#!/usr/bin/env node
// Explicit smoke test: sends ONE paid turn. Do not run automatically.
//   IPC route (desktop before 26.1117): to config.json's testThread. Daemon route: to a new thread in testCwd.
// usage: node scripts/verify-desktop.cjs --project <name> [--model <model>]
//   --model runs the turn on that model (IPC route: switches the test thread in place, e.g. after a 429).
"use strict";
const fs = require("node:fs"), os = require("node:os"), path = require("node:path");
const { spawnSync } = require("node:child_process");
const { findRollout, verifyTurnContext } = require("./lib/desktop-rollout.cjs");
const { readVersions, readState, writeState, verifiedVersion, sameVersion } = require("./lib/desktop-state.cjs");
const { listening } = require("./lib/socket-probe.cjs");

async function main() {
  const root = path.resolve(__dirname, "..");
  const cfg = JSON.parse(fs.readFileSync(path.join(root, "config.json"), "utf8"));
  const modelIndex = process.argv.indexOf("--model");
  const model = modelIndex >= 0 ? process.argv[modelIndex + 1] : undefined;
  if (modelIndex >= 0 && (!model || model.startsWith("--"))) throw new Error("--model 后面要跟模型名");
  const index = process.argv.indexOf("--project");
  // No default project: each project must use its own testThread.
  if (index < 0) throw new Error(`要带 --project <名字>（已接入：${Object.keys(cfg.projects || {}).join("、")}）`);
  const name = process.argv[index + 1];
  const project = cfg.projects?.[name];
  if (!project?.testThread) throw new Error("config.json 里没有该项目的 testThread");
  // The test thread lives in its own empty folder (testCwd); its creation folder stays writable for good.
  const testCwd = project.testCwd ? path.resolve(project.testCwd.replace(/^~(?=\/|$)/, os.homedir())) : root;
  if (!fs.statSync(testCwd, { throwIfNoEntry: false })?.isDirectory()) throw new Error(`testCwd 不存在：${testCwd}`);
  const home = (cfg.codexHome || path.join(os.homedir(), ".codex")).replace(/^~(?=\/|$)/, os.homedir());
  const version = readVersions();
  // Check state readability before sending a turn; a corrupt state must not be overwritten.
  readState();
  // Desktop 26.1117+ no longer serves IPC. Then verify the daemon route jobs actually use, on a new thread in testCwd:
  // cheaper than resuming a cold thread, and idle rollouts get compressed to .jsonl.zst, which findRollout cannot read.
  const viaIpc = await listening(path.join(home, "ipc", "ipc.sock"));
  const rollout = viaIpc ? findRollout(home, project.testThread) : null;
  if (viaIpc && !rollout) throw new Error("测试线程没有 rollout；请先由用户在桌面端加载测试线程");
  const offset = rollout ? fs.statSync(rollout).size : 0;
  const temp = fs.mkdtempSync(path.join(__dirname, ".verify-desktop-"));
  try {
    const jobFile = path.join(temp, "job.json");
    fs.writeFileSync(jobFile, JSON.stringify({
      ...(viaIpc ? { threadId: project.testThread, inherit: false } : { name: "兼容自检" }),
      cwd: testCwd, prompt: "只回复 OK", effort: "low", ...(model ? { model } : {}),
      sandbox: "workspace-write", approval: "never", timeoutSec: 120,
      sandboxPolicy: { type: "workspaceWrite", writableRoots: [testCwd], networkAccess: true, excludeTmpdirEnvVar: true, excludeSlashTmp: true },
    }));
    console.log(`兼容自检（${viaIpc ? "桌面端 IPC，测试线程" : "daemon，新线程"}）：发一轮“只回复 OK”（会消耗额度）`);
    const result = spawnSync(process.execPath, [path.join(__dirname, viaIpc ? "codex-desktop-turn.cjs" : "codex-run.cjs"), jobFile], {
      cwd: root, env: { ...process.env, CODEX_HOME: home }, encoding: "utf8", timeout: 150000,
    });
    if (result.error || result.status !== 0) throw new Error(`测试轮次未成功：${result.error?.message || result.stdout?.trim() || result.stderr?.trim() || result.status}`);
    const stdout = result.stdout || "";
    const turnId = (viaIpc ? /^start-turn: success \/ turn (\S+)$/m : /^TURN_STARTED (\S+) /m).exec(stdout)?.[1];
    if (!turnId || !(viaIpc ? /^STATUS completed \|/m : /^TURN completed$/m).test(stdout)) throw new Error("未确认本轮 turnId 和完成状态，不能标记已验证");
    const newThread = viaIpc ? null : /^THREAD (\S+) /m.exec(stdout)?.[1];
    if (!viaIpc && !newThread) throw new Error("没拿到新线程的 ID，不能标记已验证");
    const file = rollout || findRollout(home, newThread);
    if (!file) throw new Error(`找不到新线程 ${newThread} 的 rollout`);
    const after = fs.readFileSync(file);
    if (after.length <= offset) throw new Error("rollout 没有新增本轮记录");
    verifyTurnContext(after.subarray(offset).toString("utf8"), turnId, testCwd);
    const current = readVersions();
    if (!sameVersion(version, current)) throw new Error("验证期间桌面端或 daemon 版本发生变化，请重跑");
    writeState(verifiedVersion(readState(), version));
    console.log("✓ 本轮 sandbox_policy=workspace-write，可写目录只有 cwd，approval_policy=never");
    console.log(`✓ 已验证桌面端 ${version.app} / codex-cli ${version.cli} / daemon ${version.daemon || "没在运行"}，已更新本机状态文件`);
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
}

if (require.main === module) main().catch(e => { console.error(`✗ ${e.message}`); process.exitCode = 1; });
