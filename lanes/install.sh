#!/bin/sh
# Install (or refresh) Codex lanes in a repo: tools, hook, token service name, git exclude, two fresh lanes.
# usage: lanes/install.sh <repo> <keychain-service>
# The PAT itself must already be in the login keychain: security add-generic-password -a codex -s <service> -w
set -e
R=$(cd "$1" && pwd); S="$2"; [ -n "$S" ] || { echo "usage: install.sh <repo> <keychain-service>" >&2; exit 2; }
here=$(cd "$(dirname "$0")" && pwd); L="$R/.codex-lanes"
[ -d "$R/.git" ] || { echo "not a git repo: $R" >&2; exit 2; }
mkdir -p "$L/bin" "$L/hooks"
cp "$here"/bin/* "$L/bin/"; cp "$here"/hooks/pre-push "$L/hooks/"
rm -f "$L/bin/git-credential-mobicodex"
chmod +x "$L"/bin/* "$L/hooks/pre-push"
printf '%s\n' "$S" > "$L/token-service"
grep -qx '.codex-lanes/' "$R/.git/info/exclude" 2>/dev/null || echo '.codex-lanes/' >> "$R/.git/info/exclude"
security find-generic-password -a codex -s "$S" >/dev/null 2>&1 || echo "warning: keychain item $S not found yet" >&2
for n in 1 2; do "$L/bin/lane-reset" "$n"; done
