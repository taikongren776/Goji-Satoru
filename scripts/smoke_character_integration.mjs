import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {parseArgs} from 'node:util';
const {values}=parseArgs({options:{candidate:{type:'string',default:'public/models/candidates/gojo-hand-fit.glb'},out:{type:'string',default:'output/milestone-a'},url:{type:'string',default:'http://127.0.0.1:5173'}}});
const out=values.out;await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});const reports=[];
try{
  for(const candidate of [false,true]){
    const page=await browser.newPage({viewport:{width:1280,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
    if(candidate)await page.route('**/models/gojo.glb',route=>route.fulfill({path:path.resolve(values.candidate),contentType:'model/gltf-binary'}));
    await page.goto(values.url);await page.waitForFunction(()=>window.__LIMITLESS__?.ready,null,{timeout:60000});
    const before=await page.evaluate(()=>window.__LIMITLESS__);assert.equal(before.clips.length,6);
    const idle=()=>page.waitForFunction(()=>!window.__LIMITLESS__.skill&&!window.__LIMITLESS__.activity,null,{timeout:45000});
    await page.keyboard.press('1');await page.waitForFunction(()=>window.__LIMITLESS__.skill==='blue');
    await page.keyboard.press('2');assert.equal(await page.evaluate(()=>window.__LIMITLESS__.skill),'blue');
    assert.equal(await page.locator('[data-id="red"]').isDisabled(),true);
    await page.keyboard.press('Escape');await idle();
    await page.locator('[data-id="red"]').click();await page.waitForFunction(()=>window.__LIMITLESS__.skill==='red');await page.keyboard.press('Escape');await idle();
    await page.locator('#eyes').click();await idle();assert.equal(await page.locator('#eyes').getAttribute('aria-pressed'),'true');
    await page.locator('#eyes').click();await idle();assert.equal(await page.locator('#eyes').getAttribute('aria-pressed'),'false');
    await page.keyboard.press('3');await page.waitForFunction(()=>window.__LIMITLESS__.skill==='purple');await idle();
    await page.locator('#settings').click();await page.locator('#quality').selectOption('low');await page.locator('#reduced').check();
    assert.equal(await page.evaluate(()=>window.__LIMITLESS__.quality),'low');assert.equal(await page.evaluate(()=>window.__LIMITLESS__.reduced),true);
    await page.keyboard.press('Escape');await page.locator('#reset-camera').click();
    await page.setViewportSize({width:900,height:700});
    await page.screenshot({path:`${out}/application-${candidate?'candidate':'baseline'}.png`});
    const afterWarmup=await page.evaluate(()=>window.__LIMITLESS__);
    // renderer.info.memory counts lazy GPU uploads, not just object allocation.
    // Compare repeated complete effects after warm-up, not first load vs first cast.
    await page.locator('[data-id="purple"]').click();await page.waitForFunction(()=>window.__LIMITLESS__.skill==='purple');await idle();
    const after=await page.evaluate(()=>window.__LIMITLESS__);assert.equal(after.ready,true);assert.equal(errors.length,0);assert.ok(after.geometries<=afterWarmup.geometries);
    reports.push({asset:candidate?values.candidate:'public/models/gojo.glb',loadedVia:candidate?'request interception; formal model unchanged':'application default',status:'PASS',checks:['load six clips','keyboard trigger','conflict rejection','disabled buttons','Esc cancel','red button','reveal/cover','purple complete','low quality','reduced motion','camera reset','resize','stable geometry count after warm-up'],before,afterWarmup,after,pageErrors:errors});
    await page.close();
  }
  const page=await browser.newPage();let failed=false;
  await page.route('**/models/gojo.glb',route=>{if(!failed){failed=true;return route.abort('failed');}return route.continue();});
  await page.goto(values.url);await page.locator('#retry').waitFor({state:'visible'});await page.locator('#retry').click();await page.waitForFunction(()=>window.__LIMITLESS__?.ready,null,{timeout:60000});
  reports.push({check:'load failure and retry',status:'PASS'});await page.close();
}finally{await writeFile(`${out}/application-smoke.json`,JSON.stringify(reports,null,2));await browser.close();}
console.log(JSON.stringify(reports.map(({asset,check,status})=>({asset,check,status})),null,2));
