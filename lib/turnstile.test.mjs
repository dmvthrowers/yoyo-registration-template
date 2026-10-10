// Run: node --experimental-strip-types --test lib/turnstile.test.mjs
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { verifyTurnstile } from './turnstile.ts';

const realFetch = globalThis.fetch;
let calls;

beforeEach(() => {
  calls = 0;
  delete process.env.TURNSTILE_SECRET_KEY;
});
afterEach(() => {
  globalThis.fetch = realFetch;
  delete process.env.TURNSTILE_SECRET_KEY;
});

const mockFetch = (impl) => {
  globalThis.fetch = async (...args) => { calls++; return impl(...args); };
};

test('off when no secret is set: always passes and never calls Cloudflare', async () => {
  mockFetch(() => { throw new Error('should not be called'); });
  assert.equal(await verifyTurnstile(undefined, '1.2.3.4'), true);
  assert.equal(calls, 0);
});

test('with a secret, a missing, empty, non-string or oversized token fails closed without a request', async () => {
  process.env.TURNSTILE_SECRET_KEY = 'secret';
  mockFetch(() => { throw new Error('should not be called'); });
  for (const t of [undefined, null, '', 42, {}, 'x'.repeat(2049)]) {
    assert.equal(await verifyTurnstile(t, '1.2.3.4'), false);
  }
  assert.equal(calls, 0);
});

test('with a secret, success true passes and success false is rejected', async () => {
  process.env.TURNSTILE_SECRET_KEY = 'secret';
  mockFetch(async () => ({ ok: true, json: async () => ({ success: true }) }));
  assert.equal(await verifyTurnstile('tok', '1.2.3.4'), true);
  mockFetch(async () => ({ ok: true, json: async () => ({ success: false }) }));
  assert.equal(await verifyTurnstile('tok', '1.2.3.4'), false);
  mockFetch(async () => ({ ok: true, json: async () => ({}) }));
  assert.equal(await verifyTurnstile('tok', '1.2.3.4'), false);
});

test('sends the secret, the token and the IP (but not an unknown IP)', async () => {
  process.env.TURNSTILE_SECRET_KEY = 'secret';
  let body;
  mockFetch(async (_url, init) => { body = init.body; return { ok: true, json: async () => ({ success: true }) }; });
  await verifyTurnstile('tok', '9.9.9.9');
  assert.equal(body.get('secret'), 'secret');
  assert.equal(body.get('response'), 'tok');
  assert.equal(body.get('remoteip'), '9.9.9.9');
  await verifyTurnstile('tok', 'unknown');
  assert.equal(body.get('remoteip'), null);
});

test('a Cloudflare outage fails open (error status or unreachable)', async () => {
  process.env.TURNSTILE_SECRET_KEY = 'secret';
  const log = console.error; console.error = () => {};
  try {
    mockFetch(async () => ({ ok: false, status: 503, json: async () => ({}) }));
    assert.equal(await verifyTurnstile('tok', '1.2.3.4'), true);
    mockFetch(async () => { throw new Error('network down'); });
    assert.equal(await verifyTurnstile('tok', '1.2.3.4'), true);
  } finally { console.error = log; }
});
