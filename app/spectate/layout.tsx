import type { Metadata } from 'next';
import { contest } from '@/contest.config';

// Per-page title (the page is a client component, so metadata lives here).
export const metadata: Metadata = {
  title: 'RSVP to Spectate',
  description: `Free to watch. RSVP to spectate ${contest.shortName}.`,
  alternates: { canonical: '/spectate' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
