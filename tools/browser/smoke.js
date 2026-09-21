/* Full user-journey smoke test: sign up -> pick class/subject/length -> sit a paper -> answer -> review. */
const puppeteer=require('puppeteer');
const BASE=process.argv[2]||'http://127.0.0.1:8099/';
const LABEL=process.argv[3]||'smoke';
const OUT=process.argv[4]||'';
const log=[];const say=(s)=>{log.push(s);console.log(s)};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

(async()=>{
const browser=await puppeteer.launch({headless:'new',args:['--ignore-certificate-errors','--allow-insecure-localhost','--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage();
await page.setViewport({width:412,height:915,deviceScaleFactor:2,isMobile:true,hasTouch:true});
const errors=[];
page.on('pageerror',e=>errors.push('pageerror: '+e.message));
page.on('console',m=>{if(m.type()==='error'&&!/GSI_LOGGER|accounts\.google/.test(m.text()))errors.push('console: '+m.text())});

const step=async(name,fn)=>{const t=Date.now();try{const r=await fn();say(`  ✔ ${name} (${Date.now()-t}ms)${r?' :: '+r:''}`);return true}
  catch(e){say(`  ✘ ${name} FAILED :: ${String(e.message).slice(0,160)}`);return false}};

say(`\n=== SMOKE ${LABEL} :: ${BASE} ===`);
await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:60000});
await page.waitForFunction('window.QUIZ_RAW||window.QUIZ_ERR',{timeout:45000}).catch(()=>{});
await sleep(1500);

const counts=await page.evaluate(()=>({
  bankOK:!!window.QUIZ_RAW,bankErr:window.QUIZ_ERR||null,
  subjects:(window.QUIZ_RAW&&window.QUIZ_RAW.subj||[]).length,
  classes:(window.QUIZ_RAW&&window.QUIZ_RAW.classes||[]).length,
  classTabs:document.querySelectorAll('#classTabs .tab').length,
  labTiles:document.querySelectorAll('.lab-tile').length,
  dockBtns:document.querySelectorAll('#homeDock .hd-btn').length,
  navBtns:document.querySelectorAll('nav.nav .icon-btn').length,
  gateOpen:!document.getElementById('gateOverlay')?.classList.contains('hidden')&&getComputedStyle(document.getElementById('gateOverlay')).display!=='none'
}));
say('  initial: '+JSON.stringify(counts));

await step('sign up through the gate',async()=>{
  await page.evaluate(()=>{const n=document.getElementById('gateName');if(n){n.value='Test Student';n.dispatchEvent(new Event('input',{bubbles:true}))}});
  await page.evaluate(()=>window.gateSignUp&&window.gateSignUp());
  await sleep(1200);
  const g=await page.evaluate(()=>{const e=document.getElementById('gateOverlay');return e?getComputedStyle(e).display:'gone'});
  if(g!=='none'&&g!=='gone')throw new Error('gate still visible ('+g+')');
  return 'gate closed';
});

await step('class tabs rendered with real counts',async()=>{
  const t=await page.evaluate(()=>[...document.querySelectorAll('#classTabs .tab')].map(x=>x.textContent.replace(/\s+/g,' ').trim().slice(0,40)));
  if(!t.length)throw new Error('no class tabs');
  return t.join(' | ');
});

await step('select SS1',async()=>{
  await page.evaluate(()=>document.querySelectorAll('#classTabs .tab')[0].click());
  await sleep(900);
  const n=await page.evaluate(()=>document.querySelectorAll('#subjectChips .chip').length);
  if(n<2)throw new Error('only '+n+' subject chips');
  return n+' subject chips';
});

await step('select Mathematics',async()=>{
  const ok=await page.evaluate(()=>{const c=[...document.querySelectorAll('#subjectChips .chip')].find(x=>/Math/i.test(x.textContent));if(!c)return false;c.click();return true});
  if(!ok)throw new Error('Mathematics chip not found');
  await sleep(800);
  const n=await page.evaluate(()=>document.querySelectorAll('#countBoxes .count').length);
  if(!n)throw new Error('no question-count options');
  return n+' length options';
});

await step('pick a paper length',async()=>{
  await page.evaluate(()=>document.querySelectorAll('#countBoxes .count')[0].click());
  await sleep(500);
  return await page.evaluate(()=>document.getElementById('startBtn')?.textContent.trim().slice(0,50));
});

await step('commence examination',async()=>{
  await page.evaluate(()=>window.startQuiz&&window.startQuiz());
  await sleep(2000);
  const st=await page.evaluate(()=>({
    quizVisible:(()=>{const e=document.getElementById('quizCard');return e?!e.classList.contains('hidden'):false})(),
    opts:document.querySelectorAll('.opt').length,
    qtext:(document.querySelector('.qtext')||{}).textContent?.trim().slice(0,70),
    timer:(document.querySelector('.timer')||{}).textContent
  }));
  if(!st.quizVisible||!st.opts)throw new Error('quiz did not open: '+JSON.stringify(st));
  return `${st.opts} options · "${st.qtext}" · timer ${st.timer}`;
});

await step('answer 3 questions',async()=>{
  for(let i=0;i<3;i++){
    const n=await page.evaluate((k)=>{const o=document.querySelectorAll('.opt');if(!o.length)return -1;o[k%o.length].click();return o.length},i);
    if(n<0)throw new Error('no options at question '+(i+1));
    await sleep(700);
    await page.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(x=>/^Next|Next →|Submit/i.test(x.textContent.trim()));if(b)b.click()});
    await sleep(700);
  }
  return await page.evaluate(()=>{const p=document.querySelector('.progress > div');return 'progress '+(p?p.style.width:'?')});
});

await step('open question palette',async()=>{
  const ok=await page.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(x=>/Palette/i.test(x.textContent));if(b){b.click();return true}return false});
  await sleep(500);
  const n=await page.evaluate(()=>document.querySelectorAll('.pal-n').length);
  if(!ok)throw new Error('palette button not found');
  return n+' palette cells';
});

