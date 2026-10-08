// Unit tests for lib/standings.ts: ranking every format from fixture rows (no network or DB).
// Run: npm test
//
// lib/standings.ts imports with the `@/` alias like the rest of the app, so this file registers
// a tiny resolve hook that maps `@/x` to `<repo>/x.ts` before importing it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';

const root = new URL('../', import.meta.url).href;
const hook = `
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const ROOT = ${JSON.stringify(root)};
export async function resolve(spec, ctx, next) {
  if (spec.startsWith('@/')) {
    for (const ext of ['', '.ts', '.tsx', '/index.ts']) {
      const url = new URL(spec.slice(2) + ext, ROOT);
      if (existsSync(fileURLToPath(url)) && !url.pathname.endsWith('/')) return { url: url.href, shortCircuit: true };
    }
  }
  return next(spec, ctx);
}`;
register(`data:text/javascript,${encodeURIComponent(hook)}`);

const { yoyoFull, combo } = await import('../presets/competitions.ts');
const S = await import('./standings.ts');

const div = (cfg, code) => cfg.divisions.find((d) => d.code === code);
const R = (registration_id, round, final_score, display_name = registration_id) =>
  ({ registration_id, division: '1A', round, display_name, city: null, state: null, final_score });

test('rounds: averages per round, finalists first, then prelim-only entrants', () => {
  const results = [
    // Prelims: a 90, b 80, c 70 (two judges each), d 60, e 60 (tie)
    R('a', 1, 92), R('a', 1, 88), R('b', 1, 80), R('b', 1, 80), R('c', 1, '70.5'), R('c', 1, 69.5),
    R('d', 1, 60), R('e', 1, 60),
    // Finals: c wins, a second
    R('c', 2, 95), R('a', 2, 91),
  ];
  const s = S.divisionStandings(div(yoyoFull, '1A'), { results });
  assert.equal(s.format, 'freestyle');
  assert.deepEqual(s.rounds.map((r) => r.name), ['Prelims', 'Finals']);
  assert.deepEqual(s.rounds[0].rows.map((r) => [r.registration_id, r.place, r.value_label]),
    [['a', 1, '90.00'], ['b', 2, '80.00'], ['c', 3, '70.00'], ['d', 4, '60.00'], ['e', 4, '60.00']]);
  assert.equal(s.rounds[0].rows[0].detail, '2 judges');
  assert.deepEqual(s.final.map((r) => [r.registration_id, r.place]), [['c', 1], ['a', 2], ['b', 3], ['d', 4], ['e', 4]]);
  assert.equal(s.final[2].detail, 'Out in Prelims');

  // Before finals are scored, the prelim order stands.
  const early = S.divisionStandings(div(yoyoFull, '1A'), { results: results.filter((r) => r.round === 1) });
  assert.deepEqual(early.final.map((r) => r.registration_id), ['a', 'b', 'c', 'd', 'e']);

  // Advancing: top N with ties at the cut.
  const one = { ...div(yoyoFull, '1A'), rounds: [{ name: 'Prelims', advance: 3 }, { name: 'Finals' }] };
  assert.deepEqual(S.roundAdvancers(one, s, 1).map((r) => r.registration_id), ['a', 'b', 'c']);
  const four = { ...one, rounds: [{ name: 'Prelims', advance: 4 }, { name: 'Finals' }] };
  assert.deepEqual(S.roundAdvancers(four, s, 1).map((r) => r.registration_id), ['a', 'b', 'c', 'd', 'e']);
  assert.deepEqual(S.roundAdvancers(one, s, 2), []);
});

test('manual lower-is-better ranks the fastest first and labels the unit', () => {
  const rows = [
    { registration_id: 'x', division: 'SPEED', round: 1, display_name: 'X', city: null, state: null, final_score: 42.1 },
    { registration_id: 'y', division: 'SPEED', round: 1, display_name: 'Y', city: null, state: null, final_score: 39.8 },
  ];
  const s = S.divisionStandings(div(yoyoFull, 'SPEED'), { results: rows });
  assert.equal(s.better, 'lower');
  assert.deepEqual(s.final.map((r) => [r.registration_id, r.value_label]), [['y', '39.80 s'], ['x', '42.10 s']]);
  assert.equal(S.scoreLabel(1204, { format: 'manual', max: 9999, unit: 'catches' }), '1,204 catches');
  assert.equal(S.scoreLabel(92.4, div(yoyoFull, 'AP').scoring), '92.40');
});

