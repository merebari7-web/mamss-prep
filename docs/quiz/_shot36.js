const fs=require("fs"),puppeteer=require("puppeteer");
(async()=>{
  const b=await puppeteer.launch({headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
  for(const v of [{w:1280,h:860},{w:375,h:740}]){
    const p=await b.newPage();
    await p.setViewport({width:v.w,height:v.h});
    await p.goto("file://"+process.cwd()+"/index.html",{waitUntil:"load"});
    await p.waitForFunction(()=>window.__atlasApi&&window.__curicApi&&window.__aiApi,{timeout:35000}).catch(()=>{});
    await new Promise(r=>setTimeout(r,600));
    try{await p.evaluate(()=>{const g=document.getElementById("guestName");if(g)g.value="Ada";if(typeof signUpGuest==="function")signUpGuest();});}catch(e){}
    await new Promise(r=>setTimeout(r,400));
    // atlas grid
    await p.evaluate(()=>{window.__atlasApi.open();});
    await new Promise(r=>setTimeout(r,600));
    await p.screenshot({path:`/tmp/v36_atlas_${v.w}.png`}).catch(()=>{});
    if(v.w===1280){
      // history detail
      await p.evaluate(()=>{Array.prototype.forEach.call(document.querySelectorAll(".at-subj"),c=>{if(/History/.test(c.textContent))c.click();});});
      await new Promise(r=>setTimeout(r,500));
      await p.screenshot({path:`/tmp/v36_detail_${v.w}.png`}).catch(()=>{});
      await p.evaluate(()=>{window.__atlasApi.close();});
      // AI curriculum answer
      await p.evaluate(()=>{window.__aiApi.open("ask");window.__aiApi.ask("Tell me about Nok terracotta");});
      await new Promise(r=>setTimeout(r,1200));
      await p.screenshot({path:`/tmp/v36_ai_${v.w}.png`}).catch(()=>{});
      await p.evaluate(()=>{window.__aiApi.close();});
    }
    await p.close();
  }
  await b.close();
  for(const f of ["v36_atlas_1280","v36_atlas_375","v36_detail_1280","v36_ai_1280"]){
    fs.copyFileSync(`/tmp/${f}.png`,`preview_${f}.png`);console.log("wrote preview_"+f+".png");
  }
})().catch(e=>{console.error(e);process.exit(1)});
