# issue 批量处理

用户 2026-11-26 定：改动先记成 issue，凑成一批再修、再一起发版，不再提一个、改一个、发一个。每个项目一个专属定时任务，只管自己的仓库，不和别的项目合用。

## 规则

1. **一个项目一个任务**：任务 id 用 `<项目>-issue-batch`，任务内容里只能出现这个项目的仓库和目录。MobiCodex 和本库沿用老名字：`mobicodex-issue-review`（21:00）、`workflow-issue-review`（21:40），两个都发给 MobiCodex 的会话，但各管各的仓库。
2. **每次新开会话**：`target` 用 `{"type":"new","projectPath":"<项目目录>"}`，不接续长会话（长会话每次都要把整段上下文重读一遍，贵）。任务先只查额度和 issue，没有待处理的就回一句话结束，不做接手流程；有活才按项目 `CLAUDE.md` 第 1 节接手。
3. **什么算 issue**：默认只有用户明确说“记成 issue”或自己在 GitHub 上提的才算；聊天里直接让改的照旧当场处理。项目可以另定（MobiCodex 是测试问题都提 issue）。
4. **审核**：每个 issue 结论三选一——本批修（`approved`）、延后（`deferred`，写理由和什么情况下再修）、不修（`wontfix`，写理由，用户确认后才关）。拿不准的这一批先不修，最后用审批卡问用户。
5. **一批一个 PR**：分支 `batch/<YYYY-MM-DD>`，在单独的 worktree 里做；已有没合并的 batch PR 就接着做。提交写 `Refs #N`，不写 `Fixes #N`，免得合并时 issue 被自动关掉；合并后打 `fixed-unreleased`，要用户亲自试的加 `needs-user-test`。一批只升一次版本号。
6. **发版**：仍然只在用户说“发”之后，整批一起发。发完去掉 `fixed-unreleased`、评论版本、关 issue；带 `needs-user-test` 的等用户试过再关。
7. **时间**：白天跑（例如 10:30），能当天发版。Mac 断线时任务会被跳过，跳过的不补跑，下一次照样覆盖所有 open issue；跑到一半被取消的，下一次先接上没合并的 batch PR。

## 标签

`bug`、`enhancement`、`area:<模块>`、`approved`、`deferred`、`wontfix`、`fixed-unreleased`、`needs-user-test`。用 `scripts/setup-issue-labels.sh <owner/repo> area:<模块>=<说明> ...` 一次建好，重复运行没关系。

## 新项目接入

1. 复制 `templates/project/ISSUE_TEMPLATE/` 到项目仓库的 `.github/ISSUE_TEMPLATE/`，把 `<模块>` 换成这个项目的模块。
2. 复制 `templates/project/ISSUE-BATCH.md` 到项目仓库的 `docs/ISSUE-BATCH.md`，填好测试命令和发版步骤。公开仓库里不写本机路径、用户名。
3. 运行 `scripts/setup-issue-labels.sh`。
4. 复制 `templates/project/issue-batch.json` 到 `schedules/<项目>-issue-batch.json`，替换占位符（`<项目目录>` 在本库里写 `~/…`，加进线上定时任务文件时换成绝对路径），加进线上定时任务文件和 `config.json` 这个项目的 `schedules`，跑 `node scripts/doctor.cjs --project <项目>` 核对。
5. 在项目的 `CLAUDE.md` 第 3 节加一条：什么算 issue、任务名、`docs/ISSUE-BATCH.md` 在哪、修完不发版。

接入例子：招聘套件（`luoz76070-art/recruitment-suite`，11-26 接入）。
