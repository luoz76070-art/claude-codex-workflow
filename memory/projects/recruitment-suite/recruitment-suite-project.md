---
name: recruitment-suite-project
description: "招聘套件（校园岗位工作台 campus-collector、AI Gateway、ai-config-manager、JobPilot）的两个私有库、CI、线上结构和接入进度（工作流 #8 第三个项目，11-18 接入）；用户要后续深入优化"
metadata:
  node_type: memory
  type: project
  originSessionId: aa35ee15-1c32-4e56-b9d5-6c873136f5d9
  modified: 2026-11-18T15:26:35.635Z
---

**用户 11-18：** “接着做，后续还要深入的优化这个项目”。接入已完成；深入优化的范围还没定，先给方案再动手。

- **主仓库**：Mac `~/Documents/简历优化+岗位收集`，GitHub `luoz76070-art/recruitment-suite`（私有，默认分支 main）。
  - 11-18 推送前用 git filter-repo 改写了全部 136 个提交：服务器 IP 换成 SSH 别名 `recruitment-suite` 或 `SERVER_IP`，作者和提交者统一为 `luoz76070-art@users.noreply.github.com`（仓库本地 user.name/email 也设成了这个）。
  - 改写前的 `.git` 打包在 `~/workspace/project-archive/20261118-recruitment-suite-git-before-github.tar.gz`（唯一备份）。
  - Codex 的 `refs/codex/turn-diffs/*` 检查点没被改写，里面还有 IP，只留本机。**永远只推 main 或具体分支，不要 push --all/--mirror。**
  - 本机故意不入库：`PROGRESS.md`、`BLOCKED.md`、`项目筛选与部署记录.md`（含服务器 IP）。
  - 历史扫描结果：没有真实密码、密钥、令牌；`.env.example` 和测试里都是占位值。source_registry.json 里的电话和邮箱是学校就业办的公开联系方式。
  - 仓库自带规则：AGENTS.md（11-18 改成 GitHub 为准、Codex 走 `codex/*` 分支开 PR、我审查合并、上线要用户说“发”）和 docs/EXECUTION.md（每个实现提交都要更新，最新在最上面）。
- **JobPilot**：`luoz76070-art/JobPilot`（私有镜像，上游 jlifeng/JobPilot，Apache-2.0）。
  - main 跟上游。默认分支 recruitment = 上游 5ce122b + 3 个改动提交 + CI，和线上 `/opt/recruitment-suite/JobPilot` 逐文件一致。三个改动是：重复选项校验；LinkedIn 照片改用 OpenAI 兼容图片模型并保留上次结果；Node 22 镜像和 compose。
  - 上游 4 个 workflow 已手动停用（CI、Desktop CI、Release Desktop、Welcome），其中有 Windows/macOS Tauri 构建，私有库按倍数计分钟。不要推上游 tag。说明在仓库的 RECRUITMENT.md。
  - 主仓库 `deploy/jobpilot/*.patch` 已经和线上对不上：Dockerfile 那份是 Codex apply_patch 格式，linkedin-photo-persistence 应用失败。以 JobPilot 仓库为准。
  - Mac 上的 `~/workspace/JobPilot` 是另一份浅克隆（v1.7.0，有未提交的 linkedin-photo 改动），不是这个镜像。
- **CI**：
  - recruitment-suite 的 `ci.yml`：`make check`（Python 3.11 + Node 22，CI 上会真的展开 Docker Compose；399 校园 + 10 运维测试）和 Bridge 测试（150 项）。首轮 run 44333475605 绿。
  - 11-18 改了 `check_project.sh` 两处：YAML 检查用 Ruby 3 的关键字参数；Compose 在临时副本里用 `.env.example` 展开（第 8 步禁止 deploy/ 下有 `.env`）。
  - JobPilot 的 Recruitment CI：lint、type-check、duplicate-options 回归。run 44334769741 绿。
- **线上**：recruitment-suite 主机的 `/opt/recruitment-suite`，见 [[shijing-cloud-server]]。
  - 容器：recruitment-campus-collector(127.0.0.1:8010)、recruitment-ai-gateway(8030)、recruitment-jobpilot(3010)、recruitment-ai-cache(redis)，各目录自己的 compose.yml。
  - 除 JobPilot（上游克隆加未提交改动）外不是 git checkout。ai-gateway、ai-config-manager 和仓库一致；campus-collector 只有测试文件不同。
  - ai-config-manager 是 systemd 服务。cron 有 recruitment-campus-backup、recruitment-campus-health。
  - 入口：suite.us.zyzlz.xin（主工作台）、campus.us、/ai-config/、resume.us。
  - `backups/` 有 85 个目录、约 1.2 GB，超出“只留一份”，但里面有数据库快照和回滚点。清理等用户决定，我没动。
- **发版**：目前手动，按 docs/EXECUTION.md 的流程：在线 SQLite 备份并异机校验 → 构建 → 切换 → 核验。没有 GitHub 部署链；要做得在服务器建部署账号加 sudo 脚本（同 animal-world-cup），等用户批准。只有用户说“发”才上线。
- **工作线**：没有，我自己做。
