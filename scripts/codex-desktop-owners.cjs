// Read-only: which of the given threads does the running Codex desktop currently own (loaded in a window)?
// usage: node codex-desktop-owners.cjs <threadId>...
"use strict";
const net = require("node:net"), os = require("node:os"), path = require("node:path"), { randomUUID } = require("node:crypto");
const sock = net.createConnection(path.join(os.homedir(), ".codex", "ipc", "ipc.sock"));
const waiting = new Map(); let buf = Buffer.alloc(0), clientId = null;
const write = m => { const j = Buffer.from(JSON.stringify(m)); const h = Buffer.alloc(4); h.writeUInt32LE(j.length, 0); sock.write(Buffer.concat([h, j])); };
const request = (method, params, version = 1) => new Promise(resolve => { const requestId = randomUUID(); waiting.set(requestId, resolve); write({ type: "request", requestId, sourceClientId: clientId, version, method, params }); setTimeout(() => { if (waiting.delete(requestId)) resolve({ resultType: "timeout" }); }, 5000); });
sock.on("data", d => { buf = Buffer.concat([buf, d]); while (buf.length >= 4) { const n = buf.readUInt32LE(0); if (buf.length < 4 + n) break; const m = JSON.parse(buf.subarray(4, 4 + n)); buf = buf.subarray(4 + n); if (m.type === "response" && waiting.has(m.requestId)) { const r = waiting.get(m.requestId); waiting.delete(m.requestId); r(m); } } });
sock.on("connect", async () => {
  const init = await request("initialize", { clientType: "claude-code-bridge" }, 0); clientId = init.result?.clientId;
  for (const id of process.argv.slice(2)) { const o = await request("thread-owner-discovery", { conversationId: id, hostId: "local" }, 1); console.log(id, o.resultType === "success" && o.handledByClientId ? "OWNED" : `not loaded (${o.error || o.resultType})`); }
  sock.end(); process.exit(0);
});
sock.on("error", e => { console.log("ipc error", String(e)); process.exit(2); });
