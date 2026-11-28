#!/usr/bin/env node
// Environment self-check. Only writes the local desktop-version state; prints no secrets.
// usage: node doctor.cjs [--dir <session project dir> | --project <name>] [--session <cc-desk-session-id>] [--net]
//   --dir      pick the config.json project whose repo contains this directory (no default project);
//              a directory outside every project (or no flag) runs only the general checks
//   --session  flag scheduled tasks that still point at another session
//   --net      also compare with GitHub (git fetch / ls-remote); off by default
"use strict";
const fs = require("node:fs"), os = require("node:os"), path = require("node:path"), net = require("node:net");
const { spawnSync } = require("node:child_process");
const { randomUUID } = require("node:crypto");
const { checkLaneConfig } = require("./lib/lane-check.cjs");
const { encodeFrame, createFrameDecoder } = require("./lib/desktop-ipc.cjs");
const { readVersions, readState, writeState, observeVersion } = require("./lib/desktop-state.cjs");
const { listening } = require("./lib/socket-probe.cjs");

const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const root = path.resolve(__dirname, "..");
const cfg = JSON.parse(fs.readFileSync(path.join(root, "config.json"), "utf8"));
const expand = p => p && p.replace(/^~(?=\/|$)/, os.homedir());
const names = Object.keys(cfg.projects).join("、") || "无";
const dirArg = opt("--dir");
const inRepo = d => Object.keys(cfg.projects).find(n => {
  const r = path.resolve(expand(cfg.projects[n].repo)), x = path.resolve(expand(d));
  return x === r || x.startsWith(r + path.sep);
});
const projectName = opt("--project") || (dirArg ? inRepo(dirArg) : undefined);
// Not onboarded: still check the general environment (desktop, channels, gh), skip project parts.
const generic = !projectName;
const project = generic ? null : cfg.projects[projectName];
const session = opt("--session");
const useNet = args.includes("--net");
if (!generic && !project) { console.log(`✗ config.json 里没有项目 ${projectName}`); process.exit(1); }

let failed = 0, warned = 0;
const ok = m => console.log("✓ " + m);
const bad = (m, hint) => { failed++; console.log("✗ " + m + (hint ? "  → " + hint : "")); };
const warn = (m, hint) => { warned++; console.log("! " + m + (hint ? "  → " + hint : "")); };
const run = (cmd, argv, o = {}) => spawnSync(cmd, argv, { encoding: "utf8", timeout: 30000, ...o });
const out = r => (r.stdout || "").trim();
const section = t => console.log(`\n[${t}]`);

// Read-only: each thread's working folder from a fresh copy of the Codex state DB (same method as codex-threads.sh).
function threadCwds(ids) {
  const home = expand(cfg.codexHome), T = fs.mkdtempSync(path.join(os.tmpdir(), "doctor-state-"));
  try {
    for (const f of ["state_5.sqlite", "state_5.sqlite-wal", "state_5.sqlite-shm"])
      if (fs.existsSync(path.join(home, f))) fs.copyFileSync(path.join(home, f), path.join(T, f));
    const list = ids.filter(id => /^[0-9a-f-]+$/i.test(id)).map(id => `'${id}'`).join(",");
    const r = run("sqlite3", ["-separator", "\t", path.join(T, "state_5.sqlite"), `select id, cwd from threads where id in (${list || "''"});`]);
    if (r.status !== 0) return { error: (r.stderr || r.error?.message || "sqlite3 失败").trim() };
    return { cwds: Object.fromEntries(out(r).split("\n").filter(Boolean).map(l => l.split("\t"))) };
  } finally { fs.rmSync(T, { recursive: true, force: true }); }
}
const real = p => { try { return fs.realpathSync(p); } catch { return path.resolve(p); } };

function ipc(threadIds) {
  return new Promise(resolve => {
    const sockPath = path.join(expand(cfg.codexHome), "ipc", "ipc.sock");
    if (!fs.existsSync(sockPath)) return resolve({ error: "没有 ipc.sock" });
    const sock = net.createConnection(sockPath);
    const waiting = new Map(); const decode = createFrameDecoder(); let clientId = null;
    const done = r => { try { sock.end(); } catch {} resolve(r); };
    const write = m => sock.write(encodeFrame(m));
    const request = (method, params, version = 1) => new Promise(res => {
      const requestId = randomUUID(); waiting.set(requestId, res);
      write({ type: "request", requestId, sourceClientId: clientId, version, method, params });
      setTimeout(() => { if (waiting.delete(requestId)) res({ resultType: "timeout" }); }, 5000);
    });
    sock.on("data", d => {
      for (const m of decode(d)) {
        if (m.type === "response" && waiting.has(m.requestId)) { const r = waiting.get(m.requestId); waiting.delete(m.requestId); r(m); }
      }
    });
    sock.on("error", e => done({ error: String(e.code || e) }));
    sock.on("connect", async () => {
      const init = await request("initialize", { clientType: "claude-workflow-doctor" }, 0);
      clientId = init.result?.clientId;
      if (!clientId) return done({ error: "initialize 没有返回 clientId" });
      const owners = {};
      for (const id of threadIds) {
        const o = await request("thread-owner-discovery", { conversationId: id, hostId: "local" }, 1);
        owners[id] = o.resultType === "success" && o.handledByClientId ? "OWNED" : (o.error || o.resultType);
      }
      done({ clientId, owners });
    });
  });
}

