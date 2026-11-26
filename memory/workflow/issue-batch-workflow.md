---
name: issue-batch-workflow
description: 用户 11-26 定：改动先记 issue、凑批修、等“发”整批发；每个项目一个专属定时任务（每次新开会话、只管自己的仓库），细则在工作流库 docs/issue-batch.md
metadata:
  type: feedback
---

**规则（用户 2026-11-26）：** 不再“提一个、改一个、发一个”。问题记成 issue，由每个项目自己的定时任务凑成一批修复，修完等用户说“发”整批发版。每个项目一个专属任务，不能把几个项目混在一个任务里。

**Why:** 用户觉得原来每改一点就发一个版本太碎；还发现 `mobicodex-issue-review` 一个任务同时管 MobiCodex 和工作流库，容易混。

**How to apply:**
- 什么算 issue：默认只有用户明确说“记成 issue”或自己在 GitHub 提的才算，聊天里直接让改的照旧当场处理（招聘套件 11-26 定；MobiCodex 照旧把测试问题都提成 issue）。
- 任务：id `<项目>-issue-batch`，`target` 用 new + 项目目录，每次新开会话；先只查额度和 issue，没活就一句话结束，有活才接手。MobiCodex 21:00 `mobicodex-issue-review`、工作流库 21:40 `workflow-issue-review`（都发给 MobiCodex 会话，各管各的仓库）；招聘套件 10:30 `recruitment-suite-issue-batch`。
- 修复：一批一个 `batch/<日期>` 分支和 PR，提交写 `Refs #N`（不用 Fixes），合并后打 `fixed-unreleased`；发版后关 issue。
- 新项目接入按工作流库 `docs/issue-batch.md` 的“新项目接入”。相关：[[workflow-issue-approval]]。
