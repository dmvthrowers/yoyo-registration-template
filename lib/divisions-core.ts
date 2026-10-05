/**
 * Pure division logic shared by the server, the browser and the tests: fees, selection
 * rules, freestyle/manual scoring math, and the SQL that syncs divisions into the database.
 *
 * Takes the `competition` block from contest.config.ts as an argument (type-only import),
 * so `npm test` can run it under plain Node.
 */
import type { DivisionDef, FreestyleScoring, ManualScoring, competition as Competition } from '@/contest.config';

type CompetitionConfig = typeof Competition;

/** Style codes picked per division, e.g. { X: ['2A'] } */
export type DivisionStyles = Record<string, string[]>;

export type RegistrationSource = 'online' | 'late_email' | 'walk_up' | 'soft_launch';

export interface FeeResult {
  fee_cents: number;
  combo_applied: boolean;
  early_bird_applied: boolean;
  walk_up_surcharge: boolean;
  is_comp: boolean;
  comp_discount_percent: number;
  comp_base_fee_cents: number;
}

/** Sum of division prices, with each combo applied at most once (first listed wins on overlap). */
export function baseFeeCents(selected: string[], c: CompetitionConfig): { cents: number; combo: boolean } {
  let remaining = [...new Set(selected)];
  let cents = 0;
  let combo = false;
  for (const k of c.combos) {
    if (k.divisions.length > 0 && k.divisions.every((d) => remaining.includes(d))) {
      cents += k.priceCents;
      remaining = remaining.filter((d) => !k.divisions.includes(d));
      combo = true;
    }
  }
  for (const code of remaining) {
    cents += c.divisions.find((d) => d.code === code)?.priceCents ?? 0;
  }
  return { cents, combo };
}

/**
 * Fee rules, in this order:
 * 1. Comp code → its discount_percent off the combo-adjusted fee; replaces early bird and walk-up.
 * 2. Combos (contest.config.ts → competition.combos)
 * 3. Early bird (before earlyBirdCutoff) → −earlyBirdDiscountCents, floor at $0
 * 4. Walk-up / late-email → +walkUpSurchargeCents
 */
export function computeFee(
  selected: string[],
  c: CompetitionConfig,
  compDiscountPercent: number,
  registrationDate: Date,
  source: RegistrationSource,
  earlyBirdCutoff: Date,
): FeeResult {
  const { cents: baseFee, combo: combo_applied } = baseFeeCents(selected, c);

  if (compDiscountPercent > 0) {
    const pct = Math.min(100, Math.max(0, compDiscountPercent));
    const fee = Math.round(baseFee * (100 - pct) / 100);
    return {
      fee_cents: fee, combo_applied, early_bird_applied: false, walk_up_surcharge: false,
      is_comp: fee === 0, comp_discount_percent: pct, comp_base_fee_cents: baseFee,
    };
  }

  let fee = baseFee;
  const early_bird_applied = registrationDate < earlyBirdCutoff;
  if (early_bird_applied) fee = Math.max(0, fee - c.pricing.earlyBirdDiscountCents);
  const walk_up_surcharge = source === 'walk_up' || source === 'late_email';
  if (walk_up_surcharge) fee += c.pricing.walkUpSurchargeCents;

  return {
    fee_cents: fee, combo_applied, early_bird_applied, walk_up_surcharge,
    is_comp: false, comp_discount_percent: 0, comp_base_fee_cents: baseFee,
  };
}

export interface SelectionIssue {
  path: 'divisions' | 'division_styles';
  message: string;
}

/** Checks a division + style selection against the config. Empty array = valid. */
export function selectionIssues(selected: string[], styles: DivisionStyles, c: CompetitionConfig): SelectionIssue[] {
  const issues: SelectionIssue[] = [];
  const byCode = new Map(c.divisions.map((d) => [d.code, d]));

  if (selected.length === 0) issues.push({ path: 'divisions', message: 'Select at least one division' });
  for (const code of selected) {
    if (!byCode.has(code)) issues.push({ path: 'divisions', message: `Unknown division: ${code}` });
  }
  for (const code of selected) {
    const d = byCode.get(code);
    for (const other of d?.cannotCombineWith ?? []) {
      if (selected.includes(other)) {
        issues.push({ path: 'divisions', message: `${d!.name} can't be combined with ${byCode.get(other)?.name ?? other}` });
      }
    }
  }
  for (const [code, picked] of Object.entries(styles)) {
    if (picked.length === 0) continue;
    const d = byCode.get(code);
    if (!selected.includes(code) || !d?.styles) {
      issues.push({ path: 'division_styles', message: `Styles were picked for ${d?.name ?? code}, which isn't selected` });
      continue;
    }
    const valid = new Set(d.styles.options.map((o) => o.code));
    for (const s of picked) {
      if (!valid.has(s)) issues.push({ path: 'division_styles', message: `Unknown ${d.name} style: ${s}` });
    }
  }
  for (const code of selected) {
    const d = byCode.get(code);
    if (!d?.styles) continue;
    const n = new Set(styles[code] ?? []).size;
    if (n < d.styles.min || n > d.styles.max) {
      const range = d.styles.min === d.styles.max ? `${d.styles.min}` : `${d.styles.min}–${d.styles.max}`;
      issues.push({ path: 'division_styles', message: `Choose ${range} ${d.name} style${d.styles.max === 1 ? '' : 's'}` });
    }
  }
  return dedupe(issues);
}

