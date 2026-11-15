---
name: mobicodex-issue-workflow
description: 用户测试中报的 MobiCodex 问题一律提成 GitHub issue，定期按类型复盘，再成批修复；提 issue 用 Mac 上的 gh，查看走 Linux
metadata:
  node_type: memory
  type: feedback
  originSessionId: aa35ee15-1c32-4e56-b9d5-6c873136f5d9
  modified: 2026-11-14T10:18:26.355Z
---

用户 2026-11-14 定下：以后他在测试里遇到的问题，我都提成 luoz76070-art/MobiCodex 的 GitHub issue，定期按问题类型复盘，再成批修复。同一条消息里也让我按计划直接推进 backlog，不用等他逐项确认。

**Why:** 用户想让测试反馈有地方可追踪，并且按类别成批修，不要来一个修一个。

**How to apply:**
- 提 issue 和打标签：在 Mac 上用 `gh issue create` / `gh label create`，因为凭据只在 Mac 上。这是用户明确要求的，覆盖了 [[network-via-linux-host]] 里“不在 Mac 上用 gh 调接口”那条，但只限 issue 操作。
- 查看、列出 issue：11-15 起可以调 GitHub API，在 Mac 上用 `gh issue list/view` 读最方便（Linux 上公开页面也行）。
- 仓库是 **PUBLIC**：issue 正文不能有本机路径、用户名、邮箱、令牌和网关地址里的私密部分；截图要先确认里面没有个人信息。
- 每个 issue 写清楚：现象、复现步骤、版本（versionName/code）、影响的 Agent 或页面，并打上类型标签。
- 修复按批次做，在 worktree 分支上改，测完合进 main。发版仍然要用户说了才发（见 [[mobicodex-project-takeover]]），修复记录里用 `Fixes #N` 关联 issue。
- 复盘由计划任务定期触发（每天 21:00 北京时间，用 CC_DESK_TUNNEL_SCHEDULES）。
- **11-15 用户加了一步“审核是否值得修”**：归类之后、修复之前逐个评估影响、复现、成本风险、和路线图的关系，结论分本批修 / 延后（deferred 标签 + 理由和再修条件）/ 不修（wontfix 标签 + 理由，不自己关闭，等用户确认）。拿不准的归延后并在汇报里问。任务 prompt 模板在备份库 `schedules/mobicodex-issue-review.json`。
- **11-15 起复盘也覆盖工作流私有库 claude-codex-workflow 的 issue**（用户同意）：同样归类和审核，但默认只汇报；带 `approved` 标签或用户在对话里明确同意的才动手做。用户在对话里同意做某条时，我给那个 issue 打上 `approved`。
