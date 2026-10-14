import http from 'node:http';
import {createReadStream,existsSync} from 'node:fs';
import {stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname,resolve,relative,extname,sep} from 'node:path';
import {spawn} from 'node:child_process';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../dist');
if(!existsSync(resolve(root,'index.html'))){
  console.error('No production build found. Run npm install and npm run build first.');
  process.exit(1);
}
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.glb':'model/gltf-binary','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2'};
const server=http.createServer(async(req,res)=>{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'Allow':'GET, HEAD'}).end();return;}
  let path;
  try{
    const url=new URL(req.url,'http://127.0.0.1');
    const decoded=decodeURIComponent(url.pathname);
    if(decoded.includes('\0')||decoded.includes('\\'))throw new Error('Invalid path');
    path=resolve(root,'.'+(decoded==='/'?'/index.html':decoded));
    const rel=relative(root,path);
    if(rel==='..'||rel.startsWith('..'+sep)||resolve(path)===root)throw new Error('Invalid path');
  }catch{res.writeHead(400).end('Bad request');return;}
  try{
    const info=await stat(path);if(!info.isFile())throw new Error('Not a file');
    res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream','Content-Length':info.size,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
    if(req.method==='HEAD')res.end();else createReadStream(path).on('error',()=>res.destroy()).pipe(res);
  }catch{res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'}).end('Not found');}
});

let port=Number(process.argv.find(arg=>arg.startsWith('--port='))?.split('=')[1]||4173);
let attempts=0;
server.on('error',error=>{
  if(error.code==='EADDRINUSE'&&attempts++<9){port++;server.listen(port,'127.0.0.1');}
  else{console.error(error.message);process.exit(1);}
});
server.on('listening',()=>{
  const url=`http://127.0.0.1:${port}/`;
  console.log(`\nLIMITLESS / SATORU GOJO\n\n  ${url}\n\nKeep this window open. Press Ctrl+C to stop.\n`);
  if(process.argv.includes('--open')&&process.platform==='win32'){
    const child=spawn('cmd.exe',['/d','/c','start','',url],{windowsHide:true,stdio:'ignore'});
    child.on('error',()=>console.log('Open the URL above in your browser.'));child.unref();
  }
});
server.listen(port,'127.0.0.1');
process.on('SIGINT',()=>server.close(()=>process.exit(0)));
