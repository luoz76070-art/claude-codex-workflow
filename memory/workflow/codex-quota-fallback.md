---
name: codex-quota-fallback
description: "When a delegated Codex task hits 429 / quota exhaustion: stop it, tell the user, let them pick another existing channel (or me); plus how to detect 429 and resume a half-done lane"
metadata:
  node_type: memory
  type: feedback
  originSessionId: aa35ee15-1c32-4e56-b9d5-6c873136f5d9
  modified: 2026-11-14T14:13:20.534Z
---

**11-14 晚用户改了规则：** Codex 返回 429、额度用完时，我要通知他，让他从现有的其他 API 渠道里选一个来代替。不要再像 11-14 白天那样直接自己接手。同一晚用户又定：换渠道要在**原线程**里换（手机端 F6 和我派 Codex 都一样），其他渠道只是临时顶替自用 pro20x。

**Why:**
- 用户要自己决定额度花在哪个渠道上。渠道不同，费用和额度都不一样。
- 同时他定过“改代码首选我自己做”（见 [[codex-model-assignment]]），所以代码类任务的选项里，“我自己做”排第一。

**How to apply:**
- **通知里写清楚：**
  - 哪个渠道、哪个模型出了 429。
  - 什么时候恢复（读错误里的 `reset_at`，换成北京时间）。
  - 可以换的选项：同型号在其他渠道上的排前面，再列国模里合适的。代码类任务把“我自己做”放第一。
  - 渠道清单见 [[cc-switch-codex-channels]]。
- **等用户选的时候：** 我先做不需要 Codex 的事，不把这个任务硬塞给别的渠道。F1 做好之前在对话里说；F1 做好之后也发手机通知。
- **列选项：** 在 Mac 上跑备份库的 `node scripts/codex-channel-options.cjs <threadId>`。它列出线程当前模型、最近的 429 和恢复时间（北京时间），以及能原地换过去的模型；标 ✗ 的要先调用当前模型，额度用完时换不过去。开头出现 comp_hash 警告，说明 CC Switch 重新生成了模型目录，要先跑 `align-catalog-comp-hash.py` 重新对齐（见 [[codex-desktop-control]]）。
- **用户选了渠道：** 在**同一个线程**里接着做，不开新线程（用户 11-14 明确要求：原渠道恢复后要能回到原线程）。派活 job 只改 `model`（必要时加 `effort`），其他照旧：脚本发现指定了模型，会自动不沿用线程设置，并从 rollout 读出线程原来的权限原样带上（`sandbox:"keep"`）。原渠道恢复后，同样在这个线程里把 `model` 换回去。
  - lane 任务照旧用 lane 线程；换渠道就是在这个 lane 线程里指定新模型重跑。
- **怎么判断是 429：**
  - 11-14 实测，`task_complete` 里带 `error: "exceeded retry limit, last status: 429 Too Many Requests"`，没有单独的 error 事件。
  - 上游的错误码是 `user_account_window_quota_exceeded`，在 CC Switch 的 proxy_request_logs 里能看到。
  - 派活脚本 codex-desktop-turn.cjs 匹配 usageLimitExceeded、usage limit、quota、rate limit、429 之后会打印 `QUOTA_EXHAUSTED`。
  - 先看错误原文，不要把普通失败当成额度问题。
  - 轮次在 429 之前可能已经推送了，先看远端分支。
- **用户选“我自己做”时：**
  - 在主仓库建一个可信 worktree（`/tmp/<项目>-work-<任务>`），在 `claude/<任务>` 分支按同样的验收标准做。自查 diff 后本地合并进 main，再 push。
  - Codex 半途停下、没推送时，用 `.codex-lanes/bin/lane-snapshot N [out.patch]` 把 lane 的工作区导出成 patch（对比 lane-reset 写的基线，含新文件，不读 lane 的 gitdir 配置）。然后在可信 worktree 里 `git apply`，审查后补完。
- **我自己的会话中断时：** Codex 那一轮由桌面端在跑，不受影响。恢复后先查 `git ls-remote` 和 lane 的状态，不要重复派活或重复推送。
