import type { Metadata } from 'next';
import { contest } from '@/contest.config';

// Per-page title (the page is a client component, so metadata lives here).
export const metadata: Metadata = {
  title: 'Results',
  description: `Results, podiums and champions from ${contest.shortName}, the ${contest.name}.`,
  alternates: { canonical: '/results' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
