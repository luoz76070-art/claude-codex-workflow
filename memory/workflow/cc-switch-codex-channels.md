---
name: cc-switch-codex-channels
description: "Codex on the Mac goes through a local CC Switch proxy with 4 API channels; model slug prefixes, quota/429 facts, and how to read usage safely"
metadata:
  node_type: memory
  type: reference
  originSessionId: aa35ee15-1c32-4e56-b9d5-6c873136f5d9
  modified: 2026-11-19T13:41:50.524Z
---

Mac 上的 Codex 通过本机 CC Switch 代理（config.toml 里的 provider `custom` 指向 127.0.0.1:15721）访问上游。有 4 个渠道（11-14 查的）：

| 渠道（CC Switch 名称） | 模型名前缀 | 能用的模型 |
|---|---|---|
| 自用pro20x | `ccs-pro20x/` | gpt-6.2-sol、gpt-6.2-astra（11-19 目录里已有，强度到 max）、gpt-6-astra、gpt-6.1-sol、gpt-6.1-terra、gpt-6/5.6-luna、gpt-5.6-sol、图片 gpt-image-2.5-* |
| 秋API（当前渠道） | 不带前缀 | gpt-6.1-sol（目录里不带前缀的 gpt-6-astra/6-sol/6.1-terra 也走当前渠道） |
| zyz中转 | `ccs-zyz/` | gpt-6.1-sol |
| 国模 | `ccs-p84e12b/` | deepseek-v4.1-flash、deepseek-v4-pro、glm-5.2/5.3/5.3-flash、kimi-k3/k3.1-pro、qwen3.8-max |

- 模型目录在 `~/.codex/cc-switch-model-catalog.json`。只能用目录里有的模型名，各模型支持的推理强度不同（如 deepseek-v4.1-flash 只有 none/high）。
- **comp_hash 要统一**：11-14 已全部改成 "cc-switch"，这样渠道之间能原地换模型。CC Switch 重新生成目录后要重新对齐，原因见 [[codex-desktop-control]] 的“换模型”。
- **429 的样子：** pro20x 是按账号算的 7 天窗口限额。上游错误码 `user_account_window_quota_exceeded`，错误里有 `reset_at`（11-14 那次是 2026-11-20T11:34:24Z，也就是北京时间 11-20 19:34）。账号上所有模型共用这份额度，换成 pro20x 上的 6.1-sol 也会 429。
- **用量和 429 记录：** 在 `~/.cc-switch/cc-switch.db` 里，用 `sqlite3 -readonly` 查 `proxy_request_logs`（字段有 provider_id、model、status_code、error_message、created_at 秒级时间戳）和 `providers`（name、app_type='codex'）。`usage_daily_rollups` 最近几天是空的。
  - **不要读 `providers.settings_config` 的 auth 部分**，里面是密钥。
- 4 个渠道的 failover 队列都是关的。用户要自己选渠道，不要打开自动切换。见 [[codex-quota-fallback]]。
- Codex 的默认模型（config.toml 顶层 `model`）：11-14 是 `ccs-pro20x/gpt-6-astra` xhigh；11-19 21:38 是 `gpt-6.1-sol` high（秋API）；用户 11-19 定为 `ccs-pro20x/gpt-6.2-sol`，见 [[codex-model-assignment]]。手机上发起的任务不指定模型，都走这个默认模型。
- 11-19 21:25 pro20x 仍然 429，`reset_at` 是 2026-11-20T11:34:24Z，也就是北京时间 11-20 19:34，近 7 天共 43 次 429。CC Switch 里 Codex 当前渠道是秋API。
