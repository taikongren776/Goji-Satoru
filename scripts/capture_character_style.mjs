import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const out='output/playwright/character-style';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1000,height:1000},deviceScaleFactor:1});
const errors=[],results=[];page.on('pageerror',e=>errors.push(e.message));
try{
  await page.goto(`${process.env.BASE_URL||'http://127.0.0.1:5173'}/character-study.html`);await page.waitForFunction(()=>window.studyReady,null,{timeout:60000});
  await page.addStyleTag({content:'header,aside,footer{visibility:hidden}'});
  for(const asset of ['legacy','source','styled']){
    await mkdir(`${out}/${asset}`,{recursive:true});await page.evaluate(id=>window.characterStudy.choose(id),asset);
    await page.evaluate(()=>window.characterStudy.pose('relaxed'));
    for(const view of ['front','45','side','face','hand','hand-back','right-hand']){
      await page.evaluate(v=>{window.characterStudy.view(v);window.characterStudy.render();},view);
      await page.locator('canvas').screenshot({path:`${out}/${asset}/${view}.png`});
    }
    if(asset==='legacy')continue;
    for(const pose of ['relaxed','side90','side120','forward90','half','fist','blink']){
      await page.evaluate(p=>{window.characterStudy.pose(p);window.characterStudy.view(p==='blink'?'face':p==='half'||p==='fist'?'hand':'shoulder');window.characterStudy.render();},pose);
      await page.locator('canvas').screenshot({path:`${out}/${asset}/${pose}.png`});
      results.push(await page.evaluate(()=>window.characterStudy.inspect()));
      if(pose==='half'||pose==='fist'){
        await page.evaluate(()=>{window.characterStudy.view('right-hand');window.characterStudy.render();});await page.locator('canvas').screenshot({path:`${out}/${asset}/${pose}-right.png`});
      }
    }
  }
  // The standalone preview controls are tested without touching the production app.
  await page.evaluate(()=>document.querySelectorAll('style').forEach(s=>{if(s.textContent==='header,aside,footer{visibility:hidden}')s.remove();}));
  await page.selectOption('#asset','styled');await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('白发候选已加载'));
  await page.selectOption('#pose','relaxed');await page.selectOption('#view','45');
  await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:`${out}/interactive-preview.png`});
  await page.setViewportSize({width:430,height:900});await page.screenshot({path:`${out}/mobile.png`});
}finally{await browser.close();}
const protectedFiles=['public/models/gojo.glb','blender/gojo.blend','src/effects.ts','src/experience.ts','src/audio.ts','public/models/character-production/active.json'];
const hashes={};for(const file of protectedFiles)hashes[file]=createHash('sha256').update(await readFile(file)).digest('hex');
await writeFile(`${out}/verification.json`,JSON.stringify({errors,results,protectedFileHashes:hashes,note:'Finite vertices and static pose screenshots do not establish collision-free skinning or six-clip approval.'},null,2));
if(errors.length||results.some(r=>r.nonFinite))throw Error('Candidate render failed');
console.log(`${results.length} posed measurements; no non-finite vertices; ${errors.length} browser errors. Real screenshots saved in ${out}.`);
