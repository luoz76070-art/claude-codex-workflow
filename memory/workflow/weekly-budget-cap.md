---
name: weekly-budget-cap
description: 用户 11-15 定：Claude（CC Desk）每个 7 天用量窗口用到 330 美元就停，后续修复和定时任务等下个窗口；查法见正文
metadata:
  type: feedback
---

**规则（用户 2026-11-15）：** “额度周限用到330刀就停下来。就等下次周限再做后面的修复和定时任务。”

**Why:** 这个用量是用户自己付的，CC Desk 服务按 7 天窗口限额。11-13 到 11-15 三天就用了约 570 美元。

**How to apply:**
- **查法：** 在 Linux 主机上只读打开 `/home/a/.local/share/cc-desk-tunnel-data/state/sessions.sqlite`（`file:...?mode=ro`）。
  - `usage_windows` 里 `seven_day` 那行：`resets_at` 是窗口重置时间（毫秒），`utilization` 是服务端算的百分比。
  - 本周花费：`api_requests` 里 `at ≥ resets_at − 7 天` 的 `cost_usd` 之和。
  - 11-15 21:20 的读数：约 612 美元，46%。按这个比例，100% 约合 1330 美元。
- **到 330 美元：** 收尾手上那一步，保证不留半截改动；向用户汇报；停用当天剩下的定时任务。等窗口重置后再继续。
- **定时任务：** 每个定时任务的 prompt 开头都先查一次用量，超了只回一句就结束。
- **控制花费：**
  - 能派给 Codex 的（只读探索、批量修改、写文档）就派。
  - 模拟器核对这类要截很多图的步骤，只在原生改动时做。
