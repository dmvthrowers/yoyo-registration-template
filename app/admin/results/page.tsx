import { createAdminClient } from '@/lib/supabase/admin';
import { divisionByCode } from '@/contest.config';
import { DIVISIONS, type Division } from '@/lib/standings';

// Live admin data — never prerender at build time.
export const dynamic = 'force-dynamic';

/** One judge's score for one competitor, as computed by the contest_results view. */
interface ResultRow {
  registration_id: string;
  division: string;
  judge_name: string;
  display_name: string;
  city: string | null;
  state: string | null;
  style_code: string | null;
  tech_execution_normalized: number | string;
  total_eval: number | string;
  deduction_points: number | string;
  final_score: number | string;
}

interface JudgeScore {
  judge_name: string;
  style_code: string | null;
  tech: number;
  evalTotal: number;
  ded: number;
  total: number;
}

interface Competitor {
  registration_id: string;
  display_name: string;
  city: string | null;
  state: string | null;
  scores: JudgeScore[];
  avg_tech: number;
  avg_eval: number;
  avg_ded: number;
  avg_total: number;
  judge_count: number;
}

const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 100) / 100 : 0);

function emptyResults(): Record<Division, Competitor[]> {
  return Object.fromEntries(DIVISIONS.map(({ code }) => [code, [] as Competitor[]]));
}

/** Final score per judge comes from contest_results; competitors are ranked by the average across judges. */
async function getResults(): Promise<Record<Division, Competitor[]>> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('contest_results').select('*');
  if (error || !data) return emptyResults();

  const grouped: Record<Division, Map<string, Competitor>> =
    Object.fromEntries(DIVISIONS.map(({ code }) => [code, new Map<string, Competitor>()]));

  for (const row of data as ResultRow[]) {
    const div = grouped[row.division];
    if (!div) continue;
    if (!div.has(row.registration_id)) {
      div.set(row.registration_id, {
        registration_id: row.registration_id,
        display_name: row.display_name,
        city: row.city,
        state: row.state,
        scores: [],
        avg_tech: 0, avg_eval: 0, avg_ded: 0, avg_total: 0, judge_count: 0,
      });
    }
    div.get(row.registration_id)!.scores.push({
      judge_name: row.judge_name,
      style_code: row.style_code,
      tech: Number(row.tech_execution_normalized) || 0,
      evalTotal: Number(row.total_eval) || 0,
      ded: Number(row.deduction_points) || 0,
      total: Number(row.final_score) || 0,
    });
  }

  const result = emptyResults();
  for (const { code } of DIVISIONS) {
    for (const comp of grouped[code].values()) {
      comp.judge_count = comp.scores.length;
      comp.avg_tech = avg(comp.scores.map((s) => s.tech));
      comp.avg_eval = avg(comp.scores.map((s) => s.evalTotal));
      comp.avg_ded = avg(comp.scores.map((s) => s.ded));
      comp.avg_total = avg(comp.scores.map((s) => s.total));
      result[code].push(comp);
    }
    result[code].sort((a, b) => b.avg_total - a.avg_total);
  }
  return result;
}

export const revalidate = 10;

const th = { padding: '0.5rem 0.75rem', fontSize: '0.6rem', letterSpacing: '0.1em', fontWeight: 800, color: 'var(--text-muted)', whiteSpace: 'nowrap' } as const;
const num = { padding: '0.6rem 0.75rem', textAlign: 'right', color: 'var(--text-body)', fontFamily: 'monospace' } as const;
const subTh = { padding: '0.4rem 0.6rem', textAlign: 'left', fontSize: '0.55rem', letterSpacing: '0.1em', fontWeight: 800, color: 'var(--text-muted)' } as const;
const subNum = { padding: '0.4rem 0.6rem', fontFamily: 'monospace', color: 'var(--text-body)' } as const;

