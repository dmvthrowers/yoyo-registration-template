import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, apiError } from '@/lib/api-error';
import { createAdminClient } from '@/lib/supabase/admin';
import { itemFields, moduleAuth } from '@/lib/modules-server';
import { MODULES } from '@/lib/modules';

type Ctx = { params: Promise<{ module: string; id: string }> };

export const PATCH = withErrorHandling(async (requestId, req: NextRequest, ctx: Ctx) => {
  const { module: m, id } = await ctx.params;
  const a = await moduleAuth(req, requestId, m);
  if (!a.ok) return a.error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError('bad_request', 'Invalid JSON body', requestId);
  }
  const parsed = itemFields.partial().safeParse(body);
  if (!parsed.success) return apiError('bad_request', parsed.error.issues[0]?.message ?? 'Validation failed', requestId);
  const d = parsed.data;
  const def = MODULES[a.module];

  const update: Record<string, unknown> = { updated_by: a.identity.authUserId };
  if (d.title !== undefined) update.title = d.title;
  if (d.body !== undefined) update.body = d.body || null;
  if (d.status !== undefined) update.status = d.status;
  if (d.position !== undefined) update.position = d.position;
  if (d.qty !== undefined && def.useQty) update.qty = d.qty ?? 0;
  if (d.link !== undefined && def.useLink) update.link = d.link || null;
  if (Object.keys(update).length === 1) return apiError('bad_request', 'No fields to update', requestId);

  // The module is part of the match, so one module's access can't reach another module's rows.
  const { data, error } = await createAdminClient().from('contest_module_items').update(update).eq('id', id).eq('module', a.module).select('id');
  if (error) return apiError('upstream_error', 'Could not save the item', requestId);
  if (!data || data.length === 0) return apiError('not_found', 'No item with that id', requestId);
  return NextResponse.json({ ok: true }, { headers: { 'x-request-id': requestId } });
});

export const DELETE = withErrorHandling(async (requestId, req: NextRequest, ctx: Ctx) => {
  const { module: m, id } = await ctx.params;
  const a = await moduleAuth(req, requestId, m);
  if (!a.ok) return a.error;

  const { data, error } = await createAdminClient().from('contest_module_items').delete().eq('id', id).eq('module', a.module).select('id');
  if (error) return apiError('upstream_error', 'Could not delete the item', requestId);
  if (!data || data.length === 0) return apiError('not_found', 'No item with that id', requestId);
  return NextResponse.json({ ok: true }, { headers: { 'x-request-id': requestId } });
});
