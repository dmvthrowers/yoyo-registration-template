import { createAdminClient } from '@/lib/supabase/admin';
import { competition, type DivisionDef } from '@/contest.config';
import { formatSummary } from '@/lib/divisions-core';
import { fetchStandings, scoreLabel, type DivisionStandings, type StandingRow } from '@/lib/standings';

// Live admin data — never prerender at build time.
export const dynamic = 'force-dynamic';
export const revalidate = 10;

/** One judge's score for one entrant in one round, as computed by the contest_results view. */
interface ResultRow {
  registration_id: string;
  division: string;
  round: number | null;
  judge_name: string;
  style_code: string | null;
  tech_execution_normalized: number | string | null;
  total_eval: number | string | null;
  deduction_points: number | string | null;
  manual_score: number | string | null;
  manual_attempts: (number | string | null)[] | null;
  panel_scores: Record<string, number | string | null> | null;
  final_score: number | string;
}

interface JudgeScore {
  judge_name: string;
  style_code: string | null;
  tech: number;
  evalTotal: number;
  ded: number;
  criteria: Record<string, number>;
  attempts: (number | null)[];
  total: number;
}

const n = (v: unknown) => Number(v) || 0;
const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 100) / 100 : 0);
const key = (division: string, round: number, id: string) => `${division}:${round}:${id}`;

/** Per-judge rows keyed by division + round + registration. */
async function getJudgeScores(): Promise<Map<string, JudgeScore[]>> {
  const out = new Map<string, JudgeScore[]>();
  const { data, error } = await createAdminClient()
    .from('contest_results')
    .select('registration_id, division, round, judge_name, style_code, tech_execution_normalized, total_eval, deduction_points, manual_score, manual_attempts, panel_scores, final_score');
  if (error || !data) return out;
  for (const row of data as ResultRow[]) {
    const k = key(row.division, row.round ?? 1, row.registration_id);
    const list = out.get(k) ?? [];
    list.push({
      judge_name: row.judge_name,
      style_code: row.style_code,
      tech: n(row.tech_execution_normalized),
      evalTotal: n(row.total_eval),
      ded: n(row.deduction_points),
      criteria: Object.fromEntries(Object.entries(row.panel_scores ?? {}).map(([c, v]) => [c, n(v)])),
      attempts: (row.manual_attempts ?? []).map((a) => (a === null ? null : n(a))),
      total: n(row.final_score),
    });
    out.set(k, list);
  }
  return out;
}

const th = { padding: '0.5rem 0.75rem', fontSize: '0.6rem', letterSpacing: '0.1em', fontWeight: 800, color: 'var(--text-muted)', whiteSpace: 'nowrap' } as const;
const td = { padding: '0.6rem 0.75rem' } as const;
const num = { padding: '0.6rem 0.75rem', textAlign: 'right', color: 'var(--text-body)', fontFamily: 'monospace', whiteSpace: 'nowrap' } as const;
const subTh = { padding: '0.4rem 0.6rem', textAlign: 'left', fontSize: '0.55rem', letterSpacing: '0.1em', fontWeight: 800, color: 'var(--text-muted)', whiteSpace: 'nowrap' } as const;
const subNum = { padding: '0.4rem 0.6rem', fontFamily: 'monospace', color: 'var(--text-body)', whiteSpace: 'nowrap' } as const;
const roundHeading = { fontSize: '0.65rem', letterSpacing: '0.12em', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '1rem 0 0.5rem' } as const;

interface Column { label: string; value: (scores: JudgeScore[]) => string }

/** The averaged columns shown between "Judges" and the final value, per format. */
function averageColumns(d: DivisionDef): Column[] {
  const s = d.scoring;
  if (s.format === 'freestyle') {
    return [
      { label: 'Avg Tech', value: (xs) => avg(xs.map((x) => x.tech)).toFixed(2) },
      { label: 'Avg Eval', value: (xs) => avg(xs.map((x) => x.evalTotal)).toFixed(2) },
      ...(s.deductions ? [{ label: 'Avg Ded', value: (xs: JudgeScore[]) => { const v = avg(xs.map((x) => x.ded)); return v > 0 ? `−${v.toFixed(2)}` : '0.00'; } }] : []),
    ];
  }
  if (s.format === 'panel') {
    return s.criteria.map((c) => ({ label: `${c.label} /${c.max}`, value: (xs: JudgeScore[]) => avg(xs.map((x) => x.criteria[c.key] ?? 0)).toFixed(2) }));
  }
  return [];
}

