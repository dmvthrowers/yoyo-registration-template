import type { Metadata } from 'next';
import { contest } from '@/contest.config';

// Per-page title (the page is a client component, so metadata lives here).
export const metadata: Metadata = {
  title: 'Player Directory',
  description: `Browse the players who competed at ${contest.shortName} and chose to be listed, with their divisions.`,
  alternates: { canonical: '/directory' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
