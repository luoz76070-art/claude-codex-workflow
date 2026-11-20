---
name: shijing-cloud-server
description: "Shijing (诗境, moyun.zyzlz.xin) production server facts, hot-release chain/backup locations, semantic job ops, and 2026-11-13 cleanup/hardening/rebaseline state"
metadata:
  node_type: memory
  type: project
  originSessionId: aa35ee15-1c32-4e56-b9d5-6c873136f5d9
  modified: 2026-11-20T07:30:00.000Z
---

**服务器：** 诗境生产环境跑在 SSH 主机 `recruitment-suite`（root，Ubuntu 22.04，x86_64；IP 见 Mac 的 ~/.ssh/config，不写进记忆和仓库），从 Mac 上用 `ssh recruitment-suite` 登录。
同一台机器上还有 new-api、招聘套件、animal-world-cup，共 15 个容器（animal-cup-capacity-relay 的 restart 策略是 no，重启后要手动 `docker start`）。2026-11-15 删掉了 sub2api、resumeai-pro、infinite-canvas，见 [[cloud-servers-decommission-20261115]]。系统盘 29GB，数据盘挂在 /mnt/new-api-update-storage。
**SSH：** 11-18 曾因 Mac 代理出口 IP 变了被 fail2ban 封，当时用 `ssh -o ProxyCommand="nc -b en0 %h %p" recruitment-suite` 绑物理网卡直连；**11-20 实测直连已恢复**，nc 方法留作备用。

注意：在 device-script 里调用单条 ssh 时要加 `-n`；远端 `bash -s` heredoc 里的 `docker exec -i` 也会吃掉后续脚本，要加 `</dev/null` 或去掉 `-i`。

**诗境部署：**
- 部署目录 /opt/shijing。compose.yaml 起 shijing-web（3100），挂载 hot/agent-serial-search-20261018/.next；compose.mobile.yaml 起 web-mobile（3103），挂载 hot/ci-alignment-20261103/.next；compose.entrance.yaml 起 web-entrance（3102）。数据库 postgres:16，用户 shijing。
- ⚠️ nginx 的 /etc/nginx/conf.d/shijing-hot-map.conf 用 $arg_dpl 把静态资源根目录映射到 /opt/shijing/hot/assets/{header-64c7589…,64c7589…,3427756…}。**删 /opt/shijing 下任何东西之前，都要先 grep 整个 /etc/nginx 里的 /opt/shijing 引用**。
- **发布链：** 链头是 hot/header.json（header-release 后继事务）；所有旧 status 入口（agent/model-settings/mobile/hot-release.mjs status）都转到它。schema 要求 assets 恰好有 4 个根（previous 3427756、retired 22b38d8、candidate 64c7589、header-64c7589），integrity 会核对 history 五个 json、header-<rev>/source-0..2、environment-before 的 sha256。10 月 20 日以后的发布都是 ops/<id>/prepare.py→apply.py→finish.py（以 ops/ci-alignment-20261103 为模板），读 hot/header.json，以 publish.lock 互斥，finish 后 `header-release.mjs status` 必须 integrityAgrees/slotsAgree 为 true。
- **备份位置：** /opt/shijing/backups/<profile>-<rev>/config-N 是每次发布前的配置字节级副本，可按 sha256 匹配恢复；ops/<id>/previous-header.json 是每次热补丁前的 header.json 副本。

**语义全量任务** shijing-semantic-full-20261018.service（oneshot，Restart=no，`systemctl start --no-block` 启动，运行中显示 activating/start 是正常的）：
- 控制器 ops/full-semantic-20261018/full-run.py；不带 `--run` 是只检查不发请求的预检。每次发送前检查 hot/publish.lock，**存在锁就干净地停下、不发请求**，所以要暂停可以建这把锁，不要直接 kill。
- 失败的批次会被永久隔离、不重试；连续 3 次审核无效就停。11-02 停机原因：中转 vulcanapi.com 的 deepseek-v4.1-flash 临时切到默认思考的通道，3500 个 token 全花在 reasoning 上，content 为空。11-13 实测已恢复，`thinking:{type:"disabled"}` 和 `reasoning_effort:"none"` 中转都接受。
- 2026-11-13 09:24 UTC 从第 2326 批恢复。剩余约 46k 篇，约 4600 批、14 天。⚠️ 同样的 token 量单价约是 11-02 的 5 倍（每 1k token 从 0.027 涨到 0.13–0.15 credit），已告知用户。

