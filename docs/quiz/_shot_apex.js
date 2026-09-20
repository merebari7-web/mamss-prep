const puppeteer=require("puppeteer");const path=require("path");
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const b=await puppeteer.launch({headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
 const p=await b.newPage();
 await p.setViewport({width:1280,height:800});
 await p.goto("file://"+path.resolve("index.html"),{waitUntil:"load"});
 await p.waitForFunction(()=>typeof CLASSES!=="undefined",{timeout:20000}).catch(()=>{});
 await p.waitForFunction(()=>document.getElementById("apexBtn")!==null,{timeout:15000}).catch(()=>{});
 await p.evaluate(()=>{
   const now=Date.now(),day=864e5;
   localStorage.setItem("nssc_attempts_guest",JSON.stringify([
     {subj:"Mathematics",pct:60,correct:6,tms:now},{subj:"Physics",pct:100,correct:10,tms:now-day},
     {subj:"Chemistry",pct:0,correct:0,tms:now-2*day},{subj:"Biology",pct:40,correct:4,tms:now-3*day},
     {subj:"English Studies",pct:70,correct:7,tms:now-4*day},{subj:"Economics",pct:10,correct:1,tms:now-5*day}]));
 });
 await p.reload({waitUntil:"load"});
 await p.waitForFunction(()=>typeof CLASSES!=="undefined",{timeout:20000}).catch(()=>{});
 await sleep(800);
 await p.evaluate(()=>{
   const n=document.getElementById("gateName"),e=document.getElementById("gateEmail");
   if(n&&e){n.value="Amina Apex";e.value="amina.apex@test.ng";gateSignUp();}
 });
 await sleep(1800);
 await p.waitForFunction(()=>document.getElementById("apexBtn")!==null,{timeout:15000}).catch(()=>{});
 await sleep(600);
 await p.evaluate(()=>window.scrollTo(0,1400));
 await sleep(500);
 await p.evaluate(()=>window.scrollTo(0,300));
 await sleep(600);
 await p.screenshot({path:"/tmp/v28_dock.png"});
 await p.evaluate(()=>document.getElementById("apexBtn").click());
 await sleep(900);
 const st=await p.evaluate(()=>({ov:!!document.getElementById("apexOv"),hidden:document.getElementById("apexOv")?document.getElementById("apexOv").classList.contains("hidden"):null,cards:document.querySelectorAll("#apexOv .tro-card").length}));
 console.log("apex state:",JSON.stringify(st));
 await p.screenshot({path:"/tmp/v28_trophies.png"});
 await p.evaluate(()=>{document.querySelectorAll("#apexOv .apex-tab")[1].click();});
 await sleep(500);
 await p.screenshot({path:"/tmp/v28_plan.png"});
 await p.evaluate(()=>{const chk=document.querySelector("#apexOv .pl-chk");if(chk)chk.click();});
 await sleep(400);
 await p.evaluate(()=>window.scrollTo(0,300));
 await p.screenshot({path:"/tmp/v28_home_paper.png"});
 // mobile
 await p.setViewport({width:375,height:700});
 await p.evaluate(()=>{document.getElementById("apexX").click();});
 await sleep(400);
 await p.screenshot({path:"/tmp/v28_mob_home.png"});
 await p.evaluate(()=>document.getElementById("apexBtn").click());
 await sleep(500);
 await p.screenshot({path:"/tmp/v28_mob_trophies.png"});
 await b.close();console.log("done");
})().catch(e=>{console.error(e);process.exit(1)});
