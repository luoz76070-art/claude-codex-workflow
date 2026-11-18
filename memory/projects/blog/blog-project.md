---
name: blog-project
description: zyzlz.xin 博客（Hugo）的仓库、构建、发布方式和接入进度（工作流 #8 第一个项目，11-18 接入）
metadata:
  type: project
---

- **仓库**：Mac 上 `~/workspace/boke`；GitHub `luoz76070-art/blog`（私有）。11-18 由我导入，只有一个初始提交 d3c4873，内容和线上 release 20260721033808 逐字节一致（本地构建 52 个文件全同；线上多的 15 个是旧构建残留，下次发布自然消失）。
- **旧历史**（没上 GitHub，因为带个人 Gmail 和服务器 IP），各留一份：
  - `~/workspace/project-archive/20261118-blog-old-git/boke.git`：本地两提交。
  - `~/workspace/project-archive/20261113-mobicodex-repo-boundary/moved-projects-history/hermes-deploy.git`：旧 monorepo 的子目录历史，含已下线的 Windsurf 文章。
- **工作线**：没有。用户 11-18 要求我自己做、不派 Codex（见 workflow/spend-surplus-myself）；要派时再按 docs/new-project.md 第 2 节请用户建令牌和线程。
- **测试命令**：`./scripts/build.sh`（Mac 上 brew 的 Hugo extended 0.160.1）。CI `ci.yml` 在每次推送和 PR 时用校验过 checksum 的同版本 Hugo 构建，并检查 index.html、index.xml。
- **发版**：只有用户说“发”才发。方式是 Actions → Deploy（只能手动触发，check / deploy / rollback），以 `blogdeploy` 用户跑仓库里的脚本，保留 2 个版本（当前和上一个）。
  - **未完成（11-18）**：在服务器上建 `blogdeploy`（只拥有 /var/www/blog、authorized_keys 带 restrict）和设置 secrets/variables，被自动权限规则拦下，等用户决定。在那之前 Deploy 工作流跑不起来。
  - 备用：手动用 root 跑 `scripts/deploy_to_aliyun.sh`（ssh 别名 hermes-8153，密钥 `~/.ssh/hermes_scout_bridge_ed25519`）。
- **服务器**：发布服务器 `/var/www/blog`，`current` → `releases/20260721033808`，另有 3 个旧 release 和 `initial-placeholder`，目前归 root。nginx root 是 `/var/www/blog/current`（配置在 /etc/nginx/conf.d/zyzlz.xin.conf）。
  - 脚本 11-18 改过：清理和回滚只认 14 位时间编号的目录。原来占位目录会被当成回滚目标，保留 2 个时还会挤掉上一个版本。
- **项目规则**：
  - 证书目录 `24495418_zyzlz.xin_nginx/` 含私钥，已在 .gitignore，绝不提交。
  - `package.json` 和 `node_modules` 是误装的 thefuck 包，已忽略。
  - 文章 `content/posts/ai-projects/opencode-browser.md` 里有本机路径，是用户自己写的、已上线，私有库不改。
- **当前进度**：仓库和 CI 已完成（CI 44232775902 绿）；发布链等用户授权服务器改动。
