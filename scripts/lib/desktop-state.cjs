"use strict";
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const defaultStateFile = () => path.join(os.homedir(), ".codex-workflow-state.json");
const sameVersion = (a, b) => Boolean(a && b && a.app === b.app && a.cli === b.cli);

function readDesktopVersions({ app = "/Applications/ChatGPT.app", run = spawnSync } = {}) {
  const version = run("/usr/libexec/PlistBuddy", ["-c", "Print :CFBundleShortVersionString", path.join(app, "Contents/Info.plist")], { encoding: "utf8", timeout: 10000 });
  if (version.error || version.status !== 0 || !version.stdout?.trim()) throw new Error("无法读取 ChatGPT.app 版本");
  const resources = path.join(app, "Contents/Resources");
  const candidates = ["codex-cli/bin/codex", "codex", "codex-cli"];
  for (const relative of candidates) {
    const result = run(path.join(resources, relative), ["--version"], { encoding: "utf8", timeout: 10000 });
    const cli = /^codex-cli\s+(\S+)/m.exec(result.stdout || "")?.[1];
    if (!result.error && result.status === 0 && cli) return { app: version.stdout.trim(), cli };
  }
  throw new Error("无法读取内置 codex-cli 版本（可能是桌面端目录结构已变）");
}

function readState(file = defaultStateFile()) {
  try {
    const state = JSON.parse(fs.readFileSync(file, "utf8"));
    if (!state || typeof state !== "object" || Array.isArray(state)) throw new Error("状态文件必须是 JSON 对象");
    return state;
  } catch (e) { if (e.code === "ENOENT") return {}; throw e; }
}

function writeState(state, file = defaultStateFile()) {
  const temp = `${file}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(temp, JSON.stringify(state, null, 2) + "\n", { mode: 0o600, flag: "wx" });
    fs.renameSync(temp, file);
  } finally {
    try { fs.unlinkSync(temp); } catch (e) { if (e.code !== "ENOENT") throw e; }
  }
}

function observeVersion(state, version) {
  const changed = Boolean(state.observedDesktop && !sameVersion(state.observedDesktop, version));
  return { ...state, observedDesktop: version, pendingVerification: changed || state.pendingVerification === true };
}

function verifiedVersion(state, version, now = new Date().toISOString()) {
  return { ...state, observedDesktop: version, verifiedDesktop: version, verifiedAt: now, pendingVerification: false };
}

module.exports = { readDesktopVersions, readState, writeState, observeVersion, verifiedVersion, sameVersion };
