const p=require('puppeteer'),fs=require('fs');
(async()=>{
  const b=await p.launch({headless:true,args:['--no-sandbox']});
  const pg=await b.newPage();
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#faf3e8"/><path d="M32 4 L58 11 V30 C58 46 47 56 32 60 C17 56 6 46 6 30 V11 Z" fill="#2d1f10" stroke="#c9a227" stroke-width="3"/><path d="M32 10 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 z" fill="#e8c76a"/><path d="M20 38 Q32 32 44 38 L44 48 Q32 42 32 48 Q32 42 20 48 Z" fill="#f7f1de"/></svg>`;
  await pg.setViewport({width:512,height:512});
  await pg.setContent(`<!doctype html><html><body style="margin:0;background:#faf3e8"><div style="width:512px;height:512px">${svg}</div></body></html>`);
  await new Promise(r=>setTimeout(r,400));
  await pg.screenshot({path:'icon-512.png'});
  await pg.setViewport({width:192,height:192});
  await pg.setContent(`<!doctype html><html><body style="margin:0"><div style="width:192px;height:192px">${svg.replace('<svg ','<svg width="64" height="64" ')}</div></body></html>`);
  await new Promise(r=>setTimeout(r,300));
  await pg.screenshot({path:'icon-192.png'});
  await pg.setViewport({width:180,height:180});
  await pg.setContent(`<!doctype html><html><body style="margin:0;background:#faf3e8"><div style="width:180px;height:180px">${svg.replace('<svg ','<svg width="64" height="64" ')}</div></body></html>`);
  await new Promise(r=>setTimeout(r,300));
  await pg.screenshot({path:'apple-touch-icon.png'});
  await b.close();
  for(const f of ['icon-512.png','icon-192.png','apple-touch-icon.png']){
    const st=fs.statSync(f); console.log(f, st.size+ ' B');
  }
})().catch(e=>{console.error(e);process.exit(1)});
