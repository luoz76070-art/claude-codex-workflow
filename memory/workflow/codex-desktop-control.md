---
name: codex-desktop-control
description: "How Claude drives the user's Codex desktop app on the Mac (app-server socket + runner script), and why threads made that way don't show live in the desktop UI"
metadata:
  node_type: memory
  type: reference
  originSessionId: aa35ee15-1c32-4e56-b9d5-6c873136f5d9
  modified: 2026-11-14T14:13:26.880Z
---

用户用的是 Codex 桌面端（ChatGPT.app 里的 Codex Framework），想让我替他们给 Codex 派任务。

**架构（2026-11-13 实测）：**
- 桌面端有自己内置的 app-server，通过 stdio 连接：`/Applications/ChatGPT.app/Contents/Resources/codex-cli/CodexCLI.app/Contents/MacOS/codex app-server`，版本 0.166.0-alpha.5.1。外部连不进去。
- `~/.codex/app-server-control/app-server-control.sock` 连的是另一个独立的托管 daemon（`~/.codex/packages/app-server-daemon/releases/0.167.2…/codex app-server --managed-daemon`），不是桌面端在用的那个服务。这个 Unix socket 上跑的是 WebSocket，先 `initialize`，再依次调 `thread/start`（可以带 `threadSource`）、`turn/start`。
- daemon 的 originator 由它启动后第一个 initialize 的 clientInfo.name 决定，之后整个进程都用这个值。这次被我的探测设成了 "claude-readonly-probe"，daemon 重启前不会变。
- 两边共用 `~/.codex/sessions`、`state_5.sqlite` 和 `session_index.jsonl`。

**可见性：** 通过 daemon 建的会话会写进共用的 state DB。用户一开始在桌面端界面上看不到它，重启 Codex 之后才看到（用户 2026-11-13 确认，不重启不会自己出现）。派完任务后要提醒用户：想在桌面端查看，得重启或刷新 Codex。所以界面不会按 originator 或 thread_source 过滤会话，试运行那个会话这两个字段都跟桌面端自己建的不一样，照样显示了；它只是不会实时把外部建的会话刷新出来。如果要实时显示，可以考虑项目 relay 用的桌面端 IPC 管道（`apps/relay/dist/desktop/desktopIpcClient.js`）。

**实时路线（桌面端 IPC，2026-11-13 实测能用）：** `~/.codex/ipc/ipc.sock` 的消息格式是 4 字节小端长度加 JSON。先 `initialize`（version 0）拿到 clientId；再用 `thread-owner-discovery` 找出哪个桌面窗口持有这个会话，返回 handledByClientId；然后把 `thread-follower-start-turn`（version 2）发给这个窗口，格式和项目 `apps/relay/dist/desktop/desktopNativeControl.js` 里一样。这样任务由桌面端自己跑，界面上实时可见。执行进度从 rollout 文件里读，桌面端 0.166 把助手回复写成 response_item/message，不是 event_msg/agent_message。脚本：备份库里的 `scripts/codex-desktop-turn.cjs`，在 Mac 上直接运行（`node ~/workspace/claude-codex-workflow/scripts/codex-desktop-turn.cjs <job.json>`），job 字段是 threadId、prompt、cwd、effort、timeoutSec。
**指定模型和推理强度：** job 里设 `inherit:false`，同时传 `model` 和 `effort`。这样 inheritThreadSettings=false，请求里的 model/effort 就会生效（2026-11-13 实测：会话原来是 gpt-6-astra / xhigh，这一轮跑成了 gpt-6.1-sol / low）。不沿用设置时，权限用的是桌面端默认：sandbox=danger-full-access、approval=never，也就是完全放开。通过 request 里的 sandboxPolicy（`{type:"workspaceWrite", writableRoots:[cwd], networkAccess:true, excludeTmpdirEnvVar:false, excludeSlashTmp:false}`）加上 approvalPolicy:"never" 可以收紧权限，2026-11-13 实测有效。在 job 里写 `sandbox:"workspace-write"` 就行。脚本默认安静输出：STATUS 行、改动文件列表（按 cwd 下文件的 mtime 判断）、最终结论。命令计数看的是 response_item 里的 custom_tool_call 和 function_call。中途换模型会让缓存失效。
**可行的新任务流程：** 用户先在桌面端新建对话，随便发一句话，这样会话一开始就归桌面端所有。我在 state DB 里按 originator='Codex Desktop' 和 created_at 找到最新那个会话，再用 IPC 往里发任务。
坑：(1) inheritThreadSettings=true 时，request 里的 effort 会被忽略，沿用会话原来的设置。(2) 往历史很长的旧会话里发消息很费 token：只回一个 OK，就因为带上了旧会话的全部历史、缓存又是冷的，输入用了 72,773 token（缓存命中只有 3,712）。实时任务要用新会话。(3) 只有桌面端已经加载的会话才能找到持有窗口。通过 daemon 新建、桌面端会话列表里还没有的会话，用 `open [-g] codex://threads/<id>` 打开也不会被接管，等了 60 秒以上仍然是 no-client-found。要等桌面端重启、用户点开这个会话之后才行（2026-11-13 实测）。(4) 只调用 thread/start、没跑过任何一轮的会话不会落盘：既没有 rollout 文件，state DB 里也没有记录。(5) 新会话哪怕只回一个 OK，Codex 也要用约 2.6 万输入 token，主要是系统提示词、AGENTS.md 和工具定义。(6) 桌面端支持的链接有 threads/、settings、review、plugins、shared-thread、launch 等，暂时没找到能新建会话的。

