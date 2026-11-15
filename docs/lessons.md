# 踩过的坑和实测记录

时间都是北京时间。Mac 的时钟是北京时间，Linux 主机不是，写记录时以 Mac 为准。

## 1. Codex 桌面端和 daemon

| 现象 | 原因 / 做法 |
|---|---|
| 指定了 model、effort，跑出来还是线程原来的模型 | `inheritThreadSettings:true` 时请求里的 model/effort 被忽略。指定模型必须 `false`，脚本已自动处理 |
| 不沿用设置后，线程变成完全放开的权限 | `false` 时没传的权限按桌面端默认（danger-full-access）。必须把线程原来的 `sandboxPolicy`、`approvalPolicy` 转换后传回去；脚本默认 `sandbox:"keep"`，读**最后一个** turn_context |
| 有一次把测试线程误设成了完全放开 | 当时用了 `sandboxFromTurn:0`，取到的是第一个 turn_context。换完模型要核对 rollout 里新的 turn_context |
| 换到别的渠道仍然 429 | comp_hash 不同时 Codex 会先用旧模型整理上下文。模型目录要统一 comp_hash（`align-catalog-comp-hash.py`） |
| daemon 建的线程在桌面端看不到 | 桌面端不实时刷新外部建的线程，要重启；`open -g` 也接管不了。实时任务一律用桌面端建的线程 |
| `thread/start` 后没跑过一轮的线程消失了 | 不跑一轮不会落盘（没有 rollout，state DB 也没有） |
| daemon 的 originator 被设成探测时的名字 | 由它启动后第一个 initialize 的 clientInfo.name 决定，重启前不变 |
| 只回一个 OK 用了 7.3 万输入 token | 旧线程历史长、缓存冷。实时任务用新线程；新线程起步约 2.6 万 |
| `sqlite3 -readonly` 打不开 state_5.sqlite | WAL 模式需要写 -shm。连同 -wal、-shm 复制到临时目录再读（`scripts/codex-threads.sh`） |
| 换完模型，state DB 里看到的还是旧模型 | `immutable=1` 不读 WAL，读到的是旧数据。用复制的办法读 |
| 只给 model 不给 effort，推理强度变了 | 不沿用设置时请求里没带 effort，桌面端会用默认值。脚本已改成自动带上线程原来的 effort（11-15） |
| Codex 回合以 429 结束却被当成完成 | 429 只出现在 `task_complete.error` 里，没有单独的 error 事件。要检查 error 字段 |
| 自检说线程没加载（timeout） | 桌面端只认它加载过的线程，`open -g codex://threads/<id>` 后 3 秒再查 |

## 2. 工作线和 git

| 现象 | 原因 / 做法 |
|---|---|
| Codex 在 worktree 里 commit 报 Operation not permitted | workspace-write 沙箱把 `.git` 和 worktree 指向的 gitdir 强制只读。git 数据放 `lane-N.gitdir`，不能有 `.git` 指针，用 `lgit` |
| pre-push 拦不住 Codex | 它能改自己 gitdir 的配置或 `--no-verify`。每次派活后核对远端 main；自检会查 lane 配置里的可执行项 |
| 在 Codex 用过的 lane 里跑 git 有风险 | Codex 能写 core.fsmonitor、alias 等，会以你的权限执行。审查在主仓库 fetch 分支做，下个任务前 lane-reset |
| PR 显示 Closed 而不是 Merged | merge 失败了但删分支那步照样执行。脚本先 `set -e`，确认 ls-remote 包含合并后再删分支 |
| `git merge -F -` 读不到提交信息 | `-F` 不支持 stdin，先写临时文件 |
| Codex 做到一半遇到 429、没推送 | `lane-snapshot N out.patch` 导出工作区（不在 lane gitdir 里跑 git），在可信 worktree 里 apply |
| 提交时报 git 身份为空 | `-c user.name=$(...)` 取到了空值。直接用仓库或全局配置 |
| zsh 报 "==== not found" | 不要写 `echo =====`，`echo ======XXX` 也不行（11-15 又踩了两次）。分隔行用 `echo "--- xxx"` |
| 后台派活的 SSH 断了（退出码 255），没有输出 | Codex 那一轮在桌面端照跑。看 rollout 里最后一次 task_started 之后有没有 task_complete、再看远端分支，**不要重派** |
| 外层写了 `ssh … <<'PS' < /dev/null`，脚本根本没执行 | `< /dev/null` 顶替了 heredoc。只给脚本**里面**的 ssh、adb 命令加 `< /dev/null` |
| zsh 里 `ADB="adb -s x"; $ADB shell …` 报找不到命令 | zsh 不拆分变量。用函数：`a() { adb -s emulator-5554 "$@" < /dev/null; }` |

## 3. 测试和审查

| 现象 | 原因 / 做法 |
|---|---|
| relay 的 managedGateway 测试报 ENOENT | 要先 `pnpm build` 和 `pnpm build:plugin`。D2 的配对回归就是靠这几个测试发现的，别跳过 |
| 新 worktree 里 `npx tsc` 装了个错的包 | 先 `corepack pnpm install --frozen-lockfile --prefer-offline` |
| 公开仓库的测试数据里出现了真实渠道名 | 测试数据一律用虚构名字（团队账号、国产模型、中转站），合并前扫 diff |
| Codex 写的文档里有本机绝对路径 | 换成 `<repo>/` |

