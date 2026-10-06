import { z } from 'zod';

/**
 * The public sponsor inquiry form (docs/HUB_ROADMAP.md, "Sponsor inquiry form"). Pure: the schema is built
 * from the `contest.sponsors` config so the same form works for any event, and tested without a database.
 */
export interface SponsorFormConfig {
  tiers: readonly { id: string; label: string; amount: string }[];
  otherChoices: readonly { id: string; label: string }[];
  contactMethods: readonly string[];
  heardFrom: readonly string[];
}

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal('')).transform((v) => (v ? v : undefined));

const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .optional()
  .or(z.literal(''))
  .transform((v) => (v ? v : undefined))
  .refine((v) => v === undefined || /^https?:\/\/\S+\.\S+/i.test(v), 'Links must start with http:// or https://');

/** "$1,250", "1250.50" or "about 300" -> whole cents, or undefined if there is no number. */
export function parseDollarsToCents(input: string | undefined | null): number | undefined {
  if (!input) return undefined;
  const m = input.replace(/,/g, '').match(/\d+(?:\.\d{1,2})?/);
  if (!m) return undefined;
  const cents = Math.round(Number(m[0]) * 100);
  return Number.isFinite(cents) && cents >= 0 && cents <= 100_000_000 ? cents : undefined;
}

const yesNo = z.enum(['yes', 'no']).optional().or(z.literal('')).transform((v) => (v === 'yes' ? true : v === 'no' ? false : undefined));

export function inquirySchema(cfg: SponsorFormConfig) {
  const choiceIds = [...cfg.tiers.map((t) => t.id), ...cfg.otherChoices.map((c) => c.id)];
  return z.object({
    first_name: z.string().trim().min(1, 'Enter your first name.').max(80),
    last_name: z.string().trim().min(1, 'Enter your last name.').max(80),
    email: z.string().trim().toLowerCase().email('Enter an email address we can reach you at.').max(254),
    phone: optionalText(40),
    brand_name: z.string().trim().min(1, 'Enter your brand or business name.').max(160),
    social_handle: optionalText(100),
    contact_method: optionalText(60).refine((v) => v === undefined || cfg.contactMethods.includes(v), 'Pick one of the contact methods listed.'),
    website: optionalUrl,
    logo_url: optionalUrl,
    tier: z.string().refine((v) => choiceIds.includes(v), 'Choose a sponsorship tier.'),
    vendor_table: yesNo,
    division_sponsor: yesNo,
    in_kind: yesNo,
    retail_value: optionalText(30),
    heard_from: optionalText(80).refine((v) => v === undefined || cfg.heardFrom.includes(v), 'Pick one of the options listed.'),
    notes: optionalText(2000),
    /** Honeypot: real people never see or fill this. */
    _hp: z.string().optional(),
  }).strict();
}

export type SponsorInquiryInput = z.output<ReturnType<typeof inquirySchema>>;

/** The row to insert for a valid submission. */
export function inquiryRow(d: SponsorInquiryInput) {
  return {
    contact_first: d.first_name,
    contact_last: d.last_name,
    email: d.email,
    phone: d.phone ?? null,
    brand_name: d.brand_name,
    social_handle: d.social_handle ?? null,
    contact_method: d.contact_method ?? null,
    website: d.website ?? null,
    logo_url: d.logo_url ?? null,
    tier: d.tier,
    vendor_table: d.vendor_table ?? null,
    division_sponsor: d.division_sponsor ?? null,
    in_kind: d.in_kind ?? null,
    // a retail value only means something when product is included
    retail_value_cents: d.in_kind === false ? null : parseDollarsToCents(d.retail_value) ?? null,
    heard_from: d.heard_from ?? null,
    notes: d.notes ?? null,
  };
}

export interface StoredInquiry {
  brand_name: string;
  contact_first: string;
  contact_last: string;
  email: string;
  phone: string | null;
  social_handle: string | null;
  contact_method: string | null;
  website: string | null;
  tier: string;
  vendor_table: boolean | null;
  division_sponsor: boolean | null;
  in_kind: boolean | null;
  retail_value_cents: number | null;
  heard_from: string | null;
  notes: string | null;
}

/**
 * The pipeline row for converting an inquiry. It starts as a prospect with no money counted (staff set the
 * amount when it is agreed). A listed tier carries over; "not sure" and the other choices leave it blank.
 */
export function inquiryToSponsor(i: StoredInquiry, cfg: Pick<SponsorFormConfig, 'tiers'>) {
  const tier = cfg.tiers.find((t) => t.id === i.tier);
  const notes = [
    i.vendor_table ? 'Wants a vendor table.' : null,
    i.division_sponsor ? 'Interested in sponsoring a division.' : null,
    !tier ? `Asked for: ${i.tier.replace(/_/g, ' ')}.` : null,
    i.social_handle ? `Social: ${i.social_handle}` : null,
    i.website ? `Website: ${i.website}` : null,
    i.contact_method ? `Prefers: ${i.contact_method}` : null,
    i.phone ? `Phone: ${i.phone}` : null,
    i.heard_from ? `Heard about us: ${i.heard_from}` : null,
    i.notes ? `Their note: ${i.notes}` : null,
  ].filter(Boolean).join('\n').slice(0, 2000);
  return {
    name: i.brand_name,
    tier: tier ? tier.label : null,
    status: 'prospect' as const,
    amount_cents: 0,
    in_kind: i.in_kind && i.retail_value_cents ? `Product, about $${Math.round(i.retail_value_cents / 100).toLocaleString('en-US')} retail` : i.in_kind ? 'Product (value not given)' : null,
    contact_name: `${i.contact_first} ${i.contact_last}`.trim(),
    contact_email: i.email,
    notes: notes || null,
    deliverables: [] as { label: string; done: boolean }[],
  };
}
