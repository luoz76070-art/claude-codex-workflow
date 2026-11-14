# Claude 控制 Codex 的工作流（备份）

Claude Code 把开发任务派给用户 Mac 上的 Codex 桌面端去做，自己负责写任务说明、审查和合并。目标是**省 Claude 的 token，效果不打折**。这个私有库保存这套流程的脚本、lane 工具、记忆和说明。仓库里没有密钥：令牌都在 macOS 钥匙串里，脚本运行时才去读。

- **主副本位置**：脚本的主副本在 Claude 会话目录（Linux 主机），记忆在 Claude 的 memory 目录。这里是它们的快照，流程有变化时同步提交。
- **最后更新**：2026-11-14。

## 1. 架构

- **桌面端 IPC（主路线）**：`~/.codex/ipc/ipc.sock`，消息格式是 4 字节小端长度加 JSON。
  - 先 `initialize`，再用 `thread-owner-discovery` 找到持有这个线程的窗口，然后发 `thread-follower-start-turn`（version 2）。
  - 这一轮由桌面端自己执行，界面上实时看得到。进度从 rollout（`~/.codex/sessions/**/rollout-*-<id>.jsonl`）里读。
  - 桌面端只接收它已经加载的线程。`open -g codex://threads/<id>` 能让它加载桌面端列表里已有的线程。
- **托管 daemon**：`~/.codex/app-server-control/app-server-control.sock`，是 unix socket 上的 WebSocket，调 `thread/start`、`turn/start` 等。
  - 用它建的线程，桌面端要重启后才看得到。
  - 适合做不需要在界面上看到的实验，比如 ephemeral 的 fork。
- **模型渠道**：Codex 通过本机 CC Switch 代理（127.0.0.1:15721）访问上游，用模型名前缀选渠道。
  - 不带前缀的模型走 CC Switch 当前选中的 provider。
  - `ccs-<id>/<model>` 走指定渠道。
  - 模型目录是 `~/.codex/cc-switch-model-catalog.json`。

## 2. 派活流程

1. **选模型和推理强度**：见 `memory/codex-model-assignment.md`。
   - 改代码和疑难问题，首选 Claude 自己做，其次 astra（high）。
   - 主力模型是 gpt-6.1-sol，写文档用 deepseek-flash。
   - 审查一律 Claude 自己做。
2. **工作区（lane）**：仓库下的 `.codex-lanes/lane-N` 是完整克隆，git 数据放在 `lane-N.gitdir`。
   - git 数据不能叫 `.git`：Codex 沙箱会把 `.git` 强制设为只读。
   - Codex 只用 `lanes/bin/lgit`（替代 git）和 `gh-codex`（用钥匙串里只限本仓库的令牌）。
   - 在 `codex/<任务>` 分支上提交、推送，并开 PR。`hooks/pre-push` 只放行 `codex/*`。
3. **job**（`scripts/codex-desktop-turn.cjs <job.json>`）：
   ```json
   { "threadId": "<lane 线程>", "cwd": "<repo>/.codex-lanes/lane-1", "prompt": "<任务说明>",
     "model": "gpt-6.1-sol", "effort": "medium", "sandbox": "workspace-write",
     "extraWritableRoots": ["<repo>/.codex-lanes/lane-1.gitdir", "<repo>/.codex-lanes/pnpm-store"], "approval": "never" }
   ```
   - 指定了 `model` 或 `effort` 时，脚本会自动不沿用线程设置；只有这样，模型和推理强度才会生效。
   - 没写 `sandbox` 时，脚本从 rollout 读出线程原来的权限原样带上（`"keep"`）。不沿用设置又不给权限，桌面端会默认完全放开。
4. **任务说明**要短而精确。写清：
   - 目标、涉及的文件、约束（不碰 main、不动项目外的文件）、验收标准和要跑的命令。
   - 最后要求它用 10 行以内报告。
5. **执行过程不读**：脚本默认安静模式，只输出状态、改动文件和最终结论。
6. **审查和合并**：
   - 在主仓库 `git fetch origin codex/<任务>`，看 `git diff main...FETCH_HEAD`。
   - 在 `/tmp` 的 worktree 里重跑测试（relay 要先 `pnpm build` 和 `pnpm build:plugin`）。
   - 扫个人信息（仓库是公开的），本地合并后 push main。
   - 有问题就把修改意见发回同一个线程。
7. **安全边界**：Codex 能改 lane gitdir 的配置。所以永远不在用过的 lane 里不经沙箱跑 git；下一件任务开始前先跑 `lane-reset N`。

## 3. 额度用完（429）时换渠道：在原线程里换

**规则**（用户 2026-11-14 定）：
- 通知用户，让他从现有渠道里选一个。代码类任务把“Claude 自己做”列第一。
- 选好后**在原线程里**接着做，不开新线程。
- 原渠道恢复后，同样在原线程里换回。其他渠道只是临时顶替。
- 不做自动切换。

**原理**（Codex 源码 `core/src/session/turn.rs`，2026-11-14 实测）：
- 换模型时，只有新旧模型的 `comp_hash` 不同，或新模型窗口更小且上下文已经超过它的上限，Codex 才会先用**旧**模型整理上下文。
- 旧渠道没额度时，这一步会 429，整个回合就失败了。
- 旧模型失败后改用新模型重试的回退，只对 OpenAI 官方登录生效，CC Switch 用不上。
- 其他情况下，换模型就是直接换。

**操作步骤**：
1. `node scripts/codex-channel-options.cjs <threadId>` 列出：线程当前用的模型、最近的 429 和恢复时间（北京时间）、能原地换过去的模型。标 ✗ 的换不过去。
2. 用户选好后，把同一个 job 的 `model` 改成新模型再跑一次。权限会自动保留。
3. 开头出现 comp_hash 警告，说明 CC Switch 重新生成了模型目录。先跑 `python3 scripts/align-catalog-comp-hash.py`，它会备份原文件，再把所有模型统一成 `"cc-switch"`。改完桌面端和 daemon 都马上生效，不用重启。

手机端 MobiCodex 的 F6 用的是同一套做法：网关的 `/api/desktop/control/threads/:id/messages` 和 `/api/live/turns` 接收 `model` 参数。

## 4. 文件

| 文件 | 用途 |
|---|---|
| `scripts/codex-desktop-turn.cjs` | 通过桌面端 IPC 给线程发一轮，安静输出结果；遇到 429 打印 `QUOTA_EXHAUSTED` |
| `scripts/codex-run.cjs` | 通过 daemon 跑任务（备用路线，需要 ws 模块路径作参数） |
| `scripts/codex-channel-options.cjs` | 只读：列出线程能原地换过去的渠道和恢复时间 |
| `scripts/codex-desktop-owners.cjs` | 只读：查桌面端当前加载了哪些线程 |
| `scripts/align-catalog-comp-hash.py` | 统一模型目录的 comp_hash（先备份；`--check` 只检查） |
| `lanes/bin/*`, `lanes/hooks/pre-push` | lane 工具：lgit、gh-codex、凭据助手、lane-reset、lane-snapshot |
| `memory/*.md` | Claude 的相关记忆快照（以 Claude memory 目录为准） |

**在 Mac 上用**：把 `scripts/*` 传到 `/tmp/claude-*-<会话前缀>.cjs` 再用 node 运行；把 `lanes/` 放回 `<repo>/.codex-lanes/`。
- `codex-run.cjs` 需要 `ws` 模块：借用 `~/.npm-global/lib/node_modules/openclaw/node_modules/@buape/carbon/node_modules/ws`。
- 其他脚本都只用 Node 和系统自带的 sqlite3。
