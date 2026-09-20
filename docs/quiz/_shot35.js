const fs=require("fs"),puppeteer=require("puppeteer");
(async()=>{
  const b=await puppeteer.launch({headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
  for(const v of [{w:1280,h:860},{w:375,h:740}]){
    const p=await b.newPage();
    await p.setViewport({width:v.w,height:v.h});
    await p.goto("file://"+process.cwd()+"/index.html",{waitUntil:"load"});
    await p.waitForFunction(()=>typeof CLASSES!=="undefined",{timeout:20000}).catch(()=>{});
    await p.waitForFunction(()=>window.__curicApi&&window.__holo,{timeout:25000}).catch(()=>{});
    await new Promise(r=>setTimeout(r,600));
    try{await p.evaluate(()=>{const g=document.getElementById("guestName");if(g)g.value="Ada";if(typeof signUpGuest==="function")signUpGuest();});}catch(e){}
    await new Promise(r=>setTimeout(r,400));
    await p.screenshot({path:`/tmp/v35_hero_${v.w}.png`}).catch(()=>{});
    // holo scenes
    await p.evaluate(()=>{window.__holo.open("mol");});
    await new Promise(r=>setTimeout(r,400));
    const pick=async(name)=>{
      await p.evaluate(n=>{Array.prototype.forEach.call(document.querySelectorAll("#hoChips .ho-chip"),(c,i)=>{if(c.textContent.indexOf(n)>=0)c.click();});},name);
      await new Promise(r=>setTimeout(r,900));
    };
    await pick("Ethanol");
    await p.screenshot({path:`/tmp/v35_ethanol_${v.w}.png`}).catch(()=>{});
    await pick("Sodium chloride");
    await p.screenshot({path:`/tmp/v35_nacl_${v.w}.png`}).catch(()=>{});
    await p.evaluate(()=>{Array.prototype.forEach.call(document.querySelectorAll(".ho-tab"),t=>{if(t.getAttribute("data-t")==="surf")t.click();});});
    await new Promise(r=>setTimeout(r,350));
    await pick("Twin Peaks");
    await p.screenshot({path:`/tmp/v35_peaks_${v.w}.png`}).catch(()=>{});
    // orbits + tap info
    await p.evaluate(()=>{Array.prototype.forEach.call(document.querySelectorAll(".ho-tab"),t=>{if(t.getAttribute("data-t")==="orb")t.click();});});
    await new Promise(r=>setTimeout(r,500));
    await p.evaluate(()=>{window.__hoInfo("Saturn");});
    await new Promise(r=>setTimeout(r,300));
    await p.screenshot({path:`/tmp/v35_orbits_${v.w}.png`}).catch(()=>{});
    await p.evaluate(()=>{window.__holo.close();});
    await p.close();
  }
  await b.close();
  for(const f of ["v35_hero_1280","v35_hero_375","v35_ethanol_1280","v35_nacl_1280","v35_peaks_1280","v35_orbits_1280"]){
    fs.copyFileSync(`/tmp/${f}.png`,`preview_${f}.png`);console.log("wrote preview_"+f+".png");
  }
})().catch(e=>{console.error(e);process.exit(1)});
