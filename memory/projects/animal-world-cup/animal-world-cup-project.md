---
name: animal-world-cup-project
description: Animal Cup（AI 动物足球模拟器，Next.js + 联机房间中继）的仓库、CI、线上部署方式和接入进度（工作流 #8 第二个项目，11-18 接入）
metadata:
  type: project
---

- **仓库**：Mac 上 `~/Documents/game/animal-world-cup`（嵌在诗境的 `~/Documents/game` 仓库目录里，但那边从没跟踪过它；已加进 game 仓库的 `.git/info/exclude`）。GitHub `luoz76070-art/animal-world-cup`（私有）。11-18 由我导入：bfd2577 是导入提交，和服务器 `/opt/animal-world-cup` 的 1723 个文件一致（只有构建戳 `app/generated/runtimeVersion.js`、`public/sw.js` 不同），之前没有任何 git 历史。
- **CI**（2035d1c，首轮 run 44256611486 绿）：Node 22 + pnpm 10.34.4（corepack 固定，不改 package.json），`pnpm install --frozen-lockfile`、`pnpm build`，再起 `script/online-server.mjs` 跑 `verify-online-relay.mjs`（9 项检查，含 4 个并发房间）。浏览器类 verify 脚本要有界面的 Chrome，只在本机跑。
- **.gitignore 补了** `output/`（67 MB Playwright 截图）和 `.playwright-cli/`。源素材 `match-runtime-source/` 等本来就被忽略，不在库里；构建不需要它们（干净克隆实测能构建）。
- **线上**：recruitment-suite 主机（见 [[shijing-cloud-server]]），`https://animal-cup.us.zyzlz.xin`。`/opt/animal-world-cup` 放源码，`docker compose -f docker-compose.vps.yml` 起 web（127.0.0.1:13000）和 online（127.0.0.1:13002）；nginx 站点 `/etc/nginx/sites-available/animal-cup.conf` 把 /create /connect /health 转到 13002，其余到 13000。发布步骤见仓库 `deploy/vps/README.md`：先 build 再打时间戳 tag、改 `.env` 的 ANIMAL_CUP_IMAGE、逐个切 web 和 online 并做健康检查；切换前把当前镜像打成 `animal-cup:rollback-<时间>`。房间状态在内存里，切 online 会断掉正在进行的对局。
  - 现在跑的镜像是 `animal-cup:rollback-20260730-181100`（12fa870c3a4f）。
  - 7-23 手动起的 `animal-cup-capacity-relay`（容量测试遗留，没有路由）用户 11-18 说“停了吧”，已停。
  - 服务器上的 `.deploy-backups/` 有历次源码包。
- **发版（11-18 用户批准“可以做”后建好）**：仓库 `.github/workflows/deploy.yml` 手动触发，action 选 check / deploy / rollback，另有 force 开关。只有用户说“发”才跑 deploy 或 rollback；check 随时可跑（11-18 两次都通过）。
  - 服务器：用户 `awcdeploy`（密码锁定），authorized_keys 带 `restrict,command="sudo -n /usr/local/sbin/animal-cup-deploy $SSH_ORIGINAL_COMMAND"`；sudo 规则 `/etc/sudoers.d/animal-cup-deploy` 只允许这一个脚本。
  - 脚本 `/usr/local/sbin/animal-cup-deploy`：check 不收额外参数；deploy 要 40 位 commit，工作流用 `git archive HEAD | ssh … deploy <sha>` 把源码传上去；源码版本放在 `/opt/animal-world-cup-releases`。镜像标签 `release-<时间>-<sha7>` 和 `rollback-<时间>`，各只留一份。`rollback_target` 选“最新的、不是正在跑的那个” rollback 镜像，check 显示的也是它（11-18 补上）。
  - secrets：AWC_DEPLOY_SSH_KEY、AWC_DEPLOY_KNOWN_HOSTS、AWC_DEPLOY_HOST。Verify 步骤带 Origin 头查 / 和 /health。说明在仓库 `deploy/vps/README.md`。
  - 11-18 `.env` 是 `ANIMAL_CUP_IMAGE=animal-cup:rollback-20260730-181100`，旧 `.env` 备份在 `.deploy-backups/env-before-20261118`。切 online 会断掉正在进行的对局。
- **工作线**：没有，我自己做（见 workflow/spend-surplus-myself）。
