import { contest, fullTitle, venueAddress, zonedStamp } from '@/contest.config';
/**
 * Minimal iCalendar (.ics) builder for the contest — no external dependency needed.
 * The event window comes from contest.config.ts (date, startTime, endTime, timeZone);
 * see the schedule page for the real agenda.
 */

function escapeICS(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
    .replace(/\n/g, '\\n');
}

function foldLine(line: string): string {
  // RFC 5545: content lines should be folded at 75 octets.
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  let rest = line;
  while (rest.length > 75) {
    chunks.push(rest.slice(0, 75));
    rest = ' ' + rest.slice(75);
  }
  chunks.push(rest);
  return chunks.join('\r\n');
}

export function buildContestIcs(opts: { uid: string; summary?: string; description?: string }): string {
  const dtstamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${contest.organizer.name}//${contest.shortName}//EN`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${opts.uid}@${new URL(contest.organizer.url).hostname}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${zonedStamp(contest.date, contest.startTime, contest.timeZone)}`,
    `DTEND:${zonedStamp(contest.date, contest.endTime, contest.timeZone)}`,
    `SUMMARY:${escapeICS(opts.summary ?? `${contest.shortName} — ${contest.name}`)}`,
    `DESCRIPTION:${escapeICS(
      opts.description ??
        `${fullTitle}, organized by ${contest.organizer.name}. Full day-of schedule: ${contest.links.schedule}`,
    )}`,
    `LOCATION:${escapeICS(`${contest.venue.name}, ${venueAddress}`)}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.map(foldLine).join('\r\n') + '\r\n';
}
