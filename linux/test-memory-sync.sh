#!/usr/bin/env bash
# Local fixtures only: no SSH, real session memories or remote writes.
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd)
tmp=$(mktemp -d "$here/.memory-sync-test.XXXXXX")
trap 'rm -rf "$tmp"' EXIT
case_number=0

fixture() {
  case_number=$((case_number + 1))
  repo="$tmp/$case_number/repo memory"
  session="$tmp/$case_number/session memory"
  mkdir -p "$repo/workflow" "$repo/projects/demo" "$session"
  printf 'workflow rule\n' > "$repo/workflow/rule.md"
  printf 'project note\n' > "$repo/projects/demo/project.md"
  cp "$repo/workflow/rule.md" "$repo/projects/demo/project.md" "$session/"
  printf '%s\n' '- [Rule](workflow/rule.md)' '- [Project](projects/demo/project.md)' > "$repo/MEMORY.md"
  printf '%s\n' '- [Different label](rule.md)' '- [Project](project.md)' '- [Private](private.md)' > "$session/MEMORY.md"
}

run_sync() {
  expected=$1; mode=$2
  status=0
  output=$(MEMORY_SYNC_LOCAL_REPO="$repo" bash "$here/memory-sync.sh" unused "$session" "$mode" demo 2>&1) || status=$?
  if [ "$status" -ne "$expected" ]; then
    printf 'FAIL: expected exit %s, got %s\n%s\n' "$expected" "$status" "$output" >&2
    exit 1
  fi
}

contains() {
  if ! printf '%s\n' "$output" | grep -Fq -- "$1"; then
    printf 'FAIL: missing %s\n%s\n' "$1" "$output" >&2; exit 1
  fi
}

fixture
run_sync 0 diff
[ "$output" = '记忆一致：2 个文件' ]
echo 'PASS: equal content and basename indexes; private session index ignored'

fixture
printf 'changed locally\n' > "$session/rule.md"
run_sync 3 diff
[ "$output" = 'differs:         rule.md (2 lines)' ]
echo 'PASS: differing file exits 3 without pipefail interruption or same lines'

fixture
rm "$session/rule.md"
run_sync 3 diff
[ "$output" = 'only in repo:    rule.md' ]
echo 'PASS: repo-only file'

fixture
printf '%s\n' '- [Rule](workflow/rule.md)' > "$repo/MEMORY.md"
printf '%s\n' '- [Project](project.md)' '- [Private](private.md)' > "$session/MEMORY.md"
run_sync 3 diff
[ "$output" = $'index missing in session: rule.md\nindex missing in repo: project.md' ]
echo 'PASS: both missing-index directions; workflow and project prefixes ignored'

fixture
rm "$session/MEMORY.md"
run_sync 3 diff
contains 'index missing in session: rule.md'
contains 'index missing in session: project.md'
echo 'PASS: missing session index treated as empty'

fixture
printf '%s\n' '[Rule](workflow/rule.md) [Rule again](workflow/rule.md#details) [Project](projects/demo/project.md "title")' > "$repo/MEMORY.md"
run_sync 0 diff
[ "$output" = '记忆一致：2 个文件' ]
echo 'PASS: repeated links, anchors, titles and multiple links on a line'

fixture
printf 'space rule\n' > "$repo/workflow/space rule.md"
cp "$repo/workflow/space rule.md" "$session/"
printf '%s\n' '- [Space](<workflow/space rule.md>)' >> "$repo/MEMORY.md"
printf '%s\n' '- [Space](<space rule.md>)' >> "$session/MEMORY.md"
run_sync 0 diff
[ "$output" = '记忆一致：3 个文件' ]
echo 'PASS: spaces in paths and file names'

fixture
run_sync 0 check
[ "$output" = $'记忆一致：2 个文件\n处理建议：库里新的就 pull，会话里新的就 push，两边都改过就先看 diff 再合并。' ]
printf 'changed\n' > "$session/project.md"
run_sync 3 check
contains 'differs:         project.md'
contains '处理建议：库里新的就 pull，会话里新的就 push，两边都改过就先看 diff 再合并。'
echo 'PASS: check advice and exit status for equal/different files'

fixture
rm "$repo/workflow/rule.md" "$repo/projects/demo/project.md"
: > "$repo/MEMORY.md"
: > "$session/MEMORY.md"
run_sync 0 diff
[ "$output" = '记忆一致：0 个文件' ]
echo 'PASS: empty directories'

fixture
run_sync 2 push
contains 'MEMORY_SYNC_LOCAL_REPO is only for diff/check tests'
echo 'PASS: fixture mode refuses writes'

mkdir "$tmp/bin"
printf '#!/usr/bin/env bash\nexit 7\n' > "$tmp/bin/scp"
chmod +x "$tmp/bin/scp"
status=0
output=$(env -u MEMORY_SYNC_LOCAL_REPO PATH="$tmp/bin:$PATH" bash "$here/memory-sync.sh" unused "$session" check demo 2>&1) || status=$?
[ "$status" -eq 7 ]
[ -z "$output" ]
echo 'PASS: scp failure preserves original exit code, no false consistency/advice'

printf '#!/usr/bin/env bash\nexit 2\n' > "$tmp/bin/diff"
chmod +x "$tmp/bin/diff"
PATH="$tmp/bin:$PATH" run_sync 2 diff
[ -z "$output" ]
echo 'PASS: diff error is not reported as an ordinary difference'

fixture
status=0
output=$(MEMORY_SYNC_LOCAL_REPO="$repo" bash "$here/memory-sync.sh" unused "$session" diff 2>&1) || status=$?
[ "$status" -eq 0 ] || { printf 'FAIL: no-project exit %s\n%s\n' "$status" "$output" >&2; exit 1; }
[ "$output" = '记忆一致：1 个文件' ]
echo 'PASS: no project syncs workflow only; project files and index lines ignored'

echo 'All memory-sync tests passed.'
