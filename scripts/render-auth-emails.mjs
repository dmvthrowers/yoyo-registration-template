/**
 * Fill the Supabase Auth email templates with your contest details.
 *
 *   npm run auth-emails
 *
 * Reads contest.config.ts, replaces the [[PLACEHOLDERS]] in supabase/email-templates/*.html,
 * and writes ready-to-paste copies to supabase/email-templates/dist/ (gitignored).
 * Supabase's own {{ .Token }}-style tags are left alone.
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { contest, fullTitle, whenWhere } from '../contest.config.ts';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'supabase', 'email-templates');
const out = join(dir, 'dist');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const values = {
  SHORT_NAME: contest.shortName,
  SHORT_NAME_UPPER: contest.shortName.toUpperCase(),
  FULL_TITLE_UPPER: fullTitle.toUpperCase(),
  CONTACT_EMAIL: contest.contactEmail,
  WHEN_WHERE: whenWhere,
};

mkdirSync(out, { recursive: true });
for (const file of readdirSync(dir).filter((f) => f.endsWith('.html'))) {
  const html = readFileSync(join(dir, file), 'utf8').replace(/\[\[([A-Z_]+)\]\]/g, (m, key) => {
    if (!(key in values)) throw new Error(`${file}: unknown placeholder ${m}`);
    return esc(values[key]);
  });
  writeFileSync(join(out, file), html);
  console.log(`wrote supabase/email-templates/dist/${file}`);
}
