import type { MetadataRoute } from 'next';
import { competition, contest } from '@/contest.config';

const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL || `http://localhost:3000`;

export default function sitemap(): MetadataRoute.Sitemap {
  // Fixed to the contest date: a build-time `new Date()` made every page look changed on every deploy.
  const lastModified = new Date(contest.date);

  const routes = [
    '/',
    ...(contest.sponsors.enabled ? ['/sponsor'] : []),
    '/spectate',
    '/policies',
    ...(competition.divisions.some((d) => d.scoring.format === 'ladder') ? ['/tricks'] : []),
    '/fee-calculator',
    '/directory',
    '/results',
    '/schedule',
    '/side-events',
    '/results/bracket',
  ];

  return routes.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified,
    changeFrequency: route === '/' ? 'daily' : 'weekly',
    priority: route === '/' ? 1 : 0.7,
  }));
}
