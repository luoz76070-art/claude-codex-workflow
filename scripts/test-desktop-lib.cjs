#!/usr/bin/env node
"use strict";
const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const { encodeFrame, createFrameDecoder } = require("./lib/desktop-ipc.cjs");
const { sandboxPolicyFromContext, keptSettingsFromRollout, needsKeptSettings, buildStartTurnParams } = require("./lib/desktop-turn.cjs");
const { needsCurrentModel } = require("./lib/model-switch.cjs");
const { findRollout, verifyTurnContext } = require("./lib/desktop-rollout.cjs");
const { readDesktopVersions, readDaemonVersion, readState, writeState, observeVersion, verifiedVersion } = require("./lib/desktop-state.cjs");
const { listening } = require("./lib/socket-probe.cjs");
const net = require("node:net");

// Only synthetic fixtures in this repository. No real IPC, rollout, config or state.
const temp = fs.mkdtempSync(path.join(__dirname, ".desktop-lib-test-"));
test.after(() => fs.rmSync(temp, { recursive: true, force: true }));
const cwd = path.join(temp, "workspace");
const record = payload => JSON.stringify({ type: "turn_context", payload }) + "\n";
const completed = (turnId, extra = {}) => JSON.stringify({ type: "event_msg", payload: { type: "task_complete", turn_id: turnId, ...extra } }) + "\n";
const context = {
  turn_id: "synthetic-turn", model: "synthetic-model", effort: "medium", approval_policy: "never",
  sandbox_policy: { type: "workspace-write", writable_roots: [cwd], network_access: true, exclude_tmpdir_env_var: true, exclude_slash_tmp: true },
};

test("frame header is a four-byte little-endian UTF-8 byte length", () => {
  const message = { type: "request", text: "只回复 OK" }, encoded = encodeFrame(message);
  assert.equal(encoded.readUInt32LE(0), Buffer.byteLength(JSON.stringify(message)));
  assert.deepEqual([...encoded.subarray(0, 4)], [encoded.length - 4, 0, 0, 0]);
  assert.deepEqual(createFrameDecoder()(encoded), [message]);
});

test("decoder handles glued frames and a trailing half frame", () => {
  const a = { n: 1 }, b = { n: 2 }, c = { text: "第三条" };
  const decode = createFrameDecoder(), last = encodeFrame(c);
  assert.deepEqual(decode(Buffer.concat([encodeFrame(a), encodeFrame(b), last.subarray(0, 6)])), [a, b]);
  assert.deepEqual(decode(last.subarray(6)), [c]);
});

test("every header/payload split, including inside a Chinese UTF-8 character, round trips", () => {
  const message = { text: "权限检查" }, frame = encodeFrame(message);
  for (let i = 1; i < frame.length; i++) {
    const decode = createFrameDecoder();
    assert.deepEqual(decode(frame.subarray(0, i)), []);
    assert.deepEqual(decode(frame.subarray(i)), [message]);
  }
  const decode = createFrameDecoder(), messages = [];
  for (const byte of frame) messages.push(...decode(Buffer.from([byte])));
  assert.deepEqual(messages, [message]);
  assert.deepEqual(createFrameDecoder()(Buffer.alloc(0)), []);
});

test("decoders have independent buffers and reject invalid JSON", () => {
  const a = createFrameDecoder(), b = createFrameDecoder(), frame = encodeFrame({ ok: true });
  a(frame.subarray(0, 3));
  assert.deepEqual(b(frame), [{ ok: true }]);
  assert.deepEqual(a(frame.subarray(3)), [{ ok: true }]);
  assert.throws(() => createFrameDecoder()(Buffer.from([1, 0, 0, 0, 123])), SyntaxError);
});

test("workspace-write converts all snake_case permission fields without mutating the context", () => {
  const before = structuredClone(context);
  assert.deepEqual(sandboxPolicyFromContext(context), {
    type: "workspaceWrite", writableRoots: [cwd], networkAccess: true, excludeTmpdirEnvVar: true, excludeSlashTmp: true,
  });
  assert.deepEqual(context, before);
  assert.deepEqual(sandboxPolicyFromContext({ sandbox_policy: { type: "workspace-write", writable_roots: [cwd, 7] } }), {
    type: "workspaceWrite", writableRoots: [cwd], networkAccess: false, excludeTmpdirEnvVar: false, excludeSlashTmp: false,
  });
});

