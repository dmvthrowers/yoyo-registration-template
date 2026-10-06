import type { Metadata } from 'next';
import { contest } from '@/contest.config';

// Per-page title (the page is a client component, so metadata lives here).
export const metadata: Metadata = {
  title: 'Policies & Event Terms',
  description: `Refund policy, liability waiver, photo release, code of conduct and minor participant rules for ${contest.shortName}.`,
  alternates: { canonical: '/policies' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
