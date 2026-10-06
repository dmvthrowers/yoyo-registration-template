import type { Metadata } from 'next';
import { contest } from '@/contest.config';

// Per-page title (the bracket itself is a client component).
export const metadata: Metadata = {
  title: 'Battle Bracket',
  description: `The battle bracket from ${contest.shortName}, round by round.`,
  alternates: { canonical: '/results/bracket' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
