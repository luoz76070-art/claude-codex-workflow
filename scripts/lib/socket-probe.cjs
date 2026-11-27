"use strict";
const fs = require("node:fs");
const net = require("node:net");

// True only when something accepts the connection: desktop 26.1117+ leaves ~/.codex/ipc/ipc.sock behind with nobody listening.
function listening(sockPath, ms = 1500) {
  return new Promise(resolve => {
    if (!fs.existsSync(sockPath)) return resolve(false);
    const sock = net.createConnection(sockPath);
    const done = value => { clearTimeout(timer); sock.destroy(); resolve(value); };
    const timer = setTimeout(() => done(false), ms);
    sock.once("connect", () => done(true));
    sock.once("error", () => done(false));
  });
}

module.exports = { listening };
