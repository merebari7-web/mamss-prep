const fs=require("fs"),puppeteer=require("puppeteer");
(async()=>{
  const b=await puppeteer.launch({headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
  for(const v of [{w:1280,h:860},{w:375,h:740}]){
    const p=await b.newPage();
    await p.setViewport({width:v.w,height:v.h});
    await p.goto("file://"+process.cwd()+"/index.html",{waitUntil:"load"});
    await p.waitForFunction(()=>window.__reelsApi&&window.__atlasApi,{timeout:40000}).catch(()=>{});
    await new Promise(r=>setTimeout(r,600));
    try{await p.evaluate(()=>{const g=document.getElementById("guestName");if(g)g.value="Ada";if(typeof signUpGuest==="function")signUpGuest();});}catch(e){}
    await new Promise(r=>setTimeout(r,400));
    if(v.w===1280){
      // reels player mid-playback (Biology SS1)
      await p.evaluate(()=>{window.__reelsApi.open("Biology",0);});
      await new Promise(r=>setTimeout(r,400));
      await p.evaluate(()=>{window.__reelsApi.play();});
      await new Promise(r=>setTimeout(r,8000));
      await p.screenshot({path:`/tmp/v37_reel_1280.png`}).catch(()=>{});
      await p.evaluate(()=>{window.__reelsApi.close();});
      // studio pro
      await p.evaluate(()=>{document.getElementById("arcLaunch").click();});
      await new Promise(r=>setTimeout(r,2500));
      await p.evaluate(()=>{ARC.go("videos");});
      await new Promise(r=>setTimeout(r,600));
      await p.screenshot({path:`/tmp/v37_studio_1280.png`}).catch(()=>{});
      await p.evaluate(()=>{ARC.close();});
      // find button in nav (top of page)
      await p.evaluate(()=>{window.scrollTo(0,0);});
      await new Promise(r=>setTimeout(r,300));
      await p.screenshot({path:`/tmp/v37_find_1280.png`}).catch(()=>{});
    } else {
      await p.evaluate(()=>{window.__reelsApi.open("Mathematics",2);});
      await new Promise(r=>setTimeout(r,400));
      await p.evaluate(()=>{window.__reelsApi.play();});
      await new Promise(r=>setTimeout(r,2500));
      await p.screenshot({path:`/tmp/v37_reel_375.png`}).catch(()=>{});
      await p.evaluate(()=>{window.__reelsApi.close();});
    }
    await p.close();
  }
  await b.close();
  for(const f of ["v37_reel_1280","v37_studio_1280","v37_find_1280","v37_reel_375"]){
    fs.copyFileSync(`/tmp/${f}.png`,`preview_${f}.png`);console.log("wrote preview_"+f+".png");
  }
})().catch(e=>{console.error(e);process.exit(1)});
