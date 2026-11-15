# 接管 GitHub

以 MobiCodex（luoz76070-art/MobiCodex，**公开仓库**）为例。

## 1. 凭据和网络

| 谁用 | 凭据 | 范围 |
|---|---|---|
| Claude | Mac 上 `gh` 的登录（luoz76070-art，存在钥匙串）；git push 用 osxkeychain | 账号下所有仓库 |
| Codex | 细粒度令牌，钥匙串 `-a codex -s github-pat-mobicodex`，由 `gh-codex` 和 `git-credential-lane` 运行时读取 | 只限 MobiCodex：Contents 读写、Pull requests 读写、Actions 只读。**不给 Workflows**，因为工作流能读仓库机密（签名密钥） |

- 令牌由用户自己在网页上创建并存进钥匙串，Claude 不经手、不打印。
- **GitHub API 可以调**（用户 2026-11-15 同意，取代之前“只看公开网页、不调 API”的规则）：
  - 首选 Mac 上的 `gh`：`gh run list/view --log-failed` 查 CI，`gh issue list/view`、`gh label`、`gh api`，有登录，私有仓库也能用。
  - Linux 上不带凭据的调用（或 WebFetch 公开网页）只用于公开仓库的只读查询。令牌只在 Mac 上，不要带到 Linux。
  - Mac 上的 gh 偶尔报 `TLS handshake timeout`（11-15 遇到一次），重试一次通常就好；还不行就加 `HTTPS_PROXY=http://127.0.0.1:7897`（用户的本机代理）。
  - git push 和写操作（issue、标签、`gh workflow run`、建仓库）照旧在 Mac 上做，因为凭据只在 Mac。

## 2. 改代码的两条路

- **派给 Codex**：在工作线里做，推 `codex/<任务>` 分支并开 PR，流程见 `docs/delegation.md`。
- **Claude 自己做**：在主仓库建 worktree：
  ```sh
  git -C <repo> worktree add -b claude/<任务> /tmp/<项目>-work-<任务> main
  cd /tmp/<项目>-work-<任务> && corepack pnpm install --frozen-lockfile --prefer-offline
  ```
  做完在 worktree 里提交，回主仓库合并。

## 3. 审查

1. Codex 的分支：在**主仓库** `git fetch origin codex/<任务>`，看 `git diff main...FETCH_HEAD`。
   - 永远不在 Codex 用过的工作线里不经沙箱跑 git：Codex 能改 lane gitdir 的配置（core.fsmonitor、alias 等），会在你的权限下执行。
   - 每次派活后看一眼 `git ls-remote origin main`：pre-push 钩子只是提醒，Codex 能绕过。
2. 在 `/tmp/<项目>-review-*` worktree 里自己重跑测试，只看结果摘要。
   - MobiCodex 的 relay 全量测试要先 `corepack pnpm build` 和 `corepack pnpm build:plugin`，否则 macGatewayService、managedGateway 会报 ENOENT 假失败。
3. **隐私扫描**（公开仓库必做）：合并前在 `git diff --cached` 或 `git diff main...FETCH_HEAD` 里扫
   用户名、邮箱、`/Users/`、`/home/`、令牌前缀（`github_pat_`、`ghp_`、`sk-`）、服务器地址、真实渠道名。
   测试数据用虚构的名字。Codex 写的文档里常带本机绝对路径，要换成 `<repo>/`。

## 4. 合并

```sh
set -e
cd <repo>
git fetch origin codex/<任务>
printf '%s\n\n%s\n' "Merge <任务>: <一句话>" "Co-Authored-By: ..." > /tmp/merge-msg.txt   # git merge -F 不支持 stdin
git merge --no-ff -F /tmp/merge-msg.txt FETCH_HEAD
git push origin main
git ls-remote origin refs/heads/main          # 确认已包含合并提交
git push origin --delete codex/<任务>          # 确认之后才删远端分支
```

- 先 `set -e`：曾经 merge 失败了删分支那步照样执行，PR 显示成 Closed 而不是 Merged。
- 本地合并后 push main，PR 会自动变成已合并。
- 提交信息结尾带上 Claude 的署名行；关联 issue 用 `Fixes #N`。
- 合并后在 Linux 上打开 Actions 页确认 CI 通过。
- zsh 里不要写 `echo =====`（会报 "==== not found"）。

## 5. issue

- 用户测试中报的问题都提成 issue（Mac 上 `gh issue create`、`gh label create`）。
- 正文写清：现象、复现步骤、版本（versionName/code）、影响的页面，打类型标签。不能有本机路径、用户名、邮箱、令牌；截图先确认没有个人信息。
- 查看、列出 issue 在 Linux 上用公开页面。
- 每天 21:00 的定时任务按类型复盘、成批修复（模板 `schedules/mobicodex-issue-review.json`）。

## 6. 发版

- **只有用户明确说“发”才发**。
- MobiCodex 独立 App：推 `mobicodex-v<versionName>` 标签触发 `release-android.yml`。版本号要同时改 Android 和 `apps/mobile/src/features/product/identity.ts`，CI 会核对。
- 发版后核对产物（APK 大小和哈希、下载清单），再写发布记录。
- 改 `.github/workflows` 只由 Claude 做，Codex 的令牌没有这个权限。
- 项目自己的发版细节（更新服务器、网关升级）在 `memory/projects/<项目>/` 里。