test("read-only and explicit danger-full-access retain their respective permission types", () => {
  assert.deepEqual(sandboxPolicyFromContext({ sandbox_policy: { type: "read-only", network_access: true } }), { type: "readOnly", networkAccess: true });
  assert.deepEqual(sandboxPolicyFromContext({ sandbox_policy: { type: "read-only" } }), { type: "readOnly", networkAccess: false });
  assert.deepEqual(sandboxPolicyFromContext({ sandbox_policy: { type: "danger-full-access" } }), { type: "dangerFullAccess" });
});

test("missing/unknown policy fields throw; they never default to full access", () => {
  for (const ctx of [undefined, {}, { sandbox_policy: {} }, { sandbox_policy: { type: "future-policy" } }, { sandbox_policy: { type: "workspace-write" } }]) {
    assert.throws(() => sandboxPolicyFromContext(ctx), /NO_SETTINGS/);
  }
  assert.throws(() => keptSettingsFromRollout(""), /NO_SETTINGS/);
});

test("kept permissions use the last context by default and allow an explicit context index", () => {
  const first = { ...context, effort: "low", sandbox_policy: { type: "read-only" }, approval_policy: "untrusted" };
  const text = record(first) + 'not JSON\n' + JSON.stringify({ type: "event_msg" }) + '\n' + record(context);
  assert.deepEqual(keptSettingsFromRollout(text), { policy: sandboxPolicyFromContext(context), approval: "never", model: "synthetic-model", effort: "medium" });
  assert.equal(keptSettingsFromRollout(text, 0).policy.type, "readOnly");
  assert.equal(keptSettingsFromRollout(text, 0).approval, "untrusted");
  assert.throws(() => keptSettingsFromRollout(text, 3), /NO_SETTINGS/);
  const granular = { granular: { sandbox_approval: false } };
  assert.deepEqual(keptSettingsFromRollout(record({ ...context, approval_policy: granular })).approval, granular);
  assert.equal(keptSettingsFromRollout(record({ ...context, approval_policy: undefined })).approval, "on-request");
});

test("model/effort jobs disable inheritance and include permissions in the exact start-turn envelope", () => {
  const job = { threadId: "synthetic-thread", prompt: "只回复 OK", cwd, model: "synthetic-next", effort: "low", sandbox: "workspace-write", network: false, extraWritableRoots: ["extra-root"], approval: "never" };
  const before = structuredClone(job);
  assert.deepEqual(buildStartTurnParams(job, null, "message-id"), {
    conversationId: "synthetic-thread",
    turnStart: {
      request: {
        threadId: "synthetic-thread", input: [{ type: "text", text: "只回复 OK", text_elements: [] }], clientUserMessageId: "message-id",
        model: "synthetic-next", effort: "low", cwd,
        sandboxPolicy: { type: "workspaceWrite", writableRoots: [cwd, "extra-root"], networkAccess: false, excludeTmpdirEnvVar: false, excludeSlashTmp: false }, approvalPolicy: "never",
      },
      context: {
        inheritThreadSettings: false,
        restoreMessage: { cwd, context: { workspaceRoots: [cwd], collaborationMode: null, commentAttachments: [] }, responsesapiClientMetadata: null },
        attachments: [], commentAttachments: [],
      },
    },
  });
  assert.deepEqual(job, before);
  for (const setting of [{ model: "synthetic-next" }, { effort: "low" }]) {
    const params = buildStartTurnParams({ threadId: "synthetic-thread", prompt: "OK", ...setting }, keptSettingsFromRollout(record(context)));
    assert.equal(params.turnStart.context.inheritThreadSettings, false);
    assert.deepEqual(params.turnStart.request.sandboxPolicy, sandboxPolicyFromContext(context));
    assert.equal(params.turnStart.request.approvalPolicy, "never");
  }
});

