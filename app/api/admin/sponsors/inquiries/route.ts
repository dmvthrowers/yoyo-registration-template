import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, apiError } from '@/lib/api-error';
import { createAdminClient } from '@/lib/supabase/admin';
import { can } from '@/lib/roles';
import { sponsorAuth } from '@/lib/sponsors-server';

/** GET /api/admin/sponsors/inquiries: inquiries from the public form, newest first. Needs `sponsors.manage`. */
export const GET = withErrorHandling(async (requestId, req: NextRequest) => {
  const auth = await sponsorAuth(req, requestId);
  if (auth instanceof NextResponse) return auth;
  if (!can(auth.grants, 'sponsors.manage')) return apiError('forbidden', 'Sponsor management access required', requestId);

  const { data, error } = await createAdminClient()
    .from('contest_sponsor_inquiries')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) return apiError('upstream_error', 'Could not load inquiries', requestId);
  return NextResponse.json({ inquiries: data ?? [] }, { headers: { 'x-request-id': requestId, 'Cache-Control': 'no-store' } });
});