## 4. Android 和模拟器

| 现象 | 原因 / 做法 |
|---|---|
| 原生工作线里 Codex 跑不了 Gradle | 沙箱不让写 `~/.gradle`。让原生线只写代码，Claude 在审查副本里编译、lint、上模拟器 |
| 打调试 APK | `gradle -I scripts/android/lint-jdk.gradle :app:assembleDebug --no-daemon`（JAVA_HOME=JDK17，MOBILE_CODEX_COMPILE_JAVA_HOME=JDK21+），之前先 `pnpm --filter @mobile-codex/mobile build` 和 `pnpm exec cap sync android` |
| Android 16 模拟器上用 `am start --grant-read-uri-permission` 分享图片，App 读不到 | 系统日志 “caller is holding WM lock; assuming permission denied”，授权没生效，是测试方法的问题。用系统“文件”App（DocumentsUI）长按图片 → 分享来测 |
| 系统分享面板里有两个 MobiCodex | 模拟器上还装着旧的 Kelivo 版。真机上卸掉旧版就只剩一个 |

## 5. 网络和权限

| 现象 | 原因 / 做法 |
|---|---|
| Linux 上 curl api.github.com 被拦（11-14） | 当时用户要求不调 API。11-15 用户同意调 GitHub API，首选 Mac 上的 gh |
| “API Error: 403 Cloudflare” | 是 Linux 上的 Claude Code 连 Claude 服务被拦，跟 GitHub 无关 |
| 新会话不知道这套流程 | 记忆按会话存。全局 `~/.claude/CLAUDE.md` 引导到本库，再用 `memory-sync.sh pull` 导入 |
| Mac 上 `/tmp` 的脚本副本不见了 | macOS 会清理 /tmp。脚本直接从本库运行 |

## 6. 实测记录

- **2026-11-13**：桌面端 IPC 路线打通；workspace-write + approval never 全程不弹审批，写项目外文件被拦。
- **2026-11-13～14**：P0、P1 共 14 个 PR 由 Codex 在两条线完成，Claude 审查合并。
- **2026-11-14**：在原线程里换渠道实测（zyz、国模、秋API 各一次请求，没有调用已 429 的渠道）；手机 App F6 改成同一套。
- **2026-11-15 两条工作线程换渠道**：线1、线2 原来一直是 pro20x 的 gpt-6-astra（pro20x 11-20 前 429）。用 `codex-desktop-turn.cjs` 只给 `model:"gpt-6.1-sol"`，原地换到秋API，各跑一轮“只回复 OK”。CC Switch 日志里只有 3 次秋API 请求，没有调用 pro20x；权限保持 workspace-write / never，推理强度保持 low、high。线1 上下文约 16 万，冷缓存一轮输入 15.5 万 token；线2 约 22 万，超过新模型的自动整理上限，由新模型先整理一次（19.2 万输入、2910 输出）再回复。三次合计 CC Switch 折算约 0.8 美元。
- **2026-11-15 F3 两条线并行**：先把带共同插件接口的设计文档提交到 main，再派两条线。线1 原生 22 分钟、28 次模型调用、输入 263 万（缓存 200 万）、输出 2.1 万；线2 网页端 33 分钟、42 次调用、输入 536 万（缓存 470 万）、输出 2.7 万；都用秋API gpt-6.1-sol high。合并后测试一次通过，模拟器验收全部通过；审查补了 4 处（拒绝自家 FileProvider、空分享提示、图片类型兜底、快捷方式 lint）。线程历史长，输入量偏大（见 issue #3）。
- **2026-11-15 新会话接手实测**：用一次性定时任务（`target: {"type":"new"}`）开新会话，指令里故意不写本库位置和脚本名。
  - 结果：新会话读到全局 `~/.claude/CLAUDE.md`，自己找到本库；自检 0 失败；`memory-sync.sh pull` 导入 9 条记忆和索引；用最小 job 给测试线程派了一轮（8 秒，回复“接手测试 OK”，沿用线程的 gpt-6.1-sol / low / workspace-write）；查到最新 CI 成功；发版、429、公开仓库提交三条规则都答对。全程约 1.5 分钟、9 次工具调用、约 9.5k 输出 token，没有改文件、提交或改定时任务。
  - 发现并已修正：① 它查 CI 时直接调了 api.github.com，当时违反“不调 API”，已补进规则（之后 11-15 用户改为允许调 GitHub API）；② 测试线程冷缓存，一句话约 5.5 万输入 token，已在 delegation 注明；③ 最小 job 写法只在脚本注释里，已补示例；④ 自检的“定时任务不是当前会话”提醒容易被误解成必须改，已注明只有用户让接替时才改；⑤ 测试留下的 job 文件，handoff 里注明用完删掉。
  - 定时任务的新会话没有停在审批上，说明 CC Desk 给新会话的权限模式能无人值守跑完这类只读加派活的步骤。
