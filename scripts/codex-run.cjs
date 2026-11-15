// Drive the Codex desktop app-server over its local control socket.
// usage: node codex-run.cjs [<ws-module-path>] <job.json>   (ws path defaults to config.json wsModule)
// job: { cwd, prompt, name?, sandbox?, approvalPolicy?, timeoutSec?, threadId?,
//        model?, effort? (low|medium|high|xhigh|max|ultra), ephemeral?, noTurn?, threadSource? }
"use strict";
const net = require("node:net");
const os = require("node:os");
const fs = require("node:fs");
const wsFromConfig = () => JSON.parse(fs.readFileSync(require("node:path").join(__dirname, "..", "config.json"), "utf8")).wsModule.replace(/^~(?=\/|$)/, os.homedir());
const WebSocket = require(process.argv[3] ? process.argv[2] : wsFromConfig());
const job = JSON.parse(fs.readFileSync(process.argv[3] || process.argv[2], "utf8"));
const sandbox = job.sandbox || "read-only";
const approvalPolicy = job.approvalPolicy || "never";
const timeoutSec = job.timeoutSec || 540;
const sockPath = os.homedir() + "/.codex/app-server-control/app-server-control.sock";
const clip = (s, n = 200) => { s = String(s ?? ""); return s.length > n ? s.slice(0, n) + "…" : s; };

const ws = new WebSocket("ws://localhost/", {
  createConnection: () => net.createConnection({ path: sockPath }),
  perMessageDeflate: false,
  maxPayload: 16 * 1024 * 1024,
});
let nextId = 1;
const pending = new Map();
let threadId = job.threadId || null;
let turnId = null;
const messages = [];
const send = obj => ws.send(JSON.stringify(obj));
const rpc = (method, params) => new Promise((resolve, reject) => {
  const id = `c${nextId++}`;
  pending.set(id, { resolve, reject });
  send({ id, method, params });
});
const finish = code => { try { ws.close(); } catch {} setTimeout(() => process.exit(code), 200); };

const timer = setTimeout(() => {
  console.log(`\nTIMEOUT after ${timeoutSec}s: turn may still be running in the desktop app. thread=${threadId} turn=${turnId}`);
  if (messages.length) console.log("\n=== partial agent messages ===\n" + messages.join("\n\n"));
  finish(3);
}, timeoutSec * 1000);

function handleServerRequest(msg) {
  const { id, method, params } = msg;
  if (method === "item/commandExecution/requestApproval" || method === "item/fileChange/requestApproval") {
    console.log(`[approval declined] ${method} ${clip(params && (params.command || params.reason || ""))}`);
    send({ id, result: { decision: "decline" } });
  } else {
    console.log(`[server request rejected] ${method}`);
    send({ id, error: { code: -32601, message: "not supported by this client" } });
  }
}

function handleNotification(method, p) {
  if (!p) return;
  if (threadId && p.threadId && p.threadId !== threadId) return;
  if (method === "item/started" && p.item && p.item.type === "commandExecution") {
    console.log(`$ ${clip(p.item.command)}`);
  } else if (method === "item/completed" && p.item) {
    const it = p.item;
    if (it.type === "agentMessage") messages.push(it.text);
    else if (it.type === "commandExecution") console.log(`  -> exit ${it.exitCode ?? "?"} (${it.status})`);
    else if (it.type === "fileChange") console.log(`[fileChange ${it.status}] ${(it.changes || []).map(c => `${c.kind && c.kind.type || c.kind}:${c.path}`).join(", ")}`);
  } else if (method === "error") {
    console.log(`[error] ${clip(JSON.stringify(p), 500)}`);
  } else if (method === "turn/completed" && p.turn && (!turnId || p.turn.id === turnId)) {
    clearTimeout(timer);
    console.log(`\nTURN ${p.turn.status}${p.turn.error ? " error=" + clip(JSON.stringify(p.turn.error), 500) : ""}`);
    console.log("\n=== agent messages ===\n" + (messages.join("\n\n") || "(none)"));
    finish(p.turn.status === "completed" ? 0 : 1);
  }
}

ws.on("message", data => {
  const msg = JSON.parse(data.toString());
  if (msg.id != null && pending.has(msg.id) && !msg.method) {
    const p = pending.get(msg.id); pending.delete(msg.id);
    msg.error ? p.reject(new Error(msg.error.message)) : p.resolve(msg.result);
  } else if (msg.id != null && msg.method) {
    handleServerRequest(msg);
  } else if (msg.method) {
    handleNotification(msg.method, msg.params);
  }
});
ws.on("error", e => { console.log("socket error:", e.message); process.exit(1); });
ws.on("close", () => { if (!process.exitCode) console.log("socket closed"); });

ws.on("open", async () => {
  try {
    await rpc("initialize", { clientInfo: { name: "claude-code-bridge", version: "0.1.0" }, capabilities: { experimentalApi: false } });
    send({ method: "initialized", params: {} });
    if (threadId) {
      await rpc("thread/resume", { threadId, excludeTurns: true, persistExtendedHistory: true });
    } else {
      const started = await rpc("thread/start", {
        cwd: job.cwd, approvalPolicy, sandbox,
        sessionStartSource: "startup", experimentalRawEvents: false, persistExtendedHistory: true,
        threadSource: job.threadSource || "user",
        ...(job.model ? { model: job.model } : {}),
        ...(job.effort ? { config: { model_reasoning_effort: job.effort } } : {}),
        ...(job.ephemeral ? { ephemeral: true } : {}),
      });
      threadId = started.thread.id;
      console.log(`THREAD ${threadId} (model=${started.model}, effort=${started.reasoningEffort})`);
      if (job.noTurn) { clearTimeout(timer); return finish(0); }
      if (job.name) await rpc("thread/name/set", { threadId, name: job.name }).catch(() => {});
    }
    if (job.threadId) console.log(`THREAD ${threadId} (resumed)`);
    const r = await rpc("turn/start", {
      threadId, input: [{ type: "text", text: job.prompt, text_elements: [] }], approvalPolicy,
      ...(job.effort ? { effort: job.effort } : {}),
      ...(job.model ? { model: job.model } : {}),
    });
    turnId = r.turn.id;
    console.log(`TURN_STARTED ${turnId} (sandbox=${sandbox}, approval=${approvalPolicy}, model=${job.model || "default"}, effort=${job.effort || "default"})\n`);
  } catch (e) {
    console.log("rpc error:", e.message);
    finish(1);
  }
});
