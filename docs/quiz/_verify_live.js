const fs=require('fs'),crypto=require('crypto'),https=require('https');
const FILES=["index.html","sw.js","bank.js","manifest.webmanifest","apple-touch-icon.png","icon-192.png","icon-512.png","quiz/polish.js","quiz/pro.js","quiz/boost.js","quiz/aura.js","quiz/toolkit.js","quiz/notes_data.js","quiz/notes_app.js","arcade.js","edu.js","quiz/studio.js","quiz/holo.js","quiz/calc.js","quiz/ai.js","quiz/curriculum.js","quiz/atlas.js","quiz/reels.js"];
const BASE="https://merebari7-web.github.io/mamss-prep/";
const sha=b=>crypto.createHash("sha256").update(b).digest("hex");
const get=u=>new Promise((res,rej)=>{https.get(u,r=>{if(r.statusCode!==200)return rej(r.statusCode);const c=[];r.on("data",d=>c.push(d));r.on("end",()=>res(Buffer.concat(c)));}).on("error",rej);});
(async()=>{let ok=0,bad=0;
for(const f of FILES){const l=sha(fs.readFileSync(f));
try{const r=await get(BASE+f);const s=sha(r);const m=l===s?"MATCH":"MISMATCH";if(l===s)ok++;else bad++;
console.log(m.padEnd(8),f);}catch(e){bad++;console.log("FETCH ERR",f,e);}}
console.log(bad? bad+" FAIL":"ALL "+ok+"/"+FILES.length+" MATCH");process.exit(bad?1:0);})();
