# 跨会话入口：Claude 控制 Codex 与接管 GitHub

**什么时候适用**：用户要你把任务派给 Codex、接管或操作某个 GitHub 仓库、处理 Codex 额度或渠道、继续 MobiCodex 这类项目时。其他任务忽略这一节。
**只适用于设备是用户这台 Mac 的会话**（家目录里有 `~/workspace/claude-codex-workflow`）。设备是 Windows 或别的电脑时，那边没有 Codex 桌面端和这个库，不要套用；用户要在那边用，先问他。

## 1. 先接手

通过本会话的 device-script 在 Mac 上执行 `cd ~/workspace/claude-codex-workflow && git pull --ff-only`，读 `README.md` 和 `docs/handoff.md`，按“新会话接手步骤”做（自检、导入记忆、定时任务）。
这个私有库（luoz76070-art/claude-codex-workflow）是这套流程的唯一主副本：脚本直接从那里运行，改了要提交推送。

## 2. 用在哪个项目

- **项目已在库的 `config.json` 里**（目前只有 mobicodex）：自检用 `node scripts/doctor.cjs --dir <会话的项目目录>`（或 `--project <名字>`），再读 `memory/projects/<名字>/` 里这个项目自己的规则。
- **新项目**：按 `docs/new-project.md` 接入，默认和 MobiCodex 完全一致（用户 2026-11-15 定），不用再问：
  1. 用到最高一级：Codex 在两条工作线里自己提交、推 `codex/*`、开 PR；你审查、合并 main、改 CI。只需要请用户为这个仓库建一个细粒度令牌存进钥匙串，并在 Codex 桌面端**这个项目下**新建两个会话（各发一句话）给线1、线2 用。不借用 MobiCodex 或别的项目的线1、线2 派活。
  2. 发版由你（Claude）来做，触发条件和现在一样：用户明确说“发”。
  3. 仓库公开还是私有不用问，用 `gh repo view <owner>/<repo> --json visibility` 查；公开的要做隐私扫描。
  然后在 `config.json` 加一项，在 `memory/projects/<名字>/` 写这个项目的发版方式、测试命令等，提交推送。
- 项目特有的规则写进库的 `memory/projects/<名字>/`，不要写进这个全局文件。
- 新项目只沿用 MobiCodex 的**工作模式**，不承接它的记忆：会话的项目目录对不上 `config.json` 里的项目时，只导入通用规则（`memory-sync.sh … pull` 不带项目），不要导入 `memory/projects/mobicodex/`。

## 3. 所有项目都要守的规则（没读到库也要守）

- 只有用户明确说“发”才发版；不要通过别的途径替他决定发布。
- 公开仓库（比如 MobiCodex）：提交、issue、PR 里不能有本机路径、用户名、邮箱、令牌、服务器地址、真实渠道名；提交前先扫 diff。
- Codex 返回 429 或额度用完：通知用户、列出可换渠道（`scripts/codex-channel-options.cjs`），等他选；在原线程里换，不开新线程，不自动换。
- 不改 Codex 的默认模型（config.toml 顶层 model）；不读 CC Switch 数据库里的密钥（providers.settings_config 的 auth）。
- Codex 只能推 `codex/*` 分支；合并 main、改 CI、发版由你做。
- 自己联网（网页、下载）在 Linux 上做；git push 和 gh 在 Mac 上做（凭据只在 Mac）。
- **可以调用 GitHub API**（用户 2026-11-15 同意）：首选 Mac 上的 `gh`（`gh run list/view`、`gh issue list`、`gh api`），有登录，私有仓库也能用；Linux 上不带凭据的调用只用于公开仓库的只读查询。令牌只在 Mac 上，不要带到 Linux。
- **每周额度上限 380 美元**（用户 2026-11-17 定，原为 330）：只算本机（这台 Mac）在 CC Desk 每个 7 天窗口里的用量，口径同客户端“每周额度·本周期”，算法见库里 `memory/workflow/weekly-budget-cap.md`。到了就收尾停下，等窗口重置。不留缓冲（用户 11-17 定）：没到 380 就照常干活；开一项新工作前估一下，做完会超上限的就不开。
- 给用户的结果用中文。
