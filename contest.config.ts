/**
 * YOUR CONTEST SETTINGS — the one file to edit for a new contest.
 *
 * Everything contest-specific (name, date, venue, organizer, deadlines, links, logos)
 * lives here. Prices live in lib/pricing.ts.
 *
 * Safe to import from both server and browser code: nothing secret belongs in this file.
 */

export const contest = {
  /** Full name, e.g. "Springfield Yo-Yo Open" */
  name: 'Springfield Yo-Yo Open',
  /** Short name used in email subjects, tabs, and badges, e.g. "SYO-27" */
  shortName: 'SYO-27',
  /** The next edition's short name, used in post-event surveys ("help us plan SYO-28") */
  nextShortName: 'SYO-28',
  /** One line under the name. "" to hide. */
  tagline: 'Three divisions, NYYL rules, free to watch.',

  /** Contest day as YYYY-MM-DD, in the venue's time zone */
  date: '2027-03-13',
  /** Hours, 24-hour "HH:MM", for calendar invites */
  startTime: '10:00',
  endTime: '18:00',
  /** Shown to competitors, e.g. "doors open 10am" */
  doorsNote: 'doors open 10am',
  /** IANA time zone of the venue */
  timeZone: 'America/Chicago',

  venue: {
    name: 'Springfield Civic Center',
    streetAddress: '200 Capitol Ave',
    city: 'Springfield',
    region: 'IL',
    postalCode: '62701',
    country: 'US',
  },

  /**
   * Deadlines as ISO timestamps with the venue's UTC offset. The NEXT_PUBLIC_* env vars
   * override them (handy for testing), but they're baked in at build time, so redeploy
   * after changing one.
   */
  deadlines: {
    /** Registrations before this get the early-bird discount */
    earlyBird: process.env.NEXT_PUBLIC_EARLY_BIRD_CUTOFF_ISO || '2027-02-13T00:00:00-06:00',
    /** Online registration closes; walk-ups after this pay the late fee */
    onlineRegistration: process.env.NEXT_PUBLIC_ONLINE_REG_CUTOFF_ISO || '2027-03-11T23:59:59-06:00',
    /** Last moment to upload freestyle music */
    musicUpload: process.env.NEXT_PUBLIC_MUSIC_DEADLINE_ISO || '2027-03-11T23:59:59-06:00',
    /** Default expiry for comp codes made in the admin dashboard */
    compCodes: process.env.NEXT_PUBLIC_COMP_CODE_EXPIRY_ISO || '2027-03-11T23:59:59-06:00',
  },

  /** Who runs it */
  organizer: {
    name: 'Springfield Throwers',
    url: 'https://example.org',
  },

  /** Presenting sponsor ("Brought to you by ..."). Leave name "" for none. */
  presentedBy: {
    name: '',
    url: '',
    logoUrl: '',
  },

  /** Public contact address shown on every page and email footer */
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'contest@example.org',

  /**
   * Your contest's public website pages (e.g. a site built with yoyo-contest-template).
   * Leave a link "" to hide it from the nav and footer.
   */
  links: {
    home: 'https://example.org/',
    about: 'https://example.org/',
    schedule: 'https://example.org/schedule.html',
    rules: process.env.NEXT_PUBLIC_RULES_URL || 'https://example.org/rules.html',
    sponsors: 'https://example.org/sponsors.html',
    venue: 'https://example.org/venue.html',
    faq: 'https://example.org/faq.html',
    codeOfConduct: 'https://example.org/code-of-conduct.html',
    /** Where to find your other events (survey thank-you pages link here) */
    events: 'https://example.org/',
    results: 'https://example.org/results.html',
    /** Organizer's other links shown in the footer */
    resources: '',
    sourceCode: 'https://github.com/dmvthrowers/yoyo-registration-template',
  },

  /**
   * Video links shown on the results page after the contest. Leave "" to hide.
   * divisions: one playlist per division code, e.g. { '1A': 'https://youtube.com/playlist?list=...' }
   */
  videos: {
    winnersPlaylist: '',
    livestream: '',
    divisions: {} as Record<string, string>,
  },

  /** Logo images. Paths starting with "/" are served from public/. */
  logos: {
    small: '/logo-32.png',
    icon: '/logo-180.png',
    large: '/logo-512.png',
    alt: 'Contest logo',
  },
} as const;