test("plain jobs inherit; explicit inherit remains authoritative", () => {
  const job = { threadId: "synthetic-thread", prompt: "OK" };
  const params = buildStartTurnParams(job);
  assert.equal(params.turnStart.context.inheritThreadSettings, true);
  assert.equal(params.turnStart.context.restoreMessage.cwd, null);
  assert.deepEqual(params.turnStart.context.restoreMessage.context.workspaceRoots, []);
  assert.equal("sandboxPolicy" in params.turnStart.request, false);
  assert.equal("approvalPolicy" in params.turnStart.request, false);
  assert.equal(buildStartTurnParams({ ...job, model: "synthetic-next", inherit: true }).turnStart.context.inheritThreadSettings, true);
  assert.equal(needsKeptSettings({ ...job, model: "synthetic-next" }), true);
  assert.equal(needsKeptSettings(job), false);
});

test("explicit sandbox policies and approval overrides preserve existing job behavior", () => {
  const job = { threadId: "synthetic-thread", prompt: "OK", effort: "low", cwd };
  const raw = { type: "workspaceWrite", writableRoots: [cwd], networkAccess: false, excludeTmpdirEnvVar: true, excludeSlashTmp: true };
  assert.deepEqual(buildStartTurnParams({ ...job, sandboxPolicy: raw }).turnStart.request.sandboxPolicy, raw);
  assert.deepEqual(buildStartTurnParams({ ...job, sandbox: "read-only" }).turnStart.request.sandboxPolicy, { type: "readOnly", networkAccess: true });
  assert.deepEqual(buildStartTurnParams({ ...job, sandbox: "full" }).turnStart.request.sandboxPolicy, { type: "dangerFullAccess" });
  const kept = keptSettingsFromRollout(record(context));
  assert.equal(buildStartTurnParams({ ...job, approval: "on-request" }, kept).turnStart.request.approvalPolicy, "on-request");
  assert.equal(buildStartTurnParams({ ...job, effort: undefined, model: "synthetic-next" }, kept).turnStart.request.effort, "medium");
});

test("non-inherited requests without valid permissions cannot be assembled", () => {
  for (const fields of [{ model: "synthetic-next" }, { effort: "low" }, { inherit: false }, { model: "synthetic-next", sandbox: "keep" },
    { model: "synthetic-next", sandbox: "typo" }, { model: "synthetic-next", sandboxPolicy: {} },
    { model: "synthetic-next", sandboxPolicy: { type: "workspaceWrite" } }, { model: "synthetic-next", sandbox: "workspace-write" }]) {
    assert.throws(() => buildStartTurnParams({ threadId: "synthetic-thread", prompt: "OK", ...fields }), /NO_SETTINGS/);
  }
});

test("model switching respects hash mismatch, smaller windows and exact token boundaries", () => {
  const from = { comp_hash: "same", context_window: 200 }, to = { comp_hash: "same", context_window: 100, auto_compact_token_limit: 80 };
  for (const [tokens, expected] of [[null, false], [79, false], [80, false], [81, true], [100, true]]) assert.equal(needsCurrentModel(from, to, tokens), expected);
  assert.equal(needsCurrentModel(from, { ...to, auto_compact_token_limit: undefined }, 99), false);
  assert.equal(needsCurrentModel(from, { ...to, auto_compact_token_limit: undefined }, 100), true);
  assert.equal(needsCurrentModel(from, { ...to, comp_hash: "different" }, null), true);
  assert.equal(needsCurrentModel(from, { ...to, comp_hash: undefined }, 20), false);
  assert.equal(needsCurrentModel(null, to, 1000), false);
  assert.equal(needsCurrentModel({ context_window: 200 }, { context_window: 300, auto_compact_token_limit: 80 }, 250), false);
  assert.equal(needsCurrentModel(from, { ...from, auto_compact_token_limit: 80 }, 150), false);
});

