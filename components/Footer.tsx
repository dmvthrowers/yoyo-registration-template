'use client';

/** Site footer. Names, links, and the sponsor come from contest.config.ts. */

import Image from 'next/image';
import { competition, contest, contestYear, fullTitle, whenWhere } from '@/contest.config';

const SITE_HOME = contest.links.home || '/';

// Mirrors the marketing site's footer set (About/Register/Sponsors/Venue/Contact/
// Terms-equivalent/GitHub) plus app-only utility links (Leaderboard, Staff).
// "Results" (marketing-site podium recap) and "Leaderboard" (this app's full standings)
// link to each other so visitors can move between the two.
const FOOTER_LINKS = [
  { label: 'About',       href: contest.links.about },
  { label: 'Results',     href: contest.links.results },
  { label: 'Leaderboard', href: '/results' },
  { label: 'Schedule',    href: contest.links.schedule },
  { label: 'Register',    href: '/' },
  { label: 'Sponsors',    href: contest.links.sponsors },
  { label: 'Venue',       href: contest.links.venue },
  { label: 'FAQ',         href: contest.links.faq },
  { label: 'Policies',    href: '/policies' },
  ...(competition.divisions.some((d) => d.scoring.format === 'ladder') ? [{ label: 'Tricks', href: '/tricks' }] : []),
  { label: 'Staff',       href: '/staff' },
  { label: 'Resources',   href: contest.links.resources },
  { label: 'GitHub',      href: contest.links.sourceCode },
].filter((l) => !!l.href);

export default function Footer() {
  return (
    <footer style={{
      background: '#080d1a',
      padding: '40px 24px 24px',
      borderTop: '1px solid var(--navy-border)',
      marginTop: '4rem',
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* Top row */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap' as const,
          gap: 20,
          marginBottom: 24,
        }}>
          {/* Brand */}
          <a href={SITE_HOME} style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
            <Image
              src={contest.logos.small}
              alt={contest.shortName}
              width={34}
              height={34}
              style={{ objectFit: 'contain' }}
            />
            <div>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 900,
                fontSize: '0.95rem',
                color: '#fff',
              }}>
                {fullTitle}
              </div>
              <div style={{
                fontFamily: 'var(--font-condensed)',
                fontSize: '0.58rem',
                letterSpacing: '0.18em',
                color: 'var(--gold)',
                fontWeight: 700,
                textTransform: 'uppercase' as const,
              }}>
                Organized by {contest.organizer.name} · {contest.shortName}
              </div>
            </div>
          </a>

          {/* Presenting sponsor (hidden when contest.presentedBy has no logo) */}
          {contest.presentedBy.logoUrl && (
          <a
            href={contest.presentedBy.url || undefined}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}
          >
            <span style={{
              fontFamily: 'var(--font-condensed)',
              fontSize: '0.6rem',
              letterSpacing: '0.15em',
              color: '#8a9ab5',
              fontWeight: 700,
              textTransform: 'uppercase' as const,
            }}>
              Brought to<br/>you by
            </span>
            <Image
              src={contest.presentedBy.logoUrl}
              alt={contest.presentedBy.name}
              width={90}
              height={31}
              style={{ objectFit: 'contain' }}
            />
          </a>
          )}

          {/* Links */}
          <nav aria-label="Footer navigation" style={{ display: 'flex', flexWrap: 'wrap', rowGap: 8, maxWidth: '100%' }}>
            {FOOTER_LINKS.map(link => (
              <a
                key={link.label}
                href={link.href}
                {...(link.label === 'GitHub' ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                style={{
                  color: '#fff',
                  fontSize: '0.75rem',
                  textDecoration: 'none',
                  margin: '0 10px',
                  fontFamily: 'var(--font-body)',
                  transition: 'color 0.2s',
                }}
                onMouseOver={e => (e.currentTarget.style.color = 'var(--gold)')}
                onMouseOut={e => (e.currentTarget.style.color = '#fff')}
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>

        {/* Bottom row */}
        <div style={{
          borderTop: '1px solid var(--navy-border)',
          paddingTop: 20,
          display: 'flex',
          justifyContent: 'space-between',
          flexWrap: 'wrap' as const,
          gap: 6,
        }}>
          <span style={{ fontSize: '0.68rem', color: '#3a4a6a', fontFamily: 'var(--font-body)' }}>
            © {contestYear} {contest.name} · Organized by{' '}
            <a href={contest.organizer.url} style={{ color: '#3a4a6a', textDecoration: 'none' }}>
              {contest.organizer.name}
            </a>{' '}
            · <a href={`mailto:${contest.contactEmail}`} style={{ color: '#3a4a6a', textDecoration: 'none' }}>
              {contest.contactEmail}
            </a>
          </span>
          <span style={{ fontSize: '0.68rem', color: '#3a4a6a', fontFamily: 'var(--font-body)' }}>
            {whenWhere}
          </span>
          <span style={{ fontSize: '0.68rem', color: '#3a4a6a', fontFamily: 'var(--font-body)', flexBasis: '100%' }}>
            Registration app template by{' '}
            <a href="https://dmvthrowers.club/" target="_blank" rel="noopener noreferrer" style={{ color: '#3a4a6a' }}>
              DMV Throwers
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
