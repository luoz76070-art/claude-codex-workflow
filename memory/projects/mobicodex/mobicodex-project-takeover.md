---
name: mobicodex-project-takeover
description: Project now lives at repo root /Users/rorance/workspace/project (MobiCodex); user gave Claude full control incl. GitHub build/release work
metadata:
  node_type: memory
  type: project
  originSessionId: aa35ee15-1c32-4e56-b9d5-6c873136f5d9
  modified: 2026-11-15T05:30:00.000Z
---

2026-11-13 用户把项目交给我全权负责，原话是"全权接管该项目文件"，不用担心我自己的 token 消耗。当前任务是在 GitHub 上把代码编译、发布出来。

**⚠️ 11-14 起改为独立 App（用户决定“换吧，电脑页的 UI 和功能不要变回原来的”）：** 不再要 Kelivo，只做电脑这部分，Kelivo 版停更。U9、T1 取消，W2b 随 Kelivo 作废，Flutter 不装。
- A0 已合并（51303c5，合并 638aa2a，已推送）。apps/mobile 独立壳：com.mobilecodex.app，**0.2.0 / code40**，Mac debug 证书 3ffb81f3（与旧 1.3.x 及各更新通道 APK 相同，旧版可直接覆盖）。
- 改动内容：
  - 独立版也套 `.product-remote-shell`，但没有底部导航。
  - 配色在 `features/product/standalone.ts`，与 Kelivo 默认 MobiCodex 主题（动态取色关闭时）逐项一致。基准值写在 `scripts/test-mobile-standalone.mjs` 里，来自模拟器上 Kelivo 的 product-shell-v1 prefs。
  - 外观设置（主题、聊天字号、工具卡片、结果摘要）放进电脑页设置。
  - 原生新增 `ProductWindow` 插件：处理系统深浅色和系统栏颜色；MainActivity 处理返回键（product-back 事件，没有拦截就退到后台）和 SDK35 insets。
  - 热更新新增 stage/applyStaged：App 打开 8 秒后后台下载，下次启动以试运行方式生效；用户退回的版本记在 `mobicodexHotUpdateDeclined`，不再自动下载。
- 发版流程：release-android.yml（推 `mobicodex-v<versionName>` 标签就触发）已改为构建时写入 zyzlz 的 preview 与 hot 通道地址。仓库的签名 secret 就是 3ffb81f3 证书，CI APK 不用重签（没有 secret 时才用一次性 CI 密钥）。
- 动态取色（15c56d0）：跟随系统取色默认开，按 dynamic_color 1.9.0 的规则取 65 个系统色，与 Kelivo 开启动态取色时逐项一致。
- **0.2.0 已发布（11-14，用户说“发布”）**：CI run 43594130630，APK sha 660f45ae…，3,406,790 字节。`android/preview/` 的 latest.json 已指向 code40，并新建了 preview/index.html 下载页；Kelivo 下载页顶部加了跳转提示（旧页备份在 `.index-before-standalone-0.2.0.html`）。hot 通道没动。发布结果写在 releases/android/mobicodex/0.2.0/README.md（599faec），证据在 output/audit/2026-11-14/release-0.2.0/。生成页面的脚本也存在那里（make-index.py、kelivo-notice.py），下次发版改 facts.json 再跑。
  - 公网核对：Linux 访问 zyzlz.xin 的 HTTPS 时常握手超时，这时改在 Mac 上用 `curl --noproxy '*'` 核对。
- **0.3.0 已发布（11-15，用户说“先发版”，F1+F6+F3 一起）**：提交 54ff963、tag mobicodex-v0.3.0、Release run 43680473935；APK `mobile-codex-0.3.0-4c7564e98d68.apk` 3,431,646 字节，证书 3ffb81f3。preview 通道 latest→0.3.0/41、previous→0.2.0，下载页换新（旧页备份 `android/backups/20261115-132358-preview-0.2.0/`），hot 没动。结果写在 releases/android/mobicodex/0.3.0/README.md（17718e9），证据和 make-index.py 在 output/audit/2026-11-15/release-0.3.0/。
- **0.3.1 已发布（11-15，用户说“发”）**：#15 + #18 + C2 手机端。提交 8fae5ea、tag mobicodex-v0.3.1、Release run 43728957275；APK `mobile-codex-0.3.1-152e239f3493.apk` 3,431,646 字节（和 0.3.0 碰巧同字节数，校验值不同），证书 3ffb81f3。preview latest→0.3.1/42、previous→0.3.0/41，下载页换新，旧页备份在服务器 android/backups/（按用户规则只留这一份）。结果写在 releases/android/mobicodex/0.3.1/README.md（a5c4572），证据在 output/audit/2026-11-15/release-0.3.1/。**C2 用户 11-15 真机验收通过。** 正式包没再上模拟器（调试包合并前已验收）。
  - 发布服务器要带密钥：`MOBILE_CODEX_RELEASE_SSH_KEY=~/.ssh/hermes_scout_bridge_ed25519`，单条 ssh 也要 `-i` 它（别名 hermes-8153 没配密钥，不带会 Permission denied）。apksigner 要先设 JAVA_HOME=openjdk@17。
  - Mac 网关已切到 `releases/2026-11-15-v0.3.0-9f93e2ae0678`（PID 17978），旧版 2026-11-14-deepseek-w4b-4179f637ccfc 备份在 `backups/2026-11-14-deepseek-w4b-4179f637ccfc-1794719925/`。核对：status 隧道 connected、公网未鉴权 401、`/api/threads` 22 个 Codex 线程、DeepSeek 13 个会话（Codex 走 /api/threads，/api/agents/codex/sessions 返回 409 是正常的）。