// ---------------------------------------------------------------- divisions & scoring

/** A style inside a division, e.g. X Division's 2A–5A, or a kendama "ken / no ken" category. */
export interface StyleDef {
  code: string;
  label: string;
  description?: string;
  /** Freestyle only: raw clicks are multiplied by this before normalizing (1 = none). */
  multiplier?: number;
}

/**
 * "freestyle": NYYL-style sheet. A clicker tally (Technical Execution, normalized per judge to
 * techCap) + four evaluation categories (0–evalCap each) − deductions.
 */
export interface FreestyleScoring {
  format: 'freestyle';
  techCap: number;
  evalCap: number;
  /** Can a judge click below zero (misses)? */
  negativeClicks: boolean;
  /** Points per stop / discard / detach. null = no deductions. */
  deductions: { stop: number; discard: number; detach: number } | null;
}

/** "simple": each judge enters one score from 0 to max; judges are averaged. */
export interface SimpleScoring {
  format: 'simple';
  max: number;
}

export interface DivisionDef {
  /** Short, permanent ID stored in the database: letters, numbers, - or _. Never rename one in use. */
  code: string;
  name: string;
  description: string;
  /** Entry fee in cents */
  priceCents: number;
  /** Does this division perform to uploaded music? */
  music: boolean;
  /** Optional styles. Registrants pick between min and max of them. */
  styles?: { options: StyleDef[]; min: number; max: number };
  /** Division codes this one can't be entered together with */
  cannotCombineWith?: string[];
  scoring: FreestyleScoring | SimpleScoring;
}

/**
 * The toy, the divisions and how they're judged. Edit this block for a kendama, diabolo,
 * spintop or mixed contest. After changing divisions, run `npm run divisions` and apply
 * supabase/divisions.sql (see docs/SETUP.md) so the database matches.
 */
export const competition: {
  toy: { singular: string; plural: string };
  /** Labels for the three optional "setup" fields on profiles. "" hides a field. */
  gear: { yoyo: string; string: string; counterweight: string };
  divisions: DivisionDef[];
  /** Bundle prices: entering every listed division costs priceCents instead of the sum. */
  combos: { divisions: string[]; priceCents: number }[];
  pricing: {
    earlyBirdDiscountCents: number;
    walkUpSurchargeCents: number;
    /** true shows "TBD" instead of prices on public pages (checkout still charges the real amount). */
    pricesTbd: boolean;
  };
} = {
  toy: { singular: 'yo-yo', plural: 'yo-yos' },
  gear: { yoyo: 'Yo-yo', string: 'String', counterweight: 'Counterweight' },

  divisions: [
    {
      code: '1A',
      name: '1A — Single String',
      description: 'One yo-yo on one string. The classic string-trick style.',
      priceCents: 3000,
      music: true,
      scoring: { format: 'freestyle', techCap: 60, evalCap: 10, negativeClicks: true, deductions: { stop: 1, discard: 3, detach: 5 } },
    },
    {
      code: 'X',
      name: 'X Division',
      description: 'The other four styles compete together, with a per-style multiplier.',
      priceCents: 2500,
      music: true,
      styles: {
        min: 1,
        max: 2,
        options: [
          { code: '2A', label: '2A — Looping', description: 'Two looping yo-yos focused on rhythm and control.', multiplier: 1.4 },
          { code: '3A', label: '3A — Two-Handed String', description: 'Two string-trick yo-yos, one in each hand.', multiplier: 1.5 },
          { code: '4A', label: '4A — Offstring', description: 'The yo-yo is not attached to the string.', multiplier: 1.3 },
          { code: '5A', label: '5A — Freehand', description: 'Counterweight instead of a finger loop.', multiplier: 1.6 },
        ],
      },
      scoring: { format: 'freestyle', techCap: 60, evalCap: 10, negativeClicks: true, deductions: { stop: 1, discard: 3, detach: 5 } },
    },
    {
      code: 'SBJ',
      name: 'Sport / Beginner / Junior',
      description: 'For newer players. Shorter routines, no negative clicks or deductions.',
      priceCents: 2000,
      music: true,
      cannotCombineWith: ['1A', 'X'],
      scoring: { format: 'freestyle', techCap: 20, evalCap: 20, negativeClicks: false, deductions: null },
    },
  ],

  combos: [{ divisions: ['1A', 'X'], priceCents: 5000 }],

  pricing: { earlyBirdDiscountCents: 500, walkUpSurchargeCents: 1000, pricesTbd: false },
};

