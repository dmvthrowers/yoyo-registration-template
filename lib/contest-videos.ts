import type { Division } from '@/lib/standings';
import { contest } from '@/contest.config';

/** Contest videos (set in contest.config.ts → videos). Empty strings hide the links. */
export const WINNERS_PLAYLIST_URL: string = contest.videos.winnersPlaylist;

export const DIVISION_PLAYLIST_URLS: Partial<Record<Division, string>> = Object.fromEntries(
  Object.entries(contest.videos.divisions).filter(([, url]) => !!url),
) as Partial<Record<Division, string>>;

export const LIVESTREAM_URL: string = contest.videos.livestream;
