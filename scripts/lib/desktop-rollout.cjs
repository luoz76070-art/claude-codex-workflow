"use strict";
const fs = require("node:fs");
const path = require("node:path");

function findRollout(home, id) {
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

// Only accept the requested turn, never a previous successful smoke check.
function verifyTurnContext(text, turnId, cwd) {
  const contexts = [];
  let completed = false;
  for (const line of text.split("\n")) {
    let o; try { o = JSON.parse(line); } catch { continue; }
    const p = o.payload;
    if (p?.turn_id !== turnId) continue;
    if (o.type === "turn_context") contexts.push(p);
    if (o.type === "event_msg" && (p.type === "task_complete" || p.type === "turn_complete")) {
      if (p.error) throw new Error("本轮完成事件带有错误，不能标记已验证");
      completed = true;
    }
  }
  if (!contexts.length) throw new Error(`没有找到本轮 ${turnId} 的 turn_context`);
  if (!completed) throw new Error(`没有找到本轮 ${turnId} 的成功完成事件`);
  for (const ctx of contexts) {
    const sp = ctx.sandbox_policy;
    if (sp?.type !== "workspace-write") throw new Error(`sandbox_policy 应为 workspace-write，实际为 ${sp?.type || "缺失"}`);
    // cwd is writable implicitly; the desktop adds its own visualizations folder; anything else was granted to this
    // thread by an earlier turn and stays, whatever this turn asked for.
    if (!Array.isArray(sp.writable_roots)) throw new Error("writable_roots 缺失");
    const viz = require("node:path").join(require("node:os").homedir(), ".codex", "visualizations") + "/";
    const unexpected = sp.writable_roots.filter(r => typeof r !== "string" || (r !== cwd && !r.startsWith(viz)));
    if (unexpected.length) throw new Error(`可写目录超出预期：${unexpected.join("、")}。线程以前授权过的目录会一直保留，请换一个干净的新线程`);
    if (sp.exclude_tmpdir_env_var !== true || sp.exclude_slash_tmp !== true) throw new Error("临时目录仍可写，要求可写目录只有 cwd");
    if (ctx.approval_policy !== "never") throw new Error(`approval_policy 应为 never，实际为 ${ctx.approval_policy || "缺失"}`);
  }
  return contexts.at(-1);
}

module.exports = { findRollout, verifyTurnContext };
