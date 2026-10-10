import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorHandling, apiError } from '@/lib/api-error';
import { createAdminClient } from '@/lib/supabase/admin';
import { getBearerToken, getStaffIdentityFromToken } from '@/lib/auth/staff';
import { can } from '@/lib/roles';
import { BUDGET_CATEGORIES, entryIssue } from '@/lib/open-books';

async function requireAdmin(req: NextRequest, requestId: string) {
  const token = getBearerToken(req);
  if (!token) return apiError('unauthorized', 'Missing bearer token', requestId);

  const identity = await getStaffIdentityFromToken(token);
  if (!identity || !identity.isActive || !can(identity.grants, 'finance.edit')) {
    return apiError('forbidden', 'Admin access required', requestId);
  }

  return identity;
}

const patchEntrySchema = z.object({
  entry_type: z.enum(['income', 'expense']).optional(),
  category: z.enum(BUDGET_CATEGORIES).optional(),
  planned: z.boolean().optional(),
  description: z.string().trim().min(1).max(500).optional(),
  amount_cents: z.number().int().min(0).optional(),
  entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
}).strict();

export const PATCH = withErrorHandling(async (requestId, req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const auth = await requireAdmin(req, requestId);
  if (auth instanceof NextResponse) return auth;

  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError('bad_request', 'Invalid JSON body', requestId);
  }

  const parsed = patchEntrySchema.safeParse(body);
  if (!parsed.success) {
    return apiError('bad_request', parsed.error.issues[0]?.message ?? 'Validation failed', requestId);
  }
  if (Object.keys(parsed.data).length === 0) {
    return apiError('bad_request', 'No fields to update', requestId);
  }

  const supabase = createAdminClient();

  // Check the entry as it will be after the change, not just the changed fields.
  const { data: current, error: readError } = await supabase
    .from('contest_budget_entries')
    .select('entry_type, category, planned')
    .eq('id', id)
    .maybeSingle();
  if (readError) return apiError('upstream_error', 'Failed to read the budget entry', requestId);
  if (!current) return apiError('not_found', 'No such budget entry', requestId);
  const issue = entryIssue({ ...current, ...parsed.data } as Parameters<typeof entryIssue>[0]);
  if (issue) return apiError('bad_request', issue, requestId);

  const { data, error } = await supabase
    .from('contest_budget_entries')
    .update(parsed.data)
    .eq('id', id)
    .select('id, created_at, updated_at, entry_type, category, description, amount_cents, entry_date, planned')
    .single();

  if (error || !data) {
    return apiError('upstream_error', 'Failed to update budget entry', requestId);
  }

  return NextResponse.json({ ok: true, entry: data }, { headers: { 'x-request-id': requestId } });
});

export const DELETE = withErrorHandling(async (requestId, req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const auth = await requireAdmin(req, requestId);
  if (auth instanceof NextResponse) return auth;

  const { id } = await ctx.params;

  const supabase = createAdminClient();
  const { error } = await supabase.from('contest_budget_entries').delete().eq('id', id);

  if (error) {
    return apiError('upstream_error', 'Failed to delete budget entry', requestId);
  }

  return NextResponse.json({ ok: true }, { headers: { 'x-request-id': requestId } });
});