**执行脚本**：唯一主副本是 Mac 上的备份库 `~/workspace/claude-codex-workflow`（私有库 luoz76070-art/claude-codex-workflow，见 [[codex-delegation-workflow]]），脚本在 Mac 上直接用 node 运行，不再复制到 /tmp。daemon 路线是 `node scripts/codex-run.cjs [<ws模块路径>] <job.json>`，不传 ws 路径时从备份库 config.json 读（借用 openclaw 自带的 ws：`~/.npm-global/lib/node_modules/openclaw/node_modules/@buape/carbon/node_modules/ws`）。环境自检用 `node scripts/doctor.cjs`。

**推理强度：** 当前模型 ccs-pro20x/gpt-6-astra 支持 low、medium、high、xhigh、max、ultra，config 默认是 xhigh。job 里加 `effort` 字段，脚本就会在 thread/start 时用 `config.model_reasoning_effort` 覆盖，turn/start 时也传 `effort`（同一会话的后续轮次都会沿用）。2026-11-13 用 ephemeral + noTurn 验证过，返回的 reasoningEffort 确实变了，ephemeral 会话也不会落盘。简单任务用 low 或 medium。

**选模型：** job 里加 `model` 字段，thread/start 和 turn/start 都会带上。2026-11-13 用 ephemeral + noTurn 验证过，返回的 model 确实变了。模型列表用 app-server 的 `model/list` 查，当时有 22 个：ccs-pro20x/*（自用 pro20x，GPT-6/6.1/5.6 系列和图像模型）、ccs-p84e12b/*（国模：deepseek、glm、kimi、qwen）、ccs-zyz/gpt-6.1-sol（中转），还有不带前缀的 gpt-6.1-sol、gpt-6-astra 等。默认模型是 ccs-pro20x/gpt-6-astra。不带前缀的模型、以及没用过的 ccs-* 模型，能不能通过本地代理真正调用还没实测过。

**换模型（11-14 实测，结论已替换早先“只能开新线程”的判断）：**
- Codex 换模型时，只有新旧模型的 `comp_hash` 不同，或者新模型窗口更小且当前上下文已超过它的上限，才会先用**旧**模型整理一次上下文（源码 `core/src/session/turn.rs` 的 `maybe_run_previous_model_inline_compact`）。旧模型整理失败时改用当前模型重试的回退，只对 OpenAI 官方登录生效，CC Switch 的 custom provider 用不上。其他情况就是直接换模型，旧渠道没额度也不影响。
- comp_hash 来自模型目录 `~/.codex/cc-switch-model-catalog.json`（config.toml 的 `model_catalog_json`）。CC Switch 给当前 provider 的不带前缀模型写的是 "3000"，带前缀的写 "cc-switch"。**11-14 用户同意后，我把 4 个 "3000" 改成了 "cc-switch"**（备份 `cc-switch-model-catalog.json.bak-20261114-224023`）。CC Switch 重新生成目录时会改回去，要用 `align-catalog-comp-hash.py` 重新对齐。改完不用重启：daemon 和桌面端都马上生效（11-14 实测）。
- 实测（11-14）：pro20x astra 的线程原地换到 zyz中转、国模、秋API，都只有一次请求、没有调用 pro20x。历史里的 pro20x 加密推理内容，这几个渠道都接受。目录未对齐时换到秋API，会先调 pro20x，结果 429。
- **桌面端换模型：** follower start-turn 要 `inheritThreadSettings:false`，并带上 `model`、`effort`、`sandboxPolicy`、`approvalPolicy`。沿用线程设置时，model 和 effort 都会被忽略（11-14 实测）。不沿用设置时，没传的权限按桌面端默认，也就是完全放开，所以必须把线程原来的权限转换后传回去：rollout 里 turn_context 的 `sandbox_policy` 是 snake_case，要转成 `{type:"workspaceWrite", writableRoots, networkAccess, excludeTmpdirEnvVar, excludeSlashTmp}` 这种格式。turn/start 的 `permissions` 只接受命名方案，传不了线程的托管权限。换完后 state DB 里线程的 model/effort 会更新，桌面端界面显示新模型。
- **读 state DB**：用备份库的 `sh scripts/codex-threads.sh`（先连同 -wal/-shm 复制再读）。`immutable=1` 不读 WAL，会看到旧数据：11-15 我因此误以为线程模型没变。
- **11-15 线1、线2 已原地换到秋API gpt-6.1-sol**（effort 分别 low、high，权限 workspace-write/never 不变），只调了秋API。线2 上下文约 22 万，超过新模型的自动整理上限，由新模型自己整理了一次。
- 桌面端只接收它已加载的线程。`node codex-desktop-owners.cjs <id>...` 可以只读查询归属；`open -g codex://threads/<id>` 能让桌面端加载桌面列表里已有的线程（3 秒内就归它）。
- 第一版 F6 用过“新线程 + `thread/inject_items` 注入历史”（网关的 codex 0.160.1 支持），已经撤掉，这个方法只留作备用。
- 实验脚本在 Mac 的 /tmp：`f6-probe.cjs`（fork 后用指定模型跑一轮，环境变量 CONFIG='{"model_catalog_json":...}' 可以覆盖目录）、`f6-rpc.cjs`。

**其他：**
- Codex 的模型接口是本机 127.0.0.1:15721 上的代理，用的是 config.toml 里的 bearer token，所以 "Not logged in" 不影响使用。
- 试运行会话 ID 是 01a1d2c6-8904-7023-b1ae-2afd6fbe719c。
- 项目位置见 [[mobicodex-project-takeover]]。

另见 [[network-via-linux-host]]。

**可写目录会一直累积（11-16 实测，桌面端 26.1111 / codex-cli 0.169）：** rollout 的 turn_context 里，writable_roots 是这个线程历次授权过的目录的并集，这一轮请求里的 sandboxPolicy 去不掉旧的；cwd 隐含可写，不出现在列表里；桌面端还会自己加 `~/.codex/visualizations/...`。所以线程一旦被授权过敏感目录，就永久带着。当时测试线程带着主仓库 `.git` 的写权限，两条工作线都带着 `codex-to-phone`。处理：换干净的新线程（用户在桌面端新建），然后用 `node scripts/verify-desktop.cjs` 核对；派活时别把敏感目录放进 extraWritableRoots。

**11-17 新建对话的办法（工作流 #4，详见该 issue 评论）：** 桌面端对话自带 codex_app 工具 list_projects / create_thread（由桌面端建、归它所有、可指定项目）。但 create_thread 要审批，approval=never 时被拒；下一步是用 on-request 发一轮并由脚本经桌面 IPC 只批这一次。退路：`open "codex://threads/new?path=<编码目录>&prompt=<编码文字>"` 打开预填草稿，用户按一次发送。空闲约 3 小时的对话会被桌面端卸载，派活前仍要确认归属。
