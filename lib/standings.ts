import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Final standings from contest_results — one row per judge per competitor per
 * division, averaged. Shared by the public /results board and the winner
 * survey invites so "who placed" is computed the same way everywhere.
 */

export type Division = '1A' | 'X' | 'SBJ';

export const DIVISIONS: { code: Division; label: string }[] = [
  { code: '1A',  label: '1A — Single String' },
  { code: 'X',   label: 'X Division' },
  { code: 'SBJ', label: 'Sport / Beginner / Junior' },
];

/** Places that win prizes (and get the winner survey). */
export const PRIZE_PLACES = 3;

interface ResultRow {
  registration_id: string;
  division: string;
  display_name: string;
  city: string | null;
  state: string | null;
  final_score: number | string;
}

export interface Standing {
  registration_id: string;
  display_name: string;
  city: string | null;
  state: string | null;
  judge_count: number;
  avg_total: number;
}

export function emptyStandings(): Record<Division, Standing[]> {
  return { '1A': [], X: [], SBJ: [] };
}

export function computeStandings(rows: ResultRow[]): Record<Division, Standing[]> {
  const grouped: Record<Division, Map<string, { s: Standing; sum: number }>> = {
    '1A': new Map(), X: new Map(), SBJ: new Map(),
  };

  for (const row of rows) {
    const div = row.division as Division;
    if (!grouped[div]) continue;
    if (!grouped[div].has(row.registration_id)) {
      grouped[div].set(row.registration_id, {
        s: {
          registration_id: row.registration_id,
          display_name: row.display_name,
          city: row.city,
          state: row.state,
          judge_count: 0,
          avg_total: 0,
        },
        sum: 0,
      });
    }
    const entry = grouped[div].get(row.registration_id)!;
    entry.s.judge_count += 1;
    entry.sum += Number(row.final_score);
  }

  const result = emptyStandings();
  for (const { code } of DIVISIONS) {
    for (const { s, sum } of grouped[code].values()) {
      s.avg_total = s.judge_count > 0 ? Math.round((sum / s.judge_count) * 100) / 100 : 0;
      result[code].push(s);
    }
    result[code].sort((a, b) => b.avg_total - a.avg_total);
  }
  return result;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchStandings(supabase: SupabaseClient<any, 'public', any>): Promise<Record<Division, Standing[]>> {
  const { data, error } = await supabase.from('contest_results').select('*');
  if (error || !data) return emptyStandings();
  return computeStandings(data as ResultRow[]);
}

export interface Winner {
  registration_id: string;
  display_name: string;
  division: Division;
  place: number;
}

/**
 * Top PRIZE_PLACES per division, in the same order the public board shows.
 * Only the top PRIZE_PLACES count as winners for the winner survey.
 */
export function winnersFrom(standings: Record<Division, Standing[]>): Winner[] {
  return DIVISIONS.flatMap(({ code }) =>
    standings[code].slice(0, PRIZE_PLACES).map((s, i) => ({
      registration_id: s.registration_id,
      display_name: s.display_name,
      division: code,
      place: i + 1,
    })),
  );
}
