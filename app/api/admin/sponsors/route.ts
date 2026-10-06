import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, apiError } from '@/lib/api-error';
import { createAdminClient } from '@/lib/supabase/admin';
import { sponsorAuth, sponsorFields } from '@/lib/sponsors-server';
import { can } from '@/lib/roles';
import { cleanDeliverables, summarizeSponsors, type Deliverable } from '@/lib/sponsors';

/**
 * Sponsors (docs/ROLES.md). `sponsors.manage` sees and edits every sponsor; a sponsor's own login
 * (`sponsors.view` only) sees just the record linked to them, read-only.
 */
export const GET = withErrorHandling(async (requestId, req: NextRequest) => {
  const auth = await sponsorAuth(req, requestId);
  if (auth instanceof NextResponse) return auth;
  const manage = can(auth.grants, 'sponsors.manage');

  const supabase = createAdminClient();
  let q = supabase.from('contest_sponsors').select('*').order('created_at', { ascending: true });
  if (!manage) q = q.eq('auth_user_id', auth.authUserId);
  const { data, error } = await q;
  if (error) return apiError('upstream_error', 'Could not load sponsors', requestId);

  const sponsors = (data ?? []).map((s) => ({ ...s, deliverables: (s.deliverables ?? []) as Deliverable[] }));
  return NextResponse.json(
    { manage, sponsors, summary: manage ? summarizeSponsors(sponsors) : null },
    { headers: { 'x-request-id': requestId, 'Cache-Control': 'no-store' } },
  );
});

export const POST = withErrorHandling(async (requestId, req: NextRequest) => {
  const auth = await sponsorAuth(req, requestId);
  if (auth instanceof NextResponse) return auth;
  if (!can(auth.grants, 'sponsors.manage')) return apiError('forbidden', 'Sponsor management access required', requestId);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError('bad_request', 'Invalid JSON body', requestId);
  }
  const parsed = sponsorFields.safeParse(body);
  if (!parsed.success) return apiError('bad_request', parsed.error.issues[0]?.message ?? 'Validation failed', requestId);

  const d = parsed.data;
  const { data, error } = await createAdminClient()
    .from('contest_sponsors')
    .insert({
      name: d.name,
      tier: d.tier || null,
      status: d.status,
      amount_cents: d.amount_cents,
      in_kind: d.in_kind || null,
      contact_name: d.contact_name || null,
      contact_email: d.contact_email || null,
      notes: d.notes || null,
      deliverables: cleanDeliverables(d.deliverables),
      auth_user_id: d.auth_user_id ?? null,
    })
    .select('id')
    .single();
  if (error || !data) return apiError('upstream_error', 'Could not save the sponsor', requestId);
  return NextResponse.json({ ok: true, id: data.id }, { status: 201, headers: { 'x-request-id': requestId } });
});
