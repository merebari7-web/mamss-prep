/* Static server that mimics GitHub Pages: gzip/brotli, max-age=600, correct MIME. */
const http=require('http'),https=require('https'),fs=require('fs'),path=require('path'),zlib=require('zlib');
const ROOT=process.argv[2], PORT=+(process.argv[3]||8100);
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8',
'.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json; charset=utf-8','.png':'image/png',
'.jpg':'image/jpeg','.svg':'image/svg+xml','.zip':'application/zip','.xml':'application/xml; charset=utf-8','.txt':'text/plain; charset=utf-8','.ico':'image/x-icon'};
/* no in-memory caching: a rebuild must be visible on the next request */
function get(p){ try{ return fs.readFileSync(p);}catch(err){ return null; } }
const KEY=process.env.TLS_KEY, CRT=process.env.TLS_CERT;
const server=(KEY&&CRT)?https.createServer({key:fs.readFileSync(KEY),cert:fs.readFileSync(CRT)},handler):http.createServer(handler);
function handler(req,res){
  let u=decodeURIComponent(req.url.split('?')[0]); if(u.endsWith('/'))u+='index.html';
  const fp=path.join(ROOT,path.normalize(u));
  if(!fp.startsWith(ROOT)){res.writeHead(403);return res.end('403');}
  let file=fp;
  if(!fs.existsSync(file)||fs.statSync(file).isDirectory()) file=path.join(fp,'index.html');
  const buf=get(file);
  if(!buf){res.writeHead(404,{'Content-Type':'text/plain'});return res.end('404 '+u);}
  const ext=path.extname(file).toLowerCase();
  const ae=req.headers['accept-encoding']||'';
  let body=buf, enc='';
  if(buf.length>1024 && /\bbr\b/.test(ae)){body=zlib.brotliCompressSync(buf,{params:{[zlib.constants.BROTLI_PARAM_QUALITY]:6}});enc='br';}
  else if(buf.length>1024 && /\bgzip\b/.test(ae)){body=zlib.gzipSync(buf,{level:6});enc='gzip';}
  const h={'Content-Type':MIME[ext]||'application/octet-stream','Content-Length':body.length,'Cache-Control':'max-age=600','Access-Control-Allow-Origin':'*','Service-Worker-Allowed':'/'};
  if(enc)h['Content-Encoding']=enc, h['Vary']='Accept-Encoding';
  res.writeHead(200,h); res.end(req.method==='HEAD'?undefined:body);
  if(process.env.REQ_LOG){ try{ fs.appendFileSync(process.env.REQ_LOG,
    Date.now()+'\t'+body.length+'\t'+(enc||'-')+'\t'+u+'\n'); }catch(e){} }
}
server.listen(PORT,'0.0.0.0',()=>console.log('serving '+ROOT+' on '+((KEY&&CRT)?'https':'http')+'://0.0.0.0:'+PORT));
