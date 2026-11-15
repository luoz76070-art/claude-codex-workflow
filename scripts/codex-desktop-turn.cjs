// Send a turn into a thread owned by the running Codex desktop app via its IPC router,
// so the desktop itself runs it (visible live in the UI). Progress is read from the rollout file.
// usage: node codex-desktop-turn.cjs <job.json>
// job: { threadId, prompt, cwd,
//        model?, effort?, inherit? (default: false when model/effort is given, else true — inherited settings ignore model/effort),
//        sandbox? ("keep" | "workspace-write" | "read-only" | "full"; default "keep" when not inheriting),
//        sandboxFromTurn? (with "keep": which turn_context to copy, default -1 = last), sandboxPolicy? (raw app-server SandboxPolicy),
//        network? (default true), extraWritableRoots?: [],
//        approval? (default "never"), verbose? (print every command), ownerWaitSec?, timeoutSec? }
// Output (quiet by default): final agent message, command count, token totals, files changed under cwd.
"use strict";
const net = require("node:net");
const os = require("node:os");
const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");

const job = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const timeoutSec = job.timeoutSec || 1800;
const home = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
const clip = (s, n = 300) => { s = String(s ?? ""); return s.length > n ? s.slice(0, n) + "…" : s; };
const SKIP_DIRS = new Set([".git", "node_modules", "dist", "build", "output", ".playwright-cli", ".gradle", "Pods", ".dart_tool", ".next", "coverage"]);

function findRollout(id) {
  const stack = [path.join(home, "sessions")];
  while (stack.length) {
    const dir = stack.pop();
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) stack.push(p);
      else if (e.name.includes(id) && e.name.endsWith(".jsonl")) return p;
    }
  }
  return null;
}

function changedFiles(root, sinceMs, limit = 100) {
  const out = [];
  const stack = [root];
  while (stack.length && out.length < limit) {
    const dir = stack.pop();
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name) && !e.name.startsWith("dist-")) stack.push(p); continue; }
      try { if (fs.statSync(p).mtimeMs >= sinceMs) out.push(path.relative(root, p)); } catch {}
      if (out.length >= limit) break;
    }
  }
  return out.sort();
}

// "keep": the thread's own permissions from its rollout, so a model switch changes nothing else.
function keptSettings(rollout) {
  const contexts = [];
  try { for (const line of fs.readFileSync(rollout, "utf8").split("\n")) if (line.includes('"turn_context"')) { try { const o = JSON.parse(line); if (o.type === "turn_context") contexts.push(o.payload || {}); } catch {} } } catch {}
  const n = job.sandboxFromTurn ?? -1, ctx = contexts.at(n);
  if (!ctx) return null;
  const sp = ctx.sandbox_policy || {}, network = sp.network_access === true;
  const policy = sp.type === "danger-full-access" ? { type: "dangerFullAccess" }
    : sp.type === "read-only" ? { type: "readOnly", networkAccess: network }
    : sp.type === "workspace-write" ? { type: "workspaceWrite", writableRoots: (sp.writable_roots || []).filter(r => typeof r === "string"), networkAccess: network,
        excludeTmpdirEnvVar: sp.exclude_tmpdir_env_var === true, excludeSlashTmp: sp.exclude_slash_tmp === true } : null;
  const a = ctx.approval_policy;
  const approval = a === "never" || a === "on-request" || a === "untrusted" || (a && typeof a === "object" && "granular" in a) ? a : "on-request";
  return policy ? { policy, approval, model: ctx.model, effort: ctx.effort } : null;
}

function sandboxPolicy() {
  if (job.sandboxPolicy) return job.sandboxPolicy;
  const network = job.network !== false;
  if (job.sandbox === "read-only") return { type: "readOnly", networkAccess: network };
  if (job.sandbox === "full") return { type: "dangerFullAccess" };
  if (job.sandbox === "workspace-write") return {
    type: "workspaceWrite", writableRoots: [job.cwd, ...(job.extraWritableRoots || [])],
    networkAccess: network, excludeTmpdirEnvVar: false, excludeSlashTmp: false,
  };
  return null;
}

