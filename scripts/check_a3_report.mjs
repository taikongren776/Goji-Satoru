import {chromium} from 'playwright';
import {readFile,writeFile,access} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('output/milestone-a3');
const html=await readFile(path.join(root,'report.html'),'utf8');
const images=[...html.matchAll(/<img[^>]+src="([^"]+)"/g)].map(m=>m[1]);
for(const src of images)await access(path.join(root,src));
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
  const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5173/output/milestone-a3/report.html');
  // Force all images to load so lazy-loading cannot hide a broken evidence link.
  const imageResults=await page.evaluate(async()=>{
    const images=[...document.images];images.forEach(i=>i.loading='eager');
    return Promise.all(images.map(async i=>{try{await i.decode();return {src:i.getAttribute('src'),ok:i.naturalWidth>0};}catch{return {src:i.getAttribute('src'),ok:false};}}));
  });
  await page.screenshot({path:path.join(root,'report-preview.png')});
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
  const result={images:images.length,missing:imageResults.filter(i=>!i.ok),overflow,errors,status:!overflow&&!errors.length&&imageResults.every(i=>i.ok)?'PASS':'FAIL'};
  await writeFile(path.join(root,'report-check.json'),JSON.stringify(result,null,2));console.log(result);
  if(result.status!=='PASS')process.exitCode=2;
}finally{await browser.close();}
