// Unit tests for the extra formats: panel, manual attempts, ladder, bracket, rounds, team fees.
// Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PRESETS, yoyoFull } from '../presets/competitions.ts';
import {
  computeFee, voteTotal, pollWinner, panelTotal, panelMax, manualBest, betterOf, compareScores, ladderResult, compareLadder, ladderNext,
  bracketSize, seedOrder, buildBracket, setWinner, bracketPlacements, majorityPick, advancers, roundsOf,
  formatSummary, configIssues,
} from './divisions-core.ts';

const div = (code) => yoyoFull.divisions.find((d) => d.code === code);

test('panel totals clamp each criterion and ignore unknown keys', () => {
  const ap = div('AP').scoring;
  assert.equal(panelMax(ap), 100);
  assert.equal(panelTotal({ choreography: 20, performance: 30, music: 10.5, bogus: 99 }, ap), 20 + 25 + 10.5);
  assert.equal(panelTotal({}, ap), 0);
});

test('manual: best attempt respects lower-is-better and the max', () => {
  const speed = div('SPEED').scoring;
  assert.equal(betterOf(speed), 'lower');
  assert.equal(manualBest([42.1, null, 39.8], speed), 39.8);
  assert.equal(manualBest([], speed), null);
  assert.equal(manualBest([700], speed), 600);
  assert.equal(betterOf(div('1A').scoring), 'higher');
  assert.deepEqual([3, 1, 2].sort(compareScores('lower')), [1, 2, 3]);
  assert.deepEqual([3, 1, 2].sort(compareScores('higher')), [3, 2, 1]);
});

test('ladder: rung counts consecutive landed tricks; ties go to fewer attempts', () => {
  const lad = div('LADDER').scoring;
  const a = [
    { trick_index: 0, attempt: 1, landed: true },
    { trick_index: 1, attempt: 1, landed: false }, { trick_index: 1, attempt: 2, landed: true },
    { trick_index: 2, attempt: 1, landed: false }, { trick_index: 2, attempt: 2, landed: false }, { trick_index: 2, attempt: 3, landed: false },
  ];
  const ra = ladderResult(a, lad);
  assert.deepEqual([ra.rung, ra.attemptsUsed, ra.done], [2, 6, true]);
  assert.equal(ladderNext(ra, a, lad), null);
  const b = [{ trick_index: 0, attempt: 1, landed: true }, { trick_index: 1, attempt: 1, landed: true }];
  const rb = ladderResult(b, lad);
  assert.deepEqual([rb.rung, rb.done], [2, false]);
  assert.deepEqual(ladderNext(rb, b, lad), { trick_index: 2, attempt: 1 });
  assert.ok(compareLadder(lad)(rb, ra) < 0, 'same rung, fewer attempts ranks higher');
  // A landed trick above a missed one doesn't count in rung mode.
  assert.equal(ladderResult([{ trick_index: 1, attempt: 1, landed: true }], lad).rung, 0);
});

test('ladder points mode adds every landed trick', () => {
  const lad = { format: 'ladder', attemptsPerTrick: 2, rankBy: 'points', tricks: [{ name: 'a', points: 1 }, { name: 'b', points: 3 }, { name: 'c', points: 5 }] };
  const r = ladderResult([
    { trick_index: 0, attempt: 1, landed: false }, { trick_index: 0, attempt: 2, landed: false },
    { trick_index: 2, attempt: 1, landed: true },
  ], lad);
  assert.deepEqual([r.points, r.done], [5, false]);
  assert.deepEqual(ladderNext(r, [{ trick_index: 0, attempt: 2, landed: false }, { trick_index: 2, attempt: 1, landed: true }], lad), { trick_index: 1, attempt: 1 });
});