- **新功能（11-14 用户定）**：任务清单已改成第 4 版（55df4db），顺序是 F1 通知 → F6 额度用完换渠道（方案 C 已同意）→ F3 分享入口和快捷方式（吸收 W2b）→ F7 App 内反馈（用户同意走收件箱，21:00 复盘时脱敏再提 issue）。F4、F5 穿插做，F2 暂定。建议的发版点：0.3.0 = F1+F6，0.3.1 = F3+F7，仍然要等用户说“发”。
  - **F1 完成（11-14，合并 458f06d，未发布）**：网关 `apps/relay/src/attention/`（AttentionHub 只看手机发过任务的线程；/api/attention、/events、/respond），安卓 `Attention*.java`（specialUse 前台服务，只在有任务时运行，约 90 秒空闲自停）。发版要同时升级电脑端网关（`pnpm build:plugin` 切新版）。
    - 模拟器验证方法：`/tmp/f1-gateway.mjs <worktree>` 用分支的 dist 起真网关加假通道（端口 18796，`/fixture/desktop` 改状态，`/fixture/calls` 看收到的审批；`F1_THREAD=same-thread` 对上合成页的线程）。再 `adb reverse tcp:18796 tcp:18796`，`pm grant POST_NOTIFICATIONS`，用 CDP 调 `Capacitor.Plugins.Attention.configure/start`。
    - 系统会把多条通知自动折叠成一组。点折叠组里的那一行不会触发通知自己的跳转，要先展开再点。
    - 顺手修了一个老问题：readThread 拿到没有 messages 的回复时，React 渲染崩溃导致整页白屏。现在会抛出错误。
  - **F6 完成（11-14，第一版合并 68bd649；按用户要求改成原线程换渠道，合并 900829b，未发布）**：用户否决了开新线程的做法。改版后在原线程里切换：桌面线程由桌面端执行这一轮，网关线程由网关续跑；卡片只列不需要先调用旧模型就能换过去的模型；手机上显示“正在用 X 顶替 Y”，可以一键换回。原理见 [[codex-desktop-control]] 的“换模型”。下面是第一版的记录：网关 `apps/relay/src/codex/modelSwitch.ts`、`server/modelSwitchRoutes.ts`（/api/codex/models、/threads/:id/switch-options、/continue）；手机 `features/quota/`。顺带修了：rollout 里 `task_complete` 带 error（429）以前被当成功。
    - 模拟器验证方法：`/tmp/f6-env.sh`（模拟器 + `/tmp/f6-gateway.mjs` + `/tmp/f6-proxy.mjs`）。网关用真 store 读临时 Codex home 里的 429 线程，假 liveTurns 记录调用（消息含 “429” 时这一轮以额度用完结束），假桌面端离线、不碰真 Codex。代理 18797 → 网关 18796，换成管理令牌；`adb reverse tcp:8787 tcp:18797`。管理令牌是 f6-admin-token，`/fixture/calls` 要带它。
    - 公开仓库里的测试数据用虚构渠道名（ccs-team/团队账号、ccs-cn/国产模型、ccs-relay/中转站），不写真实渠道名。
    - 发现的老问题提了 issue #15（Relay 线程退后台后“正在恢复连接”不消失）。
  - **F3 完成（11-15，合并 4f853e2，PR #16 原生、#17 网页端，未发布，建议随 0.3.1）**：第一次两条 Codex 线并行（秋API gpt-6.1-sol high），设计 `docs/plans/2026-11-15-f3-share-and-shortcuts.md`。原生 IntakePlugin（分享 SEND/SEND_MULTIPLE、静态+动态快捷方式），网页端 ShareSheet、useIntake、CapturePanel initialDraft、VoiceInput openRequest。只要新 APK，网关不变。
    - 模拟器验证：`/tmp/f3-env.sh`（f3-gateway.mjs 由 f6 的改来，线程正常结束）。图片分享要用系统“文件”App 长按→分享来测，`am start --grant-read-uri-permission` 在 Android 16 上授权不生效。
  - **CC Desk（11-15 用户定）**：服务端升级不了；同意服务凭据交给网关（钥匙串，用户自己输入）；先做路线 C。
    - 11-15 核查桌面端（CC Desk Tunnel 0.3.2，ad-hoc 签名，Electron 没开 asar 完整性校验，这台机器上不能应用内升级）：没有对外控制接口。本机只开两个内部端口：proxy-bridge 的 ws（32 字节随机口令 + Origin 校验 + 只允许一个连接，已被它自己的窗口占用）和 posix-ssh-worker 的 SSH 转发口。实时“收”路线 C 就能做；实时发、审批、停止只能走路线 A（给 app.asar 打补丁加本机 socket），客户端被服务端钉在 0.3.2，补丁维护成本低。11-15 用户同意并确认路线 A。**第 1 步已完成（main bbcfe4e）**：`integrations/cc-desk/`（control.mjs 本机接口、asar.mjs、patch.mjs install/status/remove/extract、README），CI `pnpm test:ccdesk`。副本已生成在 `~/Applications/CC Desk Tunnel（手机控制）.app`（原版没动，副本去掉隔离标记、封印失效但能跑）。本机接口 `~/.mobicodex/ccdesk/<hash12>.sock`+同名 .json，每行 JSON：op status/command。本地端到端：Mac `/tmp/ccdesk-fixture`（Linux 上服务端源码 + zod/ws，SDK 和 node-pty 换空壳，端口 18821，TLS 前置 18822，地址要带 `/ws`）；`test/e2e-fixture.mjs` 14 项、`test/e2e-electron.mjs`（副本 + `--user-data-dir` + `--remote-debugging-port=9341`，CDP 填登录表单、截图）4 项都过。**第 2 步 11-15 已通过**：用户已切到副本（以后日常用副本），真实服务端上经 socket 发消息、run.cancel、approval.reply（会话权限要是 default 才会弹审批，auto 下直接执行）都成功，客户端 client.log 有逐条 relayed 记录。测试会话“MobiCodex 本机接口测试”在 ~/测试。原第 2 步方法：没有任务运行时退出 CC Desk、打开副本、新建会话“手机控制测试”后发消息给我；我从 Linux 只读查 `/home/a/.local/share/cc-desk-tunnel-data/state/sessions.sqlite`（`file:...?mode=ro`，表 sessions/events）拿会话 ID、runId、approvalId，再经 socket 测发消息、审批、停止。之后 C2a（网关只读连接）+ C2b（写走 socket）。W3b 新建会话仍走定时任务文件（窗口连接上 session.create 会顶掉窗口订阅）。
    - 路线 A 的事实（服务端源码在 Linux `~/.local/share/cc-desk-tunnel/program`，客户端解包在 Mac /tmp/ccdesk-0.3.2）：客户端 proxy-bridge.mjs 在主进程里明文转发 JSON 帧（local.on message → remote.send；remote.on message → local.send），补丁就在这里注入/截回。每条连接只能订阅一个会话（session.subscribe 会 clear），message.send 会给该连接 add 订阅；所以读消息不能借窗口连接，网关读要用自己的控制连接。连接发 `device` 帧就会在服务端建 seat/Door，网关只读连接只发 auth(tunnel:false)、不发 device（visibility 默认 shared，不需要）。渲染层收到任何会话的 native.metrics/capabilities 都会覆盖当前显示，补丁必须按窗口自己的订阅过滤 session.event/fragment，并吞掉注入请求的 response。Electron 44.5.1；客户端用 safeStorage（钥匙串）存登录凭据，改签名可能触发钥匙串授权。下一步 C2a（只读接入 + 定时任务文件发送 + 送达确认）和 W3b，C2b（审批、停止等）暂缓。设计见 `docs/plans/2026-11-14-c0-cc-desk-control.md`。
  - **C2 网关接入 CC Desk 已完成（11-15，main de519fe，CI 43690404744 全绿，未发布）**：适配器 `apps/relay/src/agents/ccDesk*.ts`（读走网关自己的连接、只发 auth 不发 device；写走补丁副本的本机接口），命令行 `ccdesk login|logout|status`（凭据用户在终端输入进钥匙串 mobicodex-ccdesk / 账户=服务地址；我不读）。测试：`ccDesk.test.mjs` 9 项（CI），本地端到端 `integrations/cc-desk/test/e2e-gateway.mjs --fixture /tmp/ccdesk-fixture --bridge /tmp/ccdesk-extract` 11 项。手机端旧版本就能显示 CC Desk（sessionApi:1），新文字和错误提示要等界面更新（等用户说“发”）。
    - 11-15 用户已 `ccdesk login`（钥匙串有凭据）。网关现跑 `releases/2026-11-15-c2-ccdesk-device-e26c4b498834`（PID 44170；目录名哈希=lib/gateway.mjs 的 sha256 前 12 位；切换前备份在 backups/2026-11-15-v0.3.0-9f93e2ae0678-1794728450）。旧版 CLI 认不出 ccdesk 配置段，停/启要用新版 CLI。
    - **真实服务端开着 PROXY_SESSION_VISIBILITY=device**：不报设备的连接看不到会话；`device` 帧会按 auth.deviceName 给该设备所有会话改名；最后一条连接发 leave 会立刻结束运行。修正 5a5cc33（CI 绿）：挂钩把窗口的 deviceName/device id 放进本机接口状态，网关读连接照抄，窗口断开就断，从不发 leave。补丁副本要重装（`patch.mjs install --force`，副本开着时拒绝）；11-15 挂了后台任务等用户退出副本后自动重装。Mac 主机名现在是 localhost，CC Desk 重启后会把这台 Mac 的会话设备名改成 localhost（它自己的行为）。
    - **11-15 公开仓库历史改写了两遍（用户同意）**：第 1 遍把本机身份和个人 Gmail 换成 noreply（提交、提交者、19 个注释标签）；第 2 遍删掉曾混进来的 7 个别的项目（Windsurf-api/WinderU-api、auto-zhaoping、hermes-deploy、image-studio、library-manage(-broken)、sub2api-v1）和 Hermes 部署工作流，并把本机路径换成 `~`、用户名换成 `owner`（`.trellis/workspace/owner/`）、发布服务器 IP/SSH 别名/密钥文件名换成占位符。两遍都在本地克隆里做、逐文件核对、26 个引用带 lease 原子强推；Release 资产都在；CI 绿。之后 f88f640 把文档里的提交号换成新号。
    - **提交号全变了**：旧号→新号用 `output/audit/2026-11-15/history-rewrite/commit-map-original-to-final`（含两遍之前的原始号和第 1 遍后的号；全 0 = 该提交已删）。改写前备份：同目录 `before-all-refs.bundle`（最原始）、`before-second-rewrite.bundle`。7 个项目各自的历史导出在 `~/workspace/project-archive/20261113-mobicodex-repo-boundary/moved-projects-history/<名>.git`（裸仓库，main 最后一提交是 11-13 移出，`main~1` 是完整内容）。
    - 改不了的：第三方 fork（10-22 创建）和 16 个 PR 引用仍保留旧内容；要彻底清得找 GitHub Support（对外，需用户同意）。历史里没有真密钥（扫过私钥、各类令牌、密码赋值，都是测试值/示例/占位符）。
  - **云服务器项目接入 GitHub（工作流私有库 #8，用户 11-15 提出）**：两台服务器约 20 个项目，工程量大，用户定 11-18 Codex 周限额度更新后再做；已设一次性定时任务 `cloud-projects-to-github-start`（11-18 10:00，接续本会话）：先查额度，再把范围/公开/顺序三项问用户，答复前不建库不推送。