**2026-11-13 发生的事：**
- 存储清理：系统盘可用空间从 2.8GB 涨到 10.25GB，清单在 /opt/shijing/CLEANUP-2026-11-13.txt。我误删了 hot/ 下的状态文件和默认素材目录，静态资源 404 约 15 分钟，素材目录已重建。
- **重新建立基线（约 09:25 UTC）：** 从 backups/header-64c7589…/config-* 按 sha256 字节级恢复了五个 history json、source-0..2 和 environment-before；header.json 用 previous-header.json 加重放 record.mjs 重建。22b38d8 素材根恢复了 340/348 个文件，其余 8 个属于该版本独有、已无法恢复，header 根里同样缺这 8 个，不影响线上。header-release status 全部为 true，publish.lock 已解除。报告在 ops/rebaseline-20261113/。
- 安全加固：/etc/ssh/sshd_config.d/00-hardening.conf 只允许密钥登录；fail2ban 用 aggressive 模式，ignoreip 里有当时的 Mac 代理出口 IP。/etc/logrotate.d/docker-containers：超过 50M 就 copytruncate。
- 已重启到 5.15.0-203，旧内核 185 保留作回退。

另见 [[mobicodex-project-takeover]]。

**接入 GitHub（工作流 #8 最后一项）：** 11-20 14:00 只读盘点完，方案写在工作流 #8 的评论里（issuecomment-7032023063），**等用户批准和 5 个决定**：integrity 误报怎么处理（建议记录在案地重建 otherConfigHash 基线）、历史保留还是快照、本机目录（建议 `~/Documents/shijing`）、语义任务要不要先查上游、发布时语义任务在跑是否允许 force。
- **线上真实源码在 Mac 的 `~/Documents/game/output/shijing-atmosphere-ops/source/`**（不是 git 仓库，411 个文件）：它的 `.next/BUILD_ID` = 线上两个前端挂载的 `build-TfctsWXpff2fKS`；对 `output/shijing-ci-alignment-ops/source-before.json`（11-03 发布前 247 个文件的 sha256）243 个一致，其余 4 个是 11-03 改的文件。`~/Documents/game/shijing/` 工作区不是线上版本：缺精选语料/语义描述 45 个文件（在存档库 7ea45a4 里），19 个文件版本不对。新库要以 atmosphere 源码目录为准。
- `~/Documents/game` 本地库：无远端，81 个提交（作者个人邮箱，54 行带服务器 IP，无密钥），另有 `shijing-selected-corpus` 分支 = 存档库 main。目录里还有 animal-world-cup（自己的库）、output/ 2.8 GB、.trellis/.codex/.agents、sleep-inference。
- **integrityAgrees 11-20 为 false**：诗境自己的 history/configs/.env/composes/assets 全部一致；变的是 `nginx -T` 里其他网站配置的 otherConfigHash（new-api 和招聘套件站点 11-19、11-20 改过，11-15 删过站点）。线上正常，但下次热发布前置检查会报 Prior release drift。`header-release.mjs status` 只输出布尔值不说原因，要按 successor-release.mjs 的 `integrity()` 逐项比哈希定位。
- **语义全量任务 11-17 04:54 UTC 停了**：第 3572 批，status.json `stopped-needs-review`，“No output after three bounded cooldown recovery rounds; inspect upstream”，241 组保留错误。剩约 3300 批。没动它。
- 线上路由：页面和 /api/public/*、/api/compose/ai、/api/compose/ci/ai、/api/health 走 web-mobile 3103（挂 hot/ci-alignment-20261103）；其余 /api/* 走 web 3100（挂 hot/agent-serial-search-20261018，但 BUILD_ID 也是 11-03 那次，原因待查）；web-entrance 3102 只服务 dpl=1 的旧资源。ci-alignment 的 apply.py 还改过 nginx（把两个 compose AI 路由改到 3103）。
- 每次热补丁的 prepare/apply/finish 和证据都在 Mac 的 `output/shijing-<名字>-ops/`（未入库），服务器上是 `ops/<id>/`。
