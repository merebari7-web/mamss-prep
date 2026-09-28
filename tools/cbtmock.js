/* Mock Supabase REST for v54 Live CBT tests: three in-memory tables with the
   same primary-key semantics as tools/cbt_schema.sql (409 on duplicate), the
   same server-side trigger behaviour (ends_at/ended_at/last_seen_at stamped by
   the mock clock, never taken from the client), CORS open, apikey required.
   Test helpers: /_reset, /_dump?table=, /_tweak (direct row merge, no triggers). */
const http = require('http');
const PORT = +(process.argv[2] || 8124);

const sessions = new Map();  // code -> row
const attempts = new Map();  // code|did -> row
const answers = new Map();   // code|did|qidx -> row
const redemptions = new Map(); // code_hash -> row (v57 school dashboard: activation roll-out)
const qq = new Map();          // id -> row (v58 question pipeline)
const prog = new Map();        // owner -> row (v62 class progress reports)
let progOn = true;             // false = emulate "schema not pasted yet" (404 42P01)
let attCols = true;            // false = emulate cbt_attempts before the v67 ALTER (400 42703)

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'apikey,authorization,content-type,prefer,accept',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
};
const now = () => new Date().toISOString();

function send(res, code, body) {
  res.writeHead(code, Object.assign({ 'Content-Type': 'application/json' }, cors));
  res.end(body === undefined || body === null ? '' : JSON.stringify(body));
}
function conflict(res) {
  return send(res, 409, { code: '23505', message: 'duplicate key value violates unique constraint' });
}
function parseFilters(search) {
  const f = {};
  search.replace(/^\?/, '').split('&').forEach(kv => {
    if (!kv) return;
    const [k, v] = kv.split('=');
    const val = decodeURIComponent(v || '');
    const key = decodeURIComponent(k);
    let m = /^eq\.(.*)$/.exec(val);
    if (m) { f[key] = { op: 'eq', v: m[1] }; return; }
    m = /^in\.\((.*)\)$/.exec(val);
    if (m) { f[key] = { op: 'in', v: m[1].split(',') }; return; }
    m = /^(?:not\.)?is\.null$/.exec(val);
    if (m) { f[key] = { op: val.startsWith('not.') ? 'notnull' : 'isnull' }; return; }
    m = /^gte?\.(.*)$/.exec(val);
    if (m) { f[key] = { op: val.startsWith('gte.') ? 'gte' : 'gt', v: m[1] }; return; }
    m = /^lte?\.(.*)$/.exec(val);
    if (m) { f[key] = { op: val.startsWith('lte.') ? 'lte' : 'lt', v: m[1] }; return; }
  });
  return f;
}
/* json-column access, exactly as PostgREST spells it: settings->>waecathon */
function readPath(row, key) {
  if (!key.includes('->>')) return row[key];
  const [col, prop] = key.split('->>');
  const v = row[col];
  return v && typeof v === 'object' ? v[prop] : undefined;
}
function matches(row, f) {
  return Object.keys(f).every(k => {
    const c = f[k], raw = readPath(row, k);
    if (c.op === 'in') return c.v.some(x => String(raw) === String(x));
    if (c.op === 'isnull') return raw == null;
    if (c.op === 'notnull') return raw != null;
    if (c.op === 'gt') return raw > c.v;
    if (c.op === 'gte') return raw >= c.v;
    if (c.op === 'lt') return raw < c.v;
    if (c.op === 'lte') return raw <= c.v;
    return String(raw) === String(c.v);
  });
}
/* trigger emulation, per tools/cbt_schema.sql */
function sessionTrigger(row, patch) {
  const out = Object.assign({}, row, patch);
  if (out.status === 'live' && row.status !== 'live') {
    out.live_at = now();
    out.ends_at = new Date(Date.now() + (Math.max(30, out.duration_s) + Math.max(0, out.extend_s)) * 1000).toISOString();
  } else if (out.status === 'live' && patch.extend_s !== undefined && patch.extend_s !== row.extend_s) {
    out.ends_at = new Date(new Date(out.live_at || now()).getTime() + (Math.max(30, out.duration_s) + Math.max(0, out.extend_s)) * 1000).toISOString();
  }
  if (out.status === 'ended' && row.status !== 'ended') out.ended_at = now();
  return out;
}
function attemptTrigger(row, patch) {
  const out = Object.assign({}, row, patch);
  out.last_seen_at = now();
  if (['submitted', 'autosubmitted'].includes(out.status) && !['submitted', 'autosubmitted'].includes(row.status)) out.submitted_at = now();
  if (out.status === 'running' && row.status !== 'running' && !out.started_at) out.started_at = now();
  return out;
}

