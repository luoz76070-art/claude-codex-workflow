# 派活给 Codex

所有脚本都在 Mac 上、本库的 `scripts/` 里直接运行：`cd ~/workspace/claude-codex-workflow && node scripts/<脚本> …`。

## 1. 架构

- **桌面端 IPC（主路线）**：`~/.codex/ipc/ipc.sock`，消息格式是 4 字节小端长度加 JSON。
  - 先 `initialize`，再用 `thread-owner-discovery` 找到持有这个线程的窗口，然后发 `thread-follower-start-turn`（version 2）。
  - 这一轮由桌面端自己执行，界面上实时看得到。进度从 rollout（`~/.codex/sessions/**/rollout-*-<id>.jsonl`）里读。
  - 桌面端只接收它已经加载的线程。`open -g codex://threads/<id>` 能让它加载桌面端列表里已有的线程（3 秒内）。
- **托管 daemon（备用路线）**：`~/.codex/app-server-control/app-server-control.sock`，是 unix socket 上的 WebSocket，调 `thread/start`、`turn/start` 等。
  - 用它建的线程，桌面端要重启后才看得到，`open -g` 也接管不了。
  - 适合不需要在界面上看到的实验，比如 ephemeral 的 fork。脚本 `codex-run.cjs`，需要 ws 模块（路径在 `config.json`）。
- **模型渠道**：Codex 通过本机 CC Switch 代理（127.0.0.1:15721）访问上游，用模型名前缀选渠道。
  - 不带前缀的模型走 CC Switch 当前选中的 provider；`ccs-<id>/<model>` 走指定渠道。
  - 模型目录是 `~/.codex/cc-switch-model-catalog.json`。渠道清单和用量查法见 `memory/workflow/cc-switch-codex-channels.md`。
- **共用数据**：桌面端和 daemon 共用 `~/.codex/sessions`、`state_5.sqlite`、`session_index.jsonl`。
  - 读 state DB 用 `sh scripts/codex-threads.sh [条数] [标题关键字]`：它把 `state_5.sqlite` 连同 `-wal`、`-shm` 复制到临时目录再读。直接 `-readonly` 会因为 WAL 报 “unable to open database file”；`immutable=1` 能打开，但不读 WAL，看到的是旧数据（11-15 就因此误以为换模型没生效）。

## 2. 线程

- 工作线线程和测试线程写在 `config.json` 各自的项目下。**每个项目只用自己的线程**：不要把一个项目的任务派进别的项目的线程（比如新项目派进 MobiCodex 的线1、线2），那边的工作目录不对，还带着那个项目的可写目录授权，上下文和缓存也会混在一起。
- **新线程要归桌面端所有**：已有一条线时用 `node scripts/codex-new-thread.cjs --project <项目> --lane <1|2|test> --assign`（用户在桌面端点一次批准）；第一次接入时请用户在 Codex 桌面端**对应的项目下**新建对话、发一句话。写进 config 后跑 `node scripts/doctor.cjs --project <项目>`：它核对每条线程的工作目录（线 N 应在 `lane-N`，测试线程应在 `testCwd`，本地项目在仓库里），不对就报错。
- 不要往历史很长的旧线程派活：冷缓存时只回一个 OK 也用了约 7.3 万输入 token。新线程起步约 2.6 万（系统提示词、AGENTS.md、工具定义）。
- 同一线程不要频繁换模型，换了缓存就失效。
- 测试线程（`config.json` 的 `testThread`）也是冷缓存：2026-11-15 接手实测只回一句就用了约 5.5 万输入 token（缓存只命中 3 千）。只在验证连通时用，不要拿它试别的。

## 3. 派活流程

1. **选模型和推理强度**：见 `memory/workflow/codex-model-assignment.md`。
   - 派活前跑 `node scripts/doctor.cjs --project <项目>`。首次记录版本；桌面端或内置 CLI 版本变动时，会提醒先运行 `node scripts/verify-desktop.cjs --project <项目>`。验证会向配置的测试线程发一轮“只回复 OK”，会消耗额度，不自动执行。
   - 写代码派 gpt-6.1-sol（主力）；改 bug 由 Claude 做；疑难问题由 Claude 和 astra（high）；用户点名时 Claude 写。写文档用 deepseek-flash。
   - 审查一律 Claude 自己做。
   - 很小的改动（写说明加审查比直接改还贵）Claude 直接做。
