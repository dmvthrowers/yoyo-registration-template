#!/usr/bin/env bash
# Replay every migration, the generated divisions, then the demo seed, on an empty plain-Postgres database.
# Catches migrations that only work on a database that already has history.
#
#   DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres scripts/check-migrations.sh
set -euo pipefail
cd "$(dirname "$0")/.."
: "${DATABASE_URL:?set DATABASE_URL to an empty Postgres 15+ database}"
psql_() { psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q "$@"; }

psql_ -f supabase/ci/supabase-stubs.sql
for f in $(ls supabase/migrations/*.sql | sort); do
  echo "apply ${f##*/}"
  psql_ -f "$f" > /dev/null
done
psql_ -f supabase/divisions.sql   # generated from contest.config.ts
psql_ -f supabase/divisions.sql   # and safe to re-apply
psql_ -f supabase/seed-demo.sql
psql_ -f supabase/seed-demo.sql   # the seed must be safe to re-run

# Every public table must have row level security on.
missing=$(psql_ -At -c "select relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity")
if [ -n "$missing" ]; then
  echo "RLS is off on: $missing" >&2
  exit 1
fi
echo "migrations OK: $(ls supabase/migrations/*.sql | wc -l) files, demo seed loaded, RLS on every table"
