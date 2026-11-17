---
name: rules-only-project-level
description: 规则文件只写 Mac 本地的项目级 CLAUDE.md；任何时候都不往远端服务器（Linux 主机）写或改全局规则文件
metadata:
  type: feedback
---

用户 2026-11-17 定：“后续的任何时候都不准向远端服务器里写全局规则。规则文件只写 mac 本地的项目级规则文件。”远端服务器指运行 Claude Code 的 Linux 主机，全局规则文件指那里的 `~/.claude/CLAUDE.md`（以及同类的全局规则文件）。

**Why:** 用户把原来放在远端全局 `CLAUDE.md` 的入口规则移到了 Mac 上项目目录的 `CLAUDE.md`（MobiCodex 会话是 `~/workspace/project/codex-to-phone/CLAUDE.md`），全局文件由用户自己管。

**How to apply:**
- 要长期生效的规则写进 Mac 上项目目录的 `CLAUDE.md`（模板 `templates/project/CLAUDE.md`），公开仓库里加进 `.git/info/exclude`，不提交。
- 不创建、不修改、不覆盖 Linux 上的 `~/.claude/CLAUDE.md`；以前“同步全局规则到 Linux”的做法作废。
- 记忆（memory-sync）照旧，它不是规则文件。
