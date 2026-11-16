#!/usr/bin/env bash
# Sync workflow memories between a Claude Code session's memory dir (Linux host) and the backup repo (Mac).
# Runs on the Linux host. The repo on the Mac is the master for memory/workflow/.
#
# usage: memory-sync.sh <ssh-config> <memory-dir> diff|check|pull|push [project]
#   diff   list content/index differences; exit 0 if equal, 3 if different
#   check  same as diff, followed by advice (never copies files)
#   pull   copy repo → session; skips files that differ locally unless FORCE=1; adds missing index lines
#   push   copy session → repo for files the repo already has (plus nothing else), then commit on the Mac
# project defaults to mobicodex (memory/projects/<project>/).
set -euo pipefail
[ $# -ge 3 ] || { sed -n 2,11p "$0"; exit 2; }
conf=$1; mem=${2%/}; mode=$3; project=${4:-mobicodex}
remote=workspace/claude-codex-workflow/memory
[ -d "$mem" ] || { echo "no memory dir: $mem" >&2; exit 2; }
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT

# Test fixtures contain the same layout as memory/. Never use them for writes.
fetch_repo() {
  if [ -n "${MEMORY_SYNC_LOCAL_REPO:-}" ]; then
    case "$mode" in
      diff|check) ;;
      *) echo "MEMORY_SYNC_LOCAL_REPO is only for diff/check tests" >&2; return 2 ;;
    esac
    cp -R "$MEMORY_SYNC_LOCAL_REPO/workflow" "$MEMORY_SYNC_LOCAL_REPO/projects/$project" "$MEMORY_SYNC_LOCAL_REPO/MEMORY.md" "$tmp/"
  else
    scp -q -F "$conf" -r "device:$remote/workflow" "device:$remote/projects/$project" "device:$remote/MEMORY.md" "$tmp/"
  fi
}
fetch_repo
shopt -s nullglob

# Compare Markdown link targets, not labels, paths or surrounding descriptions.
index_names() {
  [ -f "$1" ] || return 0
  awk '
    {
      text = $0
      while (match(text, /\[[^]]*\]\([^)]*\)/)) {
        target = substr(text, RSTART, RLENGTH)
        text = substr(text, RSTART + RLENGTH)
        sub(/^\[[^]]*\]\(/, "", target)
        sub(/\)$/, "", target)
        if (target ~ /^</) {
          sub(/^</, "", target)
          sub(/>.*/, "", target)
        } else {
          sub(/[[:space:]].*/, "", target)
        }
        if (target ~ /^[[:alpha:]][[:alnum:]+.-]*:/ || target ~ /^\/\//) continue
        sub(/[?#].*/, "", target)
        sub(/^.*\//, "", target)
        if (target ~ /\.md$/) print target
      }
    }
  ' "$1" | LC_ALL=C sort -u
}

case "$mode" in
  diff|check)
    changed=0; count=0
    for f in "$tmp/workflow"/*.md "$tmp/$project"/*.md; do
      count=$((count + 1))
      n=$(basename "$f")
      if [ ! -f "$mem/$n" ]; then
        echo "only in repo:    $n"; changed=1
      elif diff "$f" "$mem/$n" > "$tmp/content.diff"; then
        :
      else
        status=$?
        [ "$status" -eq 1 ] || exit "$status"
        lines=$(awk '/^[<>]/ { n++ } END { print n+0 }' "$tmp/content.diff")
        echo "differs:         $n ($lines lines)"; changed=1
      fi
    done
    index_names "$tmp/MEMORY.md" > "$tmp/repo.index"
    index_names "$mem/MEMORY.md" > "$tmp/session.index"
    while IFS= read -r n; do
      if ! grep -Fxq -- "$n" "$tmp/session.index"; then
        echo "index missing in session: $n"; changed=1
      fi
    done < "$tmp/repo.index"
    while IFS= read -r n; do
      if { [ -f "$tmp/workflow/$n" ] || [ -f "$tmp/$project/$n" ]; } &&
        ! grep -Fxq -- "$n" "$tmp/repo.index"; then
        echo "index missing in repo: $n"; changed=1
      fi
    done < "$tmp/session.index"
    if [ "$changed" -eq 0 ]; then echo "记忆一致：$count 个文件"; fi
    if [ "$mode" = check ]; then
      echo "处理建议：库里新的就 pull，会话里新的就 push，两边都改过就先看 diff 再合并。"
    fi
    if [ "$changed" -ne 0 ]; then exit 3; fi ;;
  pull)
    [ -f "$mem/MEMORY.md" ] || : > "$mem/MEMORY.md"
    for f in "$tmp/workflow"/*.md "$tmp/$project"/*.md; do
      n=$(basename "$f")
      if [ -f "$mem/$n" ] && ! cmp -s "$f" "$mem/$n" && [ "${FORCE:-0}" != 1 ]; then
        echo "kept local (differs, FORCE=1 to overwrite): $n"; continue
      fi
      cp "$f" "$mem/$n"; echo "pulled: $n"
      grep -q "($n)" "$mem/MEMORY.md" || { grep "($n)" "$tmp/MEMORY.md" >> "$mem/MEMORY.md" && echo "  + index line"; } || true
    done ;;
  push)
    for f in "$tmp/workflow"/*.md "$tmp/$project"/*.md; do
      n=$(basename "$f"); dir=$(basename "$(dirname "$f")")
      [ "$dir" = workflow ] && dest="$remote/workflow" || dest="$remote/projects/$project"
      if [ -f "$mem/$n" ] && ! cmp -s "$f" "$mem/$n"; then
        scp -q -F "$conf" "$mem/$n" "device:$dest/$n"; echo "pushed: $n"
      fi
    done
    echo "now commit and push on the Mac: cd ~/workspace/claude-codex-workflow && git add -A && git commit && git push" ;;
  *) echo "mode must be diff, check, pull or push" >&2; exit 2 ;;
esac
