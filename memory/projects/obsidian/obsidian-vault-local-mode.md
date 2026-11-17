---
name: obsidian-vault-local-mode
description: Obsidian 笔记库 ~/obsidian_personal_knowledge 按本地模式接入 Codex：不建 GitHub 仓库，线1/线2 直接在库里改，Claude 用本地 git 审查提交
metadata:
  type: project
---

用户 2026-11-17 定：笔记库 `~/obsidian_personal_knowledge` 用**本地模式**接入，不建 GitHub 仓库、不建令牌、没有 PR/CI/发版。

- 线程：Codex 桌面端在这个项目下的“线1”“线2”（ID 在 config.json 的 `projects.obsidian.threads`，不是 lanes）。不借用 MobiCodex 的线程。
- 派活：job 的 `cwd` 设成库根目录，`sandbox: "workspace-write"`，Codex 只能写这个目录。两条线同时派活时要分开目录，避免改同一批文件（没有 lane 隔离）。
- 审查：库根有本地 git（基线 `adacb5d`，11-17 建）。Codex 改完我用 `git diff` / `git status` 审，没问题再在本地提交；不对就 `git checkout`/`git clean` 回退 Codex 的改动。**不加 remote，不推送。**
- 库里的规则以 `AGENTS.md` 为准，派活时让 Codex 遵守：不能删已有笔记内容、不能改原始记录；新笔记用 frontmatter 模板；整理后更新对应 index.md；导入素材先落 `raw/`，图片放 `assets/`。
- 同步：装了 Remotely Save，它内置忽略 `.git`、`node_modules`、`.DS_Store`，本地 git 不会被同步上去。`.gitignore` 忽略了 workspace.json、.playwright-cli、.deck-build。
- 模型：线程建时默认是 ccs-pro20x/gpt-6-astra，11-17 测试时 429（重置 11-20 19:34），用户选定以后派活用默认渠道 **gpt-6.1-sol**，在 job 里指定 model，不改 config.toml 默认（见 [[codex-model-assignment]]）。11-17 两条线测试通过：cwd 正确，库内可写，库外写入被沙箱拒绝。
- 两条线共用一个目录，改动清单（FILES CHANGED）会互相看到对方的文件和 Obsidian 自己改的 workspace.json，审查时按任务区分。
