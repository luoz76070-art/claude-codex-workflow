# 新会话接手步骤

给新开的 Claude Code 会话看的。适用于：用户换了会话、换了项目工作区，或者一个定时任务开了新会话。做完这几步，新会话就能和原来一样派活给 Codex、接管 GitHub。

前提：
- 会话的设备是用户的 Mac（系统提示里有这个会话自己的 SSH 配置和 device-script）。
- 会话项目目录（在 Mac 上）里有项目级 `CLAUDE.md`（模板是本库的 `templates/project/CLAUDE.md`），所以你才会读到这里。
- **规则文件只写 Mac 本地的项目级 `CLAUDE.md`**：任何时候都不往远端服务器（Linux 主机）写全局规则文件（`~/.claude/CLAUDE.md` 等），也不改它（用户 2026-11-17 定）。

下面的命令，除了第 3 步，都在 Mac 上通过 device-script 执行。

## 1. 更新本库

```sh
cd ~/workspace/claude-codex-workflow && git pull --ff-only
```

然后读 `README.md`（能做什么、边界、规则），派活前再读 `docs/delegation.md`，**任何 GitHub 操作（包括只是查 CI）之前读 `docs/github.md`**。

- 查 CI、issue：在 Mac 上用 `gh`（可以调 GitHub API，用户 2026-11-15 同意）；公开仓库也可以在 Linux 上 WebFetch 公开网页。

## 2. 跑自检

```sh
cd ~/workspace/claude-codex-workflow && node scripts/doctor.cjs --session <你的会话 ID> --dir <会话的项目目录>
```

- `<会话的项目目录>` 是系统提示里的 Project directory。doctor 按它找 `config.json` 里对应的项目，**不再默认任何项目**；找到了，这个项目名就是下面第 3、4 步的 `<项目>`。找不到时只做通用检查（桌面端、渠道、gh），见下一条。
- 报“不属于任何项目”：这是未接入的项目。只沿用工作模式（规则、流程），按 `docs/new-project.md` 接入；**不要导入别的项目（比如 MobiCodex）的记忆**。

- 会话 ID 在系统提示里（定时任务那一段写着 "This session's ID"）。
- 加 `--net` 会顺带核对备份库和项目 main 是否与 GitHub 一致（会联网，走 Mac 上的 git）。
- 每项显示 ✓（正常）、!（提醒）、✗（失败），后面跟着该怎么处理。
- ✗ 处理不了的（比如 gh 没登录、钥匙串里没有令牌、Codex 桌面端没开），告诉用户需要他做什么，不要绕过。

## 3. 导入记忆（在 Linux 上执行）

记忆按会话分开存，新会话的记忆目录是空的。把本库的记忆拉进来：

```sh
# 先把脚本拿到 Linux 上（放在你自己的会话目录里）
scp -F <你的 SSH 配置> device:workspace/claude-codex-workflow/linux/memory-sync.sh ./memory-sync.sh
bash ./memory-sync.sh <你的 SSH 配置> <你的记忆目录> pull            # 只导入通用规则
bash ./memory-sync.sh <你的 SSH 配置> <你的记忆目录> pull <项目>     # 仅当第 2 步匹配到这个项目
```

- `<你的 SSH 配置>` 和 `<你的记忆目录>` 都在系统提示里。
- 不带项目只拷 `memory/workflow/`（通用规则）；带项目再加 `memory/projects/<项目>/`。都会在 MEMORY.md 里补上对应的索引行。
- 项目记忆是那个项目自己的进度和规则，别的项目用不上，还会误导。会话不是在做那个项目时不要导入。
- 本地已有、内容不同的文件不会被覆盖（加 `FORCE=1` 才覆盖）。
- 以后改了通用规则（`memory/workflow/` 里的），用 `push` 推回 Mac，再在 Mac 上提交推送本库。项目进度可以只留在会话记忆里，阶段性推回。

导入后（以及以后修改通用记忆后），在 Linux 上核对文件内容和 MEMORY.md 索引：

```sh
bash ./memory-sync.sh <你的 SSH 配置> <你的记忆目录> check [<项目>]   # 和 pull 时一样带不带项目
```

- 一致时输出“记忆一致：N 个文件”，退出码为 0；有内容或索引差异时列出差异，退出码为 3（不是同步失败）。其他非零退出码按错误处理。
- `check` 只读，不自动推拉。库里新的就 `pull`，会话里新的就 `push`，两边都改过先看 `diff` 再合并；索引差异按文件名核对并补齐。每日复盘也要核对，有差异在汇报里列出。

## 4. 定时任务

定时任务按项目分，列在 `config.json` 这个项目的 `schedules` 里（MobiCodex 的是 21:00 的 `mobicodex-issue-review` 和 21:40 的 `workflow-issue-review`，招聘套件的是 10:30 的 `recruitment-suite-issue-batch`），每个任务只管一个仓库、只发给一个会话；`target` 为 `new` 的任务每次在项目目录新开会话，不用改指向。只看本项目的；如果用户要你接替原来的会话：

```sh
python3 scripts/schedule-target.py <任务名>                # 只看现在指向谁
python3 scripts/schedule-target.py <任务名> <你的会话 ID>  # 改指向（会先备份）
```

只有用户让你接替时才改；用户没让你接替时，自检里“不是当前会话”这条提醒直接忽略。任务丢了就用 `schedules/<任务名>.json` 模板加回去（把 `<SESSION_ID>` 换掉）。

## 5. Codex 线程

自检里会列出两条工作线的线程和测试线程有没有被桌面端加载。

- 没加载：`open -g codex://threads/<线程 ID>`，3 秒后用 `node scripts/codex-desktop-owners.cjs <线程 ID>` 再查。
- 线程被删了，或者要新开：请用户在 Codex 桌面端新建对话、随便发一句话，然后在 state DB 里找到它（见 `docs/delegation.md`），写进 `config.json`。
- 派活前先跑 `<repo>/.codex-lanes/bin/lane-reset N`，让工作线回到最新的 main。
- job 文件写在 Mac 的 `/tmp/<名字>.json`，用完删掉。

## 6. 交接

原来的会话如果还在，交接前让它：
1. 把进度写进项目记忆，用 `memory-sync.sh push` 推回本库并提交。
2. 停止派活，不要两个会话同时往同一条工作线派任务。

新会话接手后，先查 `git ls-remote origin` 和工作线状态，不要重复派活或重复推送。

## 换项目工作区时

- 你自己用 gh、派 Codex 只改代码不推送：上面几步做完就能用。
- 要让 Codex 自己推 PR：看 `docs/new-project.md`。
