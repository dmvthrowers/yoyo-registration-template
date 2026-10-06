// The public sponsor inquiry form: validation from config, honeypot, money parsing, conversion. Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inquiryRow, inquirySchema, inquiryToSponsor, parseDollarsToCents } from './sponsor-inquiry.ts';

const cfg = {
  tiers: [{ id: 'gold', label: 'Gold', amount: '$500+' }, { id: 'in_kind', label: 'In-kind', amount: 'Product' }],
  otherChoices: [{ id: 'not_sure', label: 'Not sure yet' }],
  contactMethods: ['Email', 'Phone call'],
  heardFrom: ['Social media', 'Other'],
};
const ok = { first_name: ' Ada ', last_name: 'Lovelace', email: ' ADA@Example.com ', brand_name: 'Analytical Yo-Yos', tier: 'gold' };

test('a minimal valid submission passes and is cleaned up', () => {
  const r = inquirySchema(cfg).safeParse(ok);
  assert.ok(r.success);
  assert.equal(r.data.first_name, 'Ada');
  assert.equal(r.data.email, 'ada@example.com');
  assert.equal(inquiryRow(r.data).phone, null);
});

test('required fields, unknown tiers and unknown options are refused with plain messages', () => {
  const s = inquirySchema(cfg);
  assert.match(s.safeParse({ ...ok, first_name: '' }).error.issues[0].message, /first name/i);
  assert.match(s.safeParse({ ...ok, email: 'nope' }).error.issues[0].message, /email/i);
  assert.match(s.safeParse({ ...ok, tier: 'platinum' }).error.issues[0].message, /tier/i);
  assert.ok(s.safeParse({ ...ok, tier: 'not_sure' }).success, 'other choices are valid');
  assert.ok(!s.safeParse({ ...ok, contact_method: 'Carrier pigeon' }).success);
  assert.ok(!s.safeParse({ ...ok, heard_from: 'A dream' }).success);
  assert.ok(!s.safeParse({ ...ok, extra: 'x' }).success, 'unknown fields are refused');
});

test('links must be http(s)', () => {
  const s = inquirySchema(cfg);
  assert.ok(s.safeParse({ ...ok, website: 'https://example.com' }).success);
  assert.ok(!s.safeParse({ ...ok, website: 'javascript:alert(1)' }).success);
  assert.ok(s.safeParse({ ...ok, logo_url: '' }).success);
});

test('yes and no become booleans and unanswered stays empty', () => {
  const r = inquirySchema(cfg).parse({ ...ok, vendor_table: 'yes', division_sponsor: 'no' });
  const row = inquiryRow(r);
  assert.equal(row.vendor_table, true);
  assert.equal(row.division_sponsor, false);
  assert.equal(row.in_kind, null);
});

test('money parsing handles symbols, commas and words, and ignores a value when no product is included', () => {
  assert.equal(parseDollarsToCents('$1,250'), 125000);
  assert.equal(parseDollarsToCents('about 300.50 dollars'), 30050);
  assert.equal(parseDollarsToCents('lots'), undefined);
  assert.equal(parseDollarsToCents(''), undefined);
  const s = inquirySchema(cfg);
  assert.equal(inquiryRow(s.parse({ ...ok, in_kind: 'yes', retail_value: '$200' })).retail_value_cents, 20000);
  assert.equal(inquiryRow(s.parse({ ...ok, in_kind: 'no', retail_value: '$200' })).retail_value_cents, null);
});

test('converting an inquiry makes a prospect with nothing counted as money', () => {
  const base = {
    brand_name: 'Analytical Yo-Yos', contact_first: 'Ada', contact_last: 'Lovelace', email: 'ada@example.com', phone: null,
    social_handle: '@analytical', contact_method: 'Email', website: null, tier: 'gold', vendor_table: true, division_sponsor: null,
    in_kind: true, retail_value_cents: 20000, heard_from: null, notes: 'Happy to help',
  };
  const s = inquiryToSponsor(base, cfg);
  assert.equal(s.status, 'prospect');
  assert.equal(s.amount_cents, 0);
  assert.equal(s.tier, 'Gold');
  assert.equal(s.contact_name, 'Ada Lovelace');
  assert.equal(s.in_kind, 'Product, about $200 retail');
  assert.match(s.notes, /vendor table/i);
  assert.match(s.notes, /Happy to help/);
  const unsure = inquiryToSponsor({ ...base, tier: 'not_sure', in_kind: null, retail_value_cents: null }, cfg);
  assert.equal(unsure.tier, null);
  assert.match(unsure.notes, /not sure/i);
});
