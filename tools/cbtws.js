/* Minimal Phoenix-protocol echo relay for v55 camera tests: answers phx_join /
   heartbeat with ok replies and relays broadcast frames to every OTHER client
   (topic-scoped, like Supabase Realtime). In-memory, ephemeral, test-only. */
let WebSocketServer;
try { ({ WebSocketServer } = require('ws')); }
catch (e) { ({ WebSocketServer } = require(require('path').join(__dirname, '..', '..', 'testrig', 'node_modules', 'ws'))); }
const PORT = +(process.argv[2] || 8127);
const wss = new WebSocketServer({ port: PORT });
wss.on('connection', ws => {
  ws.on('message', data => {
    let m; try { m = JSON.parse(data); } catch (e) { return; }
    if (m.event === 'phx_join') {
      ws.send(JSON.stringify({ topic: m.topic, event: 'phx_reply', ref: m.ref, join_ref: m.join_ref || m.ref, payload: { status: 'ok', response: {} } }));
      return;
    }
    if (m.event === 'heartbeat') {
      ws.send(JSON.stringify({ topic: 'phoenix', event: 'phx_reply', ref: m.ref, payload: { status: 'ok', response: {} } }));
      return;
    }
    if (m.event === 'broadcast') {
      wss.clients.forEach(c => {
        if (c !== ws && c.readyState === 1) {
          c.send(JSON.stringify({ topic: m.topic, event: 'broadcast', ref: m.ref, payload: m.payload }));
        }
      });
    }
  });
});
console.log('cbt ws echo on ' + PORT);
