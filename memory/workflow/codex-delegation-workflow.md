---
name: codex-delegation-workflow
description: "User's goals for delegating coding to Codex (cut Claude's own token use, keep Claude-level quality) and the standard brief/review routine"
metadata:
  node_type: memory
  type: feedback
  originSessionId: aa35ee15-1c32-4e56-b9d5-6c873136f5d9
  modified: 2026-11-13T15:39:58.585Z
---

用户最看重的是**减少我（Claude）自己的 token 消耗**，尤其是写代码这部分；同时希望交给 Codex 的任务能做到跟我自己写一样的效果。Codex 那边用的是用户自己的额度，没那么在意。

**用户 11-14：** 这套控制 Codex 的流程“非常不错”，要求永久保留，并在 GitHub 上备份。之后做新功能时优先用这套流程。

**Why:** 用户 2026-11-13 明确说的。同一天还说了：
- 权限全开只是因为懒得点确认。只要不弹审批，可以限制权限范围。
- 模型和推理强度以后都交给我来控制。

**How to apply:**
- **默认走桌面端实时路线**（见 [[codex-desktop-control]]）。job 设 `inherit:false`、`sandbox:"workspace-write"`（只能写项目目录）、`network:true`、`approval:"never"`。2026-11-13 实测：写项目外的文件被拦下，报 Operation not permitted；写项目内正常；全程不弹审批。任务确实需要写项目外的目录时，用 `extraWritableRoots` 单独放开。
- **模型和推理强度**按 [[codex-model-assignment]] 选，用户不再逐个确认。
- **任务说明要短而精确**，包括：目标；涉及的目录或文件；约束（不准 git commit/push/reset/checkout，因为上一级仓库有约 9645 个已暂存的改动；不准动项目外的文件）；验收标准；要跑的测试或构建命令。最后要求它用 10 行以内报告：改了哪些文件、为什么改、测试命令和结果、遗留风险。
- **执行过程不读**：脚本默认安静模式，只输出状态、改动文件列表和最终结论。不开 verbose，也不翻 rollout 里的命令流。
- **审查（第 7 类）由我自己做**：只看改动文件的 `git diff -- <文件>`；自己跑测试，只看结果摘要（tail 或 grep）。发现问题就把精确的修改意见发回同一个会话，那边上下文还在、缓存也热。
- **复杂任务**先让 Codex 出方案，我确认后再让它实现。
- **很小的改动**（写任务说明加审查比直接改还贵的）由我直接做，不派给 Codex。
- 同一个会话里不要频繁换模型，换了缓存就失效。
- **额度用完（429）：** 按 [[codex-quota-fallback]] 处理。先通知用户，用 `codex-channel-options.cjs` 列出可选渠道，用户选好后在同一个线程里指定新模型重跑，原渠道恢复后再换回来。
- **主副本（11-14 起）：** 私有库 `luoz76070-art/claude-codex-workflow`（Mac 本地 `~/workspace/claude-codex-workflow`）是这套流程的唯一主副本：脚本直接从那里运行，通用记忆以库里的 `memory/workflow/` 为准，会话记忆是它的副本，用 `linux/memory-sync.sh` 同步。改了脚本或规则要提交推送。新会话靠 Linux 主机的全局 `~/.claude/CLAUDE.md` 引导，按库里的 `docs/handoff.md` 接手。11-15 用一次性定时任务开新会话实测接手成功（约 1.5 分钟；记录和修正见库里的 `docs/lessons.md`）。环境有疑问先跑 `node scripts/doctor.cjs`。**用到其他项目**：全局入口第 2 节写了做法——已在 config.json 的用 `--project`；新项目先问用户三件事（用到哪一级、公开还是私有、发版规则），按 `docs/new-project.md` 接入；只适用于设备是这台 Mac 的会话。工作流自身的优化项记在备份库的 issue 里（11-15 提交）。
- **Codex 同时最多跑 2 个会话**（用户 2026-11-13 告知）。派活按两条线排期。
- **GitHub 流程（用户 2026-11-13 同意）：**
  - 用户自己在网页上创建细粒度令牌，只限 luoz76070-art/MobiCodex。权限：Contents 读写、Pull requests 读写、Actions 只读。**不给 Workflows**，因为工作流能读仓库机密（签名密钥）；改 .github/workflows 的事由我来做。
  - 令牌存在 macOS 钥匙串，-a codex -s `github-pat-mobicodex`（11-13 已存，用户曾把旧令牌贴进对话，已重新生成，哈希核对过不是旧的）。
  - **已接好（11-13 用桌面端 Codex 实测）：** `.codex-lanes/`（在仓库里，已写进 .git/info/exclude）下有 lane-1、lane-2 两个完整克隆，git 数据放在 `lane-N.gitdir`。git 数据不能叫 `.git`，也不能有 `.git` 指针文件：Codex workspace-write 会把 `.git` 以及 worktree 指向的 gitdir 强制设为只读，即使放进 writableRoots 也一样，commit 会报 Operation not permitted。
  - 工具都在 `.codex-lanes/bin/`：
    - `lgit`：按所在目录设 GIT_DIR 和 GIT_WORK_TREE，Codex 一律用它，不用 git。
    - `gh-codex`：从钥匙串取 GH_TOKEN，不用用户自己的 gh 登录。
    - `git-credential-lane`（11-14 前叫 git-credential-mobicodex）：每条线的 gitdir 配置里先清空 osxkeychain，再用它。令牌的钥匙串名写在 `.codex-lanes/token-service`，工具按自身位置推算仓库路径，新项目用备份库的 `lanes/install.sh` 安装。
    - `lane-reset N`：删掉后从主仓库重新克隆。
  - `.codex-lanes/hooks/pre-push` 只允许推 `codex/*`。这只是提醒性质，Codex 能改自己 gitdir 的配置或用 --no-verify 绕过，所以每次派活后要看一眼 `git ls-remote origin main`。
  - 派活 job 字段：`cwd:".codex-lanes/lane-N"`（绝对路径），`sandbox:"workspace-write"`，`extraWritableRoots:["<repo>/.codex-lanes/lane-N.gitdir"]`，`network:true`。说明里写明：只用 lgit 和 gh-codex，在 `codex/<任务>` 分支提交，推送并用 gh-codex 开 PR，不准碰 main。
  - 沙箱里钥匙串可读，网络走用户代理 127.0.0.1:7897。
  - ⚠️ **安全边界：** Codex 能写 lane 的 gitdir 配置（比如 core.fsmonitor、alias），所以我永远不在用过的 lane 里不经沙箱跑 git。审查时在主仓库 `git fetch origin codex/<任务>`，再看 `git diff main...FETCH_HEAD`。合并在主仓库本地做，然后 push main，PR 会自动变成已合并。下一件任务开始前跑 `lane-reset N`。
  - 每条线工作区约 400MB；对象是硬链接，基本不额外占空间。
  - **合并步骤**：
    - 脚本里先 `set -e`。`git merge -F` 不支持从 stdin 读，提交信息要先写进临时文件。
    - 确认 `git ls-remote origin main` 已经包含 PR 的提交之后，才能删远端分支。
    - 11-13 合并 PR #1 时，merge 失败了，但删分支那步照样执行了，结果 PR 显示为 Closed，而不是 Merged。
  - **lane 依赖**：lane 里装依赖用 `--store-dir <repo>/.codex-lanes/pnpm-store`，这个目录也要放进 extraWritableRoots，不给 Codex 写全局 pnpm store 的权限。
  - **审查测试**：在主仓库建 `/tmp/mobicodex-review-*` worktree，用 `corepack pnpm install --frozen-lockfile --prefer-offline` 装依赖后自己重跑测试。
    - relay 全量测试要先跑 `corepack pnpm build` 和 `corepack pnpm build:plugin`。macGatewayService 和 managedGateway 依赖 dist-plugin，不先构建会报 ENOENT 假失败。D2 的配对回归就是靠这两个测试发现的，所以审查时别跳过。
    - 合并前在 `git diff --cached` 里扫 `rorance` 等个人信息。Codex 写的 .trellis 文档里会带本机绝对路径，要换成 `<repo>/`。
    - zsh 里不要写 `echo =====`，会报 "==== not found"。
