"use strict";
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

// Read an explicit file, without includes or running any command in the lane.
function checkLaneConfig(gitdir, expectedHooksPath, run = spawnSync) {
  const result = run("git", ["config", "--no-includes", "--file", path.join(gitdir, "config"), "--null", "--get-regexp",
    "(^core\\.hookspath$|^(core\\.fsmonitor|core\\.sshcommand|alias\\.|core\\.pager|filter\\.))"],
  { cwd: path.resolve(__dirname, "../.."), encoding: "utf8", timeout: 30000 });
  const entries = (result.stdout || "").split("\0").filter(Boolean).map(entry => {
    const split = entry.indexOf("\n");
    return { key: split < 0 ? entry : entry.slice(0, split), value: split < 0 ? "" : entry.slice(split + 1) };
  });
  const hooks = entries.filter(entry => entry.key === "core.hookspath");
  const risky = entries.filter(entry => entry.key !== "core.hookspath");
  const hooksPath = hooks[0]?.value;
  const keys = [...new Set(risky.map(entry => entry.key))];
  if (!hooks.length || hooks.some(entry => entry.value !== expectedHooksPath)) keys.push("core.hookspath");
  return { hooksPath, keys, risky: risky.map(entry => `${entry.key} ${entry.value}`).join("\n"),
    error: result.error || (result.status !== 0 && result.status !== 1) ? "无法读取 lane git 配置" : null };
}

// The caller brackets a turn with before()/after(). No side effects for a non-lane cwd.
function createLaneCheck(cwd, cfg, { run = spawnSync, env = process.env } = {}) {
  if (!cwd) return null;
  const expand = p => p.replace(/^~(?=\/|$)/, os.homedir());
  let lane;
  for (const project of Object.values(cfg.projects || {})) {
    if (!project.repo || !project.lanes?.dir) continue;
    const repo = path.resolve(expand(project.repo)), root = path.join(repo, project.lanes.dir);
    const relative = path.relative(root, path.resolve(expand(cwd)));
    const match = /^lane-([1-9][0-9]*)(?:[\\/]|$)/.exec(relative);
    if (match) { lane = { repo, root, n: match[1] }; break; }
  }
  if (!lane) return null;
  const gitEnv = { ...env };
  // -C must select the trusted main repo even if the caller exported lane variables.
  for (const key of ["GIT_DIR", "GIT_WORK_TREE", "GIT_COMMON_DIR"]) delete gitEnv[key];
  if (!gitEnv.HTTPS_PROXY && cfg.gitProxy) gitEnv.HTTPS_PROXY = cfg.gitProxy;
  const remote = () => {
    const result = run("git", ["-c", "http.version=HTTP/1.1", "-C", lane.repo, "ls-remote", "origin", "refs/heads/main", "refs/heads/codex/*"],
      { encoding: "utf8", timeout: 30000, env: gitEnv });
    if (result.error || result.status !== 0) return null;
    return new Map((result.stdout || "").trim().split("\n").filter(Boolean).map(line => {
      const [sha, ref] = line.trim().split(/\s+/); return [ref, sha];
    }));
  };
  let before;
  return {
    before() { before = remote(); },
    after() {
      const after = remote(), lines = ["\n[SECURITY]"];
      const unknown = "无法核对，稍后手动执行 git ls-remote（在项目主仓库执行）";
      if (!before || !after) {
        const failed = [!before && "派活前", !after && "派活后"].filter(Boolean).join("、");
        lines.push(`? 远端 main：${unknown}（${failed}查询失败）`);
      } else {
        const old = before.get("refs/heads/main"), next = after.get("refs/heads/main");
        if (!old && !next) lines.push(`? 远端 main：${unknown}（未找到 refs/heads/main）`);
        else if (old === next) lines.push(`✓ 远端 main 未变化：${next}`);
        else lines.push(`✗ 远端 main 已变化：${old || "(不存在)"} → ${next || "(不存在)"}；查推送记录，必要时由 Claude 回滚。`);
      }
      const checked = checkLaneConfig(path.join(lane.root, `lane-${lane.n}.gitdir`), path.join(lane.root, "hooks"), run);
      if (checked.error) lines.push(`✗ lane-${lane.n}：${checked.error}；先不要在 lane 里跑 git，执行 lane-reset ${lane.n}。`);
      else if (checked.keys.length) lines.push(`✗ lane-${lane.n} git 配置有可执行项：${checked.keys.join(", ")}；先不要在 lane 里跑 git，执行 lane-reset ${lane.n}。`);
      else lines.push(`✓ lane-${lane.n} git 配置无可执行项（hooksPath 符合预期）`);
      if (!before || !after) lines.push(`? codex/* 分支：${unknown}`);
      else {
        const changed = [...after].filter(([ref, sha]) => ref?.startsWith("refs/heads/codex/") && before.get(ref) !== sha).sort(([a], [b]) => a.localeCompare(b));
        if (!changed.length) lines.push("✓ codex/*：本轮没有新建或更新的分支");
        else lines.push("本轮新建或更新的 codex/* 分支：", ...changed.map(([ref, sha]) => `  ${ref.slice("refs/heads/".length)} ${sha}`));
      }
      return lines.join("\n");
    },
  };
}

module.exports = { checkLaneConfig, createLaneCheck };
