/** Real Chromium/Three.js screenshots, not generated illustrations. Run against Vite dev. */
import { chromium } from 'playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
const {values}=parseArgs({options:{url:{type:'string',default:'http://127.0.0.1:5173'},assets:{type:'string',default:'output/milestone-a/baseline-web'},out:{type:'string',default:'output/milestone-a/browser-baseline'},channel:{type:'string',default:'msedge'},model:{type:'string'}}});
const manifest=JSON.parse(await readFile(path.join(values.assets,'manifest.json'),'utf8'));
await mkdir(values.out,{recursive:true});
const browser=await chromium.launch({channel:values.channel,headless:true});
const page=await browser.newPage({viewport:{width:manifest.size,height:manifest.size},deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
  const target=new URL('/character-audit.html',values.url);target.searchParams.set('assets','/'+values.assets.replaceAll('\\','/'));
  if(values.model)target.searchParams.set('model',values.model);
  await page.goto(target.href);await page.waitForFunction(()=>window.characterAudit?.ready||window.characterAudit?.error,{},{timeout:60000});
  const error=await page.evaluate(()=>window.characterAudit?.error);if(error)throw new Error(error);
  const results=[];
  for(const pose of manifest.poses){
    if(values.model&&!pose.source_clip&&pose.id!=='rest')continue;
    results.push(await page.evaluate(id=>window.characterAudit.show(id),pose.id));
    await page.locator('canvas').screenshot({path:path.join(values.out,`${pose.id}.png`)});
  }
  await writeFile(path.join(values.out,'parity.json'),JSON.stringify({source:manifest.source,sha256:manifest.sha256,browser:browser.version(),errors,results},null,2));
  const failed=results.filter(r=>r.status==='FAIL');console.log(JSON.stringify({captures:results.length,parityFailures:failed.length,errors},null,2));
  if(failed.length||errors.length)process.exitCode=2;
}finally{await browser.close();}
