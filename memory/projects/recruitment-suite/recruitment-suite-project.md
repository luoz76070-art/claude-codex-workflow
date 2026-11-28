---
name: recruitment-suite-project
description: "招聘套件（校园岗位工作台 campus-collector、AI Gateway、ai-config-manager、JobPilot）的两个私有库、CI、线上结构和接入进度（工作流 #8 第三个项目，11-18 接入）；用户要后续深入优化"
metadata:
  node_type: memory
  type: project
  originSessionId: aa35ee15-1c32-4e56-b9d5-6c873136f5d9
  modified: 2026-11-23T06:35:42.827Z
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
- **前端重写方案（`docs/FRONTEND-REWRITE-PLAN-20261120.md`，用户 11-20 已确认，main e6c0a61）**：
  - 用户的决定：
    - 登录页拖动条放真实的公开校园公告；
    - 品牌名等做完再定；
    - 手机端要同等支持；
    - 429 时停下来，由用户选渠道（不预设备用渠道）。
  - **采集方式调整（取代 11-19 的“浏览时暂存”）**：
    - 待挑选只接**自动采集**：列表搜索 → 挑分数最高的 10–15 条 → 限量打开详情（第一周每天 10 个，之后最多 40 个，间隔 20–60 秒，只在夜间窗口）→ 放进待挑选；
    - 半自动做成**浏览器扩展**：Chrome 侧边栏（招聘网站看不到它），打开详情页后点“加入岗位库”或“跳过”，加入的直接进岗位库。复用设备令牌和 `/api/workbench/device-import`。
  - 新顺序（共 19–28 天）：
    0. 地基（**11-20 15:00 已发布**，main 037b1f0，campus 镜像 a311e7428243，回滚点 20261120-065752：`deploy/campus-collector/web`，`/next/` 只给管理员，登录页拖动条接 `/api/public/landing`；部署工作流在 Actions 里构建并把 `static/next` 追加进包）；
    1. 岗位库（**11-20 15:20 已发布**，main 25ab8e6，campus 镜像 e02a580bf7ba，回滚点 20261120-072017：三个视图共用 JobsPage，筛选条件在 hash 里；导入、申请采集、按学校查、偏好与材料、批量草稿/AI 精评仍链旧版）；
    2. 浏览器扩展（**11-20 15:40 已发布**，main 00e54a8，campus 镜像 fb89e34168d0，回滚点 20261120-073934；用户稍后在真实 Boss 页面实测：`web/extension`，MV3 侧边栏，先只支持 Boss 独立详情页；配对码 `RS1.`+base64url({o,t}) 复用设备令牌；后端 `/api/workbench/extension/{me,lookup,jobs}`；安装包由发布工作流构建到 `static/downloads/recruitment-suite-extension.zip`；还没在真实 Boss 页面试过；切换前只有管理员能在新版生成配对码）；
    3. 自动采集加待挑选（**11-20 15:50 已派 Codex**，用户同意提前改派：接口约定 `docs/INBOX-AUTO-COLLECT-SPEC-20261120.md`（main 0ed8943）；线 1 `codex/inbox-backend-web` 做 job_inbox 表、接口和 #inbox 卡组页，线 2 `codex/bridge-auto-collect` 做本机采集器 BOSS_AUTO_COLLECT 模式；gpt-6.2-sol high；工作线共用 `.codex-lanes/venv`（只读）和 `.codex-lanes/cache/npm`；lane-reset 从本地主仓库克隆，派活前要先把本地 main 快进。**11-20 16:28 两条线都已合并，未发布**：PR #24（线 1，我补了“已在待投递/已投递的岗位再保存不报 409、保持原状态”）和 PR #23（线 2）进 main d3f3260；我自己跑过 make check（要把 `.codex-lanes/venv/bin` 放 PATH 前面，系统 python3 的 starlette 缺 httpx2 会让 AI Gateway 测试报错）、Bridge npm test 161 项、前端 44 项；接口对接只核对了代码（评分按输入顺序逐条返回、Boss 链接两边一致），没做真实联调；**11-20 16:49 已发布 campus**（用户说“发”，run 44705569196，镜像 a3401050f8fe，回滚点 20261120-084943）；**11-20 17:20 本机 Bridge 已重装到 main ff28671**（launchd `com.zyzlz.recruitment-job-bridge`，`zsh <checkout>/deploy/local-job-bridge/install-macos-service.command`；备份只留 `~/.recruitment-job-bridge/backups/before-auto-collect-20261120`）。**17:23 自动采集已开**：用户在专用窗口（`~/.recruitment-job-bridge/chrome-profile`，调试口 9335）换成专用 Boss 号登录后才开；`~/.recruitment-job-bridge/.env` 里 BOSS_AUTO_COLLECT=1、每天 10 个详情、关键词 AI应用开发/大模型应用/Agent开发（用户选，和简历方向一致）、城市杭州+成都（用户选，第一周少搜）；平台偏好城市是 5 个、月薪 17–22K。17:23 第一次手动跑：8 分钟、无验证，81 条去重→前 15→开 10 个详情（8 正文、2 条猎头岗退回卡片）→待挑选新增 10 条，分 76–85；万宝盛华（外包）得高分）。**11-20 17:58 发布外包识别**（main 74ea8d2，run 44715105529，回滚点 20261120-095814，备份 campus-20261120T095820）：`job_scorer.outsourcing_signal` 看单位名单（18 家）、人力/劳务类公司名、驻华为/腾讯园区；发布后只重算被认出的：待挑选 3 条、岗位库 6 条→≤15 分。**用户的项目文件夹要跟着同步**：我在 /tmp/rs-b2 工作树提交、`push HEAD:main`，项目文件夹的 main 不会自己动（11-20 发现停在 62fab81 一整天）；每次推完在项目目录 `git fetch && git merge --ff-only origin/main`。**用户 11-20 定：先做本机采集器界面（精简+统一样式），再做多人自动采集（方案 A：扩展加自动模式，管理员按人开通，各自待挑选）。** **11-20 20:10 三个 PR 全部合并，main 680d7a6，未发布**：#25 本机采集器界面（我顺手去掉页头全角冒号和“已批准的 猎聘 诉求”空格；本机已重装到 24a58ec，备份只留 `backups/before-bridge-ui-20261120`）；#27 线 1 服务端+平台页（users 加 auto_collect_allowed/auto_collect 两列；待挑选按 owner_id；5 个扩展接口；`/next/` 放行 admin 或已开通用户——这是线 1 问出来后我定的，已写进约定；管理员在 #inbox 开通）；#26 线 2 扩展 0.2.0（alarms 每 10 分钟、runner.html 驱动后台 Boss 标签、详情被跳到别的 Boss 页时记 card 不暂停——审查后改的）。合并后 make check 442 项、前端 73 项、构建和扩展打包通过；5 个接口的字段我逐项对过，但没做真浏览器联调，#inbox 设置面板没截图。**11-20 20:17 已发布**（用户说“发”，run 44734397371，镜像 49c05ca9354d，回滚点 20261120-121658，备份 campus-20261120T121727）：两列已补、14 个用户无人开通、扩展下载包 0.2.0、新接口无凭证 401、bridge 令牌调 known 200；用户 Mac 扩展文件夹已换 0.2.0。**11-20 20:32 实测丢数据**：测试用户 zyzance 用 0.2.0“立即运行一次”开了 10 个详情、平台新增 0（0.2.0 等全部读完才上传，任务页在上传前没了；服务端日志无 upload/结束报告；原因是用户关了标签还是扩展被重载，未确认）。**修复 0.2.1（main a9d33ce，PR #28）11-20 21:29 已发布**（用户说“发”，run 44744585182，夜间窗口 force——发布前查过 tasks 表没有 running；镜像 4ebe2db54e62，回滚点 20261120-132856，备份 campus-20261120T132901；记录 0097744）：读一条存本机队列（storage.local 按账号）马上逐条上传+进度报告、下次先补传、任务页固定标签、中途关闭不暂停、平台超 2 小时“进行中”显示“可能已中断”。用户 Mac 扩展文件夹（~/Downloads/recruitment-suite-extension）已原地换 0.2.1，**11-20 23:10 第 4 步开工**（用户“同意”）：分工和文件归属在 `docs/STEP4-PAGES-20261120.md`（main abb71b1，五个页面各有占位文件、路由已接好）。第 1 轮：线 1 `codex/step4-account-drawers`（账号菜单三个抽屉 + 新版本提示 + 菜单入口），线 2 `codex/step4-owner-pages`（投递批次、公司报告；线 2 原线程被桌面端占着，daemon 新建了线程 01a1f983-0e44-78e3-a9f6-10ba5d3b431e）。**第 1 轮 11-20 已合并 main 214e055（PR #30、#31，CI 绿），等用户说“发”**；审查时用 Playwright 打桩数据截图（route 拦截 /api/*，本地构建当页面）。**第 2 轮 11-21 已合并 main 9522fee（PR #32 管理、#33 学校目录+采集与更新+五页按需加载，主包 479 kB；我修了管理标签高亮 aria-current: → aria-[current=page]:），CI 绿。**11-21 00:20 两轮已发布**（run 44772108480 force，镜像 74ca909fe91e，回滚点 20261120-161927；发布前等测试账号夜间自动采集跑完：00:02–00:13 读 15 详情新增 15，第一次夜间实测通过）。注意：夜间发布前先看 docker logs 里有没有 extension/inbox 请求，有就等跑完。**11-21 第 3 轮已派（用户“接着做”）**：分工写在 STEP4-PAGES 文档最后一节（main 143d81e）。线 1 `codex/step4-jobs-gaps`：对照计划第 5 节补岗位页缺口（生成草稿批次、查看匹配依据、AI 精评、“查看本次结果”改成带条件打开岗位页）。线 2 `codex/step5-switch`：`/` 给所有人新版、旧版挪 `/classic` 到 11-28、`/next/` 302 到 `/`、401 进 #login、错误边界、检查脚本和文档改成切换后。切换要等用户说“发”。**11-21 01:43 第 3 轮已发布（main ff34100，PR #34、#35，campus 镜像 571c19a3c542，回滚点 20261120-174335）**：`/` 是新版，旧版在 `/classic`，11-28 后删旧版、账号菜单“旧版”入口和 `/advanced` 跳转（待办）。全国来源库：用户 11-19 定“暂缓”；现状是杭州 29 校、成都 6 校、绍兴 2 校有启用来源，夜间定时只跑杭州，订阅 0；方案在 APP-OPTIMIZATION-PLAN-20261119 第 7、8 节。11-21 用户问起其他地区，已回复现状和建议。用户选先试 ncss.cn：11-21 已试探（结果 docs/NCSS-PROBE-20261121.md，main 7322fdb）——岗位补充够用、代替不了学校就业网；线上服务器访问不到只能 Mac 跑；匿名每查询 50 条，不登录绕；11-21 用户同意接入并确认范围（含来源学校），范围写在 docs/NCSS-INTEGRATION-20261121.md（main 0323afc）；PR #36 已审、本机真实试跑通过，审查时补了“公告也收”，11-21 18:55 已发布（campus 镜像 efb842296759，回滚点 20261121-105517；Mac 采集器已重装，备份 ~/.recruitment-job-bridge/backups/before-ncss-20261121）。第一次真实夜间诉求还没跑。第二期（夜间自动进待挑选、Mac 核验下线）待定。本周本机花费 11-21 00:30 时 253 美元，写代码都交 Codex。第 4 步剩下：岗位页“带入投递草稿”和采集结果筛选/批量（共用岗位页）、新前端加错误边界（接口结构不对会白屏）。之后是第 5 步切换。两条线不改 EXECUTION.md，合并时我统一记录。每轮审查后等用户说“发”。**11-20 22:40 登录页按模板重做已发布**（main 19378fd，PR #29：Codex 线 1 走 daemon 路线做，我审查后修了日期按北京时间、去掉 summary（库里 summary 列是页面头部杂项，不能当摘要）、标题断行；用户预览后又修了关详情后卡片条停住、弧形遮罩区域能点开卡片；run 44755670622 force，镜像 6b6c1abc59b6，回滚点 20261120-144041；未登录访客 /next/ 现在直接看到新登录页，普通用户登录后回旧版；预览办法：本机 node 小服务器 127.0.0.1:8791 读本地构建，公告数据用分支代码只读查生产库生成）。**11-20 21:32 用户实测通过**（额度调到 15：5 详情/新增 5，入库时间分散=逐条上传；记录在 main）；zyzance 本机今天已开 10 个（算额度），要点“我已处理，恢复”解除 0.2.0 留下的暂停。11-20 19:30–20:00 Mac 连不上 GitHub（Tailscale DNS 把 github.com 指到 127.0.0.1），用户修好了。本周本机花费约 219 美元（sessions.sqlite api_requests 按 device_id 汇总，本机是 a155f974…）。**扩展 0.1.1**（main ac1183a，未发布）：用户实测发现列表页 `/web/geek/jobs` 右侧详情识别不了（第 2 步只适配 job_detail），已修好并在用户真实标签页上用 osascript 只读验证；用户的扩展是从 `~/Downloads/recruitment-suite-extension` 加载的未打包扩展，我已原地覆盖成 0.1.1（原地覆盖才能保住扩展 ID 和配对）；网站下载包等下次“发”。**0.1.2**（main bc01753）：用户 Chrome 对这个扩展开了站点访问限制（Secure Preferences 里 withholding_permissions=true，只运行时放行 zhipin），平台地址被扣住→请求变跨站预检→405→“Failed to fetch”；侧边栏现在先查权限、没有就给“允许访问”按钮；本机文件夹已换成 0.1.2；**11-20 17:10 已发布**（用户说“发”，run 44708373229，镜像 e29c56f92af5，回滚点 20261120-091017，线上下载包 0.1.2）；调试 Boss 页面结构的办法：Mac 上 osascript 让 Chrome `execute javascript` 在用户已打开的 Boss 标签里只读跑脚本（Chrome 已开“允许 Apple 事件中的 JavaScript”）；
    4. 其余页面；
    5. 切换。
  - 这意味着 Boss 自动化以限量形式重新打开（11-19 用户说过不再开自动搜索，11-20 自己改了主意）。
  - 用户 11-20 定：扩展面板用 Chrome 侧边栏；自动采集用户单独准备一个 Boss 账号。
  - 登录页公告（用户 11-20 定“排除”）：只收 campus_recruitment/recruitment_notice，标题含教师、人才、公开招聘、招聘会等 15 个词的去掉，多校转载按标题去重；当时近 60 天 255 → 209 → 124 条不重复，取最新 16 条。卡片写“来源：学校”，因为就业网常转载外单位公告。
  - 本机截图方法：vite dev（`--host 127.0.0.1`）+ 本地假后端，Playwright 用 `~/.recruitment-job-bridge/app/node_modules/playwright` 加 `channel: "chrome"`（缓存里的 chromium 版本和两个 playwright 都对不上）。
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
  11-28 起写代码尽量派 Codex（不再等 250 美元）。用户已确认新顺序：发布 → 前端地基加想法 1 → 岗位库 → 其余页面 → 切换 → 想法 2 → 扩展。

