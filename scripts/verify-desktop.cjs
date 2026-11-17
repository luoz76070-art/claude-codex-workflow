#!/usr/bin/env node
// Explicit smoke test: sends ONE paid turn to config.json's testThread. Do not run automatically.
// usage: node scripts/verify-desktop.cjs [--project <name>]
"use strict";
const fs = require("node:fs"), os = require("node:os"), path = require("node:path");
const { spawnSync } = require("node:child_process");
const { findRollout, verifyTurnContext } = require("./lib/desktop-rollout.cjs");
const { readDesktopVersions, readState, writeState, verifiedVersion, sameVersion } = require("./lib/desktop-state.cjs");

function main() {
  const root = path.resolve(__dirname, "..");
  const cfg = JSON.parse(fs.readFileSync(path.join(root, "config.json"), "utf8"));
  const index = process.argv.indexOf("--project");
  // No default project: each project must use its own testThread.
  if (index < 0) throw new Error(`要带 --project <名字>（已接入：${Object.keys(cfg.projects || {}).join("、")}）`);
  const name = process.argv[index + 1];
  const project = cfg.projects?.[name];
  if (!project?.testThread) throw new Error("config.json 里没有该项目的 testThread");
  const home = (cfg.codexHome || path.join(os.homedir(), ".codex")).replace(/^~(?=\/|$)/, os.homedir());
  const version = readDesktopVersions();
  // Check state readability before sending a turn; a corrupt state must not be overwritten.
  readState();
  const rollout = findRollout(home, project.testThread);
  if (!rollout) throw new Error("测试线程没有 rollout；请先由用户在桌面端加载测试线程");
  const offset = fs.statSync(rollout).size;
  const temp = fs.mkdtempSync(path.join(__dirname, ".verify-desktop-"));
  try {
    const jobFile = path.join(temp, "job.json");
    fs.writeFileSync(jobFile, JSON.stringify({
      threadId: project.testThread, cwd: root, prompt: "只回复 OK", effort: "low", inherit: false,
      sandbox: "workspace-write", approval: "never", timeoutSec: 120,
      sandboxPolicy: { type: "workspaceWrite", writableRoots: [root], networkAccess: true, excludeTmpdirEnvVar: true, excludeSlashTmp: true },
    }));
    console.log("兼容自检：向测试线程发一轮“只回复 OK”（会消耗额度）");
    const result = spawnSync(process.execPath, [path.join(__dirname, "codex-desktop-turn.cjs"), jobFile], {
      cwd: root, env: { ...process.env, CODEX_HOME: home }, encoding: "utf8", timeout: 150000,
    });
    if (result.error || result.status !== 0) throw new Error(`测试轮次未成功：${result.error?.message || result.stdout?.trim() || result.stderr?.trim() || result.status}`);
    const turnId = /^start-turn: success \/ turn (\S+)$/m.exec(result.stdout || "")?.[1];
    if (!turnId || !/^STATUS completed \|/m.test(result.stdout || "")) throw new Error("未确认本轮 turnId 和完成状态，不能标记已验证");
    const after = fs.readFileSync(rollout);
    if (after.length <= offset) throw new Error("rollout 没有新增本轮记录");
    verifyTurnContext(after.subarray(offset).toString("utf8"), turnId, root);
    const current = readDesktopVersions();
    if (!sameVersion(version, current)) throw new Error("验证期间桌面端版本发生变化，请重跑");
    writeState(verifiedVersion(readState(), version));
    console.log("✓ 本轮 sandbox_policy=workspace-write，可写目录只有 cwd，approval_policy=never");
    console.log(`✓ 已验证桌面端 ${version.app} / codex-cli ${version.cli}，已更新本机状态文件`);
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
}

if (require.main === module) {
  try { main(); } catch (e) { console.error(`✗ ${e.message}`); process.exitCode = 1; }
}
