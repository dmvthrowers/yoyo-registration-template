import { createAdminClient } from '@/lib/supabase/admin';
import { contest } from '@/contest.config';
import { tierAvailability, type TierAvailability } from '@/lib/sponsor-inquiry';

/**
 * Tiers with how many slots are left, for the public form. Only counts leave the server: no sponsor
 * names, amounts or contact details. If the database can't be read the tiers still show, with slots unknown
 * (treated as open), so a hiccup never blocks someone from asking.
 */
export async function loadTierAvailability(): Promise<TierAvailability[]> {
  const capped = contest.sponsors.tiers.some((t) => t.slots !== undefined);
  if (!capped) return tierAvailability(contest.sponsors.tiers, []);
  const { data, error } = await createAdminClient().from('contest_sponsors').select('tier, status');
  if (error) {
    console.error('[sponsor-availability] read error:', error);
    return contest.sponsors.tiers.map((t) => ({ id: t.id, label: t.label, amount: t.amount, full: false }));
  }
  return tierAvailability(contest.sponsors.tiers, data ?? []);
}
