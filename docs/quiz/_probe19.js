const puppeteer=require("puppeteer");const path=require("path");
const VPS=[
 {n:"fold-280",w:280,h:653},{n:"iphone5-320",w:320,h:568},{n:"and-360",w:360,h:640},
 {n:"land-667",w:667,h:375},{n:"land-844",w:844,h:390},{n:"ipad-768",w:768,h:1024},
 {n:"laptop-1280",w:1280,h:800},{n:"ultra-2560",w:2560,h:1440}];
function audit(){
  const dw=document.documentElement;const out=[];
  if(dw.scrollWidth-dw.clientWidth>1) out.push("PAGE+ "+(dw.scrollWidth-dw.clientWidth)+"px");
  const intentional=el=>{const cs=getComputedStyle(el);return /auto|scroll/.test(cs.overflowX)&&el.scrollWidth<=Math.max(window.innerWidth*1.6,700)};
  const decor=el=>el.closest("#aurora,#heroSun,#heroFx,#confetti,#curtain,.blob,.rays,.facade,.watermark,#readBar,.cube-scene,.hero3d,.h-ring,.h-orb,.hero-deco,svg,.laurel")||/^I$/.test(el.tagName);
  const inScroller=el=>{for(let p=el;p&&p!==document.body;p=p.parentElement){if(intentional(p))return true}return false};
  document.querySelectorAll("body *").forEach(el=>{
    if(intentional(el)||inScroller(el)||decor(el))return;
    const cs=getComputedStyle(el);
    if(cs.display==="none"||cs.visibility==="hidden")return;
    const r=el.getBoundingClientRect();
    if(r.width===0||r.height===0)return;
    if(r.right>innerWidth+2&&r.left<innerWidth) out.push("OFF "+(el.id||el.className||el.tagName).toString().slice(0,26)+" r="+Math.round(r.right));
    if(r.left<-2&&r.right>0) out.push("OFFL "+(el.id||el.className).toString().slice(0,26));
    if(/hidden/.test(cs.overflowX)&&el.scrollWidth>el.clientWidth+2&&!el.classList.contains("hero")) out.push("CLIP "+(el.id||el.className||el.tagName).toString().slice(0,26)+" +"+(el.scrollWidth-el.clientWidth)+"px");
    if(el.children.length===0&&el.scrollHeight>el.clientHeight+4&&/hidden/.test(cs.overflowY)) out.push("TXT "+(el.id||el.className).toString().slice(0,24));
  });
  if(innerWidth<=800){
    const tiny=[];
    document.querySelectorAll("button,a,[role=button],.tab,.chip,.opt,.mp,.hd-btn,.edu-btn,.arc-btn").forEach(el=>{
      const r=el.getBoundingClientRect();
      if(r.width===0||r.height===0)return;
      if(r.height<36&&r.width<36)tiny.push("#"+(el.id||String(el.className).split(" ")[0])+" "+Math.round(r.width)+"x"+Math.round(r.height));
    });
    if(tiny.length)out.push("TINY["+tiny.slice(0,8).join(",")+"]x"+tiny.length);
  }
  return out;
}
(async()=>{
 const b=await puppeteer.launch({headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
 for(const vp of VPS){
  const p=await b.newPage();
  await p.setViewport({width:vp.w,height:vp.h,isMobile:vp.w<=800,hasTouch:vp.w<=800});
  await p.goto("file://"+path.resolve("index.html"),{waitUntil:"load"});
  await p.waitForFunction(()=>typeof CLASSES!=="undefined"||!!window.QUIZ_ERR,{timeout:20000}).catch(()=>{});
  await p.evaluate(()=>{const n=document.getElementById("gateName"),e=document.getElementById("gateEmail");if(n)n.value="A B";if(e)e.value="a@b.c";gateSignUp();});
  await new Promise(r=>setTimeout(r,600));
  const states={};
  states.home=await p.evaluate(audit);
  await p.evaluate(()=>{try{window.aiIdeas=function(){return[{ico:"🎯",txt:"Mock exam is due today",sub:"English Language · 100 questions · 45 minutes · SS3",why:"because your last English paper was 12 days ago and 3 weak topics appear",btn:"Sit paper",fn:"void 0"},{ico:"📖",txt:"Revise weakest topic",sub:"Physics · Waves combined with a long subtitle",why:"because 60% of misses land in this group",btn:"Drill",fn:"void 0"}];};AI.rot=0;renderAi();}catch(e){}});
  states.coach=await p.evaluate(audit);
  await p.evaluate(()=>{try{window.arc("open")}catch(e){}});
  await new Promise(r=>setTimeout(r,1300));
  states.arcHome=await p.evaluate(audit);
  await p.evaluate(()=>{try{ARC.go("utme");ARC.utmeStart({subjects:["English Language","Mathematics","Physics","Chemistry"]})}catch(e){}});
  await new Promise(r=>setTimeout(r,500));
  states.utmeQ=await p.evaluate(audit);
  await p.evaluate(()=>{try{ARC.close()}catch(e){}});
  await p.evaluate(()=>{try{window.edu("notes")}catch(e){}});
  await new Promise(r=>setTimeout(r,1100));
  states.eduNotes=await p.evaluate(audit);
  await p.evaluate(()=>{try{EDU.go("syllabus")}catch(e){}});
  await new Promise(r=>setTimeout(r,700));
  states.eduSyl=await p.evaluate(audit);
  await p.evaluate(()=>{try{EDU.close()}catch(e){}});
  await p.evaluate(()=>{try{window.labs("focus")}catch(e){}});
  await new Promise(r=>setTimeout(r,1200));
  states.labsFocus=await p.evaluate(audit);
  await p.evaluate(()=>{try{LX.close()}catch(e){}});
  const line=Object.entries(states).filter(([k,v])=>v.length).map(([k,v])=>k+":["+v.join(";").slice(0,110)+"]").join(" ");
  console.log(vp.n.padEnd(12), line?line:"ALL CLEAN");
  await p.close();
 }
 await b.close();
})().catch(e=>{console.error("crash",e);process.exit(1)});
