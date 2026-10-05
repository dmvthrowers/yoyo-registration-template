import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL || `http://localhost:3000`;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const routes = [
    '/',
    '/spectate',
    '/policies',
    '/fee-calculator',
    '/competitors',
    '/results',
    '/spectators',
  ];

  return routes.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: now,
    changeFrequency: route === '/' ? 'daily' : 'weekly',
    priority: route === '/' ? 1 : 0.7,
  }));
}