export default async function AdminResultsPage() {
  const results = await getResults();
  const totalScored = Object.values(results).reduce((s, arr) => s + arr.length, 0);

  const judges = new Set<string>();
  Object.values(results).forEach((comps) => comps.forEach((c) => c.scores.forEach((s) => judges.add(s.judge_name))));

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", color: 'var(--gold)', fontSize: '1.5rem', margin: '0 0 0.25rem' }}>
          Results
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
          {totalScored} competitor{totalScored !== 1 ? 's' : ''} scored · {judges.size} judge{judges.size !== 1 ? 's' : ''}: {[...judges].join(', ') || '—'}
        </p>
      </div>

      {DIVISIONS.map(({ code, label }) => {
        const comps = results[code];
        const def = divisionByCode(code);
        const freestyle = def?.scoring.format === 'freestyle' ? def.scoring : null;
        const hasStyles = !!def?.styles;
        const scoreNote = freestyle
          ? `Freestyle: Tech /${freestyle.techCap} + 4 × /${freestyle.evalCap}${freestyle.deductions ? ' − deductions' : ''}`
          : def?.scoring.format === 'manual' ? `Manual score /${def.scoring.max}` : '';
        const headers = freestyle
          ? ['Rank', 'Competitor', 'Location', 'Judges', 'Avg Tech', 'Avg Eval', ...(freestyle.deductions ? ['Avg Ded'] : []), 'Avg Total']
          : ['Rank', 'Competitor', 'Location', 'Judges', 'Avg Score'];
        const subHeaders = ['Competitor', 'Judge', ...(hasStyles ? ['Style'] : []),
          ...(freestyle ? ['Tech', 'Eval', ...(freestyle.deductions ? ['Ded'] : [])] : []), 'Total'];
        return (
          <section key={code} style={{ marginBottom: '2.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem 0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <h2 style={{ fontFamily: "'Playfair Display', serif", color: 'var(--gold)', fontSize: '1.1rem', margin: 0 }}>
                {label}
              </h2>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                {comps.length} scored{scoreNote && ` · ${scoreNote}`}
              </span>
            </div>

            {comps.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No scores submitted yet.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--navy)', borderBottom: '2px solid var(--navy-border)' }}>
                      {headers.map((h) => (
                        <th key={h} scope="col" style={{ ...th, textAlign: h === 'Rank' ? 'center' : h.startsWith('Avg') ? 'right' : 'left' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {comps.map((comp, i) => (
                      <tr key={comp.registration_id} style={{ borderBottom: '1px solid var(--navy-border)', background: i === 0 ? '#1a1400' : i % 2 === 0 ? 'var(--navy)' : 'transparent' }}>
                        <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center', fontWeight: 800, color: i === 0 ? 'var(--gold)' : 'var(--text-muted)', fontSize: '0.8rem' }}>
                          {i + 1}
                        </td>
                        <td style={{ padding: '0.6rem 0.75rem', fontWeight: 700, color: i === 0 ? 'var(--gold)' : '#fff' }}>
                          {comp.display_name}
                        </td>
                        <td style={{ padding: '0.6rem 0.75rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          {[comp.city, comp.state].filter(Boolean).join(', ') || '—'}
                        </td>
                        <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                          {comp.judge_count}
                        </td>
                        {freestyle && (
                          <>
                            <td style={num}>{comp.avg_tech.toFixed(1)}</td>
                            <td style={num}>{comp.avg_eval.toFixed(1)}</td>
                            {freestyle.deductions && <td style={num}>{comp.avg_ded > 0 ? `−${comp.avg_ded.toFixed(1)}` : '0.0'}</td>}
                          </>
                        )}
                        <td style={{ ...num, fontWeight: 800, color: i === 0 ? 'var(--gold)' : '#fff', fontSize: '1rem' }}>
                          {comp.avg_total.toFixed(1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Per-judge breakdown for top 3 */}
                {comps.slice(0, 3).some((c) => c.scores.length > 1) && (
                  <details style={{ marginTop: '0.75rem' }}>
                    <summary style={{ fontSize: '0.75rem', color: 'var(--text-muted)', cursor: 'pointer', userSelect: 'none', padding: '0.25rem 0' }}>
                      Per-judge breakdown (top 3)
                    </summary>
                    <div style={{ marginTop: '0.5rem', border: '1px solid var(--navy-border)', overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                        <thead>
                          <tr style={{ background: 'var(--navy)', borderBottom: '1px solid var(--navy-border)' }}>
                            {subHeaders.map((h) => <th key={h} scope="col" style={subTh}>{h}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {comps.slice(0, 3).flatMap((comp) =>
                            comp.scores.map((s, si) => (
                              <tr key={`${comp.registration_id}-${s.judge_name}-${si}`} style={{ borderBottom: '1px solid var(--navy-border)', background: si % 2 === 0 ? 'var(--navy)' : 'transparent' }}>
                                <td style={{ padding: '0.4rem 0.6rem', color: '#fff', fontWeight: si === 0 ? 700 : 400 }}>{si === 0 ? comp.display_name : ''}</td>
                                <td style={{ padding: '0.4rem 0.6rem', color: 'var(--text-muted)' }}>{s.judge_name}</td>
                                {hasStyles && <td style={{ padding: '0.4rem 0.6rem', color: 'var(--text-muted)' }}>{s.style_code ?? '—'}</td>}
                                {freestyle && (
                                  <>
                                    <td style={subNum}>{s.tech.toFixed(1)}</td>
                                    <td style={subNum}>{s.evalTotal.toFixed(1)}</td>
                                    {freestyle.deductions && <td style={subNum}>{s.ded.toFixed(1)}</td>}
                                  </>
                                )}
                                <td style={{ ...subNum, fontWeight: 700, color: 'var(--gold)' }}>{s.total.toFixed(1)}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </details>
                )}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
