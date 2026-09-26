/* syncmock.js — a miniature Supabase for Cloud Sync tests.
 *
 * Implements exactly the surface docs/sync.js talks to:
 *   POST /auth/v1/token?grant_type=id_token      Google JWT → session (validates 3-part JWT + payload.sub)
 *   POST /auth/v1/token?grant_type=refresh_token rotates the access token, counts calls
 *   POST /auth/v1/logout                         best-effort sign-out
 *   GET/POST/PATCH/DELETE /rest/v1/user_sync     RLS-simulating row store with rev optimistic locking
 *                                                (PATCH &rev=eq.N returns [] on mismatch, like PostgREST;
 *                                                 DELETE removes nothing, like the real no-delete policy)
 *   Control plane (tests only):
 *   GET  /mock/dbg                               full dump {rows, refreshCalls, tokenCalls, offline}
 *   POST /mock/seed   {uid|sub, email, blob, rev}  pre-place a cloud row (migration/conflict tests)
 *   POST /mock/bump   {uid|sub, keys}            another device pushes: rev+1 (+ optional merged keys)
 *   POST /mock/offline {on}                      REST paths start failing 503
 *   POST /mock/expires {seconds}                 next tokens get a tiny lifetime (refresh test)
 *   POST /mock/reset                             wipe everything
 *
 * CORS is fully open (the test page runs on a different port).
 * Usage: node syncmock.js [port]     (default 8128)
 */
"use strict";
const http = require("http");
const PORT = Number(process.argv[2] || 8128);

const db = {
  rows: {},        // uid -> {uid,email,blob,rev,updated_at}
  access: {},      // access_token -> {uid,email,exp}
  refresh: {},     // refresh_token -> uid
  refreshCalls: 0,
  tokenCalls: 0,
  logoutCalls: 0,
  offline: false,
  expiresIn: 3600,
  n: 0
};

