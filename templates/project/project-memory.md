---
name: <项目>-project
description: <项目> 的仓库、测试、发版和当前进度（接入时按 docs/new-project.md 填写）
metadata:
  type: project
---

- **仓库**：Mac 上 `<repo>`；GitHub `<owner>/<repo>`（公开/私有：用 `gh repo view --json visibility` 查；公开的提交前扫个人信息）。本地项目没有 GitHub 就写“本地，只在本地提交”。
- **工作线**：`.codex-lanes/lane-1`、`lane-2`，线程 ID 在 config.json；令牌钥匙串 `github-pat-<项目>`。
- **测试命令**：类型检查 `<命令>`、lint `<命令>`、测试 `<命令>`；有前置步骤（比如要先 build）写在这里。
- **发版**：只有用户说“发”才发。触发方式（推什么标签、跑哪个 CI、产物传到哪）、版本号要改哪几处。
- **截图/视觉验收**：用什么脚本、要不要在 Codex 沙箱外跑。
- **项目自己的规则**：目录约定、不能动的东西、AGENTS.md 里的要求。
- **当前进度**：已合并未发版的改动、等真机复测的 issue（日期写绝对日期）。
