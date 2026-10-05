import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, apiError } from '@/lib/api-error';
import { createAdminClient } from '@/lib/supabase/admin';
import { getBearerToken, getStaffIdentityFromToken } from '@/lib/auth/staff';
import { getEventFlagBoolean } from '@/lib/event-flags';
import { z } from 'zod';
import { DIVISION_CODES, divisionByCode } from '@/contest.config';
import {
  effectiveStyle, freestyleBreakdown, simpleBreakdown, styleMultiplier,
  type FreestyleSheet, type ScoreBreakdown,
} from '@/lib/divisions-core';

type Division = string;

/**
 * Scoring rules per division come from contest.config.ts → competition.divisions:
 *  - freestyle: clicker tally normalized per judge (×style multiplier) + 4 eval categories − deductions
 *  - simple: one 0–max score per judge
 * The math lives in lib/divisions-core.ts and mirrors the contest_results view.
 */
const sheetNumber = z.number().min(0).max(99).optional().default(0);
const scoreSubmitSchema = z.object({
  registration_id:       z.string().uuid(),
  division:              z.string().trim().max(20).refine((d) => DIVISION_CODES.includes(d), 'Unknown division'),
  /** Which of the competitor's styles this routine was judged under (only needed when they registered several). */
  style_code:            z.string().trim().max(20).optional().nullable(),
  /** Freestyle: raw net clicker tally (+ landed elements, − misses), NOT the normalized score. */
  tech_execution_raw:    z.number().min(-500).max(500).optional().default(0),
  trick_presentation:    sheetNumber,
  performance_quality:   sheetNumber,
  musicality:            sheetNumber,
  routine_construction:  sheetNumber,
  stop_count:            z.number().int().min(0).optional().default(0),
  discard_count:         z.number().int().min(0).optional().default(0),
  detach_count:          z.number().int().min(0).optional().default(0),
  /** Simple format: the judge's one score. */
  simple_score:          z.number().min(0).max(9999).optional(),
  notes:                 z.string().trim().max(500).optional(),
}).superRefine((data, ctx) => {
  const d = divisionByCode(data.division);
  if (!d) return;
  const sc = d.scoring;
  if (sc.format === 'simple') {
    if (data.simple_score === undefined) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${d.name} needs a score`, path: ['simple_score'] });
    else if (data.simple_score > sc.max) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${d.name} is scored out of ${sc.max}`, path: ['simple_score'] });
    return;
  }
  if (!sc.negativeClicks && data.tech_execution_raw < 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${d.name} does not use negative clicks`, path: ['tech_execution_raw'] });
  }
  if ([data.trick_presentation, data.performance_quality, data.musicality, data.routine_construction].some((v) => v > sc.evalCap)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Evaluation categories in ${d.name} are scored out of ${sc.evalCap}`, path: ['trick_presentation'] });
  }
  if (data.style_code && !d.styles?.options.some((o) => o.code === data.style_code)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Unknown ${d.name} style`, path: ['style_code'] });
  }
});

interface ScoreRow extends FreestyleSheet {
  division: Division;
  style_code: string | null;
  /** Styles the competitor registered for this division */
  registered_styles: string[];
  simple_score: number | null;
}

const multiplierOf = (r: ScoreRow) =>
  styleMultiplier(divisionByCode(r.division), effectiveStyle(r.style_code, r.registered_styles));

function computeScoreBreakdown(r: ScoreRow, maxRawForJudge: number | null): ScoreBreakdown {
  const d = divisionByCode(r.division);
  if (!d) return { tech_execution_normalized: 0, total_eval: 0, deduction_points: 0, final_score: 0 };
  if (d.scoring.format === 'simple') return simpleBreakdown(r.simple_score ?? 0, d.scoring);
  return freestyleBreakdown(r, d.scoring, multiplierOf(r), maxRawForJudge);
}

/** Highest positive raw Tech Execution (after style multipliers) in this judge's rows, or null. */
function maxPositiveRaw(rows: ScoreRow[]): number | null {
  const positives = rows.filter((r) => r.tech_execution_raw > 0).map((r) => r.tech_execution_raw * multiplierOf(r));
  return positives.length > 0 ? Math.max(...positives) : null;
}

type RegJoin = { division_styles?: Record<string, string[]> | null } | null;
const stylesFor = (reg: RegJoin, division: string): string[] => reg?.division_styles?.[division] ?? [];

function toRow(s: Record<string, unknown>, division: Division, reg: RegJoin): ScoreRow {
  return {
    division,
    style_code: (s.style_code as string | null) ?? null,
    registered_styles: stylesFor(reg, division),
    simple_score: s.simple_score === null || s.simple_score === undefined ? null : Number(s.simple_score),
    tech_execution_raw: Number(s.tech_execution_raw),
    trick_presentation: Number(s.trick_presentation),
    performance_quality: Number(s.performance_quality),
    musicality: Number(s.musicality),
    routine_construction: Number(s.routine_construction),
    stop_count: Number(s.stop_count),
    discard_count: Number(s.discard_count),
    detach_count: Number(s.detach_count),
  };
}

/**
 * GET /api/scores?division=1A
 *
 * Public endpoint (default) — returns aggregated standings for a division.
 * Staff endpoint (?mine=1 + Authorization: Bearer <token>) returns this judge's raw scores.
 */
export const GET = withErrorHandling(async (requestId, req: NextRequest) => {
  const division = req.nextUrl.searchParams.get('division');
  const mine = req.nextUrl.searchParams.get('mine') === '1';

  if (!division || !DIVISION_CODES.includes(division)) {
    return apiError('bad_request', `division must be one of: ${DIVISION_CODES.join(', ')}`, requestId);
  }
  const div = division as Division;

  const resultsPublished = await getEventFlagBoolean('results_published', process.env.RESULTS_PUBLISHED === 'true');

  if (!mine && !resultsPublished) {
    return NextResponse.json(
      { division, published: false, standings: [] },
      { headers: { 'x-request-id': requestId, 'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=45' } }
    );
  }

  let judgeIdentity: { authUserId: string; displayName: string } | null = null;
  if (mine) {
    const token = getBearerToken(req);
    if (!token) {
      return apiError('unauthorized', 'Missing bearer token', requestId);
    }
    const identity = await getStaffIdentityFromToken(token);
    if (!identity || !identity.isActive || identity.role !== 'judge') {
      return apiError('forbidden', 'Judge access required', requestId);
    }
    judgeIdentity = { authUserId: identity.authUserId, displayName: identity.displayName };
  }

  const supabase = createAdminClient();

  // Fetch scores for this division
  const query = supabase
    .from('contest_scores')
    .select(`
      id,
      registration_id,
      division,
      judge_user_id,
      judge_display_name,
      judge_name,
      tech_execution_raw,
      trick_presentation,
      performance_quality,
      musicality,
      routine_construction,
      stop_count,
      discard_count,
      detach_count,
      style_code,
      simple_score,
      notes,
      created_at,
      contest_registrations (
        first_name,
        last_name,
        preferred_bracket_name,
        city,
        state,
        division_styles
      )
    `)
    .eq('division', division);

  if (mine && judgeIdentity) {
    query.eq('judge_user_id', judgeIdentity.authUserId);
  }

  const { data: scores, error } = await query.order('created_at', { ascending: true });

  if (error) {
    console.error('[scores] query error:', error);
    return apiError('upstream_error', 'Failed to fetch scores', requestId);
  }

  if (mine) {
    const rows = (scores ?? []).map((s) => {
      const reg = Array.isArray(s.contest_registrations) ? s.contest_registrations[0] : s.contest_registrations;
      return { s, reg, fields: toRow(s, div, reg) };
    });
    const maxRaw = maxPositiveRaw(rows.map((r) => r.fields));

    const result = rows.map(({ s: raw, reg, fields: s }) => {
      const breakdown = computeScoreBreakdown(s, maxRaw);
      return {
        id: raw.id,
        registration_id: raw.registration_id,
        display_name: reg?.preferred_bracket_name ?? `${reg?.first_name} ${reg?.last_name}`,
        city: reg?.city ?? null,
        state: reg?.state ?? null,
        tech_execution_raw: s.tech_execution_raw,
        trick_presentation: s.trick_presentation,
        performance_quality: s.performance_quality,
        musicality: s.musicality,
        routine_construction: s.routine_construction,
        stop_count: s.stop_count,
        discard_count: s.discard_count,
        detach_count: s.detach_count,
        style_code: s.style_code,
        registered_styles: s.registered_styles,
        simple_score: s.simple_score,
        ...breakdown,
        notes: raw.notes ?? null,
        created_at: raw.created_at,
      };
    });
    return NextResponse.json(
      { division, judge: judgeIdentity?.displayName, scores: result },
      { headers: { 'x-request-id': requestId, 'Cache-Control': 'private, no-store' } }
    );
  }

  // Public aggregated standings — normalize within each judge's own scores first, then average across judges.
  const byJudge = new Map<string, ScoreRow[]>();
  const rowsByJudge = new Map<string, { registration_id: string; display_name: string; city: string | null; state: string | null; fields: ScoreRow }[]>();

  for (const s of scores ?? []) {
    const reg = Array.isArray(s.contest_registrations) ? s.contest_registrations[0] : s.contest_registrations;
    const displayName = reg?.preferred_bracket_name ?? `${reg?.first_name} ${reg?.last_name}`;
    const judgeKey = s.judge_user_id ?? `legacy:${s.judge_name}`;

    const fields = toRow(s, div, reg);

    if (!byJudge.has(judgeKey)) byJudge.set(judgeKey, []);
    byJudge.get(judgeKey)!.push(fields);

    if (!rowsByJudge.has(judgeKey)) rowsByJudge.set(judgeKey, []);
    rowsByJudge.get(judgeKey)!.push({ registration_id: s.registration_id, display_name: displayName, city: reg?.city ?? null, state: reg?.state ?? null, fields });
  }

  const byReg = new Map<string, {
    registration_id: string;
    display_name: string;
    city: string | null;
    state: string | null;
    judge_count: number;
    final_score_sum: number;
  }>();

  for (const [judgeKey, rows] of rowsByJudge.entries()) {
    const maxRaw = maxPositiveRaw(byJudge.get(judgeKey)!);
    for (const row of rows) {
      const breakdown = computeScoreBreakdown(row.fields, maxRaw);
      if (!byReg.has(row.registration_id)) {
        byReg.set(row.registration_id, {
          registration_id: row.registration_id,
          display_name: row.display_name,
          city: row.city,
          state: row.state,
          judge_count: 0,
          final_score_sum: 0,
        });
      }
      const entry = byReg.get(row.registration_id)!;
      entry.judge_count += 1;
      entry.final_score_sum += breakdown.final_score;
    }
  }

  const standings = Array.from(byReg.values())
    .map((entry) => ({
      registration_id: entry.registration_id,
      display_name: entry.display_name,
      city: entry.city,
      state: entry.state,
      judge_count: entry.judge_count,
      avg_final_score: Math.round((entry.final_score_sum / entry.judge_count) * 100) / 100,
    }))
    .sort((a, b) => b.avg_final_score - a.avg_final_score);

  return NextResponse.json(
    { division, standings },
    { headers: { 'x-request-id': requestId, 'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=45' } }
  );
});

/**
 * POST /api/scores
 *
 * Judge-only score submit/update. Uses authenticated judge identity.
 */
export const POST = withErrorHandling(async (requestId, req: NextRequest) => {
  let body: unknown;
  try { body = await req.json(); } catch {
    return apiError('bad_request', 'Invalid JSON body', requestId);
  }

  const parsed = scoreSubmitSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('bad_request', parsed.error.issues[0]?.message ?? 'Validation failed', requestId);
  }

  const token = getBearerToken(req);
  if (!token) {
    return apiError('unauthorized', 'Missing bearer token', requestId);
  }
  const identity = await getStaffIdentityFromToken(token);
  if (!identity || !identity.isActive || identity.role !== 'judge') {
    return apiError('forbidden', 'Judge access required', requestId);
  }

  const { registration_id, division, notes } = parsed.data;
  const isSimple = divisionByCode(division)?.scoring.format === 'simple';
  // A simple-format score keeps the freestyle columns at zero.
  const sheet = isSimple
    ? { tech_execution_raw: 0, trick_presentation: 0, performance_quality: 0, musicality: 0, routine_construction: 0, stop_count: 0, discard_count: 0, detach_count: 0 }
    : {
        tech_execution_raw: parsed.data.tech_execution_raw, trick_presentation: parsed.data.trick_presentation,
        performance_quality: parsed.data.performance_quality, musicality: parsed.data.musicality,
        routine_construction: parsed.data.routine_construction, stop_count: parsed.data.stop_count,
        discard_count: parsed.data.discard_count, detach_count: parsed.data.detach_count,
      };
  const simple_score = isSimple ? parsed.data.simple_score ?? 0 : null;

  const supabase = createAdminClient();

  // Verify registration exists and is in this division
  const { data: reg, error: regError } = await supabase
    .from('contest_registrations')
    .select('id, divisions, division_styles, paid')
    .eq('id', registration_id)
    .single();

  if (regError || !reg) {
    return apiError('not_found', 'Registration not found', requestId);
  }
  if (!(reg.divisions as string[]).includes(division)) {
    return apiError('unprocessable', 'Competitor is not in this division', requestId);
  }
  if (!reg.paid) {
    return apiError('unprocessable', 'Competitor has not paid', requestId);
  }
  const registeredStyles = stylesFor(reg as RegJoin, division);
  const style_code = parsed.data.style_code || null;
  if (style_code && !registeredStyles.includes(style_code)) {
    return apiError('unprocessable', 'Competitor did not register that style', requestId);
  }

  // Upsert score by authenticated judge account.
  const { data: score, error: upsertError } = await supabase
    .from('contest_scores')
    .upsert(
      {
        registration_id,
        division,
        judge_user_id: identity.authUserId,
        judge_name: identity.displayName,
        judge_display_name: identity.displayName,
        ...sheet,
        style_code,
        simple_score,
        notes: notes ?? null,
      },
      { onConflict: 'registration_id,division,judge_user_id' }
    )
    .select('id, judge_display_name')
    .single();

  if (upsertError || !score) {
    console.error('[scores] upsert error:', upsertError);
    return apiError('upstream_error', 'Failed to save score', requestId);
  }

  // Tech Execution normalizes against this judge's OWN highest raw score in the
  // division, so re-fetch all of this judge's scores here to get an up-to-date baseline.
  const { data: judgeScores, error: judgeScoresError } = await supabase
    .from('contest_scores')
    .select('registration_id, tech_execution_raw, trick_presentation, performance_quality, musicality, routine_construction, stop_count, discard_count, detach_count, style_code, simple_score, contest_registrations ( division_styles )')
    .eq('division', division)
    .eq('judge_user_id', identity.authUserId);

  if (judgeScoresError) {
    console.error('[scores] judge baseline query error:', judgeScoresError);
    return apiError('upstream_error', 'Score saved, but failed to compute normalized total', requestId);
  }

  const judgeRows = (judgeScores ?? []).map((r) =>
    toRow(r, division, (Array.isArray(r.contest_registrations) ? r.contest_registrations[0] : r.contest_registrations) as RegJoin));
  const thisRow: ScoreRow = { division, style_code, registered_styles: registeredStyles, simple_score, ...sheet };
  const breakdown = computeScoreBreakdown(thisRow, maxPositiveRaw(judgeRows));

  return NextResponse.json(
    {
      id: score.id,
      judge_name: score.judge_display_name ?? identity.displayName,
      registration_id,
      division,
      ...sheet,
      style_code,
      simple_score,
      ...breakdown,
    },
    { status: 200, headers: { 'x-request-id': requestId } }
  );
});