await step('flag + bookmark a question',async()=>{
  return await page.evaluate(()=>{
    const f=[...document.querySelectorAll('button')].find(x=>/Flag/i.test(x.textContent));
    const b=[...document.querySelectorAll('button')].find(x=>/Bookmark/i.test(x.textContent));
    if(f)f.click(); if(b)b.click();
    return (f?'flagged ':'')+(b?'bookmarked':'');
  });
});

await step('study-hall tools reachable',async()=>{
  const t=await page.evaluate(()=>[...document.querySelectorAll('.lab-tile')].map(x=>x.textContent.replace(/\s+/g,' ').trim().slice(0,18)).slice(0,8));
  if(t.length<8)throw new Error('only '+t.length+' lab tiles');
  return t.length+' tiles';
});

await step('open the question library (4,167 search)',async()=>{
  await page.evaluate(()=>window.openLibrary&&window.openLibrary());
  await sleep(1500);
  const c=await page.evaluate(()=>(document.getElementById('libCount')||{}).textContent);
  await page.evaluate(()=>window.closeLibrary&&window.closeLibrary());
  if(!c)throw new Error('library did not report a count');
  return c.trim().slice(0,60);
});

await step('theme toggle works',async()=>{
  const before=await page.evaluate(()=>document.documentElement.dataset.theme);
  await page.evaluate(()=>document.getElementById('themeBtn').click());
  await sleep(400);
  const after=await page.evaluate(()=>document.documentElement.dataset.theme);
  if(before===after)throw new Error('theme did not change');
  await page.evaluate(()=>document.getElementById('themeBtn').click());
  return before+' -> '+after;
});

const extra=await page.evaluate(()=>({
  manifest:!!document.querySelector('link[rel="manifest"]'),
  swController:!!(navigator.serviceWorker&&navigator.serviceWorker.controller),
  swRegs:(navigator.serviceWorker?1:0),
  installBtn:!!document.getElementById('mpInstallBtn'),
  dataSaver:document.documentElement.classList.contains('data-saver'),
  upgradeLoaded:!!window.MAMSS_UPGRADE
}));
say('  post-state: '+JSON.stringify(extra));
say(`  ERRORS (${errors.length}):`); errors.slice(0,10).forEach(e=>say('    '+e.slice(0,180)));
if(OUT)await page.screenshot({path:OUT});
await browser.close();
const failed=log.filter(l=>l.includes('✘')).length;
say(`=== ${LABEL}: ${failed?'FAILURES '+failed:'ALL STEPS PASSED'} ===`);
process.exit(failed?1:0);
})().catch(e=>{console.error('SMOKE CRASH',e);process.exit(2)});
