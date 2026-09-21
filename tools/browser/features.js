/* Tests the NEW v43 behaviour: SW caching, offline reload, Data Saver, App Centre, bank rescue. */
const puppeteer=require('puppeteer');
const BASE=process.argv[2]||'http://127.0.0.1:8100/';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const out=[];const say=s=>{out.push(s);console.log(s)};
let fails=0;
const ok=(n,c,d)=>{say(`  ${c?'✔':'✘'} ${n}${d?' :: '+d:''}`);if(!c)fails++};

(async()=>{
const browser=await puppeteer.launch({headless:'new',args:['--ignore-certificate-errors','--allow-insecure-localhost','--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage();
await page.setViewport({width:412,height:912,deviceScaleFactor:2,isMobile:true,hasTouch:true});
const errs=[];
page.on('pageerror',e=>errs.push('pageerror: '+e.message));
page.on('console',m=>{if(m.type()==='error'&&!/GSI_LOGGER|accounts\.google/.test(m.text()))errs.push('console: '+m.text())});

say('\n=== A. COLD VISIT ===');
await page.goto(BASE,{waitUntil:'networkidle2',timeout:60000});
await page.waitForFunction('window.QUIZ_RAW||window.QUIZ_ERR',{timeout:45000}).catch(()=>{});
await sleep(2500);
await page.evaluate(()=>{const n=document.getElementById('gateName');if(n){n.value='Test Student';n.dispatchEvent(new Event('input',{bubbles:true}))}window.gateSignUp&&window.gateSignUp()});
await sleep(1000);

const cold=await page.evaluate(()=>{
  const r=performance.getEntriesByType('resource');
  return {bytes:r.reduce((a,x)=>a+(x.transferSize||0),0), n:r.length,
    manifest:!!document.querySelector('link[rel="manifest"]'),
    upgrade:!!window.MAMSS_UPGRADE, feats:window.MAMSS_UPGRADE&&window.MAMSS_UPGRADE.features,
    hubBtn:!!document.getElementById('mpHubBtn'), tiles:document.querySelectorAll('#labGrid .lab-tile').length,
    stylesheets:[...document.styleSheets].map(s=>s.href?s.href.split('/').pop():'inline').filter(x=>x!=='inline'),
    swRegs:!!navigator.serviceWorker};
});
ok('manifest is linked', cold.manifest);
ok('upgrade layer booted', cold.upgrade, JSON.stringify(cold.feats));
ok('App Centre button in nav', cold.hubBtn);
ok('external stylesheets cached separately', cold.stylesheets.length>=1, cold.stylesheets.join(', '));
say(`  cold: ${cold.n} requests, ${(cold.bytes/1024).toFixed(1)} KB transferred, ${cold.tiles} study-hall tiles`);

const man=await page.evaluate(async()=>{const l=document.querySelector('link[rel="manifest"]');const r=await fetch(l.href);return {status:r.status,ct:r.headers.get('content-type'),body:await r.text()}});
let manOk=false,manName='';
try{const j=JSON.parse(man.body);manOk=!!(j.name&&j.icons&&j.start_url&&j.display);manName=j.short_name+' / icons:'+j.icons.length+' / screenshots:'+((j.screenshots||[]).length)}catch(e){}
ok('manifest is valid JSON with name+icons+start_url', manOk, manName+' (ct='+man.ct+')');

say('\n=== B. SERVICE WORKER INSTALL ===');
await sleep(3500);
let swInfo=await page.evaluate(async()=>{
  const reg=await navigator.serviceWorker.getRegistration();
  const keys=await caches.keys();
  let entries=[];
  for(const k of keys){const c=await caches.open(k);entries.push([k,(await c.keys()).length]);}
  return {active:!!(reg&&reg.active), script:reg&&reg.active&&reg.active.scriptURL.split('/').pop(),
    state:reg&&reg.active&&reg.active.state, controller:!!navigator.serviceWorker.controller, keys, entries};
});
ok('service worker active', swInfo.active, `${swInfo.script} (${swInfo.state})`);
say('  caches: '+JSON.stringify(swInfo.entries));
let precached=[];
if(swInfo.keys.length){
  precached=await page.evaluate(async(k)=>{const c=await caches.open(k);return (await c.keys()).map(r=>r.url.split('/').pop()||'/')},swInfo.keys[0]);
}
const need=['index.html','app.css','upgrade.css','upgrade.js','bank.js','manifest.webmanifest','404.html'];
const missing=need.filter(n=>!precached.some(p=>p===n||(p==='/'&&(n==='index.html'))));
ok('critical set precached (incl. bank.js + app.css)', missing.length===0, 'have: '+precached.join(', ')+(missing.length?' | MISSING: '+missing.join(', '):''));

say('\n=== C. SECOND VISIT (should be served from the device) ===');
const page2=await browser.newPage();
await page2.setViewport({width:412,height:912,deviceScaleFactor:2,isMobile:true,hasTouch:true});
await page2.goto(BASE,{waitUntil:'networkidle2',timeout:60000});
await sleep(2500);
const warm=await page2.evaluate(()=>{const r=performance.getEntriesByType('resource');
  return {bytes:r.reduce((a,x)=>a+(x.transferSize||0),0), n:r.length,
    fromCache:r.filter(x=>x.transferSize===0&&x.decodedBodySize>0).map(x=>x.name.split('/').pop()).slice(0,14),
    controller:!!navigator.serviceWorker.controller};});
say(`  warm: ${warm.n} requests, ${(warm.bytes/1024).toFixed(1)} KB transferred, controller=${warm.controller}`);
say(`  served from cache: ${warm.fromCache.join(', ')}`);
ok('controller active on repeat visit', warm.controller);
ok('repeat visit transfers less than cold', warm.bytes<cold.bytes, `${(warm.bytes/1024).toFixed(1)} KB vs ${(cold.bytes/1024).toFixed(1)} KB`);
await page2.close();

say('\n=== D. FULLY OFFLINE RELOAD ===');
await page.setOfflineMode(true);
let offlineOk=false, offlineDetail='';
try{
  await page.reload({waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction('window.QUIZ_RAW||window.QUIZ_ERR',{timeout:30000}).catch(()=>{});
  await sleep(2500);
  const o=await page.evaluate(()=>({bank:!!window.QUIZ_RAW,q:(()=>{try{let t=0;(window.QUIZ_RAW.classes||[]).forEach(c=>t+=c[1].length);return t}catch(e){return 0}})(),
    tabs:document.querySelectorAll('#classTabs .tab').length, tiles:document.querySelectorAll('.lab-tile').length,
    pill:!!document.getElementById('mpPill'), gate:!!document.getElementById('gateOverlay'),
    styled:getComputedStyle(document.body).backgroundColor}));
  offlineOk=o.bank&&o.tabs>0;
  offlineDetail=`bank=${o.bank} questions=${o.q} classTabs=${o.tabs} tiles=${o.tiles} offlinePill=${o.pill} bg=${o.styled}`;
}catch(e){offlineDetail='EXCEPTION '+e.message}
ok('app fully usable with the network off', offlineOk, offlineDetail);
await page.screenshot({path:'/home/user/shot-offline.png'});
await page.setOfflineMode(false);
await sleep(800);
await page.reload({waitUntil:'networkidle2',timeout:60000});
await page.waitForFunction('window.QUIZ_RAW||window.QUIZ_ERR',{timeout:45000}).catch(()=>{});
await sleep(2500);

say('\n=== E. APP CENTRE UI ===');
await page.evaluate(()=>window.openMpHub&&window.openMpHub());
await sleep(1400);
const hub=await page.evaluate(()=>{
  const o=document.getElementById('mpHubOverlay');
  const b=document.getElementById('mpHubBody');
  return {open:o?!o.classList.contains('hidden'):false,
    rows:[...document.querySelectorAll('#mpHubBody .mp-row')].map(r=>((r.querySelector('.mp-tx b')||{}).textContent||'?')),
    quota:(document.getElementById('mpQuotaT')||{}).textContent,
    quotaSub:((document.getElementById('mpQuotaS')||{}).textContent||'').slice(0,90),
    switch:!!document.getElementById('mpSaverSw'),
    store:((document.getElementById('mpRow-store')||{}).textContent||'').replace(/\s+/g,' ').slice(0,80)};
});
ok('App Centre opens with all sections', hub.open&&hub.rows.length>=7, hub.rows.join(' | '));
ok('storage quota reported', /storage|MB|KB/i.test(hub.quota||''), hub.quota+' — '+hub.quotaSub);
say('  storage row: '+hub.store);
await page.screenshot({path:'/home/user/shot-hub.png'});

say('\n=== F. DATA SAVER ===');
await page.evaluate(()=>{localStorage.setItem('nssc_saver','true')});
const page3=await browser.newPage();
await page3.setViewport({width:412,height:912,deviceScaleFactor:2,isMobile:true,hasTouch:true});
const reqs=[];page3.on('request',r=>reqs.push(r.url().replace(BASE,'')));
await page3.goto(BASE,{waitUntil:'networkidle2',timeout:60000});
await sleep(3500);
const sv=await page3.evaluate(()=>{
  const r=performance.getEntriesByType('resource');
  return {cls:document.documentElement.className, saver:!!window.MAMSS_SAVER,
    blocked:window.MAMSS_SAVER_BLOCKED||[], bytes:r.reduce((a,x)=>a+(x.transferSize||0),0), n:r.length,
    aurora:(()=>{const a=document.getElementById('aurora');return a?getComputedStyle(a).display:'none-el'})(),
    bank:!!window.QUIZ_RAW, tabs:document.querySelectorAll('#classTabs .tab').length};
});
ok('data-saver class applied', /data-saver/.test(sv.cls), 'class="'+sv.cls+'" saver='+sv.saver);
ok('decorations hidden', sv.aurora==='none', 'aurora display='+sv.aurora);
ok('heavy modules paused', sv.blocked.length>0, 'blocked: '+sv.blocked.join(', ')||'(none)');
ok('the paper engine still works in Data Saver', sv.bank&&sv.tabs>0, `bank=${sv.bank} tabs=${sv.tabs}`);
say(`  data saver: ${sv.n} requests, ${(sv.bytes/1024).toFixed(1)} KB (normal mode: ${cold.n} req, ${(cold.bytes/1024).toFixed(1)} KB)`);
ok('Data Saver transfers less than normal', sv.bytes<cold.bytes, `−${((1-sv.bytes/cold.bytes)*100).toFixed(0)}%`);
await page3.screenshot({path:'/home/user/shot-saver.png'});
await page3.close();

say('\n=== G. BANK RESCUE (browser with no DecompressionStream) ===');
const page4=await browser.newPage();
await page4.setViewport({width:412,height:912,deviceScaleFactor:2,isMobile:true,hasTouch:true});
await page4.evaluateOnNewDocument(()=>{try{delete window.DecompressionStream;Object.defineProperty(window,'DecompressionStream',{value:undefined,configurable:true})}catch(e){}});
await page4.goto(BASE,{waitUntil:'domcontentloaded',timeout:60000});
await page4.waitForFunction('window.QUIZ_RAW||window.QUIZ_ERR',{timeout:45000}).catch(()=>{});
await sleep(2000);
let resc=await page4.evaluate(()=>({raw:!!window.QUIZ_RAW,err:window.QUIZ_ERR||null,supported:('DecompressionStream' in window)&&!!window.DecompressionStream,
  rescue:!!(window.MAMSS_UPGRADE&&window.MAMSS_UPGRADE.features.bankrescue),txt:(window.__BANK_RAW_TXT||'').length}));
say('  after normal path: '+JSON.stringify(resc));
if(!resc.raw){ await sleep(9000); resc=await page4.evaluate(()=>({raw:!!window.QUIZ_RAW,err:window.QUIZ_ERR||null,
  rescue:!!(window.MAMSS_UPGRADE&&window.MAMSS_UPGRADE.features.bankrescue),txt:(window.__BANK_RAW_TXT||'').length,
  q:(()=>{try{let t=0;(window.QUIZ_RAW.classes||[]).forEach(c=>t+=c[1].length);return t}catch(e){return 0}})(),
  tabs:document.querySelectorAll('#classTabs .tab').length}));
  say('  after rescue     : '+JSON.stringify(resc)); }
ok('bank recovers without DecompressionStream', resc.raw&&resc.txt>100000, `questions=${resc.q||'?'} tabs=${resc.tabs||'?'} rescueFired=${resc.rescue}`);
await page4.close();

say(`\n  console/page errors across all tests: ${errs.length}`);
errs.slice(0,8).forEach(e=>say('    '+e.slice(0,170)));
ok('no unexpected JS errors', errs.length===0);
await browser.close();
say(`\n=== FEATURES: ${fails?fails+' FAILURES':'ALL PASSED'} ===`);
process.exit(fails?1:0);
})().catch(e=>{console.error('CRASH',e);process.exit(2)});
