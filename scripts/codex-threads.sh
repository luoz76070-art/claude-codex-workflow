#!/bin/sh
# Read-only: list recent Codex threads (id, title, model, effort, originator, updated) from a fresh copy of the state DB.
# usage: codex-threads.sh [limit] [title-filter]
# Copies the DB with its -wal/-shm first: -readonly cannot open it, and immutable=1 ignores the WAL (stale rows).
n=${1:-10}; f=${2:-}
T=$(mktemp -d /tmp/codex-state.XXXXXX); trap 'rm -rf "$T"' EXIT
cp "${CODEX_HOME:-$HOME/.codex}"/state_5.sqlite "$T/" && cp "${CODEX_HOME:-$HOME/.codex}"/state_5.sqlite-wal "${CODEX_HOME:-$HOME/.codex}"/state_5.sqlite-shm "$T/" 2>/dev/null || true
sqlite3 -header -column "$T/state_5.sqlite" "select id, substr(replace(title,char(10),' '),1,24) title, model, reasoning_effort effort, originator, replace(cwd, '$HOME', '~') cwd, datetime(updated_at,'unixepoch','localtime') updated from threads where title like '%' || '$f' || '%' order by updated_at desc limit $n;"
