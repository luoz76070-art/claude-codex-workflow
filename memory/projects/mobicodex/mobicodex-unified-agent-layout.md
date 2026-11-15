---
name: mobicodex-unified-agent-layout
description: MobiCodex 电脑页里 Codex、DeepSeek、Claude 等各 Agent 的会话界面布局必须保持统一，改一个就全部一起改
metadata:
  node_type: memory
  type: feedback
  originSessionId: aa35ee15-1c32-4e56-b9d5-6c873136f5d9
  modified: 2026-11-14T09:21:49.581Z
---

每个 Agent 的会话界面布局保持统一（用户 2026-11-14 明确要求）。用户只提到某一个 Agent（比如 DeepSeek）的布局问题时，修复也要落在共享样式上，让 Codex 和其他 Agent 一起变，不要单独给某个 Agent 做特殊布局。

**Why:** 用户反馈 DeepSeek 回复有缩进，我去掉了所有助手回复的头像缩进（Codex 也一起变了），用户确认要保持统一。

**How to apply:** 改消息、气泡、列表、表格等样式时，放在 `.product-remote-shell` 的共享规则里，不按 agentId 分支。只有能力差异（比如某个通道不支持停止）才按 Agent 区分。相关：[[mobicodex-project-takeover]]
