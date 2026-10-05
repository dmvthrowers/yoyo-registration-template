import { NextRequest, NextResponse } from 'next/server';

/**
 * Short public link for the spectator survey: <your registration site>/feedback
 * Easy to say out loud, post, or put on a QR code for walk-ups who never
 * RSVP'd. Tags responses as source=live unless the link already carries a
 * ?src= (e.g. /feedback?src=qr). /feedback?watch=stream opens the livestream
 * path — use it in the YouTube description (with src=social).
 */
export function GET(req: NextRequest) {
  const url = req.nextUrl.clone();
  const src = url.searchParams.get('src') ?? 'live';
  url.pathname = '/survey/spectator';
  const watch = url.searchParams.get('watch');
  url.search = `?src=${encodeURIComponent(src)}${watch === 'stream' ? '&watch=stream' : ''}`;
  return NextResponse.redirect(url, 307);
}
