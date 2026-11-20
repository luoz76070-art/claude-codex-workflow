---
name: recruitment-suite-project
description: "招聘套件（校园岗位工作台 campus-collector、AI Gateway、ai-config-manager、JobPilot）的两个私有库、CI、线上结构和接入进度（工作流 #8 第三个项目，11-18 接入）；用户要后续深入优化"
metadata:
  node_type: memory
  type: project
  originSessionId: aa35ee15-1c32-4e56-b9d5-6c873136f5d9
  modified: 2026-11-19T13:27:32.084Z
---

**用户 11-18：** “接着做，后续还要深入的优化这个项目”。接入已完成；深入优化的范围还没定，先给方案再动手。

**11-19 深入优化方案已出，等用户挑：** Mac 上 `docs/DEEP-OPTIMIZATION-PLAN-20261119.md`（未提交）。A1–A5、B1–B6、C1–C6 共 17 项，按收益和风险排序。要点：
- A1：公网 /metrics 未鉴权（754KB），扫描路径让指标标签无限增长。
- A2：campus 没开 --proxy-headers，登录限流所有人共用 172.21.0.1 一个计数。
- A3：`_allowed_by_robots` 的 except Exception 吞掉了 AccessRestrictedError；浙大（source 1）、浙江机电（3464）的 robots.txt 返回首页 HTML，已连续 13–14 晚失败。
- A4：ai-config-manager 还依赖已删除的 ai-job properties（healthz config_exists:false，首页按代码推断会 500）；/save 没有 CSRF 防护。
- B1：备份 gzip 实测 37→10MB，可省约 660MB。
- B2：健康 error（11-09～11-12 容量闸门停采 4 晚）没有通知到人。
- B3：Gateway 和配置管理没有任何测试；Mac 异机同步约 20% 次数 ssh 255 失败。
建议第一批做 A1–A5 加 B3。用户 11-19 同意按建议做代码层方案。

**11-19 应用层方案：** `docs/APP-OPTIMIZATION-PLAN-20261119.md`（未提交）。要点：
- 分类 bug：`reclassify_opportunities` 用“标题+正文”分类，覆盖了采集时“先看标题”的结果。就业网来源上 150 条被标成 faculty_staff，其中约 33 条是企业校招。
- 合规：Boss、国聘、猎聘、牛客的岗位都是 shared_public=1，等于再分发；Boss 自动搜索与 Boss robots 冲突；简历存在境外服务器、发给 AI，缺少个人信息出境的告知和同意。
- 覆盖：2956 所学校里只有 64 所有官网，能采的约 40 所。
- 速度：全局单连接，全国跑一轮约 39 小时。
- 过期：在架 793 条中 508 条待核实，每天约 80 次核验；建议用列表消失信号和按类型的时效规则。
- 全国来源库估算：能用版 3–4 周，接近全量 2–3 个月；全量入库有容量问题。
**用户 11-19 的决定：**
1. 平台岗位（Boss、国聘、猎聘、牛客）改为本人可见。Boss 自动搜索默认关闭（11-19 晚定，做在第二批）。
2. 同意改成每站单连接、多站并行。
3. robots.txt 返回 HTML 的来源放行，按没有规则处理。
4. 全国来源库暂缓，不开展。
5. 第一批照做：A1–A5、B3、分类修正（P1），再加上 1、2、3 三条。上线要等用户说“发”。

**11-20 第一批和第二批都已发布**，记录在 docs/EXECUTION.md（main 5a41739）。
- 第一批（#2、#13，main 0f52206）：
  - 发布 run 44657788859，gateway、campus、config 三个组件，回滚点都是 20261120-020128；gateway 镜像 812e539db5b8。
  - Nginx 用 remote_deploy.sh 只装 Nginx；发布脚本用 root 重装过。
  - 检查全过：
    - 公网 /metrics 返回 404，本机 7.6KB；
    - 访问日志里是真实 IP；
    - concurrency=4，分类版本 2026.11.19.1，就业网来源被标成教职工的从 150 降到 0；
    - 平台岗位可见性 0/2/0；
    - 三个组件都是 FastAPI 0.162.5。
  - **踩坑**：README 的“仅装 Nginx”命令原来没写 DEPLOY_PORTAL=false，脚本把 portal 重新复制了一遍，删掉了 .deployed-commit（内容没变，已补回 90be9c6）。README 已修。
- 第二批（PR #16，main b099b2d）：
  - campus 发布 run 44659018049，镜像 1f5d0c29a4c9，回滚点 20261120-021146（回滚镜像 078f10a204cf）。
  - ops 用 install.sh 装好，装之前的备份在 `backups/ops-before-20261120/`。
  - 备份压缩：1022MB 降到 328MB，压一轮用了 62 秒。
  - Mac 本机采集器已重装。.env 在 `~/.recruitment-job-bridge/.env`，安装脚本不会碰。
  - Mac 备份同步已重装，用的是 Homebrew Python 3.13。
  - PR #17（2d0bfb2）修了 health_digest：兼容 Python 3.9，ssh 不再读 stdin。
  - 每日巡检 `recruitment-daily-health` 已打开，每天 09:40 运行。
- **11-20 用户说“删了”，已清理**：
  - 3 个旧 campus 镜像（4 个标签）和 `releases/` 都删了，实际只腾出 17MB。
  - 原因：主机用 containerd 镜像存储，旧镜像的层仍被构建缓存引用。构建缓存是全机共用的，不做 builder prune。以后估算“删镜像能省多少”不能只看 docker system df 里的 unique 大小。
  - /ai-config/ 用户 11-20 已登录，返回 200，页面正常。