2. **工作区（lane）**：仓库下的 `.codex-lanes/lane-N` 是完整克隆，git 数据放在 `lane-N.gitdir`。
   - git 数据不能叫 `.git`：Codex 沙箱会把 `.git` 和 worktree 指向的 gitdir 强制设为只读，放进 writableRoots 也没用。
   - Codex 只用 `.codex-lanes/bin/lgit`（替代 git）和 `gh-codex`（用钥匙串里只限本仓库的令牌，不用用户自己的 gh 登录）。
   - 在 `codex/<任务>` 分支上提交、推送，并用 gh-codex 开 PR。`hooks/pre-push` 只放行 `codex/*`。
   - 派活前 `lane-reset N`，让工作线回到最新的 main。
3. **job**（`node scripts/codex-desktop-turn.cjs /tmp/<job>.json`）：
   ```json
   { "threadId": "<lane 线程>", "cwd": "<repo>/.codex-lanes/lane-1", "prompt": "<任务说明>",
     "model": "gpt-6.1-sol", "effort": "medium", "sandbox": "workspace-write", "network": true,
     "extraWritableRoots": ["<repo>/.codex-lanes/lane-1.gitdir", "<repo>/.codex-lanes/pnpm-store"],
     "approval": "never", "timeoutSec": 3000 }
   ```
   - **最小写法**（沿用线程的模型、推理强度和权限，什么都不改）：
     ```json
     { "threadId": "<线程 ID>", "prompt": "只回复：OK", "timeoutSec": 120 }
     ```
   - 指定了 `model` 或 `effort` 时，脚本会自动不沿用线程设置；只有这样，模型和推理强度才会生效。
   - 没写 `sandbox` 时，脚本从 rollout 读出线程原来的权限原样带上（`"keep"`）。不沿用设置又不给权限，桌面端会默认完全放开。
   - `sandbox: "workspace-write"` 只能写 cwd 和 extraWritableRoots；写项目外的文件会报 Operation not permitted。全程不弹审批。
   - 沙箱里钥匙串可读，网络走用户的代理。
   - lane 安全检查的 git 网络命令固定用 HTTP/1.1；没有 `HTTPS_PROXY` 时使用 `config.json` 可选的 `gitProxy`（默认空，可填本机代理地址），已有环境变量优先。
4. **任务说明**要短而精确。写清：
   - 目标；涉及的目录或文件。
   - 约束：只用 lgit 和 gh-codex，只在 `codex/<任务>` 分支提交，不碰 main，不动项目外的文件。
   - 验收标准和要跑的测试或构建命令。
   - 最后要求它用 10 行以内报告：改了哪些文件、为什么、测试命令和结果、遗留风险。
   - 复杂任务先让它出方案，确认后再实现。
5. **执行过程不读**：脚本默认安静模式，只输出 STATUS 行、改动文件（按 cwd 下文件的 mtime）和最终结论。不开 verbose，不翻 rollout。
6. **审查和合并**：派活后先看 `SECURITY` 小节，有 `✗` 先处理再审查；`?` 表示未能核对，稍后手动执行 `git ls-remote`。见 `docs/github.md`。有问题就把精确的修改意见发回同一个线程，那边上下文还在、缓存也热。
7. **同时最多 2 个 Codex 会话**，按两条线排期。
8. **两条线做同一个功能时，接口先行**：先把设计文档（含两边共同遵守的接口：名字、字段、事件）提交到 main，再 lane-reset、派活；两条线各改各的文件，任务说明里写“接口一个字都不要改”。F3 用这个办法一次合上（11-15）。

## 4. 额度用完（429）时换渠道：在原线程里换

**规则**（用户 2026-11-14 定）：
- 通知用户，让他从现有渠道里选一个。代码类任务把“Claude 自己做”列第一。
- 选好后**在原线程里**接着做，不开新线程。原渠道恢复后，同样在原线程里换回。其他渠道只是临时顶替。
- 不做自动切换，CC Switch 的 failover 保持关闭。
- 等用户选的时候，先做不需要 Codex 的事。

**怎么判断是 429**：
- `task_complete` 里带 `error: "exceeded retry limit, last status: 429 Too Many Requests"`，没有单独的 error 事件。
- 上游错误码 `user_account_window_quota_exceeded`，CC Switch 的 `proxy_request_logs` 里能看到，带 `reset_at`。
- `codex-desktop-turn.cjs` 匹配到 usage limit、quota、rate limit、429 时打印 `QUOTA_EXHAUSTED`。先看错误原文，不要把普通失败当成额度问题。
- 轮次在 429 之前可能已经推送了，先看远端分支。

