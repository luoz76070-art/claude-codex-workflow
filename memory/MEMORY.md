# 记忆索引行（memory-sync.sh pull 会把对应行补进会话的 MEMORY.md）

- [联网走 Linux 主机](network-via-linux-host.md) — 我自己联网在 Linux 上做；Mac 网络可用，Codex 等 Mac 工具直接联网；11-15 起可调 GitHub API（首选 Mac gh）
- [控制 Codex 桌面端](codex-desktop-control.md) — 通过 app-server socket 给桌面端 Codex 派任务，执行脚本和 ws 模块的位置
- [Codex 模型分配](workflow/codex-model-assignment.md) — 11-15 起：写代码派 gpt-6.1-sol（主力），改 bug 我来，疑难问题我和 astra；点名让我改时我来写
- [Codex 派活流程](codex-delegation-workflow.md) — 目标是省我的 token、效果不打折：默认走桌面端实时路线、权限限项目目录不弹审批、任务说明要精确、执行过程不读、改动我自己审；私有库 claude-codex-workflow 是唯一主副本（脚本从那跑、doctor 自检），新会话靠全局 CLAUDE.md 接手，11-15 实测通过
- [MobiCodex 项目接管](mobicodex-project-takeover.md) — 仓库根目录 /Users/rorance/workspace/project，用户让我全权负责；独立 App 0.2.0/code40 已于 11-14 发布；F1、F6 已合并待 0.3.0，F3 已合并待 0.3.1，发版等用户说“发”；CC Desk 走路线 C（不升级），下一步 C2a
- [Codex 429 时让用户选渠道](codex-quota-fallback.md) — 11-14 晚起不再自动接手：通知用户、列出其他渠道（代码类“我自己做”排第一），等他选；在原线程里换（comp_hash 对齐后可原地换，channel-options 脚本列选项）；429 识别方法
- [各 Agent 布局统一](mobicodex-unified-agent-layout.md) — 电脑页 Codex/DeepSeek 等会话布局一起改，不按 Agent 单独做
- [测试问题走 GitHub issue](mobicodex-issue-workflow.md) — 用户测试问题提成 issue（Mac gh 读写），每天 21:00 复盘：归类→审核是否值得修→成批修；工作流私有库的 issue 也审核，approved 的才做
- [CC Switch 的 Codex 渠道](cc-switch-codex-channels.md) — 4 个渠道和模型前缀、pro20x 7 天限额与 reset_at、只读查用量的方法
- [每周用量上限 380 美元](workflow/weekly-budget-cap.md) — 本机 CC Desk 7 天窗口用到 380 美元就停（按客户端“每周额度·本周期”口径，只算本机设备），后续修复和定时任务等下个窗口
- [工作流 issue 由我审批](workflow/workflow-issue-approval.md) — 我审核决定，拿不准的用审批卡附摘要请用户批
- [备份只留一份](workflow/backup-retention.md) — 只留前一个版本；诗境发布链的备份例外
- [文档要审全篇](workflow/docs-audit-whole.md) — 改 README 先审图标、截图、旧说法再改，不能只加新内容；MobiCodex 截图用 capture-readme-screens.mjs（沙箱外跑）
- [Obsidian 笔记库本地模式](projects/obsidian/obsidian-vault-local-mode.md) — 11-17 起：不建 GitHub，线1/线2 在库里直接改（workspace-write），我用本地 git 审查提交、不推送；遵守库里 AGENTS.md
