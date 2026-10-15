import {readFile,access,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
const root=path.resolve('output/milestone-a2');const html=await readFile(path.join(root,'report.html'),'utf8');
const images=[...html.matchAll(/<img[^>]+src="([^"]+)"/g)].map(x=>x[1]);
for(const src of images){const file=path.resolve(root,src);if(!file.startsWith(root+path.sep))throw new Error('Image outside report directory');await access(file);}
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5173/output/milestone-a2/report.html');
  await page.screenshot({path:path.join(root,'report-preview.png')});
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
  const result={image_links_checked:images.length,errors,horizontal_overflow:overflow,status:errors.length||overflow?'FAIL':'PASS'};
  await writeFile(path.join(root,'report-check.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
  if(result.status!=='PASS')process.exitCode=2;
}finally{await browser.close();}
