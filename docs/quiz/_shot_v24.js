const puppeteer=require("puppeteer");const path=require("path");
(async()=>{
 const b=await puppeteer.launch({headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
 const p=await b.newPage();
 await p.setViewport({width:1280,height:800});
 await p.goto("file://"+path.resolve("index.html"),{waitUntil:"load"});
 await p.waitForFunction(()=>typeof CLASSES!=="undefined",{timeout:20000}).catch(()=>{});
 await new Promise(r=>setTimeout(r,700));
 await p.evaluate(()=>{document.getElementById("gateName").value="Ada Okafor";document.getElementById("gateEmail").value="ada@test.ng";gateSignUp();});
 await new Promise(r=>setTimeout(r,1600));
 // hero close-up (top)
 await p.screenshot({path:"/tmp/v24_home.png"});
 // mid: stats + coach
 await p.evaluate(()=>window.scrollTo(0,560));
 await new Promise(r=>setTimeout(r,600));
 await p.screenshot({path:"/tmp/v24_mid.png"});
 // mobile
 await p.setViewport({width:375,height:667});
 await p.evaluate(()=>window.scrollTo(0,0));
 await new Promise(r=>setTimeout(r,600));
 await p.screenshot({path:"/tmp/v24_mob.png"});
 await b.close();console.log("done");
})().catch(e=>{console.error(e);process.exit(1)});
