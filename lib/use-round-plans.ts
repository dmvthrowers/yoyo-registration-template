'use client';

import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import type { RoundPlan } from '@/lib/round-plan';

type Plans = Record<string, RoundPlan>;

/**
 * The confirmed round plans (which rounds each division runs), fetched once. Until it loads, or
 * when a division has no plan, every configured round shows, which is the old behavior.
 */
export function useRoundPlans(): Plans {
  const [plans, setPlans] = useState<Plans>({});
  useEffect(() => {
    let live = true;
    const load = () => {
      fetch('/api/rounds/plan', { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => { if (live && j?.plans) setPlans(j.plans); })
        .catch(() => {});
    };
    load();
    window.addEventListener(CHANGED, load);
    return () => { live = false; window.removeEventListener(CHANGED, load); };
  }, []);
  return plans;
}

const CHANGED = 'round-plans-changed';

/** Tell every page component using useRoundPlans to reload (after an organizer confirms a plan). */
export const notifyRoundPlansChanged = () => window.dispatchEvent(new Event(CHANGED));

/**
 * Keeps a round picker on a round that runs: when the plan skips the selected round (a Final-only
 * division is still round 3), move to the first round that does. `rounds` are the tabs from roundTabs().
 * The change is set after the render, not inside the effect body, so React doesn't cascade renders.
 */
export function useFollowRunningRound(rounds: { round: number }[], round: number, setRound: Dispatch<SetStateAction<number>>) {
  const firstRound = rounds[0]?.round;
  const onRunningRound = rounds.some((r) => r.round === round);
  useEffect(() => {
    if (firstRound === undefined || onRunningRound) return;
    let live = true;
    Promise.resolve().then(() => { if (live) setRound(firstRound); });
    return () => { live = false; };
  }, [firstRound, onRunningRound, setRound]);
}
