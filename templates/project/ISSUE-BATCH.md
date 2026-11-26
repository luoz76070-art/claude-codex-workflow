# issue 批量处理

<把这个文件放到项目仓库的 docs/ISSUE-BATCH.md，按项目改。通用规则在工作流库 docs/issue-batch.md。>

## 什么算 issue

- 只有用户明确说“记成 issue”，或者用户自己在 GitHub 上提的，才是 issue。用户在聊天里直接让改的，照旧当场处理。

## 标签

`bug` / `enhancement`；`area:<模块>`；`approved`、`deferred`、`wontfix`、`fixed-unreleased`、`needs-user-test`。

## 定时任务

`<项目>-issue-batch`，每天 <时间>，每次新开会话，只管本仓库。

## 修一批

1. 一批一个分支 `batch/<YYYY-MM-DD>`，从最新的 `origin/main` 开，在单独的 worktree 里做。已有没合并的 `batch/*` PR 就接着做。
2. 提交说明写 `Refs #N`，不写 `Fixes #N`。
3. 一批只升一次版本号：<版本号在哪些文件>。
4. 测试全部要过：<测试命令>。
5. 提交前扫 diff：本机路径、用户名、邮箱、令牌。
6. 开 PR，标题“批次 <日期>：…”。CI 全过后合并，给 issue 打 `fixed-unreleased`、评论 PR 链接；要用户实测的加 `needs-user-test`。
7. 不发版，汇报最后问“这一批发不发”。

## 发版（用户说“发”之后）

1. <发版命令和时间限制>
2. <发完核对什么>
3. <发版记录写在哪>
4. 关 issue：去掉 `fixed-unreleased`，评论“已在 <版本> 发布”，关闭；带 `needs-user-test` 的等用户试过再关。
