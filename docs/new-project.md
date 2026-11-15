# 接入新项目

## 1. 只需要 Claude 自己改，或 Codex 只改不推

不用装任何东西：
- Claude 用 Mac 上的 gh 登录就能操作账号下的仓库。
- 派 Codex 时把 job 的 `cwd` 设成新项目目录、`sandbox: "workspace-write"`，Codex 只能写这个目录；改完由 Claude 审查、提交、推送。

## 2. 要让 Codex 自己提交、推送、开 PR

1. **令牌（用户做）**：在 GitHub 网页上建细粒度令牌，只选这一个仓库，权限 Contents 读写、Pull requests 读写、Actions 只读，不给 Workflows。存进钥匙串：
   ```sh
   security add-generic-password -a codex -s github-pat-<项目> -w
   ```
   （`-w` 后面不跟值，会提示输入，令牌不会进 shell 历史。）
2. **装工作线（Claude 做）**：
   ```sh
   sh ~/workspace/claude-codex-workflow/lanes/install.sh <repo> github-pat-<项目>
   ```
   它会把工具和 pre-push 钩子装到 `<repo>/.codex-lanes/`，写入 `token-service`，把 `.codex-lanes/` 加进 `.git/info/exclude`，并克隆出 lane-1、lane-2。每条线工作区几百 MB，对象是硬链接，基本不额外占空间。
3. **线程（用户做）**：在 Codex 桌面端新建两个对话，各发一句话。Claude 在 state DB 里找到它们的 ID。
4. **写进 `config.json`**：在 `projects` 里加一项（repo、github、public、lanes.dir、lanes.tokenService、lanes.threads、schedules）。
5. **自检**：`node scripts/doctor.cjs --project <项目>`。
6. **项目记忆**：在 `memory/projects/<项目>/` 写这个项目自己的规则（发版方式、测试命令、要不要扫隐私、目录结构），推回本库。

## 3. 依赖安装

Codex 在 lane 里装依赖时用 `--store-dir <repo>/.codex-lanes/pnpm-store`，并把这个目录放进 job 的 `extraWritableRoots`；不要给它写全局 pnpm store 的权限。
