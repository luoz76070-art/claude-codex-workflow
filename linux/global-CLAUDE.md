# 跨会话入口：Claude 控制 Codex 与接管 GitHub

这一节只在以下情况适用：用户要你把任务派给 Codex、接管或操作 GitHub 仓库（尤其是 MobiCodex）、处理 Codex 额度或渠道、继续 MobiCodex 项目。其他任务忽略这一节。

1. **先接手**：通过本会话的 device-script 在用户的 Mac 上执行
   `cd ~/workspace/claude-codex-workflow && git pull --ff-only`，
   然后读 `README.md` 和 `docs/handoff.md`，按里面的“新会话接手步骤”做（自检、导入记忆、定时任务）。
   这个私有库（luoz76070-art/claude-codex-workflow）是这套流程的唯一主副本：脚本直接从那里运行，改了要提交推送。
2. **没读到库也要守的规则**：
   - 只有用户明确说“发”才发版；不要通过别的途径替他决定发布。
   - MobiCodex 仓库是公开的：提交、issue、PR 里不能有本机路径、用户名、邮箱、令牌、真实渠道名；提交前先扫 diff。
   - Codex 返回 429 或额度用完：通知用户、列出可换渠道，等他选；在原线程里换，不开新线程，不自动换。
   - 不改 Codex 的默认模型（config.toml 顶层 model）；不读 CC Switch 数据库里的密钥（providers.settings_config 的 auth）。
   - Codex 只能推 `codex/*` 分支；合并 main、改 CI、发版由你做。
   - 自己联网（网页、下载）在 Linux 上做；git push 和 gh 在 Mac 上做（凭据只在 Mac）。
   - 给用户的结果用中文。
