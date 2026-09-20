#!/usr/bin/env node
// v15 build runner: merges _curr_core1/2.js + _curr_ext.js, rebalances missing
// subject-array closing brackets, top-ups second questions from /tmp/add.json,
// writes quiz/_curr_data.js. Needs _curr_gen.py to prepare /tmp/add.json first.
const fs = require('fs');

function load(p){
  let s = fs.readFileSync(p, 'utf8').trim();
  if(!s.endsWith('};')) throw new Error(p + ' does not end with };');
  return s.slice(0, -2).trim();
}
function bal(s){
  let d = 0, inS = false, es = false;
  for(let i = 0; i < s.length; i++){
    const c = s[i];
    if(inS){ if(es) es = false; else if(c === '\\') es = true; else if(c === '"') inS = false; continue; }
    if(c === '"'){ inS = true; continue; }
    if(c === '[' || c === '{') d++;
    else if(c === ']' || c === '}') d--;
  }
  return d;
}
function findMatch(text, start){
  // text[start] is '[': return index just past the matching ']' (string-aware)
  let d = 0, inS = false, es = false;
  for(let i = start; i < text.length; i++){
    const c = text[i];
    if(inS){ if(es) es = false; else if(c === '\\') es = true; else if(c === '"') inS = false; continue; }
    if(c === '"'){ inS = true; continue; }
    if(c === '[' || c === '{') d++;
    else if(c === ']' || c === '}'){
      d--;
      if(d === 0) return i + 1;
    }
  }
  throw new Error('unbalanced from ' + start);
}

// ---- 1. merge + rebalance ----
const parts = ['quiz/_curr_core1.js', 'quiz/_curr_core2.js', 'quiz/_curr_ext.js'].map(load);
let raw = parts.join('\n') + '\n';
{
  const idx = raw.indexOf('var CURR = {');
  const head = raw.slice(0, idx + 'var CURR = {'.length);
  let rest = raw.slice(idx + 'var CURR = {'.length);
  const re = /^"([^"]+)": \[\s*\n/gm;
  let segs = [], mm;
  while((mm = re.exec(rest))){
    const name = mm[1];
    const start = re.lastIndex;
    const nx = rest.slice(start).search(/^"([^"]+)": \[\s*\n/m);
    const end = nx < 0 ? rest.length : start + nx;
    segs.push({ name, body: rest.slice(start, end) });
  }
  let out = head + '\n'; let fixed = [];
  segs.forEach(function(s, si){
    let body = s.body;
    if(si === segs.length - 1) body = body.replace(/\n?\};\s*$/, '');
    const r = bal(body);
    if(r === 0){
      let k = body.length - 1;
      while(k >= 0 && /\s/.test(body[k])) k--;
      if(body[k] === ',') k--;
      body = body.slice(0, k + 1) + ']' + body.slice(k + 1);
      fixed.push(s.name);
    } else if(r !== -1){
      throw new Error(s.name + ' bal=' + r);
    }
    out += '"' + s.name + '": [\n' + body;
  });
  raw = out.replace(/\s+$/, '\n') + '};\n';
  console.log('rebalanced: closed [' + fixed.join(', ') + ']');
}

// ---- 2. top-up second questions ----
const ADD = JSON.parse(fs.readFileSync('/tmp/add.json', 'utf8'));
let spliced = 0;
for(const [tname, qs] of Object.entries(ADD)){
  const idx = raw.indexOf('"' + tname + '"');
  if(idx < 0) throw new Error('topic not found: ' + tname);
  if(raw.indexOf('"' + tname + '"', idx + 1) >= 0) throw new Error('topic duplicated: ' + tname);
  const qstart = raw.indexOf('[{"q":', idx);
  if(qstart < 0) throw new Error('no question array for ' + tname);
  const qend = findMatch(raw, qstart);
  for(const q of qs){
    const qs0 = raw.indexOf('[{"q":', idx);
    const qe0 = findMatch(raw, qs0);
    if(raw.slice(qs0, qe0).includes('"' + q.q + '"')) continue; // already present
    raw = raw.slice(0, qe0 - 1) + ',' + JSON.stringify(q) + raw.slice(qe0 - 1);
    spliced++;
  }
}
console.log('top-up questions spliced:', spliced);

// ---- 3. validate + write ----
eval(raw); // defines var CURR in this scope
fs.writeFileSync('quiz/_curr_data.js', raw);
console.log('CURR subjects:', Object.keys(CURR).length,
  '| topics:', Object.values(CURR).reduce((a, ts) => a + ts.length, 0),
  '| questions:', Object.values(CURR).reduce((a, ts) => a + ts.reduce((b, t) => b + (t[3] || []).length, 0), 0));
