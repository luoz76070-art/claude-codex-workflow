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

**11-19 深入优化方案已出，等用户挑：** Mac 上 `docs/DEEP-OPTIMIZATION-PLAN-20261119.md`（未提交）。A1–A6 / B / C 共 17 项，按收益和风险排序。要点：
- A1：公网 /metrics 未鉴权（754KB），扫描路径让指标标签无限增长。
- A2：campus 没开 --proxy-headers，登录限流所有人共用 172.21.0.1 一个计数。
- A3：`_allowed_by_robots` 的 except Exception 吞掉了 AccessRestrictedError；浙大（source 1）、浙江机电（3464）的 robots.txt 返回首页 HTML，已连续 13–14 晚失败。
- A4：ai-config-manager 还依赖已删除的 ai-job properties（healthz config_exists:false，首页按代码推断会 500）；/save 没有 CSRF 防护。
- B1：备份 gzip 实测 37→10MB，可省约 660MB。
- B2：健康 error（11-09～11-12 容量闸门停采 4 晚）没有通知到人。
- B3：Gateway 和配置管理没有任何测试；Mac 异机同步约 20% 次数 ssh 255 失败。
建议第一批做 A1–A5 加 B3。

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
  - `backups/` 11-18 已清理（用户“清单按照你的思路来”）：只留 `campus/`（定时备份 28 份）、`capacity-20261103`、`release-public-boundaries-20261113-v2`。campus 镜像还有 3 个手工标签（public-boundaries/before-public-boundaries/workbench-ui 等，两份旧镜像各约 248MB）和 `/opt/recruitment-suite/releases/`（17MB 旧暂存目录），没动，可以在深入优化时提议清理。
- **发版（11-19 起）**：手动 Deploy 工作流（PR #1，90be9c6），只有用户说“发”才跑 deploy/rollback：`gh workflow run deploy.yml -R luoz76070-art/recruitment-suite -f action=check|deploy|rollback -f components=gateway,campus,config,portal [-f force=true]`（Mac 上带代理）。
  - 只发 main 且该提交 CI 通过；北京时间 21–09 夜间采集窗口切 campus 要 force。
  - 服务器 `/usr/local/sbin/recruitment-suite-deploy`（源码 deploy/scripts/production_deploy.sh；改了要 root 重新 install），账号 rsdeploy（forced command + sudoers 只许这一个脚本），Secrets RS_DEPLOY_SSH_KEY/KNOWN_HOSTS/HOST。
  - 脚本：构建时旧容器继续服务；campus 切换前用 campus_backup.py 在线备份并校验；每组件一个回滚点在 `/opt/recruitment-suite/.deploy/<组件>/`；健康检查失败自动恢复；发布源码在 /opt/recruitment-suite-releases。
  - 11-19 在服务器隔离沙箱（rsdrill- 前缀、18010/18030/18020、假 .env、独立网络）演练过成功、失败自动恢复、回滚，生产没动；Actions 跑 check 成功（run 44362337205）。
  - 不管 Nginx、ops/cron、JobPilot、证书（仍用 remote_deploy.sh 手动）；异机备份不在工作流里。
  - **首次正式发布已完成（用户 11-19 凌晨说“发”）**：四个组件都是 90be9c6，运行代码与发布前一致（只有测试和 .env.example 不同）。gateway、config、portal 11-19 02:56（run 44374867706，回滚点 20261118-185520，gateway 镜像 a7fc15b848b2）；campus 11-19 09:31（run 44437482131，无 force，新镜像 release-20261119-013111-90be9c6 / fcbe7ced76d4，原 bac12b087fb7；切换前在线备份 campus-20261119T013140.567298Z.sqlite3；回滚点 20261119-013111）。两个 healthz 200。EXECUTION.md 记录在 4d9ef87。定时任务 recruitment-campus-first-deploy 已执行完。
- **工作线**：没有，我自己做。
