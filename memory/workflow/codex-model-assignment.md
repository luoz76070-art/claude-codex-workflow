---
name: codex-model-assignment
description: "Which Codex model to use for each task type when Claude delegates work to the user's Codex desktop, and what the Codex default model should be"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 7266a8dc-697d-43bd-bafa-a625a0cd92f2
  modified: 2026-11-19T13:41:43.382Z
---

**11-19 用户重定（取代 11-15 的分工）：** “默认模型可以换成pro20x渠道的gpt-6.2-sol吗？后续你和gpt解决疑难问题的模型换成pro20x渠道的gpt-6.2-astra；该规则提交到仓库的项目规则中”。已写进工作流库 `templates/project/CLAUDE.md` 第 3 节，并同步到项目本地的 CLAUDE.md。

| # | 任务类型 | 谁做 / 模型 | 推理强度 |
|---|---|---|---|
| 1 | 只读探索 / 总结 | ccs-pro20x/gpt-6.2-sol | low / medium |
| 2 | 写代码（新功能、常规开发、批量修改） | **ccs-pro20x/gpt-6.2-sol（主力）** | medium / high |
| 3 | 改 bug | 我（Claude） | — |
| 4 | 跑测试 / 构建并修复 | ccs-pro20x/gpt-6.2-sol | medium / high |
| 5 | 疑难问题 / 架构 / 大重构 | 我和 ccs-pro20x/gpt-6.2-astra | high / xhigh |
| 6 | 代码审查 | 我自己审，不派给 Codex | — |
| 7 | 写文档 | ccs-p84e12b/deepseek-v4.1-flash | high（这个模型只有 none / high 两档） |
| 8 | 生成图片 | 待用户补充（目录里有 ccs-pro20x/gpt-image-2.5-*） | — |
| — | 其他 / 默认 | ccs-pro20x/gpt-6.2-sol | 按任务难度定 |

- **Codex 默认模型**：config.toml 顶层 `model` 应为 `ccs-pro20x/gpt-6.2-sol`，推理强度保持 high。用户点名要改，不再是“暂时别动”。
  - **11-20 15:41 已换好**：pro20x 15:39 实测恢复（比上游说的 19:34 早），config.toml 顶层 model 由 `gpt-6.1-sol` 改成 `ccs-pro20x/gpt-6.2-sol`，effort 仍是 high，备份 `~/.codex/config.toml.before-6.2-sol`；两条 recruitment-suite 工作线各跑一轮 OK，都走自用pro20x、200；doctor 默认模型一项通过。19:40 的定时任务已关掉（enabled=false）。
  - CC Switch 切渠道时可能改写 config.toml，切完要看一眼。
  - 除了用户要求的这一次，不要擅自改默认模型。
- 两个 6.2 模型的推理强度都只到 max，没有 ultra。

**Why:** 用户 11-19 指定。之前的做法：11-15 起写代码的主力是秋API 的 gpt-6.1-sol，原因是 11-12 到 11-14 三天就用完了 pro20x 的 7 天额度（11-13 一天 1002 次请求）。现在写代码、疑难问题和默认模型三项都回到 pro20x，同用一份 7 天额度。11-19 时 pro20x 7 天内已有 43 次 429。

**How to apply:**
- 派任务时在 job 里写 `model` 和 `effort`，见 [[codex-desktop-control]]。用户单独指定了就按用户的来。
- **写代码一律派 ccs-pro20x/gpt-6.2-sol。** 用户点名“让你来改”时由我写；改 bug 例外，也由我做。
- 我负责：写任务说明，审查（看 diff、跑测试），合并 main，隐私扫描，必要时在模拟器上核对。
- pro20x 返回 429 时按 [[codex-quota-fallback]] 处理：通知用户、列出其他渠道，等用户选。不要自己换回秋API。
- 渠道前缀见 [[cc-switch-codex-channels]]。