- 小遗留：设置表里 `retention.job_days` 还是 90，代码不读这个值，界面也不显示。其余 Dependabot PR（uvicorn 0.54 ×3、redis 8.1、playwright 1.65、两个 actions 大版本）还没评估。
- **操作提醒**：
  - 在 Mac 的 device-script 里调用 `ssh recruitment-suite '…'` 要加 `-n`，否则会把后面的脚本当输入读走；
  - `docker exec` 要喂脚本得用 `-i`。
- **前端重写方案已出（11-20，main 0564b56，`docs/FRONTEND-REWRITE-PLAN-20261120.md`），等用户确认**。要点：
  - 新版放在 `/next/`，只有管理员能看；旧版冻结，只修 bug；
  - 每个旧按钮在新版的位置列在第 5 节；
  - 在 GitHub Actions 里构建，打进 git archive 的源码包，服务器不装 Node；
  - 新表 job_inbox 和 inbox 接口；本机采集器监听 Boss 的 `/job_detail/` 页面；
  - 共 15–22 天。
  等用户定的事：
  - 登录页拖动条用真实的公开校园公告，还是示例卡片；
  - 品牌名；
  - 手机端要不要同等支持；
  - 是否预先同意 429 时用备用渠道。
- **Boss 实证（11-19 查）**：Boss 共 607 条，7 个采集日（7-13 到 10-09），单日最多 177 条，只有 1 条是详情；本机采集器日志里“安全验证”和“访问频繁”都是 0 次。低频列表搜索没被封控，但自动打开详情页从没试过。
- **在讨论（11-19 晚，用户提出）**：
  1. 浏览时暂存看过的详情，回平台用卡通风格的卡片挑选保存，做个人岗位库；
  2. 自动搜索代替人浏览，结果进同一个挑选箱；
  3. 采集程序让其他用户也能用（app 或网站）。
  我的建议：
  - 1 赞成；
  - 2 限量做，只对评分靠前的开详情，只给本人用；
  - 3 做成 Chrome 扩展，网站读不到用户的 Boss 页面。
  用户 11-19 定：
  - 顺序照这个来：发布 → 想法 1 → 想法 2 限量版 → Chrome 扩展。
  - Mac 上 Boss 自动搜索不再开（BOSS_AUTO_SEARCH 保持关）。
- **界面风格（11-19 晚讨论中，只分析不动手）**：用户给了一份黑白极简的落地页模板提示词（“Bespoke Architecture Studio”，React+Vite+Tailwind，Geist 字体，图片拖拽长条，抽屉菜单），问能不能统一全站风格，后面还要按原有功能和按钮调整布局。
  我认错了一点：上次说“只有挑选页用卡通”本身就是割裂。改成全站用同一套设计规则，趣味放在动效和拖拽上。
  我的分析：
  - 只取设计语言，不照搬素材，因为 logo、文案、图片是别人的；
  - Google Fonts 在大陆加载不了，Geist 也没有中文；
  - 状态色要保留；
  - 先改现有 CSS（3–5 天），React 重写（2–3 周）等做 Chrome 扩展时再评估。
  **用户 11-19 定**：
  - 风格用黑白极简，不用卡通；
  - 走 B，前端用 React + TS + Vite + Tailwind 重写（我原本建议先改 CSS，用户选重写）；
  - logo 以后再设计；
  - 登录页图片条用岗位卡片代替照片；
  - 岗位库也用卡片代替文字行，我建议卡片为默认、保留列表切换。
  我提的做法：逐步迁移。新前端先挂在 /next/ 并行跑，功能对齐后再切 /，旧版保留一周当回退。想法 1 的挑选页直接用 React 写，并把重写排在想法 2 和扩展前面。顺序要用户确认；工作量 3–4 周（含想法 1），会超 250 美元，要先备好 Codex 条件。
- 还没做：说明页承诺“注销请联系管理员”，但没有一键删除功能；72 条近期岗位完全没有日期（48 条来自人事处来源），是日期抽取的问题。

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
- **工作线**：11-19 晚已装 lanes：`.codex-lanes/lane-1`、`lane-2`，都从 0f52206 开始；钥匙串服务名 `github-pat-recruitment-suite`。安装脚本只从本地克隆，不带 refs/codex。11-19 21:30 都齐了：
  - 用户建好令牌，存进了钥匙串。
  - 线1 是 01a1f3fc-2f96-74b1-bf14-e95a73bf1b89（lane-1），线2 是 01a1f3fc-1bdf-7573-a3db-4c947d10279a（lane-2），已写进 config.json（工作流库 ba7e5a9）。两个线程建立时的模型是 pro20x gpt-6-astra xhigh。11-19 起派活指定 ccs-pro20x/gpt-6.2-sol，见 [[codex-model-assignment]]。
  - doctor 0 失败 0 提醒。
  - 用 gh-codex 只读验证过令牌：能读本仓库的代码、PR 和 Actions，读 JobPilot 返回 404，说明只授权了这一个仓库。写权限要等 Codex 第一次推送才能验证。
  - 还没配 testThread。
  花费到 250 美元后改派 Codex。用户已确认新顺序：发布 → 前端地基加想法 1 → 岗位库 → 其余页面 → 切换 → 想法 2 → 扩展。