**挑选模型（11-21 讨论）**：用户要三步走都纳入（记录跳过和原因 → 与收藏相似度 → 逻辑回归），并考虑判断模型。11-21 在 Mac 实测开源 chinese-decision-0.8b（魔搭/HF quincyqiang，Apache-2.0，基于 Qwen3.5-0.8B）：MPS 每题中位 0.57 秒（766 token，线性注意力走慢速回退）；用户 16 条要/4 条不要/150 条背景，要vs不要 AUC 模型 0.78、规则 0.57，要vs背景 模型 0.89、规则 0.92；规则低于 50 分的 6 条要的岗位里模型给出 0.75 以上的有 4 条（互补）；两者都分不清用户对“讲师”类岗位的个人取舍。样本太小，结论只作参考。环境在 Mac /tmp/cdtest（venv + 模型 1.5 GB，重启可能被清），测试数据已删。Jev 官方接口未测（用户没给账号）。

**11-22 01:18 已发布第一期+库整理**（run 44928989348 force，镜像 03f97bcd29a1，回滚点 20261121-171531，备份 campus-20261121T171806）；正文归档 790 条等用户在“公共库维护”确认；两条“没再出现”规则跟踪满 7 天后再确认。**标题年份规则 PR #40 已合并 main 9936db6 未发布**（线上命中 411/1471，抽查全对）。**判断模型多用途测试**：标题和页面是否同一条 AUC 1.000（好用）；校招/社招 73%、单位性质会混淆发布学校（一般）；7 类分类 38%、外包 0.76、截止 0.54（不用）。**11-22 01:46 已发布 PR #40+#41**（run 44931733749 force，镜像 7372546b722e，回滚点 20261121-174544，备份 campus-20261121T174557；Mac 采集器已重装，备份 backups/before-judge-20261122，01:48 第一批 50 条判断上传成功）。等用户在“公共库维护”确认标题年份（411）和正文归档（790），在“判断模型复核”处理分歧。**第二期 11-22 02:26 已发布**（第一次因 Dockerfile 漏 worthwhile.py 健康检查失败自动恢复；修正+check_project 模块清单检查后重发 run 44935306121，镜像 0c59835062fa，回滚点 20261121-182439）。KeyError 修正 11-22 03:01 已发布（镜像 d0b80266af92，回滚点 20261121-190112）。首次核对：合成 0.965 > 规则 0.952，但模型只覆盖 6/16“要”未通过。候选先判已标记岗位的修正 11-22 03:27 已发布（main 275127b，镜像 ea8a1590518f，回滚点 20261121-192719，记录 a06f78f）。待看：11-23 夜间之后核对的模型覆盖率和是否通过。用户 11-22 说待确认项（标题年份、正文归档、判断模型复核）已做完；判断模型认为错了点“忽略”。**页面是不是原岗位（same_page）11-23 14:33 已发布**（PR #43，run 45124624413，镜像 75fb4778a01b，回滚点 20261123-063143，记录 5e5fe99）：只做校园（平台岗位公开核验拿不到正文）；存档要等 82 条逐批核验后才有。**第二期核对 11-23 通过**（覆盖 16/16、4/4；对背景合成 0.964>规则 0.951；对“不要”模型 0.812、规则 0.57），原账号推荐度已含模型部分。 教训：新增 campus 模块要写进 Dockerfile；发版前可在服务器用 rsdrill- 临时镜像+备份副本断网启动验证。原记录——第二期 PR #42：任务 worthwhile_to_apply 排在 is_recruitment 前、只对用户 id 1、每晚≤150；推荐度三者取高，核对门槛：模型覆盖≥一半“要”且合成≥规则。下一步候选：加“标题和页面是否同一条”任务。以下为发布前记录——**判断模型复核框架 PR #41 合并 main d7c5361**：服务器定义任务、Mac 01–05 点空闲时每轮 50 条、每晚≤2000、管理员复核队列；第一个任务 is_recruitment，下一个加“标题和页面是否同一条”。我修了“确认是招聘后被压回待核实”。Mac `~/.recruitment-job-bridge/judge` 已装好并实跑通过（模型版本 341307aa5cbc:hmm-zh-v1）；发版时要发 campus + 按流程重装本机采集器（备份、rsync 预演、install-macos-service.command、核对 capabilities 里有 judge）。
**11-22 库整理（PR #38）+ 挑选模型第一期（PR #37）合并 main 450c14f**：用户定 45 天/平台 90 天/正文 30 天/不删；原因选项合适、推荐度默认开、第二期先只给原账号。Codex 两次停下核查出“最后看到时间”不可靠（详情走缓存不更新；Boss known 已采过不上传），改成新列 list_seen_at + 跟踪满 7 天才算，两条“没再出现”规则要管理员在跟踪满后单独看预览确认。我审查改了：备份工具只读挂载宿主机 /opt/recruitment-suite/ops/campus_backup.py → 容器 /opt/ops/（create_host_path false）、整理备份 keep=1、撤回关闭时取回归档正文、模型下载单独成层、原因提示条位置。镜像构建时从 HF 下 bge-small-zh ONNX（服务器能连）；mem_limit 768m。判断模型离线测试（11-22，数据已删）：是不是招聘信息 AUC 0.992；是否已截止 0.541（不能用于关闭）；待核实里约 1/3 标题年份已过（规则可做，等用户定）。
**11-21 晚两份方案已写（main 3efe75e）**：docs/LIBRARY-CLEANUP-PLAN-20261121.md（校园库 3328：关闭 1535/待核实 1476/确认 317，默认可见 254；平台 711 条 80% 超 90 天没再采到；建议规则收紧不删数据，4 个待定项）和 docs/PICK-MODEL-PLAN-20261121.md（三期：服务器挑选记录+相似度 → Mac 判断模型 → 个人逻辑回归；3 个待定项）。ncss 第一次真实夜间诉求 #8 23:44 入库 11 条。
**扩展 0.3.0（猎聘、国聘）11-23 15:34 已发布**（PR #44 + 我的审查修正 14a4737，run 45131950846，镜像 f202b92187d8，回滚点 20261123-073358，备份 campus-20261123T073411，记录 2924bb5）：平台适配器 `extension/src/platforms.ts`；猎聘、国聘走可选站点权限 + `chrome.scripting.registerContentScripts`（新增 scripting 权限）；自动采集平台勾选默认只 Boss，三站共用每日额度，每轮合计 20 搜索/15 详情，被拦只停该平台（blockedPlatforms，点“恢复”清除）。国聘列表标题点了是页面建隐藏 target=_blank 链接再 click（查过线上公开 JS），探测时要拦 HTMLAnchorElement.prototype.click，不只是 window.open；手动模式不在用户页面点标题。部署要等这个提交的 CI 跑完，否则流水线直接拒绝（第一次就被拒了）。用户 Mac 扩展文件夹已换 0.3.0，备份只留上一版（现为 `backups/extension-0.3.0-20261123`）。待用户实测：猎聘/国聘详情手动保存，再试自动采集；猎聘列表、国聘搜索/地区筛选/详情只用离线样本测过。
**扩展 0.3.1 11-23 17:11 已发布**（main 667aeee，run 45144624879，镜像 52fc4fbd5532，回滚点 20261123-091046，记录 ec8feb3）：用户实测问题——①扩展配对的是测试账号 zyzance、网站登录 Rorance，所以“加入后网站上没有”（侧边栏现在写明存进哪个账号；用户要存进 Rorance 得用 Rorance 配对码重连）；②猎聘 /a/ 猎头职位不显示单位 → 单位写“猎头职位（企业未公开）”；③国聘按页面脚本真实结构读（标题 .title-section .title、单位 .job-company-wrap .company-title 或标签页标题“职位-单位”、薪资 .salary-section），未在浏览器渲染核对。**待用户定**：本机采集器给猎聘、国聘加夜间自动进待挑选（照 BOSS_AUTO_COLLECT）、猎聘“申请采集”改成自动搜索（现为 manual_visible_page）；投递不在范围内；同一账号同一平台只开扩展或本机采集器一边。查页面结构的办法：Linux 主机上 curl 公开页面（猎聘服务端渲染）或公开 JS 包（国聘是 SPA，看 assets/*.js 里的 className）；Mac 无头 Chrome 11-23 下午启动超时过。
**本机采集器猎聘/国聘 + 扩展 0.3.2 11-24 18:31 已发布**（PR #45，main 7c94f0d，run 45375105929，镜像 c9f2402debe5，回滚点 20261124-102857，记录 0936fbb；本机采集器已重装，备份只留 backups/before-liepin-guopin-20261124；扩展文件夹 0.3.2，备份只留 extension-0.3.1-20261124）：`.env` 新开关 LIEPIN_AUTO_COLLECT / GUOPIN_AUTO_COLLECT（默认关，关键词城市额度沿用 BOSS_AUTO_COLLECT_*，三站合计）；猎聘诉求自动搜索（详情间隔我改成 15–40 秒）；本机采集器每小时 POST /api/bridge/nightly-policy 报平台，原账号扩展跳过。**本机 Boss 夜间自动采集 11-21 21:00 起因“专用窗口不可用”一直暂停**，要用户开窗口后点恢复。教训：①审查工作树别放 /tmp（macOS 会清掉 .git，11-24 /tmp/rs-b2 坏了），现在用 `~/workspace/rs-review`（git worktree）；②派 Codex 时 nohup 的 codex-run 会随 ssh 会话结束被杀，Codex 照常跑完——别等退出文件，直接查 PR/分支；③本机采集器测试日期要写显式 +08:00，CI 是 UTC；④gh run watch 会因网络中断提前退出 1，要用 gh run view 再确认状态；⑤gh run list --commit 要用完整 SHA。
**11-24 晚**：本机采集器“打开窗口”修正已装（main a25f59c，备份只留 backups/before-window-fix-20261124；原因是专用 Chrome 无窗口在跑+刚启动时页面没加载）。`.env` 已开 LIEPIN_AUTO_COLLECT、GUOPIN_AUTO_COLLECT（备份 backups/env-before-liepin-guopin-20261124），首次夜间运行 11-25 21:00，三站合计每天 10 个详情。本机 Boss 已恢复，11-24 21:40 手动跑新增 10 条。用户同意整理本机采集器页面（三站统一、检查登录、猎聘条件采集、平台开关挪到页面、去掉牛客），已派 Codex **线 2** `codex/bridge-ui-tidy`（线 1 线程报 “already has an active writer”，疑似下午被断开的 nohup 运行留下的，需要时用桌面端或新线程处理）。本机采集器 UI 的截图办法：`~/workspace/rs-shot` 用 Playwright（app 的 node_modules）截 http://127.0.0.1:8790，看完删掉。
**本机采集器页面整理 11-24 22:35 已装**（PR #46 + 我的审查修正 130b97a，main 00c79af，CI 45414877470，记录 696a25e；只装本机采集器，服务器没部署；备份只留 backups/before-ui-tidy-20261124）：页面分 平台窗口/夜间自动采集/采集诉求（猎聘条件采集）/确认后投递/已确认岗位/后台任务，牛客已去掉；夜间平台在页面勾选，存 runtimeDir/night-platforms.json（没有就沿用 .env）；国聘、猎聘搜索前检查登录（POST /api/(guopin|liepin)/session 只读页面，不跳转），未登录只停该站。教训：Codex 按“退出登录/我的投递”判断登录，在真实已登录页面上全错；登录标记要用真实页头（猎聘 .header-quick-menu-username/-user-photo，未登录 .header-quick-menu-not-login-item；国聘 .avatar-box .user-name/img.avatar），只看顶部 150px。装好后两站都是 ready。国聘未登录页只用模拟页验证过。**待查**：11-25 21:00 后看猎聘、国聘第一次夜间采集结果（状态 bossAutoCollect.last/pauses、待挑选新增）。
**11-25 00:10 用户决定（取代 11-24 晚关于投递和 AI 聊天的讨论）**：取消“自动投递”和“AI 自动聊天”两项功能，不再提；已实现的一并清除——即本机采集器的“确认后投递”（Boss/国聘投递适配器、执行/检查/回执补偿接口、页面“确认后投递/已确认岗位”两块、相关 .env 和测试）以及服务器/网站里只为本机执行投递服务的部分。我定的边界：生产库里的历史投递记录不删（8 批、18 条），手动“已投递”标记保留（推荐过滤要用）；历史发布记录文档不改，只改描述现状的文档。AI 聊天没有任何代码或文档，无需清除。时间：11-25 白天写清除改动，等 11-25 21:00 首次猎聘国聘夜间采集看完后，11-26 白天发布（要用户说“发”）。
**原账号自动采集的确定项（11-25）**：两种方式＝本机采集器＋浏览器扩展；页面验证直接用当前账号（原账号，Boss 也一样），页面不限定；扩展在浏览器环境能运行即可；其余未确认项用户说不再补充，按既定方向：本机采集器负责的平台扩展跳过、原账号每日额度合成一份。因为服务器现在禁止原账号开扩展自动采集，页面验证前先放开这一小块（第 3 步的一部分提前）。之后三站采集稳定一周只留扩展，本机采集器保留判断模型（及采集诉求、ncss，视使用再迁）。

**11-25 凌晨开了 3 个 PR，都没合并、没发版（发版要用户说“发”）**：
- #47 `claude/remove-auto-submit` 清除自动投递（CI 通过）。发布时要 campus 部署 + 按流程重装本机采集器；Mac 运行目录里旧的 submission-config.json、boss-submission-chrome-profile 没删，留给用户决定。
- #48 `claude/owner-extension-auto-collect`：原账号不需开通即可用扩展自动采集（admin 开关对 id 1 仍 400），网页给原账号显示设置表单；原账号的扩展上传和本机采集器共用 `bridge.auto_collect.quota` 计数，两边各按自己的上限（扩展按网页设置，本机按 .env）。CI 通过。
- #49 `claude/extension-login-check` 扩展 0.3.3：猎聘、国聘搜索列表要等页头显示账号才用，30 秒没有就暂停“需要登录”（标记同本机采集器）。只读核对过专用窗口：国聘 /job/list、猎聘 /industry/ 页头都判为已登录；猎聘 /zhaopin/ 搜索页还没核对。
- #48 和 #49 改了 web/README.md 同一行，后合并的要解冲突。
- **注意**：生产上本机采集器上报接管 boss、liepin、guopin 三站（每天 10 个详情），所以 #48 发布后原账号扩展会全部跳过；要做页面验证和“两种方式同时进行”，得先把某些平台从本机采集器的夜间平台里去掉（页面勾选，存 night-platforms.json）。我的建议：等 11-25 21:00 本机首跑看完，再把猎聘、国聘交给扩展，Boss 留本机。
- 11-25 用户让删 8 月的两个未跟踪文件 BLOCKED.md、PROGRESS.md（旧投递记录），已删。项目目录还剩未跟踪的 项目筛选与部署记录.md（7 月，最早的方案挑选记录），没动。
**11-25 10:20 更新**：#48 合并 main fa74954，#49 解 README 冲突后合并 6416e2c（main CI 通过；deploy check run 45531418486 通过，线上 campus 仍是 7c94f0d / c9f2402debe5）。#47 已 rebase 到 6416e2c（eb7b52b），测试全过，**故意没合并**：等今晚本机首跑后和重装本机采集器一起发。已加一次性定时任务 `recruitment-first-liepin-guopin-night`（11-25 22:10，接续本会话，只读看首跑结果）。用户 Chrome 里的扩展配对的是测试账号 zyzance，原账号做页面验证前要用 Rorance 的配对码重连。
**#48 + #49 11-25 11:40 已发布**（用户说“发”；main 6416e2c，run 45541433372 白天无 force，campus 镜像 b2117ccde93d，回滚点 20261125-033945，备份 campus-20261125T034001.048165Z，记录 ee7b63f）：健康 200、日志无报错、下载包 0.3.3（路径 /static/downloads/recruitment-suite-extension.zip）。扩展文件夹 ~/Downloads/recruitment-suite-extension 已换 0.3.3，备份只留 ~/.recruitment-job-bridge/backups/extension-0.3.2-20261125。本机采集器没动。构建扩展要在 ~/workspace/rs-review 里（项目目录没有 node_modules）。#47 仍未合并（基于 6416e2c）。
**11-26 上午**：11-25 晚 Mac 从 20:00 一直睡（pmset 日志 DarkWake/Sleep 循环），21:00 夜间采集没跑、22:10 检查任务也没发出。11:01 用户手动跑本机采集器：Boss 新增 4（共享计数 3 详情），猎聘、国聘同一毫秒“专用窗口不可用”暂停——原因是睡眠断开 CDP 后 platform-page-target 把断线当成关标签（invalidated），之后一直拒绝。11:06 我把本机采集器夜间平台改成只留 Boss（POST /api/boss/auto-collect/config，生成 ~/.recruitment-job-bridge/night-platforms.json，服务器 bridge_platforms 同步为 [boss]），原账号扩展（用户已用 Rorance 重新配对、启用三站、每天 20）的猎聘、国聘因此可跑。修复 PR #50（断线自动重连 + 21–09 caffeinate -i -s -w + 轮询报错带原因）。#47、#50 都已合并 main e357474（CI 通过），**待用户说“发”**：campus 部署（#47）+ 按流程重装本机采集器（rsync 预演删除 24 个文件，正好是 #47 删掉的，node_modules 0 删除）。扩展 UI 待改：全部平台被本机采集器接管时按钮变灰但没写原因（下次扩展更新加一句），暂停提示“猎聘 需要登录”多一个空格。
**#47 + #50 11-26 17:38 已发布**（用户说“发”；main e357474，run 45793694915 白天无 force，campus 镜像 497ce57071ec，回滚点 20261126-093800，备份 campus-20261126T093819.584804Z，记录 de0d7f2）：本机采集器已重装，备份只留 backups/before-remove-submit-20261126（rsync 删除 24 个＝#47 删掉的文件）；.env 哈希 bcf137b4… 不变；投递接口 404；夜间平台 Boss；登录检查猎聘、国聘 ready；历史批次 8 批保留。至此自动投递已全部移除。待办：原账号扩展猎聘、国聘页面验证（用户点“立即运行一次”，11-26 17:40 时还没运行记录）；今晚首次按分工跑（Boss 本机、猎聘国聘扩展），需用户设置插电不睡眠；运行目录旧的 submission-config.json、boss-submission-chrome-profile 等用户决定；扩展 0.3.4 小改（全部被接管时说明原因、“猎聘 需要登录”空格）；11-28 后去 /classic。
**11-26 晚扩展问题**：用户不要把猎聘、国聘交回本机采集器（“像 boss 的浏览器扩展一样”）。扩展在用户自己的 Chrome 开新标签，登录要在那个 Chrome 里做（专用窗口登录不通用）。用户登录后猎聘报“页面无法读取”（猎聘 2026-11 改版为哈希样式名 `_40108… jobDetailBox` / `jobTitleBox` / `companyName`，薪资在无名 span），国聘仍报“需要登录”（0.3.3 要求认出头像）。PR #51（扩展 0.3.4）11-26 19:07 已发布（main 8f3bc8f，镜像 544d45325251，回滚点 20261126-110510，扩展文件夹已换 0.3.4、备份只留 extension-0.3.3-20261126）：猎聘新旧结构都读；登录只在明确未登录时暂停（猎聘 .header-quick-menu-not-login-item、国聘 .nav-right .login“登录/注册”）。验证方法：临时无头 Chrome（/tmp 配置，用完删）+ rolldown 把 platforms.ts 打成 IIFE 注入真实页面跑 read()；猎聘 40 条+详情完整，国聘选杭州 20 条+详情完整。本机采集器 liepin-collector.mjs 也用 .job-detail-box，同样受改版影响，未修。
**11-26 19:50 猎聘登录后列表**：0.3.4 后国聘扩展实跑成功（新增 15），猎聘仍失败。原因：登录后的猎聘搜索页（search-jobs-v2）是左列表右详情，卡片 `.job-card-pc-container.search-job-card` 没有 `<a>`，链接只在 React 数据 `item.card.job.link` 里；右侧 `.search-job-detail-card[data-job-id][data-job-kind]`。专用窗口开新标签会被猎聘脚本跳成空白（检测到调试连接），不绕过；结构是从公开脚本 concat.lietou-static.com/fe-www-pc/v6/js/src_pages_search-jobs-v2_bootstrap… 查到的。PR #52（扩展 0.3.5，liepin-page.ts 在 MAIN world 读 fiber 取链接，不点不请求；手动保存也能列出）CI 全过，**待用户说“发”**。登录后的详情页结构未验证。额度：原账号三平台共用一个每天计数、先到先得；本机采集器上限 10 看的是合计数，扩展先用掉 ≥10 时当晚 Boss 会被挤掉（代码推断）——已向用户提出按平台分配的选项，等他选。
**#52 扩展 0.3.5 11-26 20:03 已发布**（用户说“发”；main 03ba8e3，run 45815872623 白天无 force，campus 镜像 8bcd296f99d5，回滚点 20261126-120241，备份 campus-20261126T120249.695669Z，记录 71985d9）：健康 200、日志无报错、下载包 0.3.5；扩展文件夹已换 0.3.5，备份只留 extension-0.3.4-20261126。用户需在 chrome://extensions 重新加载。注意：Mac 脚本里 `ssh recruitment-suite` 要加 -n，否则会吃掉后面的脚本。
**用户提议用扩展取代本机采集器（11-26 20:05）**：扩展已有定时（alarm 每 10 分钟，21–09 每晚只跑一次，每次最多 20 搜索/15 详情，按平台平分）。本机采集器独有：不开 Chrome 也能跑（launchd + 专用窗口）、caffeinate 防睡眠、独立窗口。我建议分步：今晚保持分工 → 扩展加夜间防睡眠（chrome.power）+ 每晚可用满每天上限 → Boss 也交给扩展试几晚（改本机采集器夜间平台为空需用户同意）→ 稳定后卸载服务、删代码（另开 PR）。等用户定。
**11-26 20:20 每平台单独上限 + 同时采集**：用户选 B（网页上三个平台各填每日详情数、互不占用）并要求三平台同时采集。PR #53（扩展 0.3.6，分支 feat/per-platform-limits）CI 全过，**待用户说“发”**。服务器：`details_per_platform`（每站 1–40，默认 10）、计数 `details_today_by_platform`；扩展和本机采集器上传都按网页该平台上限查，本机采集器 .env 合计上限（10）仍由它自己执行（没改本机采集器代码）；旧 `details_per_day` 当作每站上限（原账号旧值 20 → 每站 20，发后要用户自己填）；当天旧合计计数不拆，各站当天从 0 开始；接口仍返回所选平台合计供旧扩展。扩展：每站一个后台标签同时跑，每站每轮最多 20 搜索、详情读到当天剩余（≤40），一站暂停/出错/额满不影响其他站；队列串行上传；本机打开计数按站（openedBy）；ActiveRun.workTabs 记录所有标签。分步取代本机采集器的方案用户还没明确答复。
**11-26 21:02 Boss 交给扩展**（用户说“要交给扩展”）：本机采集器夜间平台已改为 []（POST /api/boss/auto-collect/config，night-platforms.json = {"platforms":[]}），服务器 bridge.auto_collect.owner 21:02:55 已同步为 []。当晚本机采集器 21:00:24 的 Boss 运行在 known 步骤失败（created 0），原因是 21:00–21:02 Mac 连不上生产站（服务器正常、GitHub 正常），是“20:45–21:10 常断线”的同一现象；不是我改设置造成的（改设置在运行结束后）。当时共享计数 18/20（旧规则，#53 未发），当晚扩展夜间只剩 2 条详情。**纠正**：本机采集器不能整个退役——它还负责国家就业平台（ncss）夜间采集、判断模型夜间复核（judge-runner）、已批准的采集诉求（job-requests）；扩展只接了 Boss/猎聘/国聘。#53 用户还没说“发”。
**11-26 21:05 用户要 issue 批量工作流**：参照 MobiCodex（凑一批 issue → 定时任务扫描修复），本项目补上，并写进工作流库让新项目复用；每个项目一个专属定时任务，不混。用户要求**先给方案、确认后再做**。现状：工作流库已有 templates/project/issue-review.json（21:00、接续会话）；线上 mobicodex-issue-review 一个任务管 MobiCodex+工作流两个库（这就是“混”）；config.json recruitment-suite.schedules 为空。
**11-26 晚 issue 批量工作流已接入**（用户确认：10:30、每次新开会话、仍等“发”、只有用户明确说“记成 issue”才算、同意拆 MobiCodex 混合任务）：仓库 main 9aae13f 加了 `docs/ISSUE-BATCH.md`（修一批、测试、发版步骤）和 `.github/ISSUE_TEMPLATE/`（问题、新需求）；标签 area:extension/web/server/bridge、approved、deferred、wontfix、fixed-unreleased、needs-user-test 已建；项目 CLAUDE.md 第 3 节加了规则；线上定时任务 `recruitment-suite-issue-batch` 每天 10:30、target new（项目目录）、模型 claude-opus-5-5。工作流库：模板 issue-batch.json、ISSUE-BATCH.md、ISSUE_TEMPLATE、scripts/setup-issue-labels.sh、docs/issue-batch.md、通用记忆 issue-batch-workflow.md；doctor 认 new 型任务；MobiCodex 任务只留 MobiCodex，工作流库拆成 21:40 `workflow-issue-review`（都发给 aa35ee15）。定时任务文件备份只留 schedules.json.before-issue-batch。
