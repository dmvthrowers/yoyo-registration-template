import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, apiError } from '@/lib/api-error';
import { createAdminClient } from '@/lib/supabase/admin';
import { getBearerToken, getStaffIdentityFromToken } from '@/lib/auth/staff';
import { runOrderDisplayName, isNameRestricted } from '@/lib/display-name';

const VALID_DIVISIONS = ['1A', 'X', 'SBJ'] as const;
type Division = typeof VALID_DIVISIONS[number];

const REGISTRATION_FIELDS =
  'id, first_name, last_name, preferred_bracket_name, nickname, is_minor, is_public, city, state, music_filename, x_substyle';

/**
 * GET /api/run-order?division=1A
 *
 * Returns the performance order for a division.
 * Falls back to registration order (by created_at) if no run order has been set.
 *
 * Anonymous callers get privacy-safe names: minors who have not been opted into
 * public listing by a guardian show a handle or first name + last initial, and
 * their city/state are withheld. Authenticated staff see full legal names, so
 * any staff response is marked no-store to keep it off the shared CDN cache.
 */
export const GET = withErrorHandling(async (requestId, req: NextRequest) => {
  const division = req.nextUrl.searchParams.get('division') as Division | null;
  const includeMusic = req.nextUrl.searchParams.get('include_music') === '1';

  if (!division || !VALID_DIVISIONS.includes(division)) {
    return apiError('bad_request', 'division must be one of: 1A, X, SBJ', requestId);
  }

  // Any active staff member may see full names; only DJ/audio/admin get music.
  let viewerIsStaff = false;
  let canViewMusic = false;

  const token = getBearerToken(req);
  if (token) {
    const identity = await getStaffIdentityFromToken(token);
    if (identity && identity.isActive) {
      viewerIsStaff = true;
      canViewMusic = identity.role === 'dj' || identity.role === 'audio_tech' || identity.role === 'admin';
    }
  }

  if (includeMusic) {
    if (!token) {
      return apiError('unauthorized', 'Missing bearer token', requestId);
    }
    if (!viewerIsStaff) {
      return apiError('forbidden', 'Staff access required', requestId);
    }
    if (!canViewMusic) {
      return apiError('forbidden', 'DJ/audio staff access required', requestId);
    }
  }

  const withMusic = includeMusic && canViewMusic;

  // A staff response carries legal names, so it must never land in a shared cache.
  const headers = {
    'x-request-id': requestId,
    'Vary': 'Authorization',
    'Cache-Control': viewerIsStaff
      ? 'private, no-store'
      : 'public, s-maxage=15, stale-while-revalidate=45',
  };

  type RegistrationRow = {
    id: string;
    first_name: string | null;
    last_name: string | null;
    preferred_bracket_name: string | null;
    nickname: string | null;
    is_minor: boolean | null;
    is_public: boolean | null;
    city: string | null;
    state: string | null;
    music_filename: string | null;
    x_substyle: string | null;
  };

  const toPerformer = (
    reg: RegistrationRow | null | undefined,
    position: number,
    status: string,
    registrationId: string,
  ) => {
    // Withhold location for minors who have not been opted into public listing.
    const hideLocation = !viewerIsStaff && !!reg && isNameRestricted(reg);
    return {
      position,
      status,
      registration_id: registrationId,
      display_name: reg ? runOrderDisplayName(reg, viewerIsStaff) : 'Unnamed competitor',
      city: hideLocation ? null : (reg?.city ?? null),
      state: hideLocation ? null : (reg?.state ?? null),
      music_filename: withMusic ? (reg?.music_filename ?? null) : null,
      // X division freestyle style (2A/3A/4A/5A). Null for every other division —
      // not sensitive, just not applicable outside X.
      style: reg?.x_substyle ?? null,
    };
  };

  const supabase = createAdminClient();

  // Try explicit run order first
  const { data: runOrder, error: roError } = await supabase
    .from('contest_run_order')
    .select(`
      position,
      status,
      registration_id,
      contest_registrations (${REGISTRATION_FIELDS})
    `)
    .eq('division', division)
    .order('position', { ascending: true });

  if (roError) {
    console.error('[run-order] query error:', roError);
    return apiError('upstream_error', 'Failed to fetch run order', requestId);
  }

  if (runOrder && runOrder.length > 0) {
    const performers = runOrder.map((row) => {
      const reg = (Array.isArray(row.contest_registrations)
        ? row.contest_registrations[0]
        : row.contest_registrations) as RegistrationRow | null;
      return toPerformer(reg, row.position, row.status, row.registration_id);
    });

    return NextResponse.json({ division, source: 'run_order', performers }, { headers });
  }

  // Fallback: registration order, only paid registrants in this division
  const { data: regs, error: regError } = await supabase
    .from('contest_registrations')
    .select(`${REGISTRATION_FIELDS}, created_at`)
    .contains('divisions', [division])
    .eq('paid', true)
    .order('created_at', { ascending: true });

  if (regError) {
    console.error('[run-order] fallback query error:', regError);
    return apiError('upstream_error', 'Failed to fetch registrations', requestId);
  }

  const performers = ((regs ?? []) as RegistrationRow[]).map((reg, i) =>
    toPerformer(reg, i + 1, 'upcoming', reg.id),
  );

  return NextResponse.json({ division, source: 'registration_order', performers }, { headers });
});
