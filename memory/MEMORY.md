# 记忆索引行（memory-sync.sh pull 会把对应行补进会话的 MEMORY.md）

- [联网走 Linux 主机](network-via-linux-host.md) — 我自己联网在 Linux 上做；Mac 网络可用，Codex 等 Mac 工具直接联网
- [控制 Codex 桌面端](codex-desktop-control.md) — 通过 app-server socket 给桌面端 Codex 派任务，执行脚本和 ws 模块的位置
- [Codex 模型分配](codex-model-assignment.md) — 11-14 起主力 6.1-sol；改代码/疑难首选我自己，其次 astra high；文档 deepseek-flash；审查我做
- [Codex 派活流程](codex-delegation-workflow.md) — 目标是省我的 token、效果不打折：默认走桌面端实时路线、权限限项目目录不弹审批、任务说明要精确、执行过程不读、改动我自己审；私有库 claude-codex-workflow 是唯一主副本（脚本从那跑、doctor 自检），新会话靠全局 CLAUDE.md 接手，11-15 实测通过
- [MobiCodex 项目接管](mobicodex-project-takeover.md) — 仓库根目录 /Users/rorance/workspace/project，用户让我全权负责；独立 App 0.2.0/code40 已于 11-14 发布；F1、F6（原线程换渠道版）已合并待 0.3.0，发版仍等用户说“发”；F 系列新功能
- [Codex 429 时让用户选渠道](codex-quota-fallback.md) — 11-14 晚起不再自动接手：通知用户、列出其他渠道（代码类“我自己做”排第一），等他选；在原线程里换（comp_hash 对齐后可原地换，channel-options 脚本列选项）；429 识别方法
- [各 Agent 布局统一](mobicodex-unified-agent-layout.md) — 电脑页 Codex/DeepSeek 等会话布局一起改，不按 Agent 单独做
- [测试问题走 GitHub issue](mobicodex-issue-workflow.md) — 用户测试问题提成 issue（Mac gh 写、Linux 读），每天 21:00 计划任务按类型复盘、成批修复
- [CC Switch 的 Codex 渠道](cc-switch-codex-channels.md) — 4 个渠道和模型前缀、pro20x 7 天限额与 reset_at、只读查用量的方法
