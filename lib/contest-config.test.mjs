// Unit tests for contest.config.ts date helpers (no network or DB).
// Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { zonedStamp, longDate, deadlineLabel } from '../contest.config.ts';

test('zonedStamp converts venue wall-clock time to UTC, including daylight saving', () => {
  // VSYC-26's real window: 10 AM–6 PM Eastern on Sept 19, 2026 (EDT, UTC-4).
  assert.equal(zonedStamp('2026-09-19', '10:00', 'America/New_York'), '20260919T140000Z');
  assert.equal(zonedStamp('2026-09-19', '18:00', 'America/New_York'), '20260919T220000Z');
  // Winter in Chicago is CST (UTC-6).
  assert.equal(zonedStamp('2027-01-16', '10:00', 'America/Chicago'), '20270116T160000Z');
  // US daylight saving starts 2027-03-14 at 2 AM; 10 AM that day is CDT (UTC-5).
  assert.equal(zonedStamp('2027-03-14', '10:00', 'America/Chicago'), '20270314T150000Z');
  // Non-US zone.
  assert.equal(zonedStamp('2027-07-01', '09:30', 'Europe/London'), '20270701T083000Z');
});

test('longDate and deadlineLabel format ISO dates', () => {
  assert.equal(longDate('2026-09-19'), 'September 19, 2026');
  assert.equal(deadlineLabel('2026-09-17T23:59:59-04:00'), 'September 17, 2026');
  assert.equal(deadlineLabel(undefined, 'soon'), 'soon');
  assert.equal(deadlineLabel('not-a-date', 'soon'), 'soon');
});
