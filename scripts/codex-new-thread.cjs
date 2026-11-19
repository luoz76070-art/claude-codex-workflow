// Create a fresh desktop-owned Codex thread in a lane (or the test folder) without the folder picker.
// usage: node scripts/codex-new-thread.cjs --project <name> --lane <1|2|test> [--assign]
// How: the lane's current thread calls the desktop's own codex_app create_thread tool for the same folder.
// The desktop asks the USER to approve that one call (it cannot be pre-approved, 2026-11-17), so tell the
// user to click "allow" in the parent thread. The new thread inherits the parent's writable roots, which
// for a lane are its own folder, its gitdir and the pnpm store. --assign writes the new ID into config.json.
"use strict";
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const arg = name => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : undefined; };
const root = path.resolve(__dirname, "..");
const configPath = path.join(root, "config.json");
const cfg = JSON.parse(fs.readFileSync(configPath, "utf8"));
const name = arg("--project"), lane = arg("--lane"), assign = process.argv.includes("--assign");
const project = cfg.projects?.[name];
if (!project) { console.error(`✗ 要带 --project <名字>（已接入：${Object.keys(cfg.projects || {}).join("、")}）`); process.exit(2); }
if (!["1", "2", "test"].includes(lane || "")) { console.error("✗ 要带 --lane 1、2 或 test"); process.exit(2); }
const home = p => path.resolve(String(p).replace(/^~(?=\/|$)/, os.homedir()));
const repo = home(project.repo);
const lanesDir = path.join(repo, project.lanes?.dir || ".codex-lanes");
const parent = lane === "test" ? project.testThread : project.lanes?.threads?.[lane];
const folder = lane === "test" ? home(project.testCwd || "") : path.join(lanesDir, `lane-${lane}`);
if (!parent) { console.error("✗ 这条线在 config.json 里还没有线程，只能先由用户在桌面端手动建一个"); process.exit(2); }
if (!fs.statSync(folder, { throwIfNoEntry: false })?.isDirectory()) { console.error(`✗ 目录不存在：${folder}`); process.exit(2); }

const prompt = [
  "工作流任务：新建一个对话，只做这一件事，不改任何文件。",
  `1. 调用 codex_app 的 list_projects，找出根目录正好是 ${folder} 的项目（不是它的子目录或前缀相同的其他目录）。找不到就报告“找不到项目”并结束。`,
  "2. 只调用一次 create_thread：target 为该项目，environment 为 local，prompt 为“新线程：只回复 OK”。这次调用需要用户在桌面端批准，请等待。",
  "3. 最后一行只输出：NEW_THREAD=<新对话 ID>；失败时输出：NEW_THREAD_FAILED=<报错原文>。",
].join("\n");
const job = {
  threadId: parent, cwd: folder, prompt, model: "ccs-pro20x/gpt-6.2-sol", effort: "high", sandbox: "workspace-write", network: false,
  extraWritableRoots: lane === "test" ? [] : [path.join(lanesDir, `lane-${lane}.gitdir`), path.join(lanesDir, "pnpm-store")],
  approval: "on-request", timeoutSec: 1500,
};
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "codex-new-thread-"));
const jobFile = path.join(temp, "job.json");
fs.writeFileSync(jobFile, JSON.stringify(job));
console.log(`在 ${name} 的${lane === "test" ? "测试线程" : `线${lane}`}里发起新建；请用户在桌面端这个对话里批准一次 create_thread（最多等 25 分钟）。`);
const result = spawnSync(process.execPath, [path.join(__dirname, "codex-desktop-turn.cjs"), jobFile], { encoding: "utf8", timeout: 1600_000 });
fs.rmSync(temp, { recursive: true, force: true });
const out = `${result.stdout || ""}\n${result.stderr || ""}`;
const id = /NEW_THREAD=([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})/i.exec(out)?.[1]
  || /::created-thread\{threadId="([0-9a-f-]{36})"\}/i.exec(out)?.[1];
if (!id) {
  console.error("✗ 没拿到新对话 ID");
  console.error((/NEW_THREAD_FAILED=(.*)/.exec(out)?.[1] || out.split("\n").filter(l => /STATUS|QUOTA|NO_OWNER|error/i.test(l)).join("\n")).slice(0, 800));
  process.exit(1);
}
console.log(`✓ 新对话 ${id}（桌面端拥有，目录 ${path.basename(folder)}）。它的第一轮用桌面端默认模型，那边限流时会报 429，不影响以后派活。`);
if (assign) {
  const fresh = JSON.parse(fs.readFileSync(configPath, "utf8"));
  if (lane === "test") fresh.projects[name].testThread = id; else fresh.projects[name].lanes.threads[lane] = id;
  fs.writeFileSync(configPath, JSON.stringify(fresh, null, 2) + "\n");
  console.log(`✓ 已写入 config.json（${lane === "test" ? "testThread" : `lanes.threads.${lane}`}）；记得提交推送${lane === "test" ? "，并跑 verify-desktop" : ""}。`);
}