const sock = net.createConnection(path.join(home, "ipc", "ipc.sock"));
let buf = Buffer.alloc(0);
const pending = new Map();
let clientId = null;
const write = m => { const j = Buffer.from(JSON.stringify(m)); const h = Buffer.alloc(4); h.writeUInt32LE(j.length, 0); sock.write(Buffer.concat([h, j])); };
const request = (method, params, version = 1, targetClientId) => new Promise((resolve, reject) => {
  const requestId = randomUUID();
  const t = setTimeout(() => { pending.delete(requestId); reject(new Error(`ipc timeout: ${method}`)); }, 15000);
  pending.set(requestId, m => { clearTimeout(t); resolve(m); });
  write({ type: "request", requestId, sourceClientId: clientId ?? "initializing-client", method, version, params, targetClientId });
});
sock.on("data", d => {
  buf = Buffer.concat([buf, d]);
  while (buf.length >= 4) {
    const n = buf.readUInt32LE(0);
    if (buf.length < 4 + n) break;
    const m = JSON.parse(buf.subarray(4, 4 + n).toString());
    buf = buf.subarray(4 + n);
    if (m.type === "response" && pending.has(m.requestId)) { pending.get(m.requestId)(m); pending.delete(m.requestId); }
    else if (m.type === "client-discovery-request") write({ type: "client-discovery-response", requestId: m.requestId, response: { canHandle: false } });
    else if (m.type === "request") write({ type: "response", requestId: m.requestId, resultType: "error", error: "not-supported", method: m.method });
  }
});
sock.on("error", e => { console.log("ipc error:", e.message); process.exit(1); });

function watchRollout(file, offset, turnId, startedMs) {
  let pos = offset, carry = "", done = false, commands = 0, lastAgent = "", ctx = "";
  const tok = { input: 0, cached: 0, output: 0, calls: 0 };
  const finish = (code, status) => {
    const secs = Math.round((Date.now() - startedMs) / 1000);
    console.log(`STATUS ${status} | ${secs}s | ${ctx} | commands=${commands} | model calls=${tok.calls} | tokens in=${tok.input} (cached ${tok.cached}) out=${tok.output}`);
    if (job.cwd) {
      const files = changedFiles(job.cwd, startedMs);
      console.log(`FILES CHANGED under cwd (${files.length}${files.length >= 100 ? "+" : ""}):${files.length ? "\n  " + files.join("\n  ") : " none"}`);
    }
    console.log("=== final message ===\n" + (lastAgent || "(none)"));
    sock.end(); setTimeout(() => process.exit(code), 200);
  };
  const tick = () => {
    let size = 0; try { size = fs.statSync(file).size; } catch {}
    if (size > pos) {
      const fd = fs.openSync(file, "r");
      const chunk = Buffer.alloc(size - pos);
      fs.readSync(fd, chunk, 0, chunk.length, pos);
      fs.closeSync(fd);
      pos = size;
      const lines = (carry + chunk.toString("utf8")).split("\n");
      carry = lines.pop();
      for (const line of lines) {
        if (!line.trim()) continue;
        let r; try { r = JSON.parse(line); } catch { continue; }
        const p = r.payload || {};
        if (r.type === "turn_context") ctx = `model=${p.model} effort=${p.effort ?? p.reasoning_effort ?? "?"} sandbox=${(p.sandbox_policy && p.sandbox_policy.type) || "?"} approval=${p.approval_policy ?? "?"}`;
        else if (r.type === "response_item" && p.type === "message" && p.role === "assistant") lastAgent = (p.content || []).map(c => c.text || "").join("");
        else if (r.type === "event_msg" && p.type === "agent_message") lastAgent = p.message;
        else if (r.type === "event_msg" && p.type === "exec_command_begin") { if (job.verbose) console.log(`$ ${clip(Array.isArray(p.command) ? p.command.join(" ") : p.command, 200)}`); }
        else if (r.type === "response_item" && (p.type === "function_call" || p.type === "local_shell_call" || p.type === "custom_tool_call")) {
          commands++;
          if (job.verbose) console.log(`$ ${p.name || p.type} ${clip(p.arguments || p.input || (p.action && p.action.command) || "", 200)}`);
        }
        else if (r.type === "event_msg" && p.type === "token_count" && p.info && p.info.last_token_usage) { const u = p.info.last_token_usage; tok.input += u.input_tokens || 0; tok.cached += u.cached_input_tokens || 0; tok.output += u.output_tokens || 0; tok.calls++; }
        else if (r.type === "event_msg" && (p.type === "task_complete" || p.type === "turn_complete")) { if (p.last_agent_message) lastAgent = p.last_agent_message; done = "completed"; if (p.error) { const raw = JSON.stringify(p.error); done = "failed"; console.log(`[error] ${clip(raw, 500)}`); if (/usageLimitExceeded|usage[ _-]?limit|quota|insufficient_quota|rate[ _-]?limit|\b429\b|Too Many Requests|额度|用量/i.test(raw)) console.log("QUOTA_EXHAUSTED: this channel is out of quota (429). Ask the user which channel to continue on (codex-channel-options.cjs <threadId>), then rerun on the SAME thread with model=<chosen> (permissions are kept)."); } }
        else if (r.type === "event_msg" && p.type === "turn_aborted") done = "aborted";
        else if (r.type === "event_msg" && p.type === "error") { const raw = JSON.stringify(p); console.log(`[error] ${clip(raw, 500)}`); if (/usageLimitExceeded|usage[ _-]?limit|quota|insufficient_quota|rate[ _-]?limit|\b429\b|额度|用量/i.test(raw)) console.log("QUOTA_EXHAUSTED: this channel is out of quota (429). Ask the user which channel to continue on (codex-channel-options.cjs <threadId>), then rerun on the SAME thread with model=<chosen> (permissions are kept)."); }
      }
    }
    if (done) return finish(done === "completed" ? 0 : 1, done);
    if (Date.now() - startedMs > timeoutSec * 1000) { console.log(`TIMEOUT after ${timeoutSec}s: turn ${turnId} may still be running in the desktop`); return finish(3, "timeout"); }
    setTimeout(tick, 1000);
  };
  tick();
}

