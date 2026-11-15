---
name: network-via-linux-host
description: "Claude's own internet access (web search/fetch, downloads) runs on the Linux host; the Mac's network works and Mac-side tools like Codex may use it"
metadata:
  node_type: memory
  type: feedback
  originSessionId: aa35ee15-1c32-4e56-b9d5-6c873136f5d9
  modified: 2026-11-13T10:00:58.792Z
---

"联网走 Linux"指的是 Claude 自己联网（网页搜索/抓取、下载文件、调 API）时，从 cc-desk 所在的 Linux 服务器发出。Mac 本地的网络正常可用（2026-11-12 实测能连外网），Mac 上运行的程序可以直接联网，比如 Codex 和它在 127.0.0.1 上的本地模型代理。

**Why:** 用户最开始说"以后的联网都走linux"，后来澄清：这条路线指的是用 cc-desk 访问服务器上 Claude 服务的那部分，Mac 本地网络是能用的。

**How to apply:**
- 我自己要联网：在 Linux 上做。如果结果要放进项目，先下载到一个新的空临时目录，再用 scp 传到 device:/Users/rorance/workspace/project/codex-to-phone，传完删掉 Linux 上的副本。
- Mac 上本来就要联网的工具（Codex `codex exec` 等）：直接在 Mac 上跑。
- **GitHub（用户 2026-11-13 确认）：** 查看 CI 状态和日志改为在 Linux 上打开公开的 GitHub 网页（仓库 luoz76070-art/MobiCodex 是公开的），不再在 Mac 上用 `gh` 调接口。git push 仍在 Mac 上执行，因为凭据只在 Mac 上。起因是用户看到 "API Error: 403 Attention Required | Cloudflare"，怀疑是调 GitHub API 引起的；实际那是 Linux 上的 Claude Code 连 Claude 服务时被 Cloudflare 拦截，跟 GitHub 无关，我已向用户解释过。
- npm / brew / git 的联网操作：用户在澄清之前说过"还是希望走 linux 方式"（在 Linux 上准备好再传过去：npm 用 `--os=darwin --cpu=arm64`，git 用 `git bundle`）。在用户另行说明之前继续这么做；我已经问过他们知道 Mac 能联网后要不要改。