test("smoke verification only accepts the requested turn and strict cwd-only permissions", () => {
  const done = completed(context.turn_id);
  const text = record({ ...context, turn_id: "older-turn" }) + record(context) + done;
  assert.deepEqual(verifyTurnContext(text, context.turn_id, cwd), context);
  assert.throws(() => verifyTurnContext(record(context), "other-turn", cwd), /没有找到本轮/);
  const invalid = [
    { ...context, sandbox_policy: undefined },
    { ...context, sandbox_policy: { type: "danger-full-access" } },
    { ...context, sandbox_policy: { ...context.sandbox_policy, writable_roots: [cwd, "extra"] } },
    { ...context, sandbox_policy: { ...context.sandbox_policy, exclude_slash_tmp: false } },
    { ...context, sandbox_policy: { ...context.sandbox_policy, exclude_tmpdir_env_var: undefined } },
    { ...context, approval_policy: "on-request" },
  ];
  for (const ctx of invalid) assert.throws(() => verifyTurnContext(record(ctx) + done, context.turn_id, cwd));
  // cwd is writable implicitly, and the desktop adds its own visualizations folder.
  for (const roots of [[], [cwd], [require("node:path").join(require("node:os").homedir(), ".codex", "visualizations", "x")]]) {
    const ok = { ...context, sandbox_policy: { ...context.sandbox_policy, writable_roots: roots } };
    assert.doesNotThrow(() => verifyTurnContext(record(ok) + done, context.turn_id, cwd));
  }
  assert.throws(() => verifyTurnContext(record(invalid[1]) + record(context) + done, context.turn_id, cwd), /sandbox_policy/);
});

test("another turn's completion, an unfinished turn or an errored turn cannot pass verification", () => {
  for (const text of [record(context), record(context) + completed("older-turn"), record(context) + completed(context.turn_id, { error: "synthetic failure" })]) {
    assert.throws(() => verifyTurnContext(text, context.turn_id, cwd), /本轮/);
  }
  assert.deepEqual(verifyTurnContext(record(context) + completed(context.turn_id, { type: "turn_complete" }), context.turn_id, cwd), context);
});

test("rollout discovery stays within its configured synthetic Codex home", () => {
  const home = path.join(temp, "codex-home"), dir = path.join(home, "sessions", "2026", "01");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, "rollout-synthetic-thread.jsonl");
  fs.writeFileSync(file, record(context));
  assert.equal(findRollout(home, "synthetic-thread"), file);
  assert.equal(findRollout(home, "missing-thread"), null);
});

test("first observation records versions; app/CLI changes keep warning until a successful verification", () => {
  const v1 = { app: "1.0", cli: "0.1" }, v2 = { app: "2.0", cli: "0.1" }, v3 = { app: "2.0", cli: "0.2" };
  let state = observeVersion({ unrelated: true }, v1);
  assert.equal(state.pendingVerification, false);
  assert.equal(state.unrelated, true);
  assert.equal(state.verifiedDesktop, undefined, "observation is not verification");
  state = observeVersion(state, v2);
  assert.equal(state.pendingVerification, true);
  state = observeVersion(state, v2);
  assert.equal(state.pendingVerification, true, "re-running doctor cannot silence the warning");
  state = verifiedVersion(state, v2, "2026-01-01T00:00:00.000Z");
  assert.deepEqual(state.verifiedDesktop, v2);
  assert.equal(state.pendingVerification, false);
  assert.equal(state.verifiedAt, "2026-01-01T00:00:00.000Z");
  assert.equal(observeVersion(state, v3).pendingVerification, true);
});

test("synthetic state round trips, preserves other fields and refuses malformed JSON", () => {
  const file = path.join(temp, "local-state.json");
  assert.deepEqual(readState(file), {});
  const state = observeVersion({ unrelated: "preserved" }, { app: "1", cli: "2" });
  writeState(state, file);
  assert.deepEqual(readState(file), state);
  assert.equal(fs.statSync(file).mode & 0o777, 0o600);
  fs.writeFileSync(file, "broken JSON");
  assert.throws(() => readState(file), SyntaxError);
});

