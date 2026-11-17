---
name: weekly-budget-cap
description: 用户 11-15 定：本机（这台 Mac）在 CC Desk 每个 7 天窗口用到 380 美元就停，后续修复和定时任务等下个窗口；按客户端「订阅用量 → 每周额度」口径查
metadata:
  type: feedback
---

**11-17 调整：** 用户说“额度现在变为周限380刀”，上限从 330 改为 380 美元。

**规则（用户 2026-11-15）：** “额度周限用到330刀就停下来。就等下次周限再做后面的修复和定时任务。”同一天补充：“记录按照我这台机器调用的记录”，也就是 CC Desk 客户端「订阅用量 → 每周额度 → 本周期 … 等价 $X」里的数。

**Why:** 这个账号还有别的设备在用（MacBook-Air.local、LAPTOP-49GHAEAJ），服务端的 46% 是所有设备合计的。用户只按本机的花费控制。

**How to apply:**
- **查法：** 在 Linux 主机上只读打开 `/home/a/.local/share/cc-desk-tunnel-data/state/sessions.sqlite`（`file:...?mode=ro`）。
  - `usage_windows` 里 `seven_day` 的 `resets_at` 是窗口重置时间（毫秒）。
  - 本机花费：`api_requests` 里 `at ≥ resets_at − 7 天` 的 `cost_usd` 之和，只算本机设备的会话。本机会话是 `sessions.metadata` 里 `device.id` 与会话 aa35ee15-1c32-4e56-b9d5-6c873136f5d9 相同的那些，11-15 时是 RorancedeMacBook-Air.local，id a155f974…。
  - 11-15 21:23 的读数：本机 285 美元，客户端显示 286 美元，两者对得上；全账号 612 美元。
- **到 380 美元：** 收尾手上那一步，保证不留半截改动；向用户汇报；停用定时任务，等窗口重置后再继续。
- **定时任务：** 每个定时任务的 prompt 开头先按上面的口径查一次，超了只回一句就结束。
- **剩余不到 50 美元：** 不开工新的修复（批好的 issue 也不做），只审核、打标签、汇报，等窗口重置后的第一次复盘再做。这样不会做到半截撞线。11-16 加进了每日复盘的 prompt。
- **控制花费：** 写代码派 gpt-6.1-sol，见 [[codex-model-assignment]]。只读排查、批量修改、写文档也派出去。模拟器截图核对只在改了原生代码时做。