http.createServer((req, res) => {
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
  let raw = '';
  req.on('data', c => raw += c);
  req.on('end', () => {
    const qi = req.url.indexOf('?');
    const u = qi === -1 ? req.url : req.url.slice(0, qi);
    const search = qi === -1 ? '' : req.url.slice(qi);
    let body = null;
    if (raw) { try { body = JSON.parse(raw); } catch (e) { return send(res, 400, { message: 'bad json' }); } }

    /* ---- test helpers ---- */
    if (u === '/_reset' && req.method === 'POST') { sessions.clear(); attempts.clear(); answers.clear(); redemptions.clear(); qq.clear(); prog.clear(); progOn = true; attCols = true; return send(res, 200, { reset: true }); }
    if (u === '/_dump') {
      const t = parseFilters(search).table || search.match(/table=([a-z]+)/);
      const table = typeof t === 'string' ? t : (t && t[1]) || 'sessions';
      const map = table === 'attempts' ? attempts : table === 'answers' ? answers : table === 'prog' ? prog : table === 'redemptions' ? redemptions : sessions;
      return send(res, 200, [...map.values()]);
    }
    if (u === '/_flags' && req.method === 'POST') {  /* v67 test knobs */
      if (body && body.attCols !== undefined) attCols = !!body.attCols;
      if (body && body.progOn !== undefined) progOn = !!body.progOn;
      return send(res, 200, { attCols, progOn });
    }
    if (u === '/_tweak' && req.method === 'POST') {  /* direct merge, no triggers */
      const row = sessions.get(body.code);
      if (!row) return send(res, 404, { message: 'no such session' });
      delete body.code;
      sessions.set(row.code, Object.assign(row, body));
      return send(res, 200, sessions.get(row.code));
    }

    if (u === '/_prog') {
      progOn = !search.includes('on=0');
      if (search.includes('clear=1')) prog.clear();
      return send(res, 200, { progOn, rows: prog.size });
    }
    if (!req.headers.apikey) return send(res, 401, { message: 'no apikey' });

    /* ---- cbt_sessions ---- */
    if (u === '/rest/v1/cbt_sessions') {
      const f = parseFilters(search);
      if (req.method === 'GET') {
        const rows = [...sessions.values()].filter(r => matches(r, f));
        return send(res, 200, rows);
      }
      if (req.method === 'POST') {
        const items = Array.isArray(body) ? body : [body];
        for (const it of items) if (sessions.has(it.code)) return conflict(res);
        for (const it of items) {
          sessions.set(it.code, Object.assign({
            status: 'waiting', extend_s: 0, settings: {}, questions: [], duration_s: 1800,
            teacher: '', device_id: '', title: 'Live CBT session', cls: 'SS1', subject: '',
            live_at: null, ends_at: null, ended_at: null, created_at: now(),
          }, it));
        }
        return send(res, 201, undefined);
      }
      if (req.method === 'PATCH') {
        const rows = [...sessions.values()].filter(r => matches(r, f));
        if (!rows.length) return send(res, 204, undefined);
        rows.forEach(r => sessions.set(r.code, sessionTrigger(r, body)));
        return send(res, 204, undefined);
      }
    }

    /* ---- cbt_attempts ---- */
    if (u === '/rest/v1/cbt_attempts') {
      const f = parseFilters(search);
      if (req.method === 'GET') {
        const sel = (search.match(/[?&]select=([^&]*)/) || [])[1] || '';
        if (!attCols && /(^|,)(cls|voice)(,|%2C|$)/.test(decodeURIComponent(sel))) {
          return send(res, 400, { code: '42703', message: 'column "cls" of relation "cbt_attempts" does not exist' });
        }
        const rows = [...attempts.values()].filter(r => matches(r, f));
        rows.sort((a, b) => String(a.joined_at).localeCompare(String(b.joined_at)));
        return send(res, 200, rows);
      }
      if (req.method === 'POST') {
        const items = Array.isArray(body) ? body : [body];
        for (const it of items) if (attempts.has(it.session_code + '|' + it.device_id)) return conflict(res);
        if (!attCols) for (const it of items) {
          if ('cls' in it || 'voice' in it) return send(res, 400, { code: '42703', message: 'column "cls" of relation "cbt_attempts" does not exist' });
        }
        for (const it of items) {
          attempts.set(it.session_code + '|' + it.device_id, Object.assign({
            name: '', slip: '', status: 'waiting', current_q: 0, score: null, total: null,
            integrity: 0, webcam: '', joined_at: now(), started_at: null, submitted_at: null, last_seen_at: now(),
          }, it));
        }
        return send(res, 201, undefined);
      }
      if (req.method === 'PATCH') {
        if (!attCols && body && ('cls' in body || 'voice' in body)) return send(res, 400, { code: '42703', message: 'column "voice" of relation "cbt_attempts" does not exist' });
        const rows = [...attempts.values()].filter(r => matches(r, f));
        if (!rows.length) return send(res, 204, undefined);
        rows.forEach(r => {
          const next = attemptTrigger(r, body);
          attempts.set(next.session_code + '|' + next.device_id, next);
        });
        return send(res, 204, undefined);
      }
    }

    /* ---- cbt_answers ---- */
    if (u === '/rest/v1/cbt_answers') {
      const f = parseFilters(search);
      if (req.method === 'GET') {
        const rows = [...answers.values()].filter(r => matches(r, f));
        rows.sort((a, b) => a.q_idx - b.q_idx);
        return send(res, 200, rows);
      }
      if (req.method === 'POST') {
        const items = Array.isArray(body) ? body : [body];
        for (const it of items) if (answers.has(it.session_code + '|' + it.device_id + '|' + it.q_idx)) return conflict(res);
        for (const it of items) {
          answers.set(it.session_code + '|' + it.device_id + '|' + it.q_idx, Object.assign({
            choice: 0, correct: false, ms: 0, flagged: false, saved_at: now(),
          }, it));
        }
        return send(res, 201, undefined);
      }
    }

    /* ---- code_redemptions (read-only surface for the v57 dashboard) ---- */
    if (u === '/rest/v1/code_redemptions') {
      if (req.method === 'GET') {
        const rows = [...redemptions.values()];
        rows.sort((a, b) => String(b.redeemed_at).localeCompare(String(a.redeemed_at)));
        return send(res, 200, rows);
      }
      if (req.method === 'POST') {
        const items = Array.isArray(body) ? body : [body];
        for (const it of items) if (redemptions.has(it.code_hash)) return conflict(res);
        for (const it of items) {
          redemptions.set(it.code_hash, Object.assign({
            device_id: '', device_label: '', batch: '', redeemed_at: now(),
          }, it));
        }
        return send(res, 201, undefined);
      }
    }

    /* ---- question_queue (v58 teacher pipeline) ---- */
    if (u === '/rest/v1/question_queue') {
      const f = parseFilters(search);
      if (req.method === 'GET') {
        const rows = [...qq.values()].filter(r => matches(r, f));
        rows.sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
        return send(res, 200, rows);
      }
      if (req.method === 'POST') {
        const items = Array.isArray(body) ? body : [body];
        let n = 0;
        for (const it of items) {
          const id = it.id || ('q' + Date.now().toString(36) + '-' + (++n) + '-' + Math.random().toString(36).slice(2, 8));
          if (qq.has(id)) return conflict(res);
          qq.set(id, Object.assign({
            created_at: now(), status: 'pending', topic: '', e: '', source: 'csv',
            submitter: '', review_note: null, reviewed_at: null, reviewed_by: null,
          }, it, { id }));
        }
        return send(res, 201, undefined);
      }
      if (req.method === 'PATCH') {
        const rows = [...qq.values()].filter(r => matches(r, f));
        rows.forEach(r => qq.set(r.id, Object.assign(r, body)));
        return send(res, 204, undefined);
      }
    }

    /* ---- class_progress (v62 class progress reports) ---- */
    if (u === '/rest/v1/class_progress') {
      if (!progOn) return send(res, 404, { code: '42P01', message: 'relation "public.class_progress" does not exist' });
      const f = parseFilters(search);
      if (req.method === 'GET') {
        const rows = [...prog.values()].filter(r => matches(r, f));
        rows.sort((x, y) => String(y.updated_at).localeCompare(String(x.updated_at)));
        return send(res, 200, rows);
      }
      if (req.method === 'POST') {
        const items = Array.isArray(body) ? body : [body];
        for (const it of items) {
          if (!it.owner) return send(res, 400, { code: '23502', message: 'owner token required' });
          prog.set(it.owner, Object.assign({ student: '', cls: '', slip: '', role: 'student', blob: {} }, it, { updated_at: now() }));
        }
        return send(res, 201, undefined);
      }
    }

    /* unknown relation → exactly what prod returns before the SQL is run */
    return send(res, 404, { code: 'PGRST205', message: 'Could not find the table public.cbt_sessions in the schema cache', hint: 'relation does not exist' });
  });
}).listen(PORT, '0.0.0.0', () => console.log('cbt mock supabase on ' + PORT));