sock.on("connect", async () => {
  try {
    const init = await request("initialize", { clientType: "claude-code-bridge" }, 0);
    if (init.resultType !== "success") throw new Error("initialize failed: " + (init.error || ""));
    clientId = init.result.clientId;
    let owner = await request("thread-owner-discovery", { conversationId: job.threadId, hostId: "local" }, 1);
    for (let waited = 0; (owner.resultType !== "success" || !owner.handledByClientId) && waited < (job.ownerWaitSec || 0); waited++) {
      await new Promise(r => setTimeout(r, 1000));
      owner = await request("thread-owner-discovery", { conversationId: job.threadId, hostId: "local" }, 1);
    }
    if (owner.resultType !== "success" || !owner.handledByClientId) {
      console.log(`NO_OWNER: desktop has not loaded thread ${job.threadId} (${owner.error || owner.resultType}).`);
      sock.end(); return process.exit(4);
    }
    const rollout = findRollout(job.threadId);
    const offset = rollout ? fs.statSync(rollout).size : 0;
    const inherit = job.inherit ?? !(job.model || job.effort);
    const kept = !inherit && (job.sandbox === "keep" || (!job.sandbox && !job.sandboxPolicy)) ? keptSettings(rollout) : null;
    if (!inherit && (job.sandbox === "keep" || (!job.sandbox && !job.sandboxPolicy)) && !kept) { console.log("NO_SETTINGS: could not read the thread's permissions from its rollout; pass sandbox explicitly."); sock.end(); return process.exit(5); }
    const sp = kept ? kept.policy : sandboxPolicy();
    const approval = job.approval || (kept ? kept.approval : "never");
    if (kept) console.log(`switch: ${kept.model} → ${job.model || kept.model}, effort ${job.effort || kept.effort}, keeping ${sp.type} / approval ${typeof approval === "string" ? approval : "granular"}`);
    const req = {
      threadId: job.threadId,
      input: [{ type: "text", text: job.prompt, text_elements: [] }],
      clientUserMessageId: randomUUID(),
      ...(job.model ? { model: job.model } : {}),
      ...((job.effort || (kept && kept.effort)) ? { effort: job.effort || kept.effort } : {}),
      ...(sp ? { sandboxPolicy: sp, approvalPolicy: approval } : {}),
      ...(job.cwd ? { cwd: job.cwd } : {}),
    };
    const cwd = job.cwd || null;
    const params = {
      conversationId: job.threadId,
      turnStart: {
        request: req,
        context: {
          inheritThreadSettings: inherit,
          restoreMessage: { cwd, context: { workspaceRoots: cwd ? [cwd] : [], collaborationMode: null, commentAttachments: [] }, responsesapiClientMetadata: null },
          attachments: [], commentAttachments: [],
        },
      },
    };
    const startedMs = Date.now() - 1000;
    const r = await request("thread-follower-start-turn", params, 2, owner.handledByClientId);
    const outer = r.result || {}; const inner = outer.result || outer;
    const turnId = inner.turn && inner.turn.id;
    console.log(`start-turn: ${r.resultType}${r.error ? " / " + r.error : ""}${turnId ? " / turn " + turnId : ""}`);
    if (r.resultType !== "success" || !turnId) { sock.end(); return process.exit(1); }
    if (!rollout) { console.log("rollout file not found; cannot watch progress"); sock.end(); return process.exit(0); }
    watchRollout(rollout, offset, turnId, startedMs);
  } catch (e) {
    console.log("error:", e.message); sock.end(); process.exit(1);
  }
});
