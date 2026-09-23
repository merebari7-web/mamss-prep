/* Mock Supabase REST for v45 ledger tests: primary-key semantics = one row per
   code_hash, 409 on duplicate, CORS open, apikey required. In-memory only. */
const http = require('http');
const PORT = +(process.argv[2] || 8123);
const KEY = 'test-anon-key';
const rows = new Map(); // code_hash -> row

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'apikey,authorization,content-type,prefer',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
};

http.createServer((req, res) => {
  const send = (code, body) => { res.writeHead(code, Object.assign({ 'Content-Type': 'application/json' }, cors)); res.end(JSON.stringify(body)); };
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
  let raw = '';
  req.on('data', c => raw += c);
  req.on('end', () => {
    const u = req.url.split('?')[0];
    if (req.headers.apikey !== KEY) return send(401, { message: 'bad apikey' });

    if (u === '/_seed' && req.method === 'POST') {           // test helper
      const r = JSON.parse(raw || '{}');
      rows.set(r.code_hash, { code_hash: r.code_hash, device_id: r.device_id, device_label: r.device_label || '', batch: r.batch || '', redeemed_at: r.redeemed_at || new Date().toISOString() });
      return send(200, { seeded: true, size: rows.size });
    }
    if (u === '/_dump') return send(200, [...rows.values()]);

    if (u === '/rest/v1/code_redemptions' && req.method === 'POST') {
      let items; try { items = JSON.parse(raw); } catch (e) { return send(400, { message: 'bad json' }); }
      if (!Array.isArray(items)) items = [items];
      for (const it of items) {
        if (rows.has(it.code_hash)) return send(409, { code: '23505', message: 'duplicate key value violates unique constraint "code_redemptions_pkey"' });
      }
      const out = items.map(it => {
        const row = { code_hash: it.code_hash, device_id: it.device_id, device_label: it.device_label || '', batch: it.batch || '', redeemed_at: new Date().toISOString() };
        rows.set(row.code_hash, row); return row;
      });
      return send(201, out);
    }
    if (u === '/rest/v1/code_redemptions' && req.method === 'GET') {
      const m = /code_hash=eq\.([0-9a-f]+)/.exec(req.url);
      const list = m ? (rows.has(m[1]) ? [rows.get(m[1])] : []) : [...rows.values()];
      return send(200, list);
    }
    send(404, { message: 'not found' });
  });
}).listen(PORT, '0.0.0.0', () => console.log('mock supabase on ' + PORT));
