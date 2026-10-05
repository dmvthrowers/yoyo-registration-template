/**
 * Ready-made `competition` blocks for other toys. Copy one over the `competition` value in
 * contest.config.ts, adjust names and prices, then run `npm run divisions`.
 *
 * The formats here are typical starting points, not any organization's official rules.
 * Check your sanctioning body's current rulebook before you publish.
 */
import type { competition as Competition } from '../contest.config';

type CompetitionConfig = typeof Competition;

const pricing = { earlyBirdDiscountCents: 500, walkUpSurchargeCents: 1000, pricesTbd: false };

/** Freestyle sheet without the yo-yo-specific stop/discard/detach deductions. */
const freestyle = (techCap: number, evalCap: number) =>
  ({ format: 'freestyle', techCap, evalCap, negativeClicks: true, deductions: null }) as const;

export const kendama: CompetitionConfig = {
  toy: { singular: 'kendama', plural: 'kendamas' },
  gear: { yoyo: 'Kendama', string: 'String', counterweight: '' },
  divisions: [
    { code: 'KFREE', name: 'Kendama Freestyle', description: 'A timed freestyle to music, judged as a whole routine.', priceCents: 2500, music: true, scoring: { format: 'simple', max: 100 } },
    {
      code: 'KOPEN', name: 'Open Trick Challenge', description: 'Land as many listed tricks as you can in the time.', priceCents: 2000, music: false,
      styles: { min: 1, max: 1, options: [{ code: 'AM', label: 'Amateur' }, { code: 'PRO', label: 'Pro' }] },
      scoring: { format: 'simple', max: 100 },
    },
    { code: 'KJR', name: 'Junior (under 13)', description: 'Trick challenge for younger players.', priceCents: 1000, music: false, cannotCombineWith: ['KOPEN'], scoring: { format: 'simple', max: 100 } },
  ],
  combos: [{ divisions: ['KFREE', 'KOPEN'], priceCents: 4000 }],
  pricing,
};

export const diabolo: CompetitionConfig = {
  toy: { singular: 'diabolo', plural: 'diabolos' },
  gear: { yoyo: 'Diabolo', string: 'Sticks & string', counterweight: '' },
  divisions: [
    {
      code: 'DFREE', name: 'Diabolo Freestyle', description: 'Freestyle to music: one or more diabolos.', priceCents: 2500, music: true,
      styles: { min: 1, max: 1, options: [{ code: '1D', label: 'Single diabolo' }, { code: 'MD', label: 'Multi-diabolo', multiplier: 1.2 }, { code: 'VT', label: 'Vertax / vertical axis', multiplier: 1.2 }] },
      scoring: freestyle(60, 10),
    },
    { code: 'DBEG', name: 'Beginner', description: 'Shorter freestyle for newer players.', priceCents: 1500, music: true, cannotCombineWith: ['DFREE'], scoring: { format: 'simple', max: 100 } },
  ],
  combos: [],
  pricing,
};

export const spintop: CompetitionConfig = {
  toy: { singular: 'top', plural: 'spinning tops' },
  gear: { yoyo: 'Top', string: 'String', counterweight: '' },
  divisions: [
    { code: 'TFREE', name: 'Top Freestyle', description: 'Freestyle to music on a hard floor or tray.', priceCents: 2500, music: true, scoring: freestyle(60, 10) },
    { code: 'TLONG', name: 'Longest Spin', description: 'One throw, longest spin wins. Score = seconds.', priceCents: 1000, music: false, scoring: { format: 'simple', max: 9999 } },
    { code: 'TJR', name: 'Junior Freestyle', description: 'Freestyle for younger players.', priceCents: 1000, music: true, cannotCombineWith: ['TFREE'], scoring: { format: 'simple', max: 100 } },
  ],
  combos: [{ divisions: ['TFREE', 'TLONG'], priceCents: 3000 }],
  pricing,
};

/** Mixed skill toy contest: one freestyle division per toy, judged on a 100-point sheet. */
export const mixed: CompetitionConfig = {
  toy: { singular: 'skill toy', plural: 'skill toys' },
  gear: { yoyo: 'Main toy', string: 'Second toy', counterweight: '' },
  divisions: [
    { code: 'YOYO', name: 'Yo-Yo Freestyle', description: 'Any yo-yo style.', priceCents: 2000, music: true, scoring: { format: 'simple', max: 100 } },
    { code: 'KEN', name: 'Kendama Freestyle', description: 'Kendama freestyle to music.', priceCents: 2000, music: true, scoring: { format: 'simple', max: 100 } },
    { code: 'DIAB', name: 'Diabolo Freestyle', description: 'Diabolo freestyle to music.', priceCents: 2000, music: true, scoring: { format: 'simple', max: 100 } },
    { code: 'OPEN', name: 'Open Skill Toy', description: 'Tops, juggling, flow toys, anything else.', priceCents: 2000, music: true, scoring: { format: 'simple', max: 100 } },
  ],
  combos: [],
  pricing,
};

export const PRESETS = { kendama, diabolo, spintop, mixed };