test('panel divisions average judge totals (from contest_results)', () => {
  const rows = [
    { registration_id: 't1', division: 'AP', round: 1, display_name: 'The Loopers', city: null, state: null, final_score: 80 },
    { registration_id: 't1', division: 'AP', round: 1, display_name: 'The Loopers', city: null, state: null, final_score: 90 },
    { registration_id: 't2', division: 'AP', round: 1, display_name: 'Spin Crew', city: null, state: null, final_score: 86 },
  ];
  const s = S.divisionStandings(div(yoyoFull, 'AP'), { results: rows });
  assert.deepEqual(s.final.map((r) => [r.display_name, r.value]), [['Spin Crew', 86], ['The Loopers', 85]]);
});

test('ladder: rung, then fewer attempts; labels', () => {
  const at = (id, trick_index, attempt, landed) => ({ division: 'LADDER', registration_id: id, trick_index, attempt, landed });
  const ladder = [
    // p: lands 0,1 first try, misses 2 three times → rung 2, 5 attempts
    at('p', 0, 1, true), at('p', 1, 1, true), at('p', 2, 1, false), at('p', 2, 2, false), at('p', 2, 3, false),
    // q: lands 0 on try 2, 1 on try 1, 2 on try 1 → rung 3
    at('q', 0, 1, false), at('q', 0, 2, true), at('q', 1, 1, true), at('q', 2, 1, true),
    // r: same as p
    at('r', 0, 1, true), at('r', 1, 1, true), at('r', 2, 1, false), at('r', 2, 2, false), at('r', 2, 3, false),
  ];
  const names = new Map([['LADDER:q', { display_name: 'Quinn', city: 'Austin', state: 'TX' }]]);
  const s = S.divisionStandings(div(yoyoFull, 'LADDER'), { ladder, names });
  assert.deepEqual(s.final.map((r) => [r.registration_id, r.place, r.value_label, r.detail]), [
    ['q', 1, 'Rung 3 of 10', '4 attempts'],
    ['p', 2, 'Rung 2 of 10', '5 attempts'],
    ['r', 2, 'Rung 2 of 10', '5 attempts'],
  ]);
  assert.equal(s.final[0].display_name, 'Quinn');
  assert.equal(s.final[1].display_name, 'Unnamed competitor');
  // combo preset has two ladders; each only sees its own rows.
  assert.equal(S.divisionStandings(div(combo, 'KLAD'), { ladder }).final.length, 0);
});

test('bracket: placements, then losers by the round they reached', () => {
  const M = (round, position, a, b, winner, is_third_place = false, votes = [null, null]) =>
    ({ division: 'BATTLE', round, position, is_third_place, entry_a: a, entry_b: b, winner, votes_a: votes[0], votes_b: votes[1] });
  // 8-player bracket with a third-place match.
  const matches = [
    M(1, 1, 's1', 's8', 's1'), M(1, 2, 's4', 's5', 's5'), M(1, 3, 's2', 's7', 's2'), M(1, 4, 's3', 's6', 's3'),
    M(2, 1, 's1', 's5', 's1'), M(2, 2, 's2', 's3', 's3'),
    M(3, 1, 's1', 's3', 's3'), M(3, 2, 's5', 's2', 's2', true),
  ];
  const s = S.divisionStandings(div(yoyoFull, 'BATTLE'), { matches });
  assert.deepEqual(s.final.slice(0, 4).map((r) => [r.registration_id, r.place, r.value_label]),
    [['s3', 1, 'Champion'], ['s1', 2, 'Runner-up'], ['s2', 3, '3rd'], ['s5', 4, '4th']]);
  assert.deepEqual(s.final.slice(4).map((r) => r.registration_id).sort(), ['s4', 's6', 's7', 's8']);
  assert.ok(s.final.slice(4).every((r) => r.place === 5 && r.value_label === 'Quarterfinal'));
  assert.equal(S.bracketRoundLabel(1, 3), 'Quarterfinal');
  assert.equal(S.bracketRoundLabel(2, 3), 'Semifinal');

  // Audience battle, no third-place match: semifinal losers ranked by votes.
  const duel = div(combo, 'DUEL');
  const dm = [
    { ...M(1, 1, 'a', 'b', 'a', false, [30, 10]), division: 'DUEL' }, { ...M(1, 2, 'c', 'd', 'd', false, [5, 20]), division: 'DUEL' },
    { ...M(2, 1, 'a', 'd', 'a', false, [12, 11]), division: 'DUEL' },
  ];
  const ds = S.divisionStandings(duel, { matches: dm });
  assert.deepEqual(ds.final.map((r) => [r.registration_id, r.place, r.value_label]).slice(0, 2), [['a', 1, 'Champion'], ['d', 2, 'Runner-up']]);
  assert.equal(ds.final.length, 4);
  // Unfinished bracket: nobody placed yet, everyone by round reached.
  const open = S.divisionStandings(div(yoyoFull, 'BATTLE'), { matches: [...matches.slice(0, 4), M(2, 1, 's1', 's5', null), M(2, 2, 's2', 's3', null), M(3, 1, null, null, null), M(3, 2, null, null, null, true)] });
  assert.equal(open.final.length, 8);
  assert.deepEqual(open.final.map((r) => r.value_label), [...Array(4).fill('Semifinal'), ...Array(4).fill('Quarterfinal')]);
});

