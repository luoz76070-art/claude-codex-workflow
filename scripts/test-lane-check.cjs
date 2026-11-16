#!/usr/bin/env node
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { spawnSync } = require("node:child_process");
const { checkLaneConfig, createLaneCheck } = require("./lib/lane-check.cjs");

// Keep fixtures in this repository; no real lane, remote, IPC or credentials are used.
const temp = fs.mkdtempSync(path.join(__dirname, ".lane-check-test-"));
test.after(() => fs.rmSync(temp, { recursive: true, force: true }));
const repo = path.join(temp, "project with spaces"), lanes = path.join(repo, ".codex-lanes");
const gitdir = path.join(lanes, "lane-2.gitdir"), hooks = path.join(lanes, "hooks");
fs.mkdirSync(gitdir, { recursive: true });
const configFile = path.join(gitdir, "config");
const clean = `[core]\n\thooksPath = ${JSON.stringify(hooks)}\n`;
const cfg = { gitProxy: "http://proxy.invalid:7897", projects: { example: { repo, lanes: { dir: ".codex-lanes", threads: { "2": "synthetic" } } } } };
const sha = char => char.repeat(40);
const refs = rows => rows.map(([name, commit]) => `${commit}\trefs/heads/${name}\n`).join("");

test("clean config passes; core.fsmonitor is detected without executing it", () => {
  fs.writeFileSync(configFile, clean);
  const checked = checkLaneConfig(gitdir, hooks);
  assert.equal(checked.error, null); assert.deepEqual(checked.keys, []);
  assert.equal(checked.hooksPath, hooks);
  const marker = path.join(temp, "must-not-execute");
  fs.appendFileSync(configFile, `\tfsmonitor = ${JSON.stringify(`!touch ${marker}`)}\n`);
  const dirty = checkLaneConfig(gitdir, hooks);
  assert.deepEqual(dirty.keys, ["core.fsmonitor"]);
  assert.match(dirty.risky, /^core\.fsmonitor /);
  assert.equal(fs.existsSync(marker), false);
});

test("legacy executable keys and unexpected hooksPath are reported", () => {
  fs.writeFileSync(configFile, '[core]\n hooksPath = elsewhere\n sshCommand = command\n pager = command\n[alias]\n audit = !command\n[filter "custom"]\n clean = command\n');
  assert.deepEqual(checkLaneConfig(gitdir, hooks).keys.sort(), ["alias.audit", "core.hookspath", "core.pager", "core.sshcommand", "filter.custom.clean"].sort());
});

function audit(before, after, env = {}, cwd = path.join(lanes, "lane-2", "src")) {
  fs.writeFileSync(configFile, clean);
  const calls = [], replies = [before, after];
  const check = createLaneCheck(cwd, cfg, { env, run(cmd, args, options) {
    calls.push({ cmd, args, options });
    if (args.includes("ls-remote")) {
      const reply = replies.shift();
      return typeof reply === "string" ? { status: 0, stdout: reply } : reply;
    }
    return spawnSync(cmd, args, options);
  } });
  return { check, calls };
}

test("SECURITY reports unchanged main and only new/updated codex branches, using the main repo and fallback proxy", () => {
  const before = refs([["main", sha("a")], ["codex/updated", sha("b")], ["codex/unchanged", sha("c")], ["codex/deleted", sha("d")]]);
  const after = refs([["main", sha("a")], ["codex/updated", sha("e")], ["codex/unchanged", sha("c")], ["codex/new", sha("f")]]);
  const env = { GIT_DIR: "untrusted-lane", GIT_WORK_TREE: "untrusted-lane", GIT_COMMON_DIR: "untrusted-lane" };
  const { check, calls } = audit(before, after, env);
  assert.equal(calls.length, 0, "no query before the turn is about to start");
  check.before(); const report = check.after();
  assert.match(report, /\[SECURITY\]/); assert.match(report, new RegExp(`✓ 远端 main 未变化：${sha("a")}`));
  assert.match(report, /✓ lane-2 git 配置无可执行项/);
  assert.ok(report.includes(`codex/new ${sha("f")}`) && report.includes(`codex/updated ${sha("e")}`));
  assert.doesNotMatch(report, /codex\/unchanged|codex\/deleted/);
  for (const { args, options } of calls.filter(call => call.args.includes("ls-remote"))) {
    assert.deepEqual(args, ["-c", "http.version=HTTP/1.1", "-C", repo, "ls-remote", "origin", "refs/heads/main", "refs/heads/codex/*"]);
    assert.equal(options.env.HTTPS_PROXY, cfg.gitProxy);
    for (const key of ["GIT_DIR", "GIT_WORK_TREE", "GIT_COMMON_DIR"]) assert.equal(options.env[key], undefined);
  }
  assert.equal(env.GIT_DIR, "untrusted-lane", "the parent environment stays unchanged");
});

test("changed/deleted main and unsafe lane config include remediation; existing HTTPS_PROXY wins", () => {
  for (const after of [refs([["main", sha("b")]]), ""]) {
    const { check, calls } = audit(refs([["main", sha("a")]]), after, { HTTPS_PROXY: "http://existing.invalid:7897" });
    check.before(); fs.appendFileSync(configFile, " fsmonitor = command\n"); const report = check.after();
    assert.match(report, /✗ 远端 main 已变化/); assert.ok(report.includes(sha("a")));
    assert.ok(report.includes(after ? sha("b") : "(不存在)"));
    assert.match(report, /查推送记录，必要时由 Claude 回滚/);
    assert.match(report, /✗ lane-2.*core\.fsmonitor.*lane-reset 2/);
    assert.equal(calls[0].options.env.HTTPS_PROXY, "http://existing.invalid:7897");
  }
});

test("failed ls-remote is unknown, never a clean verdict; lane inspection still runs", () => {
  const good = refs([["main", sha("a")]]), failure = { status: null, error: Object.assign(new Error("timeout"), { code: "ETIMEDOUT" }) };
  for (const pair of [[failure, good], [good, failure], [failure, failure]]) {
    const { check } = audit(...pair); check.before();
    assert.doesNotThrow(() => {
      const report = check.after();
      assert.match(report, /\? 远端 main：无法核对，稍后手动执行 git ls-remote/);
      assert.match(report, /\? codex\/\* 分支：无法核对/);
      assert.match(report, /✓ lane-2 git 配置无可执行项/);
      assert.doesNotMatch(report, /✓ 远端 main|本轮没有新建/);
    });
  }
});

test("non-lane cwd is ignored and unreadable config cannot pass", () => {
  for (const cwd of [undefined, repo, path.join(temp, "other", "lane-2"), path.join(lanes, "lane-2.gitdir"), path.join(lanes, "lane-2-other")]) assert.equal(createLaneCheck(cwd, cfg), null);
  const { check } = audit(refs([["main", sha("a")]]), refs([["main", sha("a")]]));
  check.before(); fs.writeFileSync(configFile, "[invalid\n");
  assert.match(check.after(), /✗ lane-2：无法读取 lane git 配置.*lane-reset 2/);
});
