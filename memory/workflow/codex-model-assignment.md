---
name: codex-model-assignment
description: "Which Codex model to use for each task type when Claude delegates work to the user's Codex desktop"
metadata:
  type: feedback
---

**11-15 用户重定分工：** “分工写代码由渠道的gpt-6.1-sol来做，改bug之类的由你来，其次，主力改代码的模型是gpt-6.1-sol，疑难问题由astra和你来解决，后续如果需要你来改我会直接点名让你来改。”

| # | 任务类型 | 谁做 / 模型 | 推理强度 |
|---|---|---|---|
| 1 | 只读探索 / 总结 | gpt-6.1-sol | low / medium |
| 2 | 写代码（新功能、常规开发、批量修改） | **gpt-6.1-sol（主力）** | medium / high |
| 3 | 改 bug | 我（Claude） | — |
| 4 | 跑测试 / 构建并修复 | gpt-6.1-sol | medium / high |
| 5 | 疑难问题 / 架构 / 大重构 | 我和 gpt-6-astra | astra high / xhigh |
| 6 | 代码审查 | 我自己审，不派给 Codex | — |
| 7 | 写文档 | ccs-p84e12b/deepseek-v4.1-flash | high（这个模型只有 none / high 两档） |
| 8 | 生成图片 | 待用户补充（目录里有 ccs-pro20x/gpt-image-2.5-*） | — |
| — | 其他 / 默认 | gpt-6.1-sol | 按任务难度定 |

**Why:**
- 我的用量用户每周有上限（[[weekly-budget-cap]]）。
- 11-12 到 11-14 三天里，astra 在 pro20x 上碰到了 7 天窗口限额。

**How to apply:**
- **写代码一律派 gpt-6.1-sol。** 用户点名“让你来改”时才由我写，改 bug 例外。
- **我负责的部分：**
  - 写任务说明。
  - 审查：看 diff、跑测试。
  - 合并 main。
  - 隐私扫描。
  - 必要时在模拟器上核对。
- **派任务时：** 在 job 里写 `model` 和 `effort`（见 [[codex-desktop-control]]）。用户单独指定了就按用户的来。
- **渠道：** 6.1-sol 走秋API，模型名写不带前缀的 `gpt-6.1-sol`。astra 只有 pro20x 有（`ccs-pro20x/gpt-6-astra`），11-20 19:34 前用不了，这期间疑难问题由我做。其他前缀见 [[cc-switch-codex-channels]]。
- **Codex 默认模型“暂时别动”（用户 11-14）：** config.toml 顶层还是 pro20x astra xhigh，不要改。