**原理**（Codex 源码 `core/src/session/turn.rs` 的 `maybe_run_previous_model_inline_compact`，2026-11-14 实测）：
- 换模型时，只有新旧模型的 `comp_hash` 不同，或新模型窗口更小且上下文已经超过它的上限，Codex 才会先用**旧**模型整理上下文。旧渠道没额度时这一步会 429，整个回合失败。
- 旧模型失败后改用新模型重试的回退，只对 OpenAI 官方登录生效，CC Switch 用不上。
- 其他情况下，换模型就是直接换；历史里别家的加密推理内容，各渠道都接受。

**操作步骤**：
1. `node scripts/codex-channel-options.cjs <threadId>` 列出：线程当前模型、最近的 429 和恢复时间（北京时间）、能原地换过去的模型。标 ✗ 的换不过去。
2. 用户选好后，把同一个 job 的 `model` 改成新模型再跑一次，权限自动保留。
3. 开头出现 comp_hash 警告，说明 CC Switch 重新生成了模型目录。先跑 `python3 scripts/align-catalog-comp-hash.py`（会备份原文件），再把所有模型统一成 `"cc-switch"`。改完桌面端和 daemon 都马上生效。

**用户选“Claude 自己做”时**：在主仓库建可信 worktree（`/tmp/<项目>-work-<任务>`，`claude/<任务>` 分支）。Codex 做到一半没推送的，用 `.codex-lanes/bin/lane-snapshot N out.patch` 导出它的半成品（不在 lane 的 gitdir 里跑 git），在 worktree 里 `git apply` 后审查补完。

手机端 MobiCodex 的 F6 用的是同一套做法：网关的 `/api/desktop/control/threads/:id/messages` 和 `/api/live/turns` 接收 `model` 参数。

## 5. 脚本

| 文件 | 用途 |
|---|---|
| `scripts/doctor.cjs` | 自检：gh、钥匙串令牌、桌面端 IPC、线程归属、CC Switch、comp_hash、工作线、定时任务；记录桌面端和内置 CLI 版本，升级后提醒先验证 |
| `scripts/verify-desktop.cjs` | `node scripts/verify-desktop.cjs [--project <项目>]`：向该项目的 testThread 发一轮“只回复 OK”（effort low），核对本轮 rollout 的 workspace-write、仅 cwd 可写和 approval never；成功才标记版本已验证 |
| `scripts/test-desktop-lib.cjs` | `node --test scripts/test-desktop-lib.cjs`：纯函数/合成目录回归，覆盖帧、权限、参数、换模型和版本记录，不派真实任务 |
| `scripts/codex-desktop-turn.cjs` | 通过桌面端 IPC 给线程发一轮，安静输出结果；遇到 429 打印 `QUOTA_EXHAUSTED`；lane 任务结束输出 `SECURITY`，有 `✗` 先处理再审查 |
| `scripts/lib/lane-check.cjs` | doctor 与派活脚本共用的 lane 配置检查；派活前后只在主仓库查询远端 main、codex/* |
| `scripts/test-lane-check.cjs` | `node scripts/test-lane-check.cjs`：合成配置与 SECURITY 回归，不派真实任务 |
| `scripts/codex-run.cjs` | 通过 daemon 跑任务（备用路线；ws 模块路径可省，默认读 config.json） |
| `scripts/codex-channel-options.cjs` | 只读：列出线程能原地换过去的渠道和恢复时间 |
| `scripts/codex-new-thread.cjs` | `node scripts/codex-new-thread.cjs --project <项目> --lane <1|2|test> [--assign]`：让这条线现有的对话调用桌面端的 create_thread，在同一个文件夹里新建一个归桌面端所有的对话；**用户要在桌面端批准一次**（11-17 实测不能预先批准）。新对话继承父对话的可写目录。`--assign` 把新 ID 写进 config.json。线程上下文太大、想换干净线程时用 |
| `scripts/codex-desktop-owners.cjs` | 只读：查桌面端当前加载了哪些线程 |
| `scripts/align-catalog-comp-hash.py` | 统一模型目录的 comp_hash（先备份；`--check` 只检查） |
| `scripts/schedule-target.py` | 查看或修改定时任务发给哪个会话（先备份） |
| `scripts/codex-threads.sh` | 只读：列出最近的 Codex 线程和它们当前的模型（读状态库的新鲜副本） |
| `lanes/` | 工作线工具和安装脚本，见 `docs/new-project.md` |

桌面端版本状态保存在本机 `~/.codex-workflow-state.json`，不进 git；doctor 只更新已观察版本，升级提醒会一直保留到 verify 成功。验证按返回的 turnId 查本轮新增 turn_context，失败或超时不会标记已验证；超时后该轮可能仍在桌面端运行，先检查测试线程再重试。验证要求临时目录隐式写权限也关闭，避免把额外可写目录误判为“仅 cwd”。