- 验证方法：
  - 模拟器镜像是 default 版，`adb root` 后可以读 /data/data/*/shared_prefs。
  - debug APK 可以用 `adb forward tcp:9333 localabstract:webview_devtools_remote_<pid>` 接 CDP（ws 模块路径见 [[codex-desktop-control]]）。
  - 独立版没有打开任何浮层时按返回会退到后台，模拟器上这时 Kelivo 会跑到前台，别误以为点到了 Kelivo。
- 11-14 在 Linux 上用 curl 访问 api.github.com 被自动权限规则拦了（Unsanctioned Communication）。11-15 用户同意调 GitHub API，查 Release、CI 改用 Mac 上的 gh。

**项目位置：** e7f5a29 那个提交把 MobiCodex 提升到了仓库根目录，所以现在真正的项目在 `/Users/rorance/workspace/project`（remote 是 github.com/luoz76070-art/MobiCodex，旧名 project 会跳转；11-13 已用 set-url 改成新名；分支 main）。会话配置里的 `.../project/codex-to-phone` 只是遗留的旧目录，里面大多是空目录，计划以后清理（目前搁置）。所有命令都要在仓库根目录下执行。

**GitHub：** Mac 上的 `gh` 已经以 luoz76070-art 登录。git push 和 gh 操作在 Mac 上执行，因为凭据只在 Mac 上；用户的全权接管授权覆盖了 [[network-via-linux-host]] 里"git 走 Linux"那条。
- 工作流有三个：ci.yml、release-android.yml、release-kelivo.yml（名称是 "MobiCodex Kelivo Android Release"，手动触发）。
- Release 流程原来每次约 50 分钟，其中只出报告的 Flutter UI 测试约 30 分钟，Ubuntu 上固定有 29 个桌面/iOS 界面测试失败，Android lint、单元测试和构建约 16 分钟。204153b（11-13）把这部分 Flutter 测试拆成 3 个分片并行跑，job 权限为 contents: read，同时给发布 job 加了 setup-gradle 缓存。11-13 用户授权我用 `gh workflow run` 触发（只触发，查看仍走 Linux 公开网页）。实跑 Run 43411440346 成功：发布 job 用时 20.5 分钟，原来约 50 分钟，整次运行 26.8 分钟，3 个测试分片按预期报 exit 1。这次在 main 上写入了 Gradle 缓存，下一次运行才能看出缓存的效果。
- 用 `python3 scripts/package-kelivo-source.py` 打源码包，可以在本地干净克隆里配一个假 APK 预先跑一遍验证。

**交接时的状态：** 之前是桌面端 Codex 会话 01a1b66b（从 01a1a09e 分叉出来的）在做这件事。Kelivo Release 已于 11-13 成功（Run 43377520321）。11-13 推送了 7e1af40、e9e561e、ed5665c，内容是 codex-live-session 插件、docs 和 trellis 归档。`codex-to-phone-promo/` 按用户意思不提交。仓库是 **PUBLIC**，提交前要扫密钥和个人信息。

**优化任务清单（11-13 定稿，已提交 ec1be1d）：**
- 正式版在 `docs/plans/2026-11-13-blurt-optimization-task-list.md`，仓库公开，所以里面不写本机路径和 output/ 路径。草稿 `output/plans/…-draft.md` 留着备查。
- P0 = V1 S1 V2 V3 V4 S2 D2 B4 B1（B4 已提前）。派活分两条线：lane-1 V1→V2→V3→V4，lane-2 S1→S2→D2→B4→B1。复杂任务先让 Codex 出方案。
- 开工前需要用户在 Codex 桌面端新建两个对话，各发一句话，这样会话归桌面端所有，我才能用 IPC 派活。
- 用户 11-13 说网关 relaySecret 的轮换"后续再说"。
- **进度（11-14）：**
  - P0 已全部合并：V1(#1) S1(#2) V2(#3) V3(#4) S2(#5) D2(#6) V4(#7) B4+B1(#8)。
  - P1 已合并：B2(#9) W1(#10) U0(#11) U10/U11(#12) W2a(#13) U1+U2(#14) W3（481de7d）。
    - d68203e 是我修的 D2 回归：配对页发空 Bearer 被 401，新手机配不上。
    - W3 由 Codex 写到一半遇到 429，我导入快照后补了“结果不明的核对标记”（POST .../handoffs/:id/resolve），squash 合并。
    - W4（ba0c32d）是我自己做的：relay 里的 WorkItemProgress 把交接进度写回卡片。Codex 桌面端能精确对应回合；Agent 通道只做到“送达 → 进行中”，回合对应拆成 W4b。手机卡片补了验收、退回、重新打开这些操作。
    - W5（aeaf493）是我做的：顶栏原来的“新建事项”按钮改成“事项”页入口，页面按状态分五个标签，打开时有待验证就默认显示待验证，并用事件流实时刷新。合成页现在会提供合成事项数据，截图工具在 output/ui-review/tools/items-shot.cjs。
    - W6+V6（c18d6f4）：删卡时连带删图；每 6 小时清理一次，完成或退回超过 30 天的卡删图留字，24 小时没被任何卡引用的上传也删掉（MOBILE_CODEX_RETENTION_DAYS 可调）；手机端保存转写文字（不存录音），保留 30 天，可关闭。
    - U3（1300b64）审批卡：“允许一次”实心为主按钮，危险命令标红，文件改动按文件分块显示红绿差异（桌面端审批新增 files 字段）。截图工具在 output/ui-review/tools/approvals-shot.cjs，要先点“打开线程列表”，再切到“优化连接与消息同步”会话。
    - U12（f11a2bc）设置页：顶部连接卡（已连接 · 电脑名 · 延迟 · 重新检测）→ 配对与设备 → 语音 → 折叠的“高级”（手动连接、电脑状态、诊断）；去掉了 Relay/Token/Pair phone 等术语；401 文案改为“电脑拒绝了这台设备：可能已被撤销，或访问令牌不对”。截图工具 output/ui-review/tools/settings-shot.cjs（浅色、深色展开高级、320 宽 150% 字号）。
    - U4（fe3db6b）顶栏：Agent 图标 + 会话名 + 状态点一行，项目名标签替代路径；点标题切换 Agent；右上只留一个（连上时“事项”，连不上时“设置”）；刷新改为线程列表/Agent 会话列表下拉刷新，抽屉顶部保留刷新按钮并放了“设置”入口。shared/PullToRefresh、features/agents/AgentIcon（U13 复用）。截图工具 header-shot.cjs；settings-shot.cjs 已改为从抽屉进设置。
    - U5（2da5554）输入框：单行胶囊（附件/输入/语音/发送），空草稿时隐藏发送、语音键实心为主；有内容时发送键用品牌色（浅色墨、深色米白）；清空后高度缩回。截图工具 composer-shot.cjs。
    - U8 核对过：U0（9468afe）已经做完深色墨色系 #111317、米白文字和 AA 对比度测试，样式里也没有写死的颜色，不用再改。
    - U13（7da8005）Agent 选择页：每行有图标、在线/检测中/离线、描述、“N 个会话 · 最近活动 X”。在线状态以实际拉第一页会话是否成功为准，因为网关的 probe 状态没人刷新。Codex 一行用手机工作台缓存的线程列表。截图工具 agents-shot.cjs。
    - U7（d255dfc）动效与触感：发送/引导/排队轻震，审批允许单震、拒绝/取消双震（navigator.vibrate，Kelivo 宿主有 VIBRATE 权限，真机效果要等发布后验证）；设置“外观与触感”里可以关。消息和卡片在手机上恢复浮入，语音面板上滑，设置面板关闭时有滑出。验证脚本 motion-check.cjs。
    - U6（fa01116）加载改骨架屏（线程列表、聊天、Agent 列表/会话、事项页），空状态用 A1 标志插画（shared/BrandMark、EmptyState、Skeleton）；线程列表加载中不再误报“没有匹配的线程”。截图工具 states-shot.cjs（用 page.route 延迟请求截骨架屏）。
    - main 在 fa01116。P1 网页端 U 系列只剩 U9（Flutter，要 Kelivo 构建验证）。其余：V5（原生录音分段）、T1（Ubuntu Flutter 测试）、W2b/W3b/W4b、C0/C2/C3。W 主线 W1–W6 已完成，还剩 W2b、W3b、W4b。
  - 11-14 约 10:10 起 Codex 一直 429，我按 [[codex-quota-fallback]] 自己接着做。（进度见上）
  - 手机端网页跑在 Capacitor BridgeActivity 里（integrations/kelivo/remote-android 的 RemoteControlActivity），window.confirm/prompt 会变成原生对话框，可以用。
  - W3b（交接时新建会话）已写进任务清单，排在 C2 之后。W2b 是 Kelivo 原生代码，Mac 上没有 Flutter 验证不了，往后排。交接面板还是朴素表单，合成页也不支持事项接口，留给 U 系列打磨。
  - Codex 线程：线1 = 01a1d573-a55d…，线2 = 01a1d573-cc0f…。
- **0.1.9 已发布（11-14 完成）：** GitHub Release（Run 12，标签在 c893e35）+ 更新服务器 latest=code11（重签 APK eac306dc…，previous=code10）+ 源码 + 安装页，公网回下载逐字节一致，其他通道未动；README 已更新（fff569c）。证据在 output/audit/2026-11-14/release-0.1.9/。**用户 11-14 确认：已通过 App 内更新安装，能正常使用，震动反馈有效**（d5e4421 记入版本说明）。main 在 d5e4421。
- **0.1.9 发布过程（11-14 用户说“发布”）：**
  - 网关已切到 `releases/2026-11-14-p1-ui-5005e029e9a8`（PID 62182，实例 9f2689f8），旧版 2026-11-07-image-reference 保留；备份在 `backups/2026-11-14-p1-ui-5005e029e9a8-1794627901/`（gateway.json + workspace/.mobile-codex）。旧网关 stop 后 3 秒自然退出。DeepSeek 桥接仍是 0.2.7（S1/S2 的 lastTurn/活动字段可选，兼容；要显示需在 Harness 插件页升级桥接，需用户操作）。
  - Kelivo：标签 mobicodex-kelivo-v0.1.9-native-preview（code11）。第一次 Run 10（43553689105）失败：verify-kelivo.mjs 装好 APK 后会比对 `apps/mobile/src/features/product/identity.ts` 的 productVersionCode/Label，我只改了 pubspec。修复提交 7c4fa069 后删掉远端标签重打（没有发布过任何东西），Run 11（43555102583）。**以后发版：pubspec.yaml 和 identity.ts 两处都要改。** Run 11 过了 Android lint/测试/构建，卡在源码打包：B1 删了 13 个上游图标文件但 integrations/kelivo/source-files.json 还列着；c893e35 加了 removedUpstreamFiles 并改打包脚本，Run 12。**发版前先在干净克隆里用假 APK 跑 package-kelivo-source.py 和工作流的资产校验片段**（本地 25 秒，CI 一轮 25 分钟）。 CI 日志公开页面看不到（要登录），按用户规矩不在 Mac 上调 gh 接口，只能看步骤名和注解。B2 改名只做了 APK/源码包文件名（mobicodex-…）和 Release 标题；标签前缀不能改成 mobicodex-v*，那会触发旧的 release-android.yml。
  - ⚠️ CI 用构建机临时 debug 证书签名（0.1.8 CI 版证书 40f566…），手机装的是 Mac 本地 debug 证书 3ffb81f3…，不能覆盖安装。方案：下载 CI APK，在 Mac 上用 ~/.android/debug.keystore（apksigner，build-tools 35，JDK openjdk@17）重签后再发更新服务器。Mac 上已经没有 Flutter（.tools 已清）。
  - 更新服务器：ssh 别名 hermes-8153，密钥 ~/.ssh/hermes_scout_bridge_ed25519，目录 /var/www/mobile-codex/releases/android/kelivo-preview（source/ 子目录放源码包，source/latest.json = source-package.json），公网 https://zyzlz.xin/mobile-codex/releases/android/kelivo-preview/。顺序：先源码（upload-release-atomically.sh），再 APK+清单（publish-android-update.sh 带 MOBILE_CODEX_RELEASE_* 环境变量），最后换安装页 index.html（按 output/audit/2026-11-07/mobicodex-branding/release/index.html 改）。
- **0.1.9 语音闪退（11-14 修好，74be81d，尚未发布）：** 点“开始录音”后 App 崩溃，系统把 Kelivo 宿主重新拉起，看起来像跳到了设置。根因是发布版 R8 full mode 删掉了 Capacitor 的 PluginHandle.pluginAnnotation 字段，getPermissionStates 被编译成 `throw null`。修法：remote-android 的 consumer-rules.pro 里 keep `com.getcapacitor.**`。另外 `scripts/kelivo-apk-guard.mjs` 由 verify-kelivo 调用，会检查 dex 里的反射元数据（0.1.9 APK 不过，未混淆的独立版能过）。Kelivo 设置里的“语音识别”是它自己 AI 页用的（系统/sherpa/云），和电脑页的百炼语音互不相关。气泡改成 `--user-bubble`。**下次发布：先把 CI APK 重签装进模拟器，验证录音能弹出权限框而且不崩，再发更新通道。**
  - 复现方法：模拟器 AVD `mcvoice`（android-36 arm64，`emulator -no-window`），装 APK。用 `UI_FIXTURE_PRODUCT=1 serve-ui-fixture`（端口 18788），前面挂 `/tmp/mcvoice/proxy.mjs`（端口 18795；它负责 CORS，`/api/pairing/consume` 返回 `fixture-only`，`/api/*` 加上 `/A` 前缀）。再 `adb reverse tcp:8787 tcp:18795`，随便填个配对码。Kelivo 默认开动态取色，所以模拟器上是蓝色主题。
  - ⚠️ 坑：通过 device-script 跑 adb 必须 `< /dev/null`，否则 adb 会吃掉后面的脚本。Mac 的 18789 端口是用户自己的 node 进程，不要动。在 Mac 上下载执行 JDK 会被权限策略拦。build-tools 35 里的 R8 8.6 跑 Capacitor 时出内部错误（CME），本地复现 R8 走不通。
- **DeepSeek 桥接 0.2.8 + 0.1.10 已发布（11-14 完成，main @23e9251）：** Harness 桌面版自动升级到 0.2.2-rc.3 后 0.2.7 被拒，DeepSeek 一度断开。0.2.8 加入 W4b `consumedTurns`，并兼容 rc.3。官方隔离检查用户同意后跑通，共 30/30 项。方法：从 app.asar 用 /tmp/mcvoice/asar/extract.py 只读解包，加上 npm 来的同版 testkit（在 Linux 下载并核对 sha512），用 Harness 自带的 Node 24 跑。注意 Mac 自己的 node 是 v22，不够用。用户当天把插件卸了，我用 Harness 自带的 CLI `plugin --profile desktop add --offline --ignore-scripts` 装回 `deepseek/mobile-deepseek-0.2.8-2ba7b4e75812`，HMR 自动加载，用户不用手动开关。profile 备份在 `backups/2026-11-14-deepseek-0.2.8-profile`。网关切到 `releases/2026-11-14-deepseek-w4b-4179f637ccfc`，旧版 p1-ui 保留。0.1.10 / code12：Run 13（43574485056）。重签后的 APK 是 6756099b…，previous 为 code11；发布前已在模拟器验证录音正常。**用户真机安装尚待确认。** 发布证据在 output/audit/2026-11-14/release-0.1.10/。
- **0.1.10 用户 11-14 确认：** 能正常安装、语音可用、新气泡颜色满意。
- **0.1.11 / code13 已发布（11-14）：** 消息排版（用户字号=正文、助手全宽）+ GFM 表格/引用/分隔线/嵌套列表。Run 14（43580457598），重签 APK 2d603b18…，previous=code12，源码 d129e456…；模拟器 0.1.10→0.1.11 覆盖升级验证通过；main @3340e35；证据 output/audit/2026-11-14/release-0.1.11/。脚本在 /tmp/kelivo-0.1.11/（模板用上一版线上 index）。
- **C0 设计完成（11-14，bd8a2b8，docs/plans/2026-11-14-c0-cc-desk-control.md）：** 不需要上游 PR；CC Desk 服务端协议（auth tunnel:false + device 帧、session.subscribe/history、message.send 的 requestId 即 messageId 且幂等、approval.reply、run.cancel）够用。但当前服务端 0.3.2（协议 17）只允许纯控制连接只读，跨设备发消息/审批/停止要 ≥0.3.3（上游最新 0.3.14、协议 25）。路线：B 升级后直连（推荐），C 过渡（只读 + schedules.json 发送），A 桌面端 IPC 补丁版。**待用户决定：能否升级服务端（会重启并中断所有会话，含我这个会话）、是否把服务凭据交给网关（钥匙串）、是否先做 C。** 在此之前 C2/C3/W3b(Claude) 停着。
- **V5 完成（11-14，1b67141，待随下一版 APK 发布）：** 原生 AdtsSegments 按 ADTS 整帧在 25–35 秒停顿处切段，segment 事件 → 网页逐段转写实时显示，上限 10 分钟，后台/来电保留已录内容；旧原生仍走 2 分钟单段。模拟器验证 2 分钟 5 段通过。本地能用 `/opt/homebrew/bin/gradle`（JAVA_HOME=/opt/homebrew/opt/openjdk 即 JDK25，Capacitor 要 21+）离线编译独立版 apps/mobile/android 并 assembleDebug；独立版 App 在模拟器里要先 pm clear 再配对（填任意码即可）。
  - 下次发版可以照搬 /tmp/kelivo-0.1.10/ 里的脚本（resign.sh、make-index.py，模板用上一版线上 index）。stale 检查要避开说明文字里提到的旧版本号。
  - 坑：macOS 上 /tmp 是软链，guard 脚本的 CLI 判断已改成比较 realpath。auto mode 分类器拦过：在 Mac 上下载执行 JDK；第一次跑隔离检查（用户明确同意后才放行）。
- **发布（旧记录）：** 手机拿到这些改动需要两步：一次 Kelivo 发布构建（`gh workflow run` 要用户再次授权），以及把 Mac 上运行的网关升级到新版（用 `pnpm build:plugin` 生成 releases/<日期>-<名>-<hash>，再切换过去，旧版保留以便回退）。
  - 11-14 我用 AskUserQuestion 问发布授权，用户拒绝了这个弹窗，并说"从中断处继续"。之后发布的事只在文字里提，不要再弹窗追问。
  - W1 的原生 Java/Kotlin 改动、B2 的 l10n、B4 的资源，都要等 Kelivo 发布构建才能真正编译验证。
  - B2 列出的发布工作流命名项（tag、Release 标题、artifact 名，以及 scripts/verify-kelivo.mjs:106 的 APK 名）要我来改。这些和更新清单的资产名有关，要和发布一起处理。

用户已经定下的：
- 先做里程碑 A；手机端不需要切换模型。
- applicationId 等正式版时再改。
- CC Desk 用 IPC 控制桌面端，和 Codex 一样，不做浏览器访问。CC Desk 是开源的 sun168567/cc-desk-tunnel，Electron 做的，目前没有本地 IPC。
- 要去掉 Kelivo 的痕迹，变成用户自己的产品。Kelivo 是 AGPL-3.0，必须保留许可证和"基于 Kelivo"的说明。现在的图标用了 OpenAI 的标志，有商标风险。
- **logo 定为 A1“墨夜琥珀”**（11-13）：墨色渐变 #363B46→#101216、米白 M #F5F1EA、琥珀点 #F59E0B。定稿文件在 `output/branding/2026-11-13-logo-concepts/A-variants/final/`（圆角图标，自适应前景/背景/单色层 viewBox -256..1536，浅底单标）。UI 配色从它来：琥珀只当信号色。
- **在 Kelivo 宿主里，网页工作台的颜色由 Flutter 下发**（`apps/kelivo/lib/features/product/product_shell.dart` 的 productPalette），所以换配色要改 Kelivo 的 `lib/theme/palettes.dart`。
- **UI 截图工具**：`output/ui-review/tools/shot.cjs <plan.json>`。它会：用 CLI `pair` 生成一次性码并在本地兑换设备令牌（只放在内存里）→ 在 5179 端口临时起一个带 VITE_KELIVO_HOST=android 的 vite → 用 Playwright 拦截 host.ts 并替换成 ProductHost 桩，注入 Kelivo 默认调色板 → headless shell 1248 以 412×915 截图 → 在 finally 里撤销设备、关闭 vite。用户每次都要单独授权临时配对，看完就撤销。之前没有 devices.json，用完要删掉空的 `[]` 文件。11-13 的截图在 `output/ui-review/2026-11-13/raw/`。
- **合成页截图工具（不需要配对，优先用）**：`output/ui-review/tools/fixture-shot.cjs <worktree> <dist> <out>`。先在 `<worktree>/apps/mobile` 下跑 `VITE_KELIVO_HOST=android corepack pnpm exec vite build --outDir <dist>`。脚本用 scripts/serve-ui-fixture.mjs 加合成数据（productFixture=1 自带 ProductHost 桩），首页直接进入会话 A；再调 /fixture/rendering 切到“完成”或“运行中”状态，浅色、深色各截一套。合成数据里没有 S2 的活动证据，所以运行中状态栏只显示兜底文案，这是正常的。
- ⚠️ 读 gateway.json 时必须递归脱敏，里面嵌套着 managerKey、relaySecret、deepseek token、bridgeToken。11-13 我只脱敏了顶层字段，结果把这些值打印进了对话。
- 桌面图标变回 Kelivo 的原因：荣耀 Magic6 Pro 的桌面缓存了旧图标（同一包名升级、资源名没变），修法是给图标资源改名。

**本机服务（11-13 已迁到仓库根目录）：**
- Mobile Codex Gateway：配置在 `~/Library/Application Support/Mobile Codex Gateway/gateway.json`，workspace 已改成仓库根目录。设备、队列、上传文件都在 workspace 下的 `.mobile-codex/` 和 `mobile-uploads/`（已复制过来，已在 .gitignore 里）。重启用 `node "<releases/2026-11-07-…>/mobile-codex/scripts/mobile-codex.mjs" stop|start|status --config <gateway.json>`，start 会自己脱离会话。
- vite 开发服务器（端口 5178）：在 `apps/mobile` 下跑 `npm run dev`。从 ssh 启动时，nohup 加 disown 活不过 ssh 结束，要用 python 的 `subprocess.Popen(..., start_new_session=True)`。日志在 /tmp/mobile-vite-5178.log。
- 旧目录 `codex-to-phone`（3.8GB）已经没有服务依赖了，可以清掉里面的内容，但目录本身要保留，因为它是 cc-desk 会话的项目目录。删之前要先问用户。

**11-16 进展（0.3.1 之后，未发版；CHANGELOG 已写“未发布”一节）：**
- README 整篇重写（价值先行、A1 图标、`scripts/capture-readme-screens.mjs` 生成的模拟数据截图）；仓库简介、topics、主页已改；分享预览图 docs/images/social-preview.png 要用户在网页 Settings 上传。
- 已合并：#19 全部（#23 共用顶栏和全局设置、#24 Agent 平级导航和返回、#25 外部入口统一，已关闭）；#20 电脑端保温（#21）和手机端断线不清屏 + 后台 20 秒宽限（#26），#20 留着等发版后真机测切屏时间再关；CC Desk 通知跳错修复；Actions 固定 SHA；SECURITY.md + 私密漏洞报告；`scripts/check-navigation-flow.mjs`（网页版导航流程检查，13 项通过，通知入口网页版无法触发）。
- 发版前必须：模拟器上走一遍系统返回、冷启动恢复、点真通知进 CC Desk 会话；网关要一起升级（#21）。
- 待定：#22 投稿 awesome-codex-plugins（扫描 43/100，插件包不带 CLI 和预构建网关，先权衡维护成本）；awesome-claude-code 只能用户自己网页提交，表单内容已给。
- Codex 线程：线2 现在已能加载；但测试线程带着主仓库 .git 写权限、两条线带着 codex-to-phone（桌面端会保留历次授权的可写目录），已请用户新建 3 个干净线程替换，换完跑 verify-desktop.cjs。新线程要建在它以后干活的目录里：线1 `.codex-lanes/lane-1`、线2 `.codex-lanes/lane-2`、测试线程 `~/workspace/codex-test`。
- **11-17：C3 取消**（用户：插件通道不下线），改做 **C4 Claude CLI 控制通道**：网关用 Agent SDK（listSessions/getSessionMessages、query 流式输入 + resume/forkSession、canUseTool 审批和 AskUserQuestion、interrupt、setPermissionMode），手机可新建、继续历史会话。设计稿 docs/plans/2026-11-17-c4-claude-cli-channel.md（4e95d86），分 C4a 只读 / C4b 运行 / C4c 交互；用户 11-17 定：另开“Claude CLI” Agent；新建/继续只限网关配置列出的目录；“会话正开在终端里时分叉继续还是拒绝”待用户定，定了再派 Codex。11-17 13:31 用户已在 lane-1、lane-2、codex-test 三个文件夹里重建线程（可写目录只有自己的目录），config.json 已换新 ID；用户定测试线程换默认渠道 gpt-6.1-sol（verify-desktop 加了 --model）。但 verify-desktop 原先用工作流库当 cwd 和可写目录，两次运行把工作流库永久授权给了新测试线程（我的失误），脚本已改为在 config 的 testCwd（~/workspace/codex-test）里跑；用户 15:03 在 codex-test 重建了测试线程（01a1e851…），verify-desktop --model gpt-6.1-sol 已通过（可写目录只有 cwd）。终端会话写入方问题（C4 第 2 点）用户说先不谈。
- **F7 第一部分已合并**（PR #28，合并提交 7e45907，CI 绿）：网关收件箱在网关配置目录下 `feedback/`（0700/0600，按设备隔离、UUID 去重、每设备每小时 20 条），手机设置里反馈面板 + IndexedDB 离线待发。F7 第二部分也已合并（PR #29，4e7db2a，CI 绿；长按消息弹菜单“复制/反馈这条/取消”，分享面板加“反馈问题”）；CHANGELOG 未发布一节已补 F7，以及 21:00 复盘加收件箱处理步骤（发版后才会有数据）。
- **11-17 用户真机报的两个问题已提 issue**：#30 额度卡片“换到这个模型接着做”不生效（电脑端线程没有新模型的一轮，显示成额度用完；伴随“正在同步桌面控制状态”）；#31 手机端在项目里新建 Codex 会话却建到网关默认目录（defaultCwd）。截图含渠道名未公开。#30 已由我修复（e02e941，CI 绿，issue 已评论，发版后真机复测再关）：网关自己的 app-server 新建线程也标 source=vscode，手机把它当桌面线程，换模型走桌面通道被拒；现在 originator=mobile-codex-relay 的线程不算桌面线程。#31 已合并（PR #33，合并提交 a3f2463，CI 绿；/api/projects + 新建带项目 cwd + 网关按真实路径校验已知项目），issue 被 PR 自动关闭后已重开，等发版真机复测。C4a 已合并（PR #32，合并提交 deffe14，CI 绿）：SDK @anthropic-ai/claude-agent-sdk 0.3.326（Anthropic 专有条款，排除了原生可执行包；build:plugin 会把 SDK 读取部分打进网关包并附 LICENSE），配置 claudeCli.directories。C4b 已合并（PR #34，合并提交 cfdfa88，CI 绿）：用电脑上已装的 claude（需 ≥ 2.1.326，用户现装 2.1.220，发版前要请他 `claude update`）；写入方保护暂定“拒绝”（插件登记或 2 分钟内外部写入）；审批和提问一律拒绝；最多 3 进程、15 分钟空闲回收。C4c 也已合并（PR #35，38bed42，CI 绿）：手机审批（一次/总是允许只采纳 localSettings 且过滤危险 setMode/拒绝附理由）、提问、切权限模式（default/plan/acceptEdits）和模型，30 分钟超时拒绝并中断。C4 代码全部完成，剩真机验收。F4 常用指令一键发已合并（7d09f4c，CI 绿；Codex 推送失败，我从 lane-2.gitdir 取来直接合并，没有 PR）。F5 电脑端（有任务时 caffeinate -i -w / systemd-inhibit，60 秒后释放，keepAwake 配置，连接面板显示状态）已合并（PR #36，3c09a5d，CI 绿）。F5 手机端（电脑离线提醒，复用 F1 通知服务，2 分钟、一次、恢复撤通知、加 ACCESS_NETWORK_STATE）已合并并推送 main（045877a，PR #37）；18:40 推送后设备 SSH 断开，CI 结果和 PR 状态未核实、记忆未同步到工作流库——恢复连接后先查。发版前模拟器要核对：系统返回、冷启动恢复、通知进 CC Desk 会话、F5 离线提醒（后台计时、断网、认证失效、点通知跳转、恢复撤通知）。下一个可做：工作流 #4 新建对话脚本。真机验收要跑真实模型（花用户 Claude 账号的额度），做之前先问用户。主仓库装依赖时 npm 下载会 ECONNRESET，要带 HTTPS_PROXY/HTTP_PROXY 重试。21:00 复盘已加反馈收件箱步骤（0b）。额度规则 11-17 改为不留 50 美元缓冲，开工前估算。
- **11-17 晚（用户让我自己做）**：Claude CLI 真机验收被用户 Claude Code 渠道 429/502 卡住（apiKeySource none，settings.json 走中转），启动、版本检查、中断已真机通过；顺手修了“限流时一直显示思考中”（4111708，显示第 n/10 次重试）。工作流 #4 关闭：codex-new-thread.cjs 建线程（每次要用户点批准），线1→01a1e98a…、线2→01a1e986… 已换成干净线程；#3 等下次派活记录起步 token。
- **11-17 21:00 复盘后合成浏览器验收**（59ccc72，CI 绿）：#31 选项目、F4 常用指令、Claude CLI 设置/重试提示外观正常；修了两处——长按菜单在手指抬起时被遮罩当点击关掉（系统“触摸和按住延迟”调长时必现），重试提示从消息上方移到下方。做法：`openSyntheticPage` 后用 `page.route("**/api/**")` 补缺的接口（未知的 `route.fallback()`），长按用 CDP `Input.dispatchTouchEvent`（无头 Chromium 不触发 contextmenu，所以抬起会有 click）。模拟器原生项（返回键、冷启动、离线提醒）要配对真网关，未做，需先问用户。#30 被 Fixes 自动关闭后已重开等真机复测。
- **README 截图**（从通用规则 docs-audit-whole 搬来）：用 `node scripts/capture-readme-screens.mjs` 生成（模拟数据，输出到 docs/images/screens）。Codex 沙箱里启动不了 Chromium，这个脚本要我在沙箱外运行。图标的原图在本地 output/branding/2026-11-13-logo-concepts/A-variants/final/A1-icon.svg。
- **Codex 令牌**（从通用规则搬来）：钥匙串 `github-pat-mobicodex`，只限 luoz76070-art/MobiCodex，11-13 已存；用户曾把旧令牌贴进对话，已重新生成，哈希核对过不是旧的。
- **测试和发版细节**（从 docs/github.md 搬来）：MobiCodex 的 relay 全量测试要先 `corepack pnpm build` 和 `corepack pnpm build:plugin`，否则 macGatewayService、managedGateway 会报 ENOENT 假失败。 发版：推 `mobicodex-v<versionName>` 标签触发 `release-android.yml`。版本号要同时改 Android 和 `apps/mobile/src/features/product/identity.ts`，CI 会核对。
- **11-17 晚自查 Claude CLI（f2c2aa6、591c535，CI 绿）**：输入超过手机可见 2 万字符的非改文件请求只能拒绝（服务端也拒绝 allow）；版本检查失败 30 秒后重查，升级 claude 不用重启网关。真机验收时补测：一轮快结束时“即时追加”的消息（可能落到下一轮，而 runtime 已标 idle，会拒绝该轮的工具审批）。
- **0.4.0 已发布（11-17 晚，用户说“可以发新版本”）**：提交 d876339、tag mobicodex-v0.4.0、Release run 44097910781；APK `mobile-codex-0.4.0-a20d2d658593.apk` 3,452,126 字节，证书 3ffb81f3（CI 直接签，不用重签）。preview latest→0.4.0/43、previous→0.3.1/42，下载页换新（服务器 android/backups/ 只留 0.3.1 页）。结果 a2d8cc3，证据 output/audit/2026-11-17/release-0.4.0/（make-index.py 可照搬，stale 检查要换）。#20/#30/#31 已评论请真机复测。
  - Mac 网关已切到 `releases/2026-11-17-v0.4.0-0279332b5ca9`（PID 4768），备份 backups/2026-11-15-c2-ccdesk-device-e26c4b498834-<epoch>（其余 17 个旧备份按“只留一份”删了）。`claudeCli.directories` 还没配，等用户给目录。
  - 模拟器验收：调试包 + Playwright `_android.webView` 驱动；配对码由 `mobile-codex.mjs pair` 直接填进 App 不打印；adb 命令要 `</dev/null`，否则会吞掉 device-script 的标准输入。返回键和冷启动恢复通过；离线提醒要有运行中的任务才触发（AttentionService），默认模型 429 时没法测，留真机。验收后 `revoke` 了模拟器设备。`devices` 只列新式配对设备，用户手机不在列表里（旧 token）。
- **11-17 22:20 CC Desk 连不上（已修，d6bc6d8，网关已切 `releases/2026-11-17-ccdesk-timeout-bd612ba44b6d`）**：Mac 和 CC Desk 服务（就在 Linux 主机上）之间的 Tailscale 没有直连，走 DERP 中继（Mac 对称 NAT，MappingVariesByDestIP=true，往返约 350 ms），打开一个空闲会话要 12–32 秒，超过网关 15 秒超时，于是每约 17 秒重连一次（Linux 上 `journalctl --user` 里 node 服务的“Connection … closed after 17 s”就是这个循环）。改成连接 30 秒、请求 60 秒。并发打开太多会话会因同时跟随数上限直接结束（不是故障）。根治要让 Tailscale 直连。
- **11-17 22:30 第一条 App 内反馈**（0.4.0，设置页）→ #38：分屏删掉（66200e2，main 未发版）；运行策略保留，建议分两行写清“执行前要不要问我 / 能改哪些文件”，**等用户确认再改**（默认是直接执行 + 工程写入）。收件箱条目已标 filed #38。网关又切到 `releases/2026-11-17-ccdesk-linger-eea131242a5c`（807edce：CC Desk 离开后保持 10 分钟）。#20/#30/#31 用户已在 0.4.0，等他复测；#22 等他决定要不要投稿。
- **11-17 23:00 CC Desk 重连慢的根因**：Mac 上 Clash Verge 开着 TUN（utun4 198.18.0.0，0/1+128/1 路由），Tailscale 被代理接管，直连失败、DERP 实测只有约 8 KB/s。网关原来关了 permessage-deflate，CC Desk 服务端是支持压缩的；5a484b4 打开后冷打开 5.2/10.5/7.7 秒（原 24/32/约 60 秒）。网关现跑 `releases/2026-11-17-ccdesk-deflate-82ceaa82198b`。根治要在 Clash 里让 Tailscale 直连（规则 IP-CIDR 100.64.0.0/10 DIRECT、PROCESS-NAME IPNExtension/tailscaled DIRECT，或 TUN 排除该网段），需用户同意才改。