test("version discovery reads the App plist and bundled CLI without contacting desktop IPC", () => {
  const calls = [];
  const version = readDesktopVersions({ app: "/synthetic/ChatGPT.app", run(cmd, args) {
    calls.push([cmd, args]);
    return cmd.endsWith("PlistBuddy") ? { status: 0, stdout: "1.2.3\n" } : { status: 0, stdout: "codex-cli 0.2.3\n" };
  } });
  assert.deepEqual(version, { app: "1.2.3", cli: "0.2.3" });
  assert.equal(calls.length, 2);
  assert.match(calls[1][0], /codex-cli\/bin\/codex$/);
  assert.deepEqual(calls[1][1], ["--version"]);
  assert.throws(() => readDesktopVersions({ run: () => ({ status: 1 }) }), /无法读取 ChatGPT.app/);
  assert.throws(() => readDesktopVersions({ run: cmd => ({ status: 0, stdout: cmd.endsWith("PlistBuddy") ? "1.0" : "unknown version" }) }), /无法读取内置 codex-cli/);
});

test("daemon version comes from the running managed daemon, not the supervisor or a missing process", () => {
  const ps = stdout => () => ({ status: 0, stdout });
  const base = "/synthetic/.codex/packages/app-server-daemon/releases/0.172.0-aarch64-apple-darwin/bin/codex app-server";
  assert.equal(readDaemonVersion({ run: ps(`${base} daemon pid-update-loop\n${base} --listen unix:// --managed-daemon\n`) }), "0.172.0");
  assert.equal(readDaemonVersion({ run: ps(`${base} daemon pid-update-loop\n`) }), null);
  assert.equal(readDaemonVersion({ run: () => ({ status: 1 }) }), null);
});

test("a daemon update needs verification like a desktop update; records without daemon count as changed", () => {
  const v = { app: "1", cli: "2", daemon: "0.171.0" };
  const state = verifiedVersion({}, v, "2026-01-01T00:00:00.000Z");
  assert.equal(observeVersion(state, v).pendingVerification, false);
  assert.equal(observeVersion(state, { ...v, daemon: "0.172.0" }).pendingVerification, true);
  assert.equal(observeVersion(observeVersion({}, { app: "1", cli: "2" }), v).pendingVerification, true);
});

test("socket probe needs a listener; a leftover file at the socket path is not enough", async () => {
  const sock = path.join(temp, "probe.sock");
  assert.equal(await listening(sock), false, "missing path");
  const server = net.createServer(s => s.end());
  await new Promise(resolve => server.listen(sock, resolve));
  assert.equal(await listening(sock), true);
  await new Promise(resolve => server.close(resolve));
  const stale = path.join(temp, "stale.sock");
  fs.writeFileSync(stale, "");
  assert.equal(await listening(stale), false, "file with nobody listening");
});

test("Codex 0.172+ turn context: writable paths come from file_system_sandbox_policy entries", () => {
  const entry = (access, p) => ({ access, path: typeof p === "string" ? { type: "path", path: p } : p });
  const ctx = entries => ({ ...context, sandbox_policy: { type: "workspace-write", network_access: true, exclude_tmpdir_env_var: true, exclude_slash_tmp: true },
    file_system_sandbox_policy: { kind: "restricted", entries } });
  const text = entries => record(ctx(entries)) + completed("synthetic-turn");
  const base = [entry("read", { type: "special", value: { kind: "root" } }), entry("write", cwd), entry("write", cwd), entry("read", path.join(cwd, ".git"))];
  assert.doesNotThrow(() => verifyTurnContext(text(base), "synthetic-turn", cwd));
  assert.throws(() => verifyTurnContext(text([...base, entry("write", path.join(temp, "elsewhere"))]), "synthetic-turn", cwd), /可写目录超出预期/);
  assert.throws(() => verifyTurnContext(text([...base, entry("write", { type: "special", value: { kind: "root" } })]), "synthetic-turn", cwd), /可写目录超出预期：特殊路径/);
  assert.throws(() => verifyTurnContext(record({ ...ctx(base), file_system_sandbox_policy: undefined }) + completed("synthetic-turn"), "synthetic-turn", cwd), /writable_roots 缺失/);
});
