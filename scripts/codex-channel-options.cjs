// Which channels can a Codex thread switch to right now, in place (no new thread)?
// usage: node codex-channel-options.cjs [threadId]
// Prints the thread's current model, recent 429s with reset times (Beijing), and the models Codex can move the
// thread to without first calling the current model (same comp_hash; a smaller window only if the context fits).
// Read-only: config.toml, the model catalog, the thread's rollout, CC Switch's request log (sqlite3 -readonly).
"use strict";
const fs = require("node:fs"), os = require("node:os"), path = require("node:path"), { execFileSync } = require("node:child_process");
const home = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
const threadId = process.argv[2];
const channelOf = slug => /^ccs-[^/]+\//.test(slug) ? slug.slice(0, slug.indexOf("/")) : "default";
const label = m => (/[（(]([^（()）]+)[)）]\s*$/u.exec(m.display_name || "") || [])[1] || (channelOf(m.slug) === "default" ? "默认渠道(当前 provider)" : channelOf(m.slug));
const bj = iso => { const t = Date.parse(iso); return Number.isFinite(t) ? new Date(t + 8 * 3600e3).toISOString().slice(5, 16).replace("T", " ") : iso; };

const config = fs.readFileSync(path.join(home, "config.toml"), "utf8");
const catalogFile = (/^\s*model_catalog_json\s*=\s*"([^"]+)"/m.exec(config) || [])[1];
const models = catalogFile ? JSON.parse(fs.readFileSync(path.isAbsolute(catalogFile) ? catalogFile : path.join(home, catalogFile), "utf8")).models || [] : [];
const usable = models.filter(m => m.visibility !== "hide" && !/image/i.test(m.slug));
const hashes = [...new Set(models.map(m => m.comp_hash))];
if (hashes.length > 1) console.log(`⚠ catalog has ${hashes.length} comp_hash values (${hashes.join(", ")}): switching between them makes Codex call the OLD model first. Align them (back up first).`);

let current = null, tokens = null;
if (threadId) {
  const find = dir => { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) { const r = find(p); if (r) return r; } else if (e.name.endsWith(`${threadId}.jsonl`)) return p; } return null; };
  const rollout = find(path.join(home, "sessions"));
  if (!rollout) { console.log(`thread ${threadId}: rollout not found`); process.exit(2); }
  for (const line of fs.readFileSync(rollout, "utf8").split("\n")) {
    if (line.includes('"turn_context"')) { try { const p = JSON.parse(line).payload; current = { model: p.model, effort: p.effort, sandbox: p.sandbox_policy && p.sandbox_policy.type, approval: p.approval_policy }; } catch {} }
    else if (line.includes('"token_count"')) { try { const u = JSON.parse(line).payload.info.last_token_usage; if (u) tokens = u.input_tokens; } catch {} }
  }
  console.log(`thread ${threadId}: ${current ? `${current.model} / ${current.effort} / ${current.sandbox} / approval ${current.approval}` : "no turns"}; context ≈ ${tokens ?? "?"} tokens`);
}

const db = path.join(os.homedir(), ".cc-switch", "cc-switch.db");
if (fs.existsSync(db)) {
  try {
    const out = execFileSync("/usr/bin/sqlite3", ["-readonly", "-separator", "\t", db,
      "select request_model, max(created_at), (select error_message from proxy_request_logs l2 where l2.request_model = l.request_model and l2.status_code = 429 order by created_at desc limit 1) from proxy_request_logs l where status_code = 429 and created_at >= strftime('%s','now','-7 days') group by request_model;"], { encoding: "utf8", timeout: 5000 });
    for (const row of out.trim().split("\n").filter(Boolean)) {
      const [model, at, error] = row.split("\t"), reset = (/"reset_at"\s*:\s*"([^"]+)"/.exec(error || "") || [])[1];
      const future = reset && Date.parse(reset) > Date.now();
      console.log(`429: ${model} last ${bj(new Date(Number(at) * 1000).toISOString())} (Beijing)${reset ? future ? `, resets ${bj(reset)} (Beijing)` : ", reset time passed" : ""}`);
    }
  } catch (e) { console.log("CC Switch log unreadable:", e.message.split("\n")[0]); }
}

const from = current && models.find(m => m.slug === current.model);
const blocked = to => from && ((from.comp_hash && to.comp_hash && from.comp_hash !== to.comp_hash)
  || (from.context_window > to.context_window && tokens !== null && (tokens > (to.auto_compact_token_limit ?? Infinity) || tokens >= to.context_window)));
const groups = new Map();
for (const m of usable) {
  if (current && channelOf(m.slug) === channelOf(current.model)) continue;
  const key = label(m); if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(`${m.slug}${blocked(m) ? " ✗needs the current model first" : ""} [${(m.supported_reasoning_levels || []).map(l => l.effort || l).join("/")}]`);
}
console.log(current ? "switch in place to:" : "models:");
for (const [name, list] of groups) console.log(`  ${name}: ${list.join(", ")}`);
