---
name: codex-model-assignment
description: "Which Codex model to use for each task type when Claude delegates work to the user's Codex desktop"
metadata:
  node_type: memory
  type: feedback
  originSessionId: aa35ee15-1c32-4e56-b9d5-6c873136f5d9
  modified: 2026-11-14T12:38:58.021Z
---

**11-14 用户改过一次：** “主力模型换成 gpt-6.1-sol，astra 用得太快。改代码和解决难题的时候要首选你自己的模型或者是 astra。”

| # | 任务类型 | 谁做 / 模型 | 推理强度 |
|---|---|---|---|
| 1 | 只读探索 / 总结 | gpt-6.1-sol | low / medium |
| 2 | 简单修改（改代码） | 我（Claude）自己改；量大时派 gpt-6-astra | astra 用 high |
| 3 | 批量机械修改 | gpt-6.1-sol | low / medium |
| 4 | 跑测试 / 构建并修复 | gpt-6.1-sol | medium / high |
| 5 | 常规开发（改代码） | 我自己写；大块、边界清楚、要长时间跑测试循环的派 gpt-6-astra | astra 用 high，不再默认 xhigh |
| 6 | 疑难问题 / 架构 / 大重构 | 我自己做；要第二意见时让 astra 只出方案 | astra xhigh |
| 7 | 代码审查 | 我自己审，不派给 Codex | — |
| 8 | 写文档 | ccs-p84e12b/deepseek-v4.1-flash | high（这个模型只有 none / high 两档） |
| 9 | 生成图片 | 待用户补充（目录里有 ccs-pro20x/gpt-image-2.5-*） | — |
| — | 其他 / 默认 | gpt-6.1-sol | 按任务难度定 |

**Why:** 用户要控制 Codex 那边的额度消耗。11-12 到 11-14 三天里，pro20x 上的 astra 跑了约 2000 次请求，11-14 白天就碰到了 7 天窗口限额（见 [[cc-switch-codex-channels]]）。改代码的质量用户更信我或 astra。

**How to apply:**
- 派任务时在 job 里写 `model` 和 `effort`（见 [[codex-desktop-control]]）。用户单独指定了就按用户的来。
- **渠道（用户 11-14 定）：** 6.1-sol 走秋API，模型名写不带前缀的 `gpt-6.1-sol`。astra 只有 pro20x 有（`ccs-pro20x/gpt-6-astra`），11-20 19:34 前用不了，这期间改代码我自己做。其他前缀见 [[cc-switch-codex-channels]]。
- **Codex 默认模型“暂时别动”（用户 11-14）：** config.toml 顶层还是 pro20x astra xhigh，不要改。
- 第 7 类审查一直由我做：看改动、跑测试。
- 2026-11-13 用 ephemeral 会话测过 gpt-6.1-sol（low）和 deepseek-v4.1-flash（high），都能调通，各约 10 秒。
