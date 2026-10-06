import type { Metadata } from 'next';
import AnalyticsScrubbed from '@/components/AnalyticsScrubbed';
import './globals.css';
import { contest, presentedLine, whenWhere } from '@/contest.config';

const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

const presented = presentedLine ? ` · ${presentedLine}` : '';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  // Each route sets its own title (see the per-route layout.tsx files); the
  // template keeps the contest name on every tab.
  title: {
    default: `${contest.shortName} · ${contest.name}${presented}`,
    template: `%s · ${contest.shortName}`,
  },
  description: `Registration, results and run order for ${contest.shortName}, ${contest.name}${presentedLine ? ` — ${presentedLine.toLowerCase()}` : ''}. ${whenWhere}.`,
  openGraph: {
    title: `${contest.shortName} · ${contest.name}`,
    description: `Registration, results and run order — ${whenWhere}`,
    url: SITE_URL,
    siteName: contest.organizer.name,
    images: [{ url: contest.logos.large, alt: contest.logos.alt }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${contest.shortName} · ${contest.name}`,
    description: `Registration, results and run order — ${whenWhere}`,
    images: [contest.logos.large],
  },
  alternates: { canonical: '/' },
  robots: { index: true, follow: true },
};

const eventJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SportsEvent',
  name: `${contest.shortName} — ${contest.name}`,
  startDate: `${contest.date}T${contest.startTime}`,
  endDate: `${contest.date}T${contest.endTime}`,
  eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
  eventStatus: 'https://schema.org/EventScheduled',
  location: {
    '@type': 'Place',
    name: contest.venue.name,
    address: {
      '@type': 'PostalAddress',
      streetAddress: contest.venue.streetAddress,
      addressLocality: contest.venue.city,
      addressRegion: contest.venue.region,
      postalCode: contest.venue.postalCode,
      addressCountry: contest.venue.country,
    },
  },
  organizer: {
    '@type': 'Organization',
    name: contest.organizer.name,
    url: contest.organizer.url,
  },
  ...(contest.presentedBy.name
    ? { sponsor: { '@type': 'Organization', name: contest.presentedBy.name, ...(contest.presentedBy.url ? { url: contest.presentedBy.url } : {}) } }
    : {}),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="icon" type="image/png" sizes="32x32" href={contest.logos.small} />
        <link rel="apple-touch-icon" href={contest.logos.icon} />
        <meta name="theme-color" content="#0d1428" />
        <script type="application/ld+json">{JSON.stringify(eventJsonLd)}</script>
      </head>
      <body>
        <a href="#main-content" className="skip-link">Skip to main content</a>
        {children}
        <AnalyticsScrubbed />
      </body>
    </html>
  );
}
