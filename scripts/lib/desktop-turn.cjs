"use strict";
const { randomUUID } = require("node:crypto");

function sandboxPolicyFromContext(context) {
  const sp = context?.sandbox_policy;
  if (!sp || typeof sp.type !== "string") throw new Error("NO_SETTINGS: turn_context has no sandbox_policy.type");
  const network = sp.network_access === true;
  if (sp.type === "danger-full-access") return { type: "dangerFullAccess" };
  if (sp.type === "read-only") return { type: "readOnly", networkAccess: network };
  if (sp.type === "workspace-write" && Array.isArray(sp.writable_roots)) return {
    type: "workspaceWrite", writableRoots: sp.writable_roots.filter(r => typeof r === "string"), networkAccess: network,
    excludeTmpdirEnvVar: sp.exclude_tmpdir_env_var === true, excludeSlashTmp: sp.exclude_slash_tmp === true,
  };
  throw new Error(`NO_SETTINGS: unsupported or incomplete sandbox_policy: ${sp.type}`);
}

function keptSettingsFromRollout(text, index = -1) {
  const contexts = [];
  for (const line of text.split("\n")) {
    try { const o = JSON.parse(line); if (o.type === "turn_context") contexts.push(o.payload || {}); } catch {}
  }
  const ctx = contexts.at(index);
  const policy = sandboxPolicyFromContext(ctx);
  const a = ctx.approval_policy;
  const approval = a === "never" || a === "on-request" || a === "untrusted" || (a && typeof a === "object" && "granular" in a) ? a : "on-request";
  return { policy, approval, model: ctx.model, effort: ctx.effort };
}

const inheritsSettings = job => job.inherit ?? !(job.model || job.effort);
const needsKeptSettings = job => !inheritsSettings(job) && (job.sandbox === "keep" || (!job.sandbox && !job.sandboxPolicy));

function sandboxPolicyFromJob(job) {
  if (job.sandboxPolicy) {
    const sp = job.sandboxPolicy;
    if (sp.type === "readOnly" || sp.type === "dangerFullAccess" || (sp.type === "workspaceWrite" && Array.isArray(sp.writableRoots))) return sp;
    throw new Error("NO_SETTINGS: unsupported or incomplete sandboxPolicy");
  }
  const network = job.network !== false;
  if (job.sandbox === "read-only") return { type: "readOnly", networkAccess: network };
  if (job.sandbox === "full") return { type: "dangerFullAccess" };
  if (job.sandbox === "workspace-write") {
    if (typeof job.cwd !== "string" || !job.cwd) throw new Error("NO_SETTINGS: workspace-write requires cwd");
    return { type: "workspaceWrite", writableRoots: [job.cwd, ...(job.extraWritableRoots || [])],
      networkAccess: network, excludeTmpdirEnvVar: false, excludeSlashTmp: false };
  }
  if (job.sandbox && job.sandbox !== "keep") throw new Error(`NO_SETTINGS: unsupported sandbox: ${job.sandbox}`);
  return null;
}

function buildStartTurnParams(job, kept = null, messageId = randomUUID()) {
  const inherit = inheritsSettings(job);
  if (needsKeptSettings(job) && !kept) throw new Error("NO_SETTINGS: could not read the thread's permissions from its rollout; pass sandbox explicitly.");
  const sp = kept ? kept.policy : sandboxPolicyFromJob(job);
  if (!inherit && !sp) throw new Error("NO_SETTINGS: sandboxPolicy is required when not inheriting thread settings");
  const approval = job.approval || (kept ? kept.approval : "never");
  const req = {
    threadId: job.threadId,
    input: [{ type: "text", text: job.prompt, text_elements: [] }],
    clientUserMessageId: messageId,
    ...(job.model ? { model: job.model } : {}),
    ...((job.effort || (kept && kept.effort)) ? { effort: job.effort || kept.effort } : {}),
    ...(sp ? { sandboxPolicy: sp, approvalPolicy: approval } : {}),
    ...(job.cwd ? { cwd: job.cwd } : {}),
  };
  const cwd = job.cwd || null;
  return {
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
}

module.exports = { sandboxPolicyFromContext, keptSettingsFromRollout, needsKeptSettings, buildStartTurnParams };