function dedupe(issues: SelectionIssue[]): SelectionIssue[] {
  const seen = new Set<string>();
  return issues.filter((i) => (seen.has(i.message) ? false : (seen.add(i.message), true)));
}

/** Drop empty style lists and styles for divisions that aren't selected. */
export function cleanStyles(selected: string[], styles: DivisionStyles | undefined): DivisionStyles {
  const out: DivisionStyles = {};
  for (const [code, picked] of Object.entries(styles ?? {})) {
    const uniq = [...new Set(picked)];
    if (selected.includes(code) && uniq.length > 0) out[code] = uniq;
  }
  return out;
}

// ---------------------------------------------------------------- scoring

/** The style a score counts under: the one the judge picked, else the registrant's only style. */
export function effectiveStyle(scoreStyle: string | null | undefined, registered: string[] | undefined): string | null {
  if (scoreStyle) return scoreStyle;
  return registered && registered.length === 1 ? registered[0] : null;
}

export function styleMultiplier(d: DivisionDef | undefined, style: string | null): number {
  if (!d || d.scoring.format !== 'freestyle' || !style) return 1;
  return d.styles?.options.find((o) => o.code === style)?.multiplier ?? 1;
}

export interface FreestyleSheet {
  tech_execution_raw: number;
  trick_presentation: number;
  performance_quality: number;
  musicality: number;
  routine_construction: number;
  stop_count: number;
  discard_count: number;
  detach_count: number;
}

