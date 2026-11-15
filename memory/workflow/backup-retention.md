---
name: backup-retention
description: 用户 11-15 定：备份只留前一个版本（一份）；发布前备份新的，更早的删掉
metadata:
  type: feedback
---

**规则（用户 2026-11-15）：** “备份只留前面一个版本。”

**Why:** 旧备份越积越多，占空间也乱。

**How to apply:**
- 发布前照常备份当前版本，备份完删掉更早的那些备份，只留这一份。适用于下载页备份、网关切换时的旧版、服务器上删项目前的备份等。
- 同一份备份放了好几处时只留一处。删项目的备份 11-15 已改成只在 Mac 上留一份：`~/workspace/server-backups/decommission-20261115/`。
- **例外：** 诗境的 `/opt/shijing/backups` 和 `ops/<id>/previous-header.json` 是发布链完整性核对要用的，不要按这条删，见 [[shijing-cloud-server]]。
