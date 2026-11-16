---
name: docs-audit-whole
description: 更新 README 等文档时要审核全篇（图标、截图、旧说法、链接），不能只往里加新内容；README 截图用 capture-readme-screens.mjs 生成
metadata:
  type: feedback
---

更新 README 或说明文档时，先把全篇审一遍：图标、截图是不是现在的样子，旧说法、链接、版本号、命令还对不对，然后再改。不能只把新内容加进去。

**Why:** 2026-11-16 我更新 MobiCodex README 时只加了 CC Desk 和反馈问题一节，用户指出图标（还是带 OpenAI 标志的旧概念图）和截图（Kelivo 时期）都过时，要求整篇重写，要吸引人，简洁明了地体现项目价值。

**How to apply:**
- 改文档前列一个“哪些还适用、哪些过时”的清单，图片也要看。
- 公开项目的 README 开头先讲价值，再讲功能、下载、上手。
- MobiCodex 的 README 截图用 `node scripts/capture-readme-screens.mjs` 生成（模拟数据，输出到 docs/images/screens）。Codex 沙箱里启动不了 Chromium，这个脚本要我在沙箱外运行。图标的原图在本地 output/branding/2026-11-13-logo-concepts/A-variants/final/A1-icon.svg。
- 相关：[[mobicodex-project-takeover]]
