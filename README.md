# Claude 控制 Codex 与接管 GitHub 的工作流

Claude Code 跑在 Linux 主机上，通过 SSH 操作用户的 Mac。代码交给 Mac 上的 Codex 桌面端写（用用户的 Codex 额度），Claude 负责拆任务、写说明、审查、测试、合并、发版和管 issue。

目标：**省 Claude 的 token，效果不打折。**

这个私有库是这套流程的**唯一主副本**：脚本直接从这里运行，通用规则以这里的 `memory/workflow/` 为准。仓库里没有密钥：令牌都在 macOS 钥匙串里，脚本运行时才读。

- 新会话从 `docs/handoff.md` 开始。
- 最后更新：2026-11-15。

## 快速开始（新会话）

```sh
cd ~/workspace/claude-codex-workflow && git pull --ff-only
node scripts/doctor.cjs --session <会话 ID>       # 自检
```

然后按 `docs/handoff.md` 导入记忆、确认定时任务。派活看 `docs/delegation.md`，GitHub 操作看 `docs/github.md`，新项目看 `docs/new-project.md`，踩过的坑看 `docs/lessons.md`。

## 1. 组成

| 部件 | 在哪 | 作用 |
|---|---|---|
| Claude | Linux 主机 | 拆任务、写说明、审查、合并、发版 |
| SSH 通道 | 每个会话自带 | 所有项目操作都在 Mac 上执行 |
| Codex 桌面端 | Mac | 执行任务，界面上实时看得到 |
| CC Switch | Mac | 4 个模型渠道，可以在原线程里换模型 |
| 脚本 | 本库 `scripts/` | 派活、查线程归属、列可换渠道、对齐模型目录、自检、改定时任务 |
| 两条工作线 | 项目仓库 `.codex-lanes/` | Codex 在独立克隆里提交、推送、开 PR |
| GitHub 凭据 | Mac 钥匙串 | 用户的 gh 登录（Claude 用）；只限单个仓库的令牌（Codex 用） |
| 记忆 | Linux 主机，按会话分开 | 规则和进度；本库 `memory/` 是主副本 |
| 全局入口 | Linux `~/.claude/CLAUDE.md` | 所有会话都会读，引导新会话来这里 |
| 定时任务 | CC Desk 客户端 | 每天 21:00 复盘 issue |

## 2. 能做什么

1. **派活**：一条命令把任务发进桌面端指定线程，指定模型和推理强度；权限限项目目录，全程不弹审批；只回结论（改了哪些文件、测试结果、遗留风险），不读过程。
2. **两条线并行**：Codex 在两个独立克隆里各做一个任务，自己提交、推 `codex/*` 分支、开 PR。
3. **审查合并**：Claude 看改动、在单独副本重跑全量测试、扫隐私、本地合并推 main、确认 CI。
4. **额度用完换渠道**：识别 429 → 通知用户并列出可换渠道和恢复时间 → 用户选 → 原线程换模型接着做 → 原渠道恢复后换回。MobiCodex 手机 App 的 F6 是同一套。
5. **Claude 自己做**：Codex 不可用或任务更适合 Claude 时，在临时 worktree 改，合并流程相同；Codex 半途停下的工作可以导出接着做。
6. **issue 与复盘**：测试问题提 issue，21:00 定时复盘、成批修。
7. **发版**：用户说“发”后打标签触发 CI，核对产物，更新下载渠道。
8. **换会话、换项目**：新会话按 `docs/handoff.md` 接手；新项目按 `docs/new-project.md` 接入。2026-11-15 实测：一个新会话只靠全局入口就找到本库，约 1.5 分钟、约 9.5k 输出 token 完成自检、导入记忆、派一轮 Codex、查 CI 和规则问答（记录见 `docs/lessons.md`）。

## 3. 能力边界

**做不到的**
- 只能接桌面端已加载的线程。新线程要用户在桌面端建（发一句话）；Claude 建不出能在界面上实时显示的新线程。
- Codex 同时最多 2 个会话。
- 原地换模型只对 comp_hash 一致的模型有效；比原模型窗口小、且上下文已超出它上限的换不过去。CC Switch 重新生成模型目录时会改回标记，要重新对齐（自检和 channel-options 会提醒）。
- 成本坑：往历史很长的旧线程派活很贵（只回 OK 用了约 7.3 万输入 token），新线程起步约 2.6 万；中途换模型缓存失效。
- 依赖环境：Mac 开机、Codex 桌面端在运行、CC Switch 在运行、CC Desk 连着。Linux 主机上没有项目代码。
- 记忆按会话存，新会话默认看不到，要靠全局入口和 `memory-sync.sh`。