test('bracket: sizes, seeding, byes, advancing and placements', () => {
  assert.deepEqual([bracketSize(2), bracketSize(5), bracketSize(8), bracketSize(9)], [2, 8, 8, 16]);
  assert.deepEqual(seedOrder(8), [1, 8, 4, 5, 2, 7, 3, 6]);
  const ms = buildBracket(['s1', 's2', 's3', 's4', 's5'], true);
  const r1 = ms.filter((m) => m.round === 1);
  assert.equal(r1.length, 4);
  // Seeds 1–3 get byes and are already in round 2.
  assert.deepEqual(r1.map((m) => [m.entry_a, m.entry_b, m.winner]), [['s1', null, 's1'], ['s4', 's5', null], ['s2', null, 's2'], ['s3', null, 's3']]);
  const r2 = ms.filter((m) => m.round === 2 && !m.is_third_place);
  assert.deepEqual(r2.map((m) => [m.entry_a, m.entry_b]), [['s1', null], ['s2', 's3']]);
  setWinner(ms, r1[1], 's5');
  assert.equal(r2[0].entry_b, 's5');
  setWinner(ms, r2[0], 's5');
  setWinner(ms, r2[1], 's2');
  const final = ms.find((m) => m.round === 3 && !m.is_third_place);
  const third = ms.find((m) => m.is_third_place);
  assert.deepEqual([final.entry_a, final.entry_b, third.entry_a, third.entry_b], ['s5', 's2', 's1', 's3']);
  setWinner(ms, final, 's2');
  setWinner(ms, third, 's3');
  assert.deepEqual(bracketPlacements(ms), [{ entry: 's2', place: 1 }, { entry: 's5', place: 2 }, { entry: 's3', place: 3 }, { entry: 's1', place: 4 }]);
  // Changing an earlier result clears what depended on it.
  setWinner(ms, r1[1], 's4');
  assert.deepEqual([r2[0].entry_b, r2[0].winner, final.entry_a, final.winner], ['s4', null, null, null]);
  assert.throws(() => setWinner(ms, r2[1], 'nobody'));
  assert.deepEqual(buildBracket(['solo'], false), []);
});

test('bracket without a third-place match ties both semifinal losers for 3rd', () => {
  const ms = buildBracket(['a', 'b', 'c', 'd'], false);
  const [m1, m2] = ms.filter((m) => m.round === 1);
  setWinner(ms, m1, 'a');
  setWinner(ms, m2, 'c');
  setWinner(ms, ms.find((m) => m.round === 2), 'a');
  assert.deepEqual(bracketPlacements(ms), [{ entry: 'a', place: 1 }, { entry: 'c', place: 2 }, { entry: 'd', place: 3 }, { entry: 'b', place: 3 }]);
  assert.deepEqual([majorityPick(['a', 'b', 'a']), majorityPick(['a', 'b']), majorityPick([])], ['a', null, null]);
});

test('rounds: advancers keep ties at the cut', () => {
  const ranked = [{ s: 90 }, { s: 85 }, { s: 80 }, { s: 80 }, { s: 70 }];
  assert.equal(advancers(ranked, 3, (r) => r.s).length, 4);
  assert.equal(advancers(ranked, 10, (r) => r.s).length, 5);
  assert.deepEqual(roundsOf(div('1A')).map((r) => r.name), ['Prelims', 'Finals']);
  assert.deepEqual(roundsOf(div('BATTLE')).map((r) => r.name), ['Final']);
});

test('team fees: per-team pricing charges only the captain', () => {
  const later = new Date('2030-01-01'), before = new Date('2000-01-01');
  assert.equal(computeFee(['DBL'], yoyoFull, 0, later, 'online', before).fee_cents, 3000);
  assert.equal(computeFee(['DBL'], yoyoFull, 0, later, 'online', before, ['DBL']).fee_cents, 0);
  // Per-person pricing still charges a joining member.
  assert.equal(computeFee(['AP'], yoyoFull, 0, later, 'online', before, ['AP']).fee_cents, 2000);
  // Early bird never goes below zero on a free entry.
  assert.equal(computeFee(['DBL'], yoyoFull, 0, before, 'online', later, ['DBL']).fee_cents, 0);
});

