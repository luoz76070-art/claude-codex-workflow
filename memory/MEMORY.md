# 记忆索引行（memory-sync.sh pull 会把对应行补进会话的 MEMORY.md）

## 通用规则（memory/workflow/，每个会话都导入）

- [联网走 Linux 主机](workflow/network-via-linux-host.md) — 我自己联网在 Linux 上做；Mac 网络可用，Codex 等 Mac 工具直接联网；11-15 起可调 GitHub API（首选 Mac gh）；Mac 上 git push/gh 要加 HTTPS_PROXY=http://127.0.0.1:7897
- [控制 Codex 桌面端](workflow/codex-desktop-control.md) — 通过 app-server socket 给桌面端 Codex 派任务，执行脚本和 ws 模块的位置；新线程用 codex-new-thread.cjs（用户点一次批准）
- [Codex 模型分配](workflow/codex-model-assignment.md) — 11-19 起：默认模型和写代码用 pro20x gpt-6.2-sol，改 bug 我来，疑难问题我和 pro20x gpt-6.2-astra；点名让我改时我来写
- [Codex 派活流程](workflow/codex-delegation-workflow.md) — 目标是省我的 token、效果不打折：默认走 daemon 路线 codex-run.cjs、每个任务新开线程（桌面端 26.1117 起没有 IPC，#11）、权限限项目目录不弹审批、任务说明要精确、执行过程不读、改动我自己审；私有库 claude-codex-workflow 是唯一主副本（脚本从那跑、doctor 自检）
- [Codex 429 时让用户选渠道](workflow/codex-quota-fallback.md) — 11-14 晚起不再自动接手：通知用户、列出其他渠道（代码类“我自己做”排第一），等他选；在原线程里换（comp_hash 对齐后可原地换，channel-options 脚本列选项）；429 识别方法
- [CC Switch 的 Codex 渠道](workflow/cc-switch-codex-channels.md) — 4 个渠道和模型前缀、pro20x 7 天限额与 reset_at、只读查用量的方法
- [每周用量上限 380 美元](workflow/weekly-budget-cap.md) — 本机 CC Desk 7 天窗口用到 380 美元就停（客户端“每周额度·本周期”口径，只算本机设备），不留缓冲；做完会超的工作不开
- [谁来写代码：尽量派 Codex](workflow/spend-surplus-myself.md) — 11-28 起：写代码和改 bug 都派 Codex，我写说明、审查、合并、发版；不再等 250 美元（380 硬上限照旧）
- [issue 凑批修、每个项目一个专属任务](workflow/issue-batch-workflow.md) — 用户 11-26 定：改动先记 issue、凑批修、等“发”整批发；每个项目一个专属定时任务（每次新开会话、只管自己的仓库），细则在 docs/issue-batch.md
- [工作流 issue 由我审批](workflow/workflow-issue-approval.md) — 我审核决定，拿不准的用审批卡附摘要请用户批
- [备份只留一份](workflow/backup-retention.md) — 只留前一个版本；项目记忆里写明的例外除外
- [文档要审全篇](workflow/docs-audit-whole.md) — 改 README 先审图标、截图、旧说法再改，不能只加新内容；项目的截图方法写在项目记忆
- [规则只写项目级文件](workflow/rules-only-project-level.md) — 规则只写 Mac 本地项目目录的 CLAUDE.md；任何时候都不往远端服务器（Linux 主机）写或改全局 ~/.claude/CLAUDE.md（11-17 用户定）

## 项目记忆（memory/projects/<名字>/，只在会话项目目录匹配 config.json 时导入）

### mobicodex

- [MobiCodex 项目接管](projects/mobicodex/mobicodex-project-takeover.md) — 仓库根目录 ~/workspace/project，用户让我全权负责；发版等用户说“发”；当前进度、未发版改动和待真机复测的 issue 都在这
- [各 Agent 布局统一](projects/mobicodex/mobicodex-unified-agent-layout.md) — 电脑页 Codex/DeepSeek 等会话布局一起改，不按 Agent 单独做
- [测试问题走 GitHub issue](projects/mobicodex/mobicodex-issue-workflow.md) — 用户测试问题提成 issue（Mac gh 读写），每天 21:00 复盘：归类→审核是否值得修→成批修；工作流私有库的 issue 也审核，approved 的才做

### animal-world-cup

- [Animal Cup 项目](projects/animal-world-cup/animal-world-cup-project.md) — 私有库 luoz76070-art/animal-world-cup（11-18 从线上源码导入）、CI 构建加联机中继测试；手动 Deploy 工作流（check/deploy/rollback，awcdeploy 账号 + 单脚本 sudo）11-18 建好，check 通过；capacity-relay 已停

### recruitment-suite

- [招聘套件项目](projects/recruitment-suite/recruitment-suite-project.md) — 私有库 recruitment-suite + JobPilot 镜像；11-20 第一、二批已发布；Codex 工作线已就绪；下一步前端 React 重写方案

### blog

- [博客项目](projects/blog/blog-project.md) — zyzlz.xin 博客：私有库 luoz76070-art/blog、CI、手动 Deploy 工作流（check/deploy/rollback，保留 2 个版本）；blogdeploy 账号和 secrets 11-18 已建好，check 通过

### obsidian

- [Obsidian 笔记库本地模式](projects/obsidian/obsidian-vault-local-mode.md) — 11-17 起：不建 GitHub，线1/线2 在库里直接改（workspace-write），我用本地 git 审查提交、不推送；遵守库里 AGENTS.md
