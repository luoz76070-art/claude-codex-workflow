---
name: spend-surplus-myself
description: 11-28 起尽量都派 Codex：写代码和改 bug 都派，我写说明、审查、合并、发版；不再等花到 250 美元（取代 11-19 的切换线）
metadata:
  node_type: memory
  type: feedback
  originSessionId: aa35ee15-1c32-4e56-b9d5-6c873136f5d9
  modified: 2026-11-28T01:30:00.000Z
---

**11-28 用户：** “现在尽量都用codex，不要等250刀后再说”（同时说博客的 Codex 令牌已经配好）。
- 写代码、改 bug、批量修改都派 Codex，模型按 [[codex-model-assignment]]（`ccs-pro20x/gpt-6.2-sol`；疑难问题 `ccs-pro20x/gpt-6.2-astra` 和我一起）。
- 我做：写任务说明，审查（diff、测试、模拟器核对），合并，改 CI，隐私扫描，发版，动服务器。
- 仍由我直接做的：写说明加审查比直接改还贵的很小改动；用户点名“你来改”的；Codex 碰不到的事（服务器、钥匙串、`.github/workflows`、沙箱外的操作）。
- 380 美元的硬上限照旧，见 [[weekly-budget-cap]]。pro20x 的两个模型共用一个 7 天额度，429 时按 [[codex-quota-fallback]] 找用户选渠道。

**之前的说法（都被取代）：** 11-17 晚“今天尽可能把剩余额度花完……自行完成”；11-18“现在尽可能用自己的额度，别用codex”；11-19“当额度花到250刀的时候就启动codex工作流”。

**Why:** 用户 11-28 改口，没有另说原因；和 [[codex-delegation-workflow]] 最早的目标一致：少用我的 token，Codex 用的是用户自己的渠道额度。

**How to apply:**
- 派活前项目要有 Codex 条件：细粒度令牌在钥匙串（`github-pat-<项目>`），`.codex-lanes` 装好（docs/new-project.md）。daemon 路线不用建线程。没有令牌的项目先请用户建；等令牌时按 new-project.md 第 1 节，让 Codex 只改不推，由我审查提交。
- 派活流程见 [[codex-delegation-workflow]]。