/** The per-judge columns of the breakdown table, per format. */
function judgeColumns(d: DivisionDef): Column[] {
  const s = d.scoring;
  const one = (f: (x: JudgeScore) => string): Column['value'] => (xs) => f(xs[0]);
  if (s.format === 'freestyle') {
    return [
      ...(d.styles ? [{ label: 'Style', value: one((x) => x.style_code ?? '—') }] : []),
      { label: 'Tech', value: one((x) => x.tech.toFixed(2)) },
      { label: 'Eval', value: one((x) => x.evalTotal.toFixed(2)) },
      ...(s.deductions ? [{ label: 'Ded', value: one((x) => x.ded.toFixed(2)) }] : []),
    ];
  }
  if (s.format === 'panel') return s.criteria.map((c) => ({ label: c.label, value: one((x) => (x.criteria[c.key] ?? 0).toFixed(2)) }));
  if (s.format === 'manual' && (s.attempts ?? 1) > 1) {
    return [{ label: 'Attempts', value: one((x) => x.attempts.map((a) => (a === null ? '—' : scoreLabel(a, s))).join(' · ') || '—') }];
  }
  return [];
}

/** A plain ranked table (ladder, bracket, and overall standings for multi-round divisions). */
function SimpleTable({ rows, valueHeader }: { rows: StandingRow[]; valueHeader: string }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
        <thead>
          <tr style={{ background: 'var(--navy)', borderBottom: '2px solid var(--navy-border)' }}>
            <th scope="col" style={{ ...th, textAlign: 'center' }}>Rank</th>
            <th scope="col" style={{ ...th, textAlign: 'left' }}>Competitor</th>
            <th scope="col" style={{ ...th, textAlign: 'left' }}>Location</th>
            <th scope="col" style={{ ...th, textAlign: 'right' }}>{valueHeader}</th>
            <th scope="col" style={{ ...th, textAlign: 'left' }}>Detail</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.registration_id} style={{ borderBottom: '1px solid var(--navy-border)', background: r.place === 1 ? '#1a1400' : i % 2 === 0 ? 'var(--navy)' : 'transparent' }}>
              <td style={{ ...td, textAlign: 'center', fontWeight: 800, color: r.place === 1 ? 'var(--gold)' : 'var(--text-muted)', fontSize: '0.8rem' }}>{r.place}</td>
              <td style={{ ...td, fontWeight: 700, color: r.place === 1 ? 'var(--gold)' : '#fff' }}>{r.display_name}</td>
              <td style={{ ...td, color: 'var(--text-muted)', fontSize: '0.8rem' }}>{[r.city, r.state].filter(Boolean).join(', ') || '—'}</td>
              <td style={{ ...num, fontWeight: 800, color: r.place === 1 ? 'var(--gold)' : '#fff' }}>{r.value_label}</td>
              <td style={{ ...td, color: 'var(--text-muted)', fontSize: '0.8rem' }}>{r.detail ?? ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** One round of a judged (freestyle / panel / manual) division with averages and per-judge rows. */
function ScoredRound({ d, round, rows, judges }: { d: DivisionDef; round: number; rows: StandingRow[]; judges: Map<string, JudgeScore[]> }) {
  const avgCols = averageColumns(d);
  const judgeCols = judgeColumns(d);
  const scoresOf = (r: StandingRow) => judges.get(key(d.code, round, r.registration_id)) ?? [];
  if (rows.length === 0) return <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No scores submitted yet.</p>;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
        <thead>
          <tr style={{ background: 'var(--navy)', borderBottom: '2px solid var(--navy-border)' }}>
            <th scope="col" style={{ ...th, textAlign: 'center' }}>Rank</th>
            <th scope="col" style={{ ...th, textAlign: 'left' }}>Competitor</th>
            <th scope="col" style={{ ...th, textAlign: 'left' }}>Location</th>
            <th scope="col" style={{ ...th, textAlign: 'center' }}>Judges</th>
            {avgCols.map((c) => <th key={c.label} scope="col" style={{ ...th, textAlign: 'right' }}>{c.label}</th>)}
            <th scope="col" style={{ ...th, textAlign: 'right' }}>{d.scoring.format === 'manual' ? 'Avg Best' : 'Avg Total'}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const scores = scoresOf(r);
            return (
              <tr key={r.registration_id} style={{ borderBottom: '1px solid var(--navy-border)', background: r.place === 1 ? '#1a1400' : i % 2 === 0 ? 'var(--navy)' : 'transparent' }}>
                <td style={{ ...td, textAlign: 'center', fontWeight: 800, color: r.place === 1 ? 'var(--gold)' : 'var(--text-muted)', fontSize: '0.8rem' }}>{r.place}</td>
                <td style={{ ...td, fontWeight: 700, color: r.place === 1 ? 'var(--gold)' : '#fff' }}>{r.display_name}</td>
                <td style={{ ...td, color: 'var(--text-muted)', fontSize: '0.8rem' }}>{[r.city, r.state].filter(Boolean).join(', ') || '—'}</td>
                <td style={{ ...td, textAlign: 'center', color: 'var(--text-muted)' }}>{scores.length}</td>
                {avgCols.map((c) => <td key={c.label} style={num}>{c.value(scores)}</td>)}
                <td style={{ ...num, fontWeight: 800, color: r.place === 1 ? 'var(--gold)' : '#fff', fontSize: '1rem' }}>{r.value_label}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <details style={{ marginTop: '0.75rem' }}>
        <summary style={{ fontSize: '0.75rem', color: 'var(--text-muted)', cursor: 'pointer', userSelect: 'none', padding: '0.25rem 0' }}>
          Per-judge breakdown
        </summary>
        <div style={{ marginTop: '0.5rem', border: '1px solid var(--navy-border)', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ background: 'var(--navy)', borderBottom: '1px solid var(--navy-border)' }}>
                <th scope="col" style={subTh}>Competitor</th>
                <th scope="col" style={subTh}>Judge</th>
                {judgeCols.map((c) => <th key={c.label} scope="col" style={subTh}>{c.label}</th>)}
                <th scope="col" style={subTh}>{d.scoring.format === 'manual' ? 'Best' : 'Total'}</th>
              </tr>
            </thead>
            <tbody>
              {rows.flatMap((r) =>
                scoresOf(r).map((s, si) => (
                  <tr key={`${r.registration_id}-${s.judge_name}-${si}`} style={{ borderBottom: '1px solid var(--navy-border)', background: si % 2 === 0 ? 'var(--navy)' : 'transparent' }}>
                    <td style={{ padding: '0.4rem 0.6rem', color: '#fff', fontWeight: si === 0 ? 700 : 400 }}>{si === 0 ? r.display_name : ''}</td>
                    <td style={{ padding: '0.4rem 0.6rem', color: 'var(--text-muted)' }}>{s.judge_name}</td>
                    {judgeCols.map((c) => <td key={c.label} style={subNum}>{c.value([s])}</td>)}
                    <td style={{ ...subNum, fontWeight: 700, color: 'var(--gold)' }}>{scoreLabel(s.total, d.scoring)}</td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

function DivisionResults({ d, ds, judges }: { d: DivisionDef; ds: DivisionStandings; judges: Map<string, JudgeScore[]> }) {
  if (ds.format === 'showcase') return <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Showcase — not judged.</p>;
  if (ds.format === 'ladder' || ds.format === 'bracket') {
    return (
      <>
        {ds.final.length === 0
          ? <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No results yet.</p>
          : <SimpleTable rows={ds.final} valueHeader={ds.format === 'ladder' ? 'Result' : 'Finish'} />}
        {ds.format === 'bracket' && (
          <p style={{ margin: '0.6rem 0 0', fontSize: '0.8rem' }}>
            <a href={`/results/bracket?division=${encodeURIComponent(d.code)}`} style={{ color: 'var(--gold-light)', fontWeight: 700 }}>View bracket →</a>
          </p>
        )}
      </>
    );
  }
  if (ds.rounds.length === 1) return <ScoredRound d={d} round={1} rows={ds.rounds[0].rows} judges={judges} />;
  return (
    <>
      <h3 style={{ ...roundHeading, marginTop: 0 }}>Overall</h3>
      {ds.final.length === 0
        ? <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No scores submitted yet.</p>
        : <SimpleTable rows={ds.final} valueHeader="Score" />}
      {ds.rounds.map((r, i) => (
        <div key={r.name}>
          <h3 style={roundHeading}>Round {i + 1} · {r.name}</h3>
          <ScoredRound d={d} round={i + 1} rows={r.rows} judges={judges} />
        </div>
      ))}
    </>
  );
}

export default async function AdminResultsPage() {
  const [standings, judges] = await Promise.all([fetchStandings(createAdminClient()), getJudgeScores()]);
  const totalPlaced = Object.values(standings).reduce((s, d) => s + d.final.length, 0);
  const judgeNames = new Set<string>();
  judges.forEach((xs) => xs.forEach((s) => judgeNames.add(s.judge_name)));

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", color: 'var(--gold)', fontSize: '1.5rem', margin: '0 0 0.25rem' }}>
          Results
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
          {totalPlaced} placed · {judgeNames.size} judge{judgeNames.size !== 1 ? 's' : ''}: {[...judgeNames].join(', ') || '—'}
        </p>
      </div>

      {competition.divisions.map((d) => {
        const ds = standings[d.code];
        return (
          <section key={d.code} aria-labelledby={`admin-div-${d.code}`} style={{ marginBottom: '2.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem 0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <h2 id={`admin-div-${d.code}`} style={{ fontFamily: "'Playfair Display', serif", color: 'var(--gold)', fontSize: '1.1rem', margin: 0 }}>
                {d.name}
              </h2>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                {ds.format !== 'showcase' && `${ds.final.length} placed · `}{formatSummary(d)}
              </span>
            </div>
            <DivisionResults d={d} ds={ds} judges={judges} />
          </section>
        );
      })}
    </div>
  );
}
