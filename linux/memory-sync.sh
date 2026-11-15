#!/usr/bin/env bash
# Sync workflow memories between a Claude Code session's memory dir (Linux host) and the backup repo (Mac).
# Runs on the Linux host. The repo on the Mac is the master for memory/workflow/.
#
# usage: memory-sync.sh <ssh-config> <memory-dir> diff|pull|push [project]
#   diff   list files that differ or exist on one side only
#   pull   copy repo → session; skips files that differ locally unless FORCE=1; adds missing index lines
#   push   copy session → repo for files the repo already has (plus nothing else), then commit on the Mac
# project defaults to mobicodex (memory/projects/<project>/).
set -euo pipefail
[ $# -ge 3 ] || { sed -n 2,10p "$0"; exit 2; }
conf=$1; mem=${2%/}; mode=$3; project=${4:-mobicodex}
remote=workspace/claude-codex-workflow/memory
[ -d "$mem" ] || { echo "no memory dir: $mem" >&2; exit 2; }
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT

scp -q -F "$conf" -r "device:$remote/workflow" "device:$remote/projects/$project" "device:$remote/MEMORY.md" "$tmp/"
files() { ls "$tmp/workflow"/*.md "$tmp/$project"/*.md 2>/dev/null; }

case "$mode" in
  diff)
    for f in $(files); do
      n=$(basename "$f")
      if [ ! -f "$mem/$n" ]; then echo "only in repo:    $n"
      elif ! cmp -s "$f" "$mem/$n"; then echo "differs:         $n ($(diff "$f" "$mem/$n" | grep -c '^[<>]') lines)"
      else echo "same:            $n"; fi
    done ;;
  pull)
    [ -f "$mem/MEMORY.md" ] || : > "$mem/MEMORY.md"
    for f in $(files); do
      n=$(basename "$f")
      if [ -f "$mem/$n" ] && ! cmp -s "$f" "$mem/$n" && [ "${FORCE:-0}" != 1 ]; then
        echo "kept local (differs, FORCE=1 to overwrite): $n"; continue
      fi
      cp "$f" "$mem/$n"; echo "pulled: $n"
      grep -q "($n)" "$mem/MEMORY.md" || { grep "($n)" "$tmp/MEMORY.md" >> "$mem/MEMORY.md" && echo "  + index line"; } || true
    done ;;
  push)
    for f in $(files); do
      n=$(basename "$f"); dir=$(basename "$(dirname "$f")")
      [ "$dir" = workflow ] && dest="$remote/workflow" || dest="$remote/projects/$project"
      if [ -f "$mem/$n" ] && ! cmp -s "$f" "$mem/$n"; then
        scp -q -F "$conf" "$mem/$n" "device:$dest/$n"; echo "pushed: $n"
      fi
    done
    echo "now commit and push on the Mac: cd ~/workspace/claude-codex-workflow && git add -A && git commit && git push" ;;
  *) echo "mode must be diff, pull or push" >&2; exit 2 ;;
esac