function send(res, code, body, extra) {
  const h = Object.assign({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Expose-Headers": "Content-Range",
    "Content-Type": "application/json"
  }, extra || {});
  res.writeHead(code, h);
  res.end(body === undefined ? "" : JSON.stringify(body));
}
function readBody(req) {
  return new Promise((ok) => {
    let s = "";
    req.on("data", (c) => { s += c; if (s.length > 8e6) req.destroy(); });
    req.on("end", () => { try { ok(s ? JSON.parse(s) : null); } catch (e) { ok(null); } });
  });
}
function parseJwt(jwt) {
  try {
    const p = String(jwt || "").split(".");
    if (p.length !== 3) return null;
    return JSON.parse(Buffer.from(p[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
  } catch (e) { return null; }
}
function authOf(req) {
  const h = req.headers["authorization"] || "";
  const t = h.replace(/^Bearer\s+/i, "");
  const s = db.access[t];
  return (s && s.exp > Date.now()) ? s : null;
}
function qparam(url, name) {
  const m = new URL(url, "http://x").searchParams.get(name);
  return m;
}
function eqParam(url, table, col) {
  const m = new URL(url, "http://x").searchParams.get(col + "=eq");
  if (m != null) return m;
  // PostgREST style: ?uid=eq.X arrives as param name "uid" value "eq.X" OR param "uid=eq" — support both
  for (const [k, v] of new URL(url, "http://x").searchParams.entries()) {
    if (k === col && String(v).startsWith("eq.")) return String(v).slice(3);
  }
  return null;
}
function uidOf(body) { return body && body.uid ? String(body.uid) : (body && body.sub ? "u-" + body.sub : null); }

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, "http://x");
  if (req.method === "OPTIONS") return send(res, 204, undefined);
  const path = u.pathname;

  /* ---------------- control plane ---------------- */
  if (path.startsWith("/mock/")) {
    if (path === "/mock/dbg") return send(res, 200, { rows: db.rows, refreshCalls: db.refreshCalls, tokenCalls: db.tokenCalls, logoutCalls: db.logoutCalls, offline: db.offline });
    if (path === "/mock/reset") { Object.keys(db.rows).forEach((k) => delete db.rows[k]); db.access = {}; db.refresh = {}; db.refreshCalls = 0; db.tokenCalls = 0; db.logoutCalls = 0; db.offline = false; db.expiresIn = 3600; return send(res, 200, { ok: true }); }
    const b = await readBody(req);
    if (path === "/mock/seed") {
      const uid = uidOf(b);
      if (!uid) return send(res, 400, { error: "need uid or sub" });
      db.rows[uid] = { uid, email: b.email || "", blob: b.blob || { v: 1, keys: {} }, rev: Number(b.rev) || 1, updated_at: new Date().toISOString() };
      return send(res, 200, { ok: true, uid });
    }
    if (path === "/mock/bump") {
      const uid = uidOf(b);
      const row = db.rows[uid];
      if (!row) return send(res, 404, { error: "no row" });
      if (b.keys) {
        row.blob = row.blob || { v: 1, keys: {} };
        row.blob.keys = Object.assign({}, row.blob.keys, b.keys);
      }
      row.rev += 1;
      row.updated_at = new Date().toISOString();
      return send(res, 200, { ok: true, rev: row.rev });
    }
    if (path === "/mock/offline") { db.offline = !!(b && b.on); return send(res, 200, { ok: true, offline: db.offline }); }
    if (path === "/mock/expires") { db.expiresIn = Number(b && b.seconds) || 3600; return send(res, 200, { ok: true, expiresIn: db.expiresIn }); }
    return send(res, 404, { error: "unknown mock route" });
  }

  /* ---------------- auth ---------------- */
  if (path === "/auth/v1/token") {
    const grant = qparam(req.url, "grant_type");
    const b = await readBody(req);
    if (grant === "id_token") {
      db.tokenCalls += 1;
      if (!b || b.provider !== "google") return send(res, 400, { error: "invalid_request", error_description: "provider must be google" });
      const payload = parseJwt(b.id_token);
      if (!payload || !payload.sub) return send(res, 400, { error: "invalid_request", error_description: "bad id_token" });
      const uid = "u-" + payload.sub;
      const email = payload.email || "";
      const acc = "acc." + (++db.n);
      db.access[acc] = { uid, email, exp: Date.now() + db.expiresIn * 1000 };
      db.refresh["ref." + uid] = uid;
      return send(res, 200, { access_token: acc, refresh_token: "ref." + uid, token_type: "bearer", expires_in: db.expiresIn, user: { id: uid, email } });
    }
    if (grant === "refresh_token") {
      const uid = b && db.refresh[b.refresh_token];
      if (!uid) return send(res, 400, { error: "invalid_grant", error_description: "unknown refresh token" });
      db.refreshCalls += 1;
      const acc = "acc." + (++db.n);
      let email = "";
      Object.keys(db.access).forEach((k) => { if (db.access[k].uid === uid) email = db.access[k].email; });
      db.access[acc] = { uid, email, exp: Date.now() + db.expiresIn * 1000 };
      return send(res, 200, { access_token: acc, refresh_token: "ref." + uid, token_type: "bearer", expires_in: db.expiresIn, user: { id: uid, email } });
    }
    return send(res, 400, { error: "unsupported_grant_type" });
  }
  if (path === "/auth/v1/logout") {
    const t = (req.headers["authorization"] || "").replace(/^Bearer\s+/i, "");
    if (db.access[t]) delete db.access[t];
    db.logoutCalls += 1;
    return send(res, 204, undefined);
  }

  /* ---------------- REST: user_sync ---------------- */
  if (path === "/rest/v1/user_sync") {
    if (db.offline) return send(res, 503, { code: "57P03", message: "mock offline" });
    const auth = authOf(req);
    if (!auth) return send(res, 401, { code: "PGRST301", message: "JWT required" });

    if (req.method === "GET") {
      const uid = eqParam(req.url, "user_sync", "uid");
      const row = db.rows[uid];
      // RLS simulation: you only ever see YOUR row
      return send(res, 200, row && row.uid === auth.uid ? [row] : []);
    }
    if (req.method === "POST") {
      const b = await readBody(req);
      if (!b || b.uid !== auth.uid) return send(res, 401, { code: "42501", message: "new row violates row-level security policy" });
      if (db.rows[b.uid]) return send(res, 409, { code: "23505", message: "duplicate key value violates unique constraint \"user_sync_pkey\"" });
      const row = { uid: b.uid, email: b.email || "", blob: b.blob || { v: 1, keys: {} }, rev: Number(b.rev) || 1, updated_at: new Date().toISOString() };
      db.rows[b.uid] = row;
      return send(res, 201, [row]);
    }
    if (req.method === "PATCH") {
      const uid = eqParam(req.url, "user_sync", "uid");
      const revEq = eqParam(req.url, "user_sync", "rev");
      const row = db.rows[uid];
      if (!row || row.uid !== auth.uid) return send(res, 200, []);          // RLS: invisible
      if (revEq != null && Number(revEq) !== Number(row.rev)) return send(res, 200, []); // optimistic lock miss → 0 rows
      const b = await readBody(req);
      if (b && b.blob !== undefined) row.blob = b.blob;
      if (b && b.email !== undefined) row.email = b.email;
      // trigger semantics: a rev that does not advance is forced to old+1
      row.rev = (b && Number(b.rev) > row.rev) ? Number(b.rev) : row.rev + 1;
      row.updated_at = new Date().toISOString();
      return send(res, 200, [row]);
    }
    if (req.method === "DELETE") {
      // no delete policy: accepted, removes nothing
      return send(res, 204, undefined);
    }
  }

  return send(res, 404, { error: "not found: " + path });
});

server.listen(PORT, "127.0.0.1", () => console.log("syncmock (mini Supabase for Cloud Sync) on http://127.0.0.1:" + PORT));