test('every preset is valid and every format has a summary', () => {
  for (const [name, c] of Object.entries(PRESETS)) {
    assert.deepEqual(configIssues(c), [], name);
    for (const d of c.divisions) assert.ok(formatSummary(d).length > 5, `${name}/${d.code}`);
  }
  assert.match(formatSummary(div('SPEED')), /lowest seconds wins, best of 3/);
  assert.match(formatSummary(div('LADDER')), /10 tricks, 3 tries/);
});

test('configIssues catches bad format settings', () => {
  const bad = structuredClone(yoyoFull);
  bad.divisions.find((d) => d.code === 'BATTLE').rounds = [{ name: 'Prelims', advance: 4 }, { name: 'Finals' }];
  bad.divisions.find((d) => d.code === '1A').rounds = [{ name: 'Prelims' }, { name: 'Finals' }];
  bad.divisions.find((d) => d.code === 'AP').scoring.criteria[0].key = 'Bad Key';
  bad.divisions.find((d) => d.code === 'LADDER').scoring.attemptsPerTrick = 0;
  bad.divisions.find((d) => d.code === 'DBL').entry.max = 1;
  const issues = configIssues(bad).join('\n');
  for (const re of [/rounds only apply/, /needs advance/, /criterion key "Bad Key"/, /attemptsPerTrick/, /team entries need/]) assert.match(issues, re);
});

test('audience battles: poll winner, vote totals, third place by votes', () => {
  const ms = buildBracket(['a', 'b', 'c', 'd'], false);
  const [m1, m2] = ms.filter((m) => m.round === 1);
  Object.assign(m1, { votes_a: 40, votes_b: 25 });
  Object.assign(m2, { votes_a: 31, votes_b: 33 });
  assert.equal(pollWinner(m1), 'a');
  assert.equal(pollWinner(m2), 'c'); // b 31 vs c 33
  assert.equal(pollWinner({ ...m1, votes_a: 5, votes_b: 5 }), null);
  setWinner(ms, m1, 'a');
  setWinner(ms, m2, 'c');
  setWinner(ms, ms.find((m) => m.round === 2), 'c');
  // Seeding pairs a–d and b–c. Semifinal losers: d (25 votes) and b (31): b takes 3rd.
  assert.deepEqual([m1.entry_b, m2.entry_a], ['d', 'b']);
  assert.equal(voteTotal(ms, 'd'), 25);
  assert.deepEqual(bracketPlacements(ms, { thirdPlaceByVotes: true }).slice(2), [{ entry: 'b', place: 3 }, { entry: 'd', place: 4 }]);
  assert.deepEqual(bracketPlacements(ms).slice(2).map((p) => p.place), [3, 3]);
});

test('clearing a semifinal result empties its side of the third-place match', () => {
  const ms = buildBracket(['a', 'b', 'c', 'd'], true);
  const [m1, m2] = ms.filter((m) => m.round === 1);
  setWinner(ms, m1, 'a');
  setWinner(ms, m2, 'c');
  const third = ms.find((m) => m.is_third_place);
  assert.deepEqual([third.entry_a, third.entry_b], ['d', 'b']);
  setWinner(ms, third, 'd');
  // Overturn semifinal 1 to d: the third-place side becomes the new loser a, winner cleared.
  setWinner(ms, m1, 'd');
  assert.deepEqual([third.entry_a, third.entry_b, third.winner], ['a', 'b', null]);
});

test('overturning a quarterfinal clears the semifinal and its third-place side', () => {
  const ms = buildBracket(['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8'], true);
  const qf = ms.filter((m) => m.round === 1);
  qf.forEach((m) => setWinner(ms, m, m.entry_a));
  const [sf1, sf2] = ms.filter((m) => m.round === 2);
  setWinner(ms, sf1, sf1.entry_a);
  setWinner(ms, sf2, sf2.entry_a);
  const third = ms.find((m) => m.is_third_place);
  assert.ok(third.entry_a && third.entry_b);
  // Change quarterfinal 1's winner: semifinal 1 loses its entrant and result.
  setWinner(ms, qf[0], qf[0].entry_b);
  assert.equal(sf1.winner, null);
  assert.equal(third.entry_a, null);
  assert.ok(third.entry_b, 'the other semifinal is untouched');
});
