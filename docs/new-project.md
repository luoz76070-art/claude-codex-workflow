# 接入新项目

**默认和 MobiCodex 完全一致（用户 2026-11-15 定），不用再问**：
- 用最高一级：Codex 在两条工作线里自己提交、推 `codex/*`、开 PR；Claude 审查、合并 main、改 CI。下面第 2 节全做。
- 发版由 Claude 做，触发条件不变：用户明确说“发”。具体怎么发（标签、CI、上传到哪）在接入时弄清楚，写进 `memory/projects/<项目>/`。
- 公开还是私有用 `gh repo view <owner>/<repo> --json visibility` 查，公开的要做隐私扫描。
- 唯一要用户动手的是建令牌（第 2 节第 1 步）。桌面端 26.1117 起不用再建 Codex 线程（第 2 节第 3 步）。

这台 Mac 以外的设备（比如 Windows）没有 Codex 桌面端和本库，这套流程用不了。

## 1. 临时只需要 Claude 自己改，或 Codex 只改不推（令牌还没建好时）

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
3. **线程（26.1117 起不用建）**：派活走 daemon 路线，每个任务由 `codex-run.cjs` 在本项目的 `lane-N` 里新开线程（#11，见 `docs/delegation.md`），`config.json` 不写 `lanes.threads`，doctor 照样检查 lane-1、lane-2。下面是桌面端 IPC 还能用的老版本的做法：每个项目用自己的两个线程，**不借用别的项目（比如 MobiCodex）的线1、线2**。线程记着自己的工作目录，桌面端还会保留它历次授权的可写目录；借用别的项目的线程，等于在错误的目录里、带着那个项目的写权限干活。
   - 用户在 Codex 桌面端添加这个项目（选这个项目的仓库目录，或第 2 步装好的 `<repo>/.codex-lanes/lane-1`、`lane-2`），在这个项目下新建两个对话，各发一句话。
   - Claude 用 `sh scripts/codex-threads.sh 5` 找到它们，写进 `config.json` 后跑 doctor：它**核对每条线程的 cwd**（线 N 在 `lane-N`、测试线程在 `testCwd`、本地项目在仓库里），不对就报错。
   - 测试线程（`testThread`）建在一个专用的空目录里（例如 `~/workspace/codex-test`），并在 config 写 `testCwd`；线程会一直保留建立时所在目录的写权限，所以不要建在仓库里。不需要验证连通时可以先不配。
4. **写进 `config.json`**：在 `projects` 里加一项（repo、github、public、lanes.dir、lanes.tokenService、schedules；IPC 路线才要 lanes.threads）。
5. **自检**：`node scripts/doctor.cjs --project <项目>`。
   - 入口规则：把 `templates/project/CLAUDE.md` 复制到 Mac 上这个项目的会话目录，命名 `CLAUDE.md`（公开仓库里要加进 `.git/info/exclude`，别提交）。不要写到 Linux 主机的 `~/.claude/`。
6. **项目记忆**：复制 `templates/project/project-memory.md` 到 `memory/projects/<项目>/<项目>-project.md`，填好发版方式、测试命令、要不要扫隐私、目录结构，在 `memory/MEMORY.md` 的项目一节加索引行，推回本库。
   - 要 issue 批量处理：按 `docs/issue-batch.md` 的“新项目接入”做（模板 `templates/project/issue-batch.json`、`ISSUE-BATCH.md`、`ISSUE_TEMPLATE/`，标签用 `scripts/setup-issue-labels.sh`）。一个项目一个专属任务，不和别的项目合用。

## 3. 依赖安装

Codex 在 lane 里装依赖时用 `--store-dir <repo>/.codex-lanes/pnpm-store`，并把这个目录放进 job 的 `extraWritableRoots`；不要给它写全局 pnpm store 的权限。

## 4. 本地项目（没有 GitHub 远端，比如笔记库）

用户不想建 GitHub 仓库时用这种方式（例：`obsidian`，2026-11-17）：
- 在项目目录 `git init` 建本地基线（先定好 `.gitignore`），不加 remote、不推送。
- `config.json` 写 `"local": true`，不写 `github`、`lanes`。daemon 路线不用建线程；IPC 路线时才请用户在桌面端这个项目下建两个，用 `codex-threads.sh` 核对 cwd 后放进 `threads`（不是 `lanes.threads`）。
- 派活用第 1 节的方式（`cwd` 是项目目录，`sandbox: "workspace-write"`）；Claude 用 `git diff` 审查后在本地提交。
- doctor 对没有 `github` 的项目只检查本地 git 和线程，不查远端和令牌。