**故意设的安全线**
- Codex 只写项目目录、只推 `codex/*`；令牌只限单个仓库，没有 Workflows 权限（工作流能读签名密钥）。
- pre-push 只是提醒，Codex 能绕过：每次派活后 Claude 核对 main；不在 Codex 用过的工作线里不经沙箱跑 git，自检会查 lane 配置里有没有可执行项。
- 合并、改 CI、发版、动服务器只由 Claude 做；发版只等用户说“发”。
- 公开仓库提交前扫个人信息和真实渠道名。
- 渠道由用户选，不开自动切换；不改 Codex 默认模型；不读 CC Switch 里的密钥。

**质量边界**
- Codex 的代码一律由 Claude 审。MobiCodex 的 14 个 Codex PR 里，合并后发现 1 个回归（D2 配对，已修），1 个做到一半遇到 429，由 Claude 补完。
- 复杂任务先让 Codex 出方案；疑难、架构、审查由 Claude 做。界面效果（模拟器截图）由 Claude 验证。

## 4. 收益（MobiCodex，2026-11-13 到 11-14 实测，粗估）

| | 派给 Codex（PR #1–#14） | Claude 自己写（W3–U6、F1、F6） |
|---|---|---|
| 合并的代码量 | 约 1 万行 | 约 5800 行 |
| Claude 的输出 token | 约 42 万（含一次性搭建） | 约 87 万 |
| 每行代码耗 Claude 的输出 token | 约 25–40 | 约 150 |
| 每行代码耗 Claude 的输入（缓存读取） | 约 9 千 | 约 3.4 万 |

- 派给 Codex 时，Claude 的消耗约为自己写的 **1/4 到 1/6**。两边任务类型不同，自己写的部分还包含模拟器验证和源码调研，只能看量级。
- 代价转到 Codex：11-13 一天 pro20x 1002 次请求，CC Switch 按 API 价折算约 218 美元（订阅，不是实际花费，但占额度）；11-12 到 11-14 三天用完了 7 天额度（含用户自己的使用）。所以主力改成了 gpt-6.1-sol，改代码首选 Claude。
- 速度：两条线并行，P0 的 8 个 PR 在 11-13 一个下午内合并完。
- 用户只需要建线程、选渠道，不用点审批。

## 5. 后续优化方向（收敛：少而稳，不再加新机制）

1. **一个入口命令**：把脚本和工作线工具合成一个命令，配置集中在 `config.json`。
2. **规则只存一份**：通用规则只放本库，会话记忆是副本。
3. **自动记账**：每次派活记一行（任务、模型、Codex token、耗时、测试是否一次通过、返工次数），按数据调模型分配。
4. **降成本**：每个任务开新线程、说明精简；同一线程不换模型；文档类派国模 flash。
5. **少让用户动手**：现在唯一必须手动的是建线程；可以一次预建几个空线程备用，或继续找让桌面端接管新线程的办法。
6. **稳定性**：Codex 桌面端升级后先跑自检（IPC 格式一变脚本就坏）；给脚本补最小测试。
7. **安全**：令牌一个仓库一个；合并前核对 lane 配置（已进自检）。
8. **明确不做**：自动换渠道；让 Codex 合并 main 或发版；需要替用户点界面的方案。

## 6. 目录

```
README.md                 本说明
config.json               本机路径、项目、工作线、线程 ID
docs/handoff.md           新会话接手步骤
docs/delegation.md        派活：架构、线程、job、换渠道、脚本表
docs/github.md            GitHub：凭据、审查、隐私扫描、合并、issue、发版
docs/new-project.md       接入新项目（令牌、工作线、config）
docs/lessons.md           踩过的坑、实测记录
scripts/                  doctor、派活和换渠道脚本、schedule-target
lanes/                    工作线工具（路径按自身位置推算）和 install.sh
linux/global-CLAUDE.md    Linux 主机 ~/.claude/CLAUDE.md 的内容
linux/memory-sync.sh      会话记忆 ↔ 本库同步（在 Linux 上跑）
memory/MEMORY.md          记忆索引行（导入时用）
memory/workflow/          通用规则（主副本）
memory/projects/<项目>/   项目规则和进度快照
schedules/                定时任务模板
```