test('showcase is empty and winnersFrom skips it; ties at 3rd all win', () => {
  const results = [R('a', 2, 90), R('b', 2, 80), R('c', 2, 70), R('d', 2, 70), R('e', 2, 60)];
  const all = S.computeStandings({ results }, yoyoFull.divisions);
  assert.deepEqual(all.SHOW, { format: 'showcase', better: 'higher', rounds: [], final: [] });
  const w = S.winnersFrom(all);
  assert.deepEqual(w.map((x) => [x.division, x.registration_id, x.place]), [['1A', 'a', 1], ['1A', 'b', 2], ['1A', 'c', 3], ['1A', 'd', 3]]);
});

test('public names never show a non-public minor\'s legal full name', () => {
  const minor = { id: '1', first_name: 'Sam', last_name: 'Rivera', is_minor: true, is_public: false, city: 'Reston', state: 'VA' };
  assert.deepEqual(S.publicEntry(minor), { display_name: 'Sam R.', city: null, state: 'VA' });
  assert.equal(S.publicEntry({ ...minor, preferred_bracket_name: 'sam rivera' }).display_name, 'Sam R.');
  assert.equal(S.publicEntry({ ...minor, preferred_bracket_name: 'Sammy' }).display_name, 'Sammy');
  assert.equal(S.publicEntry({ ...minor, nickname: 'Spinz' }).display_name, 'Spinz');
  assert.equal(S.publicEntry({ ...minor, is_public: true }).display_name, 'Sam Rivera');
  assert.equal(S.publicEntry(minor, 'Team Loop').display_name, 'Team Loop');
});

test('state champion: best-placed finisher from the state, even off the podium', () => {
  const row = (registration_id, place, state) => ({ registration_id, place, state, display_name: registration_id, city: null, value: 0, value_label: '0' });
  const rows = [row('a', 1, 'MD'), row('b', 2, 'OH'), row('c', 3, 'NY'), row('d', 4, 'va'), row('e', 5, 'VA')];
  assert.deepEqual(S.stateChampions(rows, 'VA').map((r) => r.registration_id), ['d']);
  // Ties for that place all count.
  const tied = [row('a', 1, 'MD'), row('b', 2, 'VA'), row('c', 2, 'VA'), row('d', 4, 'VA')];
  assert.deepEqual(S.stateChampions(tied, 'va').map((r) => r.registration_id), ['b', 'c']);
  // Nobody from the state, or the feature switched off.
  assert.deepEqual(S.stateChampions(rows, 'TX'), []);
  assert.deepEqual(S.stateChampions(rows, ''), []);
  assert.deepEqual(S.stateChampions([row('x', 1, null)], 'VA'), []);
});

// ---------------------------------------------------------------- add-on divisions (master plan R2)

test('an add-on keeps the parent order for the people who ticked it, renumbered, ties kept', () => {
  const parent = div(yoyoFull, '1A');
  const addon = { code: 'GIRLS', name: 'Girls', scoring: { format: 'addon', parent: '1A' } };
  const results = [R('a', 1, 90), R('b', 1, 85), R('c', 1, 85), R('d', 1, 70), R('e', 1, 60)];
  const out = S.computeStandings(
    { results, addOnMembers: { GIRLS: new Set(['b', 'c', 'e']) } },
    [parent, addon],
  );
  assert.deepEqual(out['1A'].final.map((r) => [r.registration_id, r.place]), [['a', 1], ['b', 2], ['c', 2], ['d', 4], ['e', 5]]);
  assert.deepEqual(out.GIRLS.final.map((r) => [r.registration_id, r.place]), [['b', 1], ['c', 1], ['e', 3]]);
  assert.equal(out.GIRLS.format, 'addon');
  assert.equal(out.GIRLS.final[0].value, 85, 'scores come through unchanged');
});

test('an add-on with nobody ticked is empty, and with no parent standings does not crash', () => {
  const parent = div(yoyoFull, '1A');
  const addon = { code: 'GIRLS', name: 'Girls', scoring: { format: 'addon', parent: '1A' } };
  assert.deepEqual(S.computeStandings({ results: [R('a', 1, 90)] }, [parent, addon]).GIRLS.final, []);
  assert.deepEqual(S.computeStandings({ results: [] }, [addon]).GIRLS.final, []);
});
