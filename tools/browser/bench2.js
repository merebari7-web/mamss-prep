/* True network cost measured at the server (immune to service-worker transferSize quirks).
   Runs: cold visit x3, warm visit, "short first visit then offline", full offline reload. */
const puppeteer=require('puppeteer');
const fs=require('fs');
const URL_=process.argv[2], LABEL=process.argv[3], LOG=process.argv[4];
const RUNS=+(process.argv[5]||3);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const offset=()=>{try{return fs.statSync(LOG).size}catch(e){return 0}};
const since=(o)=>{let t=fs.readFileSync(LOG,'utf8').slice(o).trim();if(!t)return{bytes:0,n:0,files:[]};
  const L=t.split('\n').map(x=>x.split('\t'));
  return {bytes:L.reduce((a,x)=>a+(+x[1]||0),0),n:L.length,files:L.map(x=>x[3])};};
const launch=()=>puppeteer.launch({headless:'new',args:['--ignore-certificate-errors','--allow-insecure-localhost','--no-sandbox','--disable-dev-shm-usage']});
const mk=async b=>{const p=await b.newPage();await p.setViewport({width:412,height:912,deviceScaleFactor:2,isMobile:true,hasTouch:true});return p};
const state=p=>p.evaluate(()=>({bank:!!window.QUIZ_RAW,tabs:document.querySelectorAll('#classTabs .tab').length,
  tiles:document.querySelectorAll('.lab-tile').length,sw:!!(navigator.serviceWorker&&navigator.serviceWorker.controller),
  manifest:!!document.querySelector('link[rel="manifest"]'),
  fcp:(performance.getEntriesByName('first-contentful-paint')[0]||{}).startTime|0}));
const med=a=>a.slice().sort((x,y)=>x-y)[a.length>>1];

(async()=>{
/* ---------------- COLD x N (fresh profile each time) ---------------- */
const coldFcp=[],coldNet=[],coldWall=[];
for(let i=0;i<RUNS;i++){
  const b=await launch(), p=await mk(b);
  const o=offset(); const t=Date.now();
  await p.goto(URL_,{waitUntil:'networkidle2',timeout:90000});
  await p.waitForFunction('window.QUIZ_RAW||window.QUIZ_ERR',{timeout:60000}).catch(()=>{});
  await sleep(3500);                       /* let the SW finish precaching */
  coldWall.push(Date.now()-t);
  const net=since(o); coldNet.push(net.bytes);
  const s=await state(p); coldFcp.push(s.fcp);
  await b.close();
}
/* ---------------- WARM (same profile as a completed cold visit) ---------------- */
let b=await launch(), p=await mk(b);
await p.goto(URL_,{waitUntil:'networkidle2',timeout:90000});
await p.waitForFunction('window.QUIZ_RAW||window.QUIZ_ERR',{timeout:60000}).catch(()=>{});
await sleep(5000);
let o=offset(); let t=Date.now();
const p2=await mk(b);
await p2.goto(URL_,{waitUntil:'networkidle2',timeout:90000});
await p2.waitForFunction('window.QUIZ_RAW||window.QUIZ_ERR',{timeout:60000}).catch(()=>{});
await sleep(3000);
const warmNet=since(o), warmWall=Date.now()-t, warmState=await state(p2);
/* third visit = steady state */
o=offset(); t=Date.now();
const p3=await mk(b);
await p3.goto(URL_,{waitUntil:'networkidle2',timeout:90000});
await p3.waitForFunction('window.QUIZ_RAW||window.QUIZ_ERR',{timeout:60000}).catch(()=>{});
await sleep(3000);
const warm2Net=since(o), warm2Wall=Date.now()-t;
await p.close(); await p2.close(); await p3.close(); await b.close();

/* ------- SHORT FIRST VISIT (user leaves early) THEN OFFLINE ------- */
b=await launch(); p=await mk(b);
await p.goto(URL_,{waitUntil:'domcontentloaded',timeout:90000});
await sleep(4500);   /* enough for the SW to install; the lazy modules are still trickling in */
const shortState=await state(p);
await p.setOfflineMode(true);
let shortOff;
try{
  await p.reload({waitUntil:'domcontentloaded',timeout:40000});
  await p.waitForFunction('window.QUIZ_RAW||window.QUIZ_ERR',{timeout:40000}).catch(()=>{});
  await sleep(3500);
  const s=await state(p);
  const mods=await p.evaluate(()=>performance.getEntriesByType('resource').filter(r=>r.responseEnd===0).length);
  shortOff={ok:!!(s.bank&&s.tabs>0),...s,failedFetches:mods};
}catch(e){shortOff={ok:false,detail:String(e.message).slice(0,80)}}
await p.setOfflineMode(false); await p.close(); await b.close();

/* ---------------- FULL OFFLINE RELOAD ---------------- */
b=await launch(); p=await mk(b);
await p.goto(URL_,{waitUntil:'networkidle2',timeout:90000});
await p.waitForFunction('window.QUIZ_RAW||window.QUIZ_ERR',{timeout:60000}).catch(()=>{});
await sleep(5000);
await p.setOfflineMode(true); t=Date.now();
let fullOff;
try{
  await p.reload({waitUntil:'domcontentloaded',timeout:40000});
  await p.waitForFunction('window.QUIZ_RAW||window.QUIZ_ERR',{timeout:40000}).catch(()=>{});
  await sleep(3500);
  const s=await state(p); fullOff={ok:!!(s.bank&&s.tabs>0),wall:Date.now()-t,...s};
}catch(e){fullOff={ok:false,detail:String(e.message).slice(0,80),wall:Date.now()-t}}
await b.close();

const R=(k,v)=>console.log(k.padEnd(34)+v);
console.log(`\n########## ${LABEL} ##########`);
R('cold network bytes (median)', (med(coldNet)/1024).toFixed(1)+' KB   ['+coldNet.map(x=>(x/1024).toFixed(0)).join(', ')+']');
R('cold first paint (median)', med(coldFcp)+' ms   ['+coldFcp.join(', ')+']');
R('cold wall clock (median)', med(coldWall)+' ms');
R('WARM network bytes', (warmNet.bytes/1024).toFixed(1)+' KB over '+warmNet.n+' requests');
R('WARM files re-fetched', warmNet.files.join(', ').slice(0,150)||'(none)');
R('WARM wall clock', warmWall+' ms  · sw='+warmState.sw);
R('3rd-VISIT network bytes', (warm2Net.bytes/1024).toFixed(1)+' KB over '+warm2Net.n+' requests');
R('3rd-VISIT files', warm2Net.files.join(', ').slice(0,150)||'(none)');
R('short-visit -> offline', shortOff.ok?'✔ WORKS':'✘ BROKEN');
R('   (bank/tabs/tiles)', `${shortOff.bank}/${shortOff.tabs}/${shortOff.tiles} · sw=${shortOff.sw}`);
R('full offline reload', fullOff.ok?'✔ WORKS':'✘ BROKEN');
R('   (bank/tabs/tiles/ms)', `${fullOff.bank}/${fullOff.tabs}/${fullOff.tiles} · ${fullOff.wall}ms`);
fs.writeFileSync(`/home/user/bench2-${LABEL}.json`,JSON.stringify({LABEL,coldNet,coldFcp,coldWall,warmNet,warm2Net,warmState,shortOff,fullOff},null,1));
})().catch(e=>{console.error('BENCH2 FAIL',e);process.exit(1)});