/** Look up a division by code */
export const divisionByCode = (code: string): DivisionDef | undefined =>
  competition.divisions.find((d) => d.code === code);

/** All division codes, in display order */
export const DIVISION_CODES: string[] = competition.divisions.map((d) => d.code);


// ---------------------------------------------------------------- derived helpers

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December'];

function parts(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m, d };
}

/** "March 13, 2027" for any YYYY-MM-DD (defaults to the contest date) */
export function longDate(iso: string = contest.date): string {
  const { y, m, d } = parts(iso);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

/** "March 13" (no year) */
export function monthDay(iso: string = contest.date): string {
  const { m, d } = parts(iso);
  return `${MONTHS[m - 1]} ${d}`;
}

/** "Mar 13" */
export function shortMonthDay(iso: string = contest.date): string {
  const { m, d } = parts(iso);
  return `${MONTHS[m - 1].slice(0, 3)} ${d}`;
}

/** Contest year as a number */
export const contestYear = parts(contest.date).y;

/** "Springfield, IL" */
export const venueCity = `${contest.venue.city}, ${contest.venue.region}`;

/** "Springfield Civic Center · Springfield, IL" */
export const venueLine = `${contest.venue.name} · ${venueCity}`;

/** "200 Capitol Ave, Springfield, IL 62701" */
export const venueAddress =
  `${contest.venue.streetAddress}, ${contest.venue.city}, ${contest.venue.region} ${contest.venue.postalCode}`.trim();

/** "March 13, 2027 · Springfield Civic Center · Springfield, IL" — the standard footer line */
export const whenWhere = `${longDate()} · ${venueLine}`;

/** "Springfield Yo-Yo Open 2027" */
export const fullTitle = `${contest.name} ${contestYear}`;

/** "Brought to you by X" or "" */
export const presentedLine = contest.presentedBy.name ? `Brought to you by ${contest.presentedBy.name}` : '';

/** "MARCH 13, 2027 · SPRINGFIELD CIVIC CENTER" for page banners */
export const bannerLine = `${longDate()} · ${contest.venue.name}`.toUpperCase();

/** A deadline as a Date */
export const deadlineDate = (key: keyof typeof contest.deadlines) => new Date(contest.deadlines[key]);

/** Format an ISO timestamp (or YYYY-MM-DD) from an env var as "March 11, 2027", or fall back */
export function deadlineLabel(iso: string | undefined, fallback = 'the deadline'): string {
  if (!iso) return fallback;
  const day = iso.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? longDate(day) : fallback;
}

/** UTC offset (ms) of `timeZone` at instant `utcMs`, via Intl (handles daylight saving). */
function zoneOffsetMs(utcMs: number, timeZone: string): number {
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const v: Record<string, number> = {};
  for (const part of f.formatToParts(new Date(utcMs))) {
    if (part.type !== 'literal') v[part.type] = Number(part.value);
  }
  return Date.UTC(v.year, v.month - 1, v.day, v.hour, v.minute, v.second) - utcMs;
}

/** "2027-03-13" + "10:00" in a time zone → the matching instant as a Date. */
export function zonedDate(dateIso: string, hhmm: string, timeZone: string): Date {
  const [y, m, d] = dateIso.split('-').map(Number);
  const [hh, mm, ss = 0] = hhmm.split(':').map(Number);
  const wall = Date.UTC(y, m - 1, d, hh, mm, ss);
  // Two passes settle the offset correctly on daylight-saving change days.
  let utc = wall - zoneOffsetMs(wall, timeZone);
  utc = wall - zoneOffsetMs(utc, timeZone);
  return new Date(utc);
}

/** "2027-03-13" + "10:00" in a time zone → iCalendar UTC stamp "20270313T160000Z". */
export function zonedStamp(dateIso: string, hhmm: string, timeZone: string): string {
  return zonedDate(dateIso, hhmm, timeZone).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}
