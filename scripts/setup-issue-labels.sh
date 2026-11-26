#!/usr/bin/env bash
# Create the labels the issue batch workflow uses (docs/issue-batch.md). Safe to run again.
# usage: setup-issue-labels.sh <owner/repo> [area:<模块>=<说明> ...]
# Runs on the Mac with the user's gh login.
set -euo pipefail
repo=${1:?usage: setup-issue-labels.sh <owner/repo> [area:<模块>=<说明> ...]}; shift
export HTTPS_PROXY=${HTTPS_PROXY:-http://127.0.0.1:7897}
label() {
  for _ in 1 2 3; do
    gh label create "$1" -R "$repo" --color "$2" --description "$3" --force >/dev/null 2>&1 && { echo "ok $1"; return; }
    sleep 3
  done
  echo "failed $1" >&2; return 1
}
label bug d73a4a 问题
label enhancement a2eeef 新需求
label approved 0e8a16 审核通过，本批修
label deferred c5def5 延后，评论里写理由
label wontfix ffffff 建议不修，用户确认后才关
label fixed-unreleased bfd4f2 已合进 main，还没发版
label needs-user-test f9d0c4 发版后要用户亲自试
for area in "$@"; do label "${area%%=*}" 1d76db "${area#*=}"; done
