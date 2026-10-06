import type { Metadata } from 'next';
import { contest } from '@/contest.config';

// Per-page title (the page is a client component, so metadata lives here).
export const metadata: Metadata = {
  title: 'Fee Calculator',
  description: `Work out your ${contest.shortName} entry fees by division and see how team entries are priced.`,
  alternates: { canonical: '/fee-calculator' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