const tcp = (host, port) => new Promise(resolve => {
  const s = net.createConnection({ host, port: Number(port) });
  const t = setTimeout(() => { s.destroy(); resolve(false); }, 3000);
  s.on("connect", () => { clearTimeout(t); s.end(); resolve(true); });
  s.on("error", () => { clearTimeout(t); resolve(false); });
});

(async () => {
  console.log(`Claude → Codex 工作流自检 · ${generic ? "未指定项目，只做通用检查" : `项目 ${projectName || "<项目>"}`} · ${new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}`);

  if (generic) warn(dirArg ? `${dirArg} 不属于 config.json 里的任何项目（已接入：${names}）` : `没有指定项目（已接入：${names}）`,
    dirArg ? "未接入的项目：按 docs/new-project.md 接入，只沿用工作模式，不要导入别的项目的记忆" : "加 --dir <会话的项目目录> 或 --project <名字>");

  section("基础");
  ok(`node ${process.version}`);
  const st = run("git", ["-C", root, "status", "--porcelain"]);
  if (st.status !== 0) bad("备份库不是 git 仓库", root);
  else if (out(st)) warn("备份库有未提交的改动", "提交并推送到 GitHub");
  else ok("备份库干净");
  if (useNet) {
    run("git", ["-C", root, "fetch", "-q", "origin"]);
    const ab = out(run("git", ["-C", root, "rev-list", "--left-right", "--count", "HEAD...@{u}"])).split(/\s+/);
    if (ab.length === 2 && ab[1] !== "0") warn(`备份库落后远端 ${ab[1]} 个提交`, "git pull --ff-only");
    else if (ab.length === 2 && ab[0] !== "0") warn(`备份库有 ${ab[0]} 个提交没推送`, "git push");
    else ok("备份库与远端一致");
  }

  section("GitHub");
  const repo = project ? expand(project.repo) : null;
  if (!project) {}
  else if (!fs.existsSync(path.join(repo, ".git"))) bad("项目仓库不存在", repo);
  else {
    const url = out(run("git", ["-C", repo, "remote", "get-url", "origin"]));
    if (!project.github) {
      if (url) warn(`本地项目却有 origin`, url);
      else ok("本地项目：没有 GitHub 远端，Codex 只改不推，Claude 审查后在本地提交");
    } else if (!url.includes(project.github)) warn(`origin 不是 ${project.github}`, url);
    else ok(`项目仓库 origin = ${project.github}${project.public ? "（公开，提交前扫个人信息）" : ""}`);
    const head = out(run("git", ["-C", repo, "rev-parse", "--short", "main"]));
    ok(`本地 main = ${head}`);
    if (useNet && project.github) {
      const remote = out(run("git", ["-C", repo, "ls-remote", "origin", "refs/heads/main"])).slice(0, 7);
      const local = out(run("git", ["-C", repo, "rev-parse", "main"])).slice(0, 7);
      if (remote && remote !== local) warn(`远端 main = ${remote}，和本地不一致`, "先查是谁推的（Codex 不该推 main）");
      else if (remote) ok("远端 main 与本地一致");
    }
  }
  const gh = run("gh", ["auth", "status"]);
  const acct = ((gh.stdout || "") + (gh.stderr || "")).match(/account (\S+)/);
  if (gh.error) bad("没有 gh 命令");
  else if (gh.status === 0 && acct) ok(`gh 已登录 ${acct[1]}（Claude 用）`);
  else bad("gh 未登录或令牌失效", "请用户在 Mac 终端跑 gh auth login");
  const lanes = project?.lanes;
  // Local projects (no GitHub) keep their two threads at project.threads instead of lanes.threads.
  const threads = lanes?.threads || project?.threads || {};
  if (lanes) {
    const kc = run("security", ["find-generic-password", "-a", "codex", "-s", lanes.tokenService]);
    if (kc.status === 0) ok(`钥匙串里有 Codex 用的令牌 ${lanes.tokenService}（没有读取内容）`);
    else bad(`钥匙串里没有 ${lanes.tokenService}`, "请用户建细粒度令牌后存入钥匙串，见 docs/new-project.md");
  }

  section("Codex");
  try {
    const version = readVersions();
    ok(`桌面端 ${version.app} / codex-cli ${version.cli} / daemon ${version.daemon || "没在运行"}`);
    const previous = readState(), state = observeVersion(previous, version);
    if (state.pendingVerification) warn(`桌面端或 daemon 已升级，先运行 node scripts/verify-desktop.cjs --project ${projectName || "<项目>"} 再派活`);
    try {
      writeState(state);
      if (!previous.observedDesktop) ok("首次记录当前桌面端版本（本机状态文件，不进 git）");
    } catch (e) { warn(`无法保存桌面端版本记录（${e.code || e.message}）`, "在本机终端重跑 doctor，确认状态文件可写"); }
  } catch (e) { warn(e.message, `先运行 node scripts/verify-desktop.cjs --project ${projectName || "<项目>"} 再派活`); }
  const cfgToml = path.join(expand(cfg.codexHome), "config.toml");
  if (fs.existsSync(cfgToml)) {
    const top = fs.readFileSync(cfgToml, "utf8").split(/\n\[/)[0];
    const m = top.match(/^model\s*=\s*"([^"]+)"/m), e = top.match(/^model_reasoning_effort\s*=\s*"([^"]+)"/m);
    const want = "ccs-pro20x/gpt-6.2-sol"; // 用户 2026-11-19 定
    if (m && m[1] === want) ok(`默认模型 ${m[1]} ${e ? e[1] : ""}`);
    else warn(`默认模型是 ${m ? m[1] : "?"} ${e ? e[1] : ""}，规则要求 ${want}（用户 11-19 定）`, "pro20x 没有 429 时，把 config.toml 顶层 model 改成规则里的值");
  } else bad("没有 ~/.codex/config.toml");
  const threadIds = [...Object.values(threads), ...(project?.testThread ? [project.testThread] : [])];
  const daemonSock = path.join(expand(cfg.codexHome), "app-server-control", "app-server-control.sock");
  const daemonUp = await listening(daemonSock);
  const r = await ipc(threadIds);
  // Desktop 26.1117+ has no IPC; with the daemon listening that is the normal state, and jobs go through codex-run.cjs.
  if (r.error && daemonUp) ok("桌面端 IPC 没开放（26.1117 起如此），派活走 daemon 路线");
  else if (r.error) bad(`连不上桌面端 IPC：${r.error}`, "确认 Codex 桌面端在运行");
  else {
    ok("桌面端 IPC 可用");
    for (const [n, id] of Object.entries(threads)) {
      if (r.owners[id] === "OWNED") ok(`线${n} 线程已被桌面端加载`);
      else warn(`线${n} 线程没有被桌面端加载（${r.owners[id]}）`, `open -g codex://threads/${id}，3 秒后再查；线程被删了就请用户新建`);
    }
    if (project?.testThread) {
      if (r.owners[project.testThread] === "OWNED") ok("测试线程已被桌面端加载");
      else warn(`测试线程没有被桌面端加载（${r.owners[project.testThread]}）`, `open -g codex://threads/${project.testThread}`);
    }
  }
  // A thread works in the folder it was created in; a lane thread made elsewhere edits the wrong tree.
  const expected = {};
  for (const n of Object.keys(threads)) expected[threads[n]] = { label: `线${n}`, dir: lanes ? path.join(repo, lanes.dir, `lane-${n}`) : repo, inside: !lanes };
  if (project?.testThread && project.testCwd) expected[project.testThread] = { label: "测试线程", dir: expand(project.testCwd) };
  if (Object.keys(expected).length) {
    const c = threadCwds(Object.keys(expected));
    if (c.error) warn(`读不到线程的工作目录（${c.error}）`, "scripts/codex-threads.sh 手动核对");
    else for (const [id, e] of Object.entries(expected)) {
      const got = c.cwds[id], want = real(e.dir);
      const shown = d => d.replace(os.homedir(), "~");
      if (!got) warn(`${e.label} 在 state 库里查不到`, "线程可能被删了，请用户新建");
      else if (real(got) === want || (e.inside && real(got).startsWith(want + path.sep))) ok(`${e.label} 工作目录 ${shown(got)}`);
      else bad(`${e.label} 工作目录是 ${shown(got)}，应为 ${shown(e.dir)}`, `在正确的目录新建：node scripts/codex-new-thread.cjs --project ${projectName} --lane ${e.label === "测试线程" ? "test" : e.label.slice(1)} --assign`);
    }
  }
  if (daemonUp) ok("daemon 控制 socket 在监听（派活主路线 codex-run.cjs）");
  else bad(fs.existsSync(daemonSock) ? "daemon 控制 socket 没人监听" : "没有 daemon 控制 socket", "派活主路线 codex-run.cjs 用不了：ps 查 managed-daemon 进程，告诉用户");
  if (fs.existsSync(path.join(expand(cfg.wsModule), "package.json"))) ok("ws 模块在（codex-run.cjs 用）"); else bad("找不到 ws 模块", "派活主路线 codex-run.cjs 要用，改 config.json 的 wsModule");

  section("渠道");
  const [host, port] = cfg.ccSwitchProxy.split(":");
  if (await tcp(host, port)) ok(`CC Switch 代理 ${cfg.ccSwitchProxy} 在监听`); else bad(`CC Switch 代理 ${cfg.ccSwitchProxy} 没响应`, "确认 CC Switch 在运行");
  const al = run("python3", [path.join(__dirname, "align-catalog-comp-hash.py"), "--check"]);
  if (al.status === 0) ok("模型目录的 comp_hash 已对齐（可以原地换渠道）");
  else warn("模型目录的 comp_hash 没对齐", "python3 scripts/align-catalog-comp-hash.py（会先备份）");

  if (lanes) {
    section("工作线");
    const L = path.join(repo, lanes.dir);
    const svc = fs.existsSync(path.join(L, "token-service")) ? fs.readFileSync(path.join(L, "token-service"), "utf8").trim() : null;
    if (svc !== lanes.tokenService) warn(`${lanes.dir}/token-service 是 ${svc ?? "空"}`, `应为 ${lanes.tokenService}，用 lanes/install.sh 重装`);
    // Daemon-route projects (desktop 26.1117+) have no fixed threads; their lanes are still lane-1 and lane-2.
    const laneNums = Object.keys(lanes.threads || {}).length ? Object.keys(lanes.threads) : ["1", "2"];
    for (const n of laneNums) {
      const W = path.join(L, `lane-${n}`), D = path.join(L, `lane-${n}.gitdir`), B = path.join(L, `lane-${n}.base`);
      if (!fs.existsSync(W) || !fs.existsSync(D) || !fs.existsSync(B)) { bad(`lane-${n} 不完整`, `${lanes.dir}/bin/lane-reset ${n}`); continue; }
      // Read the lane's git config as a plain file; never run git inside a lane Codex has used.
      const { hooksPath: hooks, risky } = checkLaneConfig(D, path.join(L, "hooks"));
      const base = fs.readFileSync(B, "utf8").trim();
      const behind = out(run("git", ["-C", repo, "rev-list", "--count", `${base}..main`]));
      const msg = `lane-${n} 基线 ${base.slice(0, 7)}`;
      if (risky) bad(`lane-${n} 的 git 配置里有可执行项：${risky.split("\n")[0]}`, `不要在里面跑 git，直接 lane-reset ${n}`);
      else if (hooks !== path.join(L, "hooks")) warn(`lane-${n} 的 hooksPath 不对（${hooks || "空"}）`, `lane-reset ${n}`);
      else if (behind && behind !== "0") warn(`${msg}，落后 main ${behind} 个提交`, `派活前跑 ${lanes.dir}/bin/lane-reset ${n}`);
      else ok(`${msg}，与 main 一致`);
    }
  }

  section("定时任务");
  const sp = process.env.CC_DESK_TUNNEL_SCHEDULES;
  if (!sp || !fs.existsSync(sp)) warn("找不到定时任务文件（CC_DESK_TUNNEL_SCHEDULES）");
  else {
    const tasks = JSON.parse(fs.readFileSync(sp, "utf8")).tasks || [];
    for (const id of project?.schedules || []) {
      const t = tasks.find(x => x.id === id);
      if (!t) { warn(`没有定时任务 ${id}`, `用 schedules/${id}.json 模板加回去`); continue; }
      const target = t.target?.type === "session" ? `会话 ${t.target.sessionId}` : t.target?.type === "new" ? `新会话（${t.target.projectPath}）` : JSON.stringify(t.target);
      const when = t.schedule?.time || t.schedule?.at || JSON.stringify(t.schedule);
      if (!t.enabled) warn(`${id}（${when}）已停用`);
      // Batch tasks open a new session in the project each time; check the directory instead of the session.
      else if (t.target?.type === "new") {
        if (path.resolve(expand(t.target.projectPath) || "") === path.resolve(expand(project.repo))) ok(`${id}（${when}）每次${target}`);
        else warn(`${id}（${when}）的项目目录不是 ${project.repo}`, `改线上任务的 target.projectPath`);
      }
      else if (session && t.target?.sessionId !== session) warn(`${id}（${when}）发给 ${target}，不是当前会话`, `只有用户让你接替时才改：python3 scripts/schedule-target.py ${id} ${session}`);
      else ok(`${id}（${when}）发给 ${target}`);
    }
  }

  console.log(`\n结果：${failed} 项失败，${warned} 项提醒`);
  process.exit(failed ? 1 : 0);
})();
