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
  - 还有一个 `animal-cup-capacity-relay` 容器：7-23 手动起的、用 7-26 的旧镜像跑 online-server，映射 127.0.0.1:13003，restart=no，nginx 没有任何路由指向它，像是容量测试留下的。去留等用户决定，我不动。
  - 服务器上的 `.deploy-backups/` 有历次源码包。
- **发版**：只有用户说“发”才发。目前没有自动发布链；要做的话需要服务器改动（部署账号 + 只允许跑一个部署脚本的 sudo 规则），等用户批准。
- **工作线**：没有，我自己做（见 workflow/spend-surplus-myself）。
