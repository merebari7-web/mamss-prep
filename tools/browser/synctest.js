/* v44 Carry: export progress on one device, import on another (separate profiles). */
const puppeteer=require('puppeteer');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const URL_='http://127.0.0.1:8100/';
const mk=async b=>{const p=await b.newPage();await p.setViewport({width:412,height:912,deviceScaleFactor:2,isMobile:true,hasTouch:true});return p};
const signup=async(p,name)=>{await p.evaluate(n=>{const i=document.getElementById('gateName');i.value=n;i.dispatchEvent(new Event('input',{bubbles:true}));window.gateSignUp()},name);await sleep(1200);
  await p.evaluate(()=>{const o=document.getElementById('mpNewOverlay');if(o)o.remove()})};
const fails=[];const ok=(n,c,d)=>{console.log(`  ${c?'✔':'✘'} ${n}${d?' :: '+d:''}`);if(!c)fails.push(n)};

(async()=>{
/* ---------------- DEVICE A ---------------- */
const bA=await puppeteer.launch({headless:'new',args:['--no-sandbox','--disable-dev-shm-usage']});
const A=await mk(bA);
const errs=[];A.on('pageerror',e=>errs.push('A:'+e.message));
await A.goto(URL_,{waitUntil:'networkidle2',timeout:60000});
await A.waitForFunction('window.QUIZ_RAW||window.QUIZ_ERR',{timeout:45000}).catch(()=>{});
await sleep(3000); await signup(A,'Device One');
/* give device A real progress: XP, merits and one recorded attempt */
await A.evaluate(()=>{const t=uid();
  store.set('nssc_xp_'+t,777); store.set('nssc_coins_'+t,42);
  store.set('nssc_attempts_'+t,[{tms:1700000000000,cls:0,subj:'Mathematics',score:8,pct:80,n:10}]);
  store.set('nssc_badges',['first-paper']);});
await A.evaluate(()=>window.openMpSync());
await sleep(800);
ok('sync overlay opens on device A', await A.evaluate(()=>{const o=document.getElementById('mpSyncOverlay');return o&&!o.classList.contains('hidden')}));
await A.evaluate(()=>document.getElementById('mpSyncMake').click());
await sleep(1200);
const code=await A.evaluate(()=>document.getElementById('mpSyncCode').value);
const meta=await A.evaluate(()=>document.getElementById('mpSyncMeta').textContent);
ok('code generated and compressed', code.startsWith('MAMSS1.')&&code.length>50, `prefix MAMSS1. · ${code.length} chars · ${meta.slice(0,80)}`);
const rawJsonLen=await A.evaluate(()=>JSON.stringify(window.backupPayload()).length);
ok('code is smaller than the raw JSON', code.length<rawJsonLen, `${code.length} chars vs ${rawJsonLen} raw`);
await bA.close();

/* ---------------- DEVICE B (separate profile = separate device) ---------------- */
const bB=await puppeteer.launch({headless:'new',args:['--no-sandbox','--disable-dev-shm-usage']});
const B=await mk(bB);
B.on('pageerror',e=>errs.push('B:'+e.message));
B.on('dialog',d=>d.accept());
await B.goto(URL_,{waitUntil:'networkidle2',timeout:60000});
await B.waitForFunction('window.QUIZ_RAW||window.QUIZ_ERR',{timeout:45000}).catch(()=>{});
await sleep(3000); await signup(B,'Device Two');
await B.evaluate(()=>window.openMpSync());
await sleep(800);
await B.evaluate(c=>{document.getElementById('mpSyncIn').value=c},code);
await B.evaluate(()=>document.getElementById('mpSyncRead').click());
await sleep(1200);
const prev=await B.evaluate(()=>document.getElementById('mpSyncImportOut').textContent);
ok('code read + previewed on device B', /code read/.test(prev)&&/1 paper/.test(prev), prev.replace(/\s+/g,' ').slice(0,90));
await B.evaluate(()=>document.getElementById('mpSyncApply').click());
await B.waitForNavigation({timeout:30000}).catch(()=>{});
await B.waitForFunction('window.QUIZ_RAW||window.QUIZ_ERR',{timeout:45000}).catch(()=>{});
await sleep(2500);
const merged=await B.evaluate(()=>{const t=uid();return {
  xp:store.get('nssc_xp_'+t,0), coins:store.get('nssc_coins_'+t,0),
  attempts:(store.get('nssc_attempts_'+t,[])||[]).length,
  badges:store.get('nssc_badges',[]), name:(window.user||{}).name,
  hud:document.getElementById('coinN')&&document.getElementById('coinN').textContent,
  storedUser:store.get('nssc_user',null)};});
ok('XP carried across', merged.xp===777, 'xp='+merged.xp);
ok('merits carried across', merged.coins===42&&merged.hud==='42', 'coins='+merged.coins+' hud='+merged.hud);
ok('the recorded paper carried across', merged.attempts===1, 'attempts='+merged.attempts);
ok('badges carried across', Array.isArray(merged.badges)&&merged.badges.includes('first-paper'), JSON.stringify(merged.badges));
ok('local profile kept (merge, not overwrite)', merged.storedUser&&merged.storedUser.name==='Device Two', JSON.stringify(merged.storedUser).slice(0,60));

/* merge must be idempotent: importing the same code twice must not duplicate the paper */
await B.evaluate(()=>window.openMpSync()); await sleep(600);
await B.evaluate(c=>{document.getElementById('mpSyncIn').value=c},code);
await B.evaluate(()=>document.getElementById('mpSyncRead').click()); await sleep(900);
await B.evaluate(()=>document.getElementById('mpSyncApply').click());
await B.waitForNavigation({timeout:30000}).catch(()=>{});
await B.waitForFunction('window.QUIZ_RAW||window.QUIZ_ERR',{timeout:45000}).catch(()=>{});
await sleep(2000);
const again=await B.evaluate(()=>({attempts:(store.get('nssc_attempts_'+uid(),[])||[]).length}));
ok('re-import does not duplicate papers', again.attempts===1, 'attempts after 2nd import='+again.attempts);
await bB.close();

/* garbage input must fail gracefully */
const bC=await puppeteer.launch({headless:'new',args:['--no-sandbox','--disable-dev-shm-usage']});
const C=await mk(bC);
await C.goto(URL_,{waitUntil:'networkidle2',timeout:60000});
await sleep(2500); await signup(C,'Device Three');
await C.evaluate(()=>window.openMpSync()); await sleep(600);
await C.evaluate(()=>{document.getElementById('mpSyncIn').value='MAMSS1.not-a-real-code!!!!'});
await C.evaluate(()=>document.getElementById('mpSyncRead').click()); await sleep(900);
const bad=await C.evaluate(()=>document.getElementById('mpSyncImportOut').textContent);
ok('garbage code rejected with a friendly message', /✘/.test(bad)&&!/undefined/.test(bad), bad.replace(/\s+/g,' ').slice(0,70));
await bC.close();

console.log('  page errors:', errs.length?errs:'(none)');
if(errs.length)fails.push('page errors');
console.log(`\n=== SYNC TEST: ${fails.length?fails.length+' FAILURES':'ALL PASSED'} ===`);
process.exit(fails.length?1:0);
})().catch(e=>{console.error('CRASH',e);process.exit(2)});