export interface ScoreBreakdown {
  tech_execution_normalized: number;
  total_eval: number;
  deduction_points: number;
  final_score: number;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Freestyle: a judge's own highest positive (multiplied) raw tally maps to techCap and
 * everyone else scales from it. Final = tech + eval − deductions, floored at 0.
 * Mirrors the contest_results view; keep the two in sync.
 */
export function freestyleBreakdown(s: FreestyleSheet, scoring: FreestyleScoring, multiplier: number, judgeMaxRaw: number | null): ScoreBreakdown {
  const tech = judgeMaxRaw === null || s.tech_execution_raw <= 0
    ? 0
    : Math.min(scoring.techCap, r2((s.tech_execution_raw * multiplier / judgeMaxRaw) * scoring.techCap));
  const totalEval = r2(s.trick_presentation + s.performance_quality + s.musicality + s.routine_construction);
  const ded = scoring.deductions
    ? s.stop_count * scoring.deductions.stop + s.discard_count * scoring.deductions.discard + s.detach_count * scoring.deductions.detach
    : 0;
  return { tech_execution_normalized: tech, total_eval: totalEval, deduction_points: ded, final_score: Math.max(0, r2(tech + totalEval - ded)) };
}

export function manualBreakdown(score: number, scoring: ManualScoring): ScoreBreakdown {
  const v = Math.min(scoring.max, Math.max(0, r2(score)));
  return { tech_execution_normalized: 0, total_eval: 0, deduction_points: 0, final_score: v };
}

// ---------------------------------------------------------------- database sync

const CODE_RE = /^[A-Za-z0-9_-]{1,20}$/;
const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
const num = (n: number) => (Number.isFinite(n) ? String(n) : '0');

/** Problems with the competition config itself (bad codes, duplicates, bad caps). */
export function configIssues(c: CompetitionConfig): string[] {
  const out: string[] = [];
  const codes = c.divisions.map((d) => d.code);
  if (codes.length === 0) out.push('competition.divisions is empty');
  for (const d of c.divisions) {
    if (!CODE_RE.test(d.code)) out.push(`Division code "${d.code}" must be 1–20 letters, numbers, - or _`);
    if (codes.filter((x) => x === d.code).length > 1) out.push(`Duplicate division code "${d.code}"`);
    if (d.priceCents < 0 || !Number.isInteger(d.priceCents)) out.push(`${d.code}: priceCents must be a whole number ≥ 0`);
    for (const o of d.cannotCombineWith ?? []) if (!codes.includes(o)) out.push(`${d.code}: cannotCombineWith names unknown division "${o}"`);
    if (d.styles) {
      const sc = d.styles.options.map((o) => o.code);
      if (sc.length === 0) out.push(`${d.code}: styles.options is empty`);
      for (const s of sc) {
        if (!CODE_RE.test(s)) out.push(`${d.code}: style code "${s}" must be 1–20 letters, numbers, - or _`);
        if (sc.filter((x) => x === s).length > 1) out.push(`${d.code}: duplicate style "${s}"`);
      }
      if (d.styles.min < 0 || d.styles.max < Math.max(1, d.styles.min) || d.styles.max > sc.length) {
        out.push(`${d.code}: styles.min/max must satisfy 0 ≤ min ≤ max ≤ number of styles, max ≥ 1`);
      }
    }
    const sc = d.scoring;
    if (sc.format === 'freestyle') {
      if (!(sc.techCap > 0 && sc.techCap <= 1000) || !(sc.evalCap > 0 && sc.evalCap <= 99)) {
        out.push(`${d.code}: freestyle techCap must be 1–1000 and evalCap 1–99`);
      }
    } else if (!(sc.max > 0 && sc.max <= 9999)) {
      out.push(`${d.code}: manual max must be 1–9999`);
    }
  }
  for (const k of c.combos) {
    for (const code of k.divisions) if (!codes.includes(code)) out.push(`combo names unknown division "${code}"`);
    if (k.divisions.length < 2) out.push('a combo needs at least two divisions');
  }
  return out;
}

/** Idempotent SQL that makes contest_divisions / contest_division_styles match the config. */
export function divisionsSql(c: CompetitionConfig): string {
  const issues = configIssues(c);
  if (issues.length) throw new Error(`contest.config.ts competition block:\n- ${issues.join('\n- ')}`);

  const rows = c.divisions.map((d, i) => {
    const s = d.scoring;
    const f = s.format === 'freestyle' ? s : null;
    return `  (${[
      q(d.code), q(d.name), q(s.format),
      f ? num(f.techCap) : 'null', f ? num(f.evalCap) : 'null', f ? String(f.negativeClicks) : 'false',
      num(f?.deductions?.stop ?? 0), num(f?.deductions?.discard ?? 0), num(f?.deductions?.detach ?? 0),
      s.format === 'manual' ? num(s.max) : 'null', String(d.music), String(i + 1),
    ].join(', ')})`;
  });
  const styles = c.divisions.flatMap((d) =>
    (d.styles?.options ?? []).map((o, i) => `  (${[q(d.code), q(o.code), q(o.label), num(o.multiplier ?? 1), String(i + 1)].join(', ')})`),
  );
  const codes = c.divisions.map((d) => q(d.code)).join(', ');
  const styleKeys = c.divisions.flatMap((d) => (d.styles?.options ?? []).map((o) => `(${q(d.code)}, ${q(o.code)})`));

  return `-- GENERATED by \`npm run divisions\` from contest.config.ts → competition.divisions.
-- Do not edit by hand. Apply it after the migrations, and again whenever divisions change:
--   Supabase → SQL Editor → paste this file → Run   (or: psql "$DATABASE_URL" -f supabase/divisions.sql)
-- It refuses to remove a division that registrations, scores or the run order still use.

begin;

insert into public.contest_divisions
  (code, name, scoring_format, tech_cap, eval_cap, allow_negative, stop_points, discard_points, detach_points, manual_max, has_music, sort_order)
values
${rows.join(',\n')}
on conflict (code) do update set
  name = excluded.name, scoring_format = excluded.scoring_format, tech_cap = excluded.tech_cap,
  eval_cap = excluded.eval_cap, allow_negative = excluded.allow_negative, stop_points = excluded.stop_points,
  discard_points = excluded.discard_points, detach_points = excluded.detach_points,
  manual_max = excluded.manual_max, has_music = excluded.has_music, sort_order = excluded.sort_order,
  updated_at = now();

${styles.length ? `insert into public.contest_division_styles (division_code, code, label, multiplier, sort_order)
values
${styles.join(',\n')}
on conflict (division_code, code) do update set
  label = excluded.label, multiplier = excluded.multiplier, sort_order = excluded.sort_order;

delete from public.contest_division_styles
 where (division_code, code) not in (${styleKeys.join(', ')});` : 'delete from public.contest_division_styles;'}

delete from public.contest_divisions where code not in (${codes});

commit;
`;
}
