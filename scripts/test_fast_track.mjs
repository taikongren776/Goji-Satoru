import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.env.LIMITLESS_TEST_OUTPUT||'output/playwright/fast-track/regression';await mkdir(out,{recursive:true});
const testUrl=process.env.LIMITLESS_TEST_URL||'http://127.0.0.1:5173/';
const browser=await chromium.launch({channel:'msedge',headless:true});const results=[];
try{
 const page=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(testUrl);await page.waitForFunction(()=>window.__LIMITLESS__?.ready,null,{timeout:60000});
 const snapshot=()=>page.evaluate(()=>window.__LIMITLESS__);
 const idle=()=>page.waitForFunction(()=>!window.__LIMITLESS__.skill&&!window.__LIMITLESS__.activity,null,{timeout:30000});
 const resetOK=async()=>{const d=await snapshot();assert.equal(d.effects.active,false);assert.equal(d.effects.warp,0);assert.ok(d.effects.lights.every(x=>x===0));assert.ok(Object.values(d.effects.layers).every(x=>x===false));return d;};
 // Warm up every layer; repeat every complete skill to check resource stability.
 for(let cycle=0;cycle<2;cycle++)for(const id of ['blue','red','purple']){
   const home=await snapshot();await page.locator(`[data-id="${id}"]`).click();
   await page.waitForFunction(id=>window.__LIMITLESS__.skill===id,id);
   await page.keyboard.press(id==='blue'?'2':'1');assert.equal((await snapshot()).skill,id);
   await page.waitForFunction(()=>window.__LIMITLESS__.time>.8);
   const during=await snapshot();assert.equal(during.effects.active,true);
   await idle();const after=await resetOK();
   for(let i=0;i<3;i++)assert.ok(Math.abs(after.camera[i]-home.camera[i])<.002);
   results.push({cycle,id,during,after});
 }
 const warmed=results.filter(x=>x.cycle===1).map(x=>x.after);assert.ok(warmed.every(x=>x.geometries===warmed[0].geometries&&x.textures===warmed[0].textures));
 for(const key of ['1','2','3']){await page.keyboard.press(key);await page.waitForFunction(()=>window.__LIMITLESS__.time>.6);await page.keyboard.press('Escape');await idle();await resetOK();}
 await page.locator('#eyes').click();await idle();assert.equal((await snapshot()).eyesVisible,true);await page.locator('#eyes').click();await idle();assert.equal((await snapshot()).eyesVisible,false);
 await page.locator('#settings').click();await page.locator('#quality').selectOption('low');await page.locator('#reduced').check();await page.keyboard.press('Escape');
 await page.locator('[data-id="purple"]').click();await page.waitForFunction(()=>window.__LIMITLESS__.time>4.85);const low=await snapshot();assert.equal(low.effects.warp,0);assert.equal(low.effects.particleBudget,90);await page.screenshot({path:`${out}/low-reduced.png`});await page.keyboard.press('Escape');await idle();await resetOK();
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:`${out}/mobile.png`});await page.locator('[data-id="red"]').click();await page.waitForFunction(()=>window.__LIMITLESS__.skill==='red');await page.keyboard.press('Escape');await idle();
 results.push({checks:['complete all three twice','competing trigger rejected','camera restored','all layers/lights/warp reset','stable warmed geometry/texture count','cancel all three','reveal/cover','low quality','reduced motion','mobile viewport/button'],low,errors});assert.equal(errors.length,0);
 await page.close();
 // Separate, actual touch-enabled context.
 const mobile=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});await mobile.goto(testUrl);await mobile.waitForFunction(()=>window.__LIMITLESS__?.ready,null,{timeout:60000});await mobile.locator('[data-id="blue"]').tap();await mobile.waitForFunction(()=>window.__LIMITLESS__.skill==='blue');await mobile.locator('#cancel').tap();await mobile.waitForFunction(()=>!window.__LIMITLESS__.skill&&!window.__LIMITLESS__.activity);results.push({touch:'PASS'});await mobile.close();
 const retry=await browser.newPage();let fail=true;await retry.route(process.env.LIMITLESS_TEST_ASSET_ROUTE||'**/models/gojo.glb',r=>{if(fail){fail=false;return r.abort('failed');}return r.continue();});await retry.goto(testUrl);await retry.locator('#retry').waitFor({state:'visible'});await retry.locator('#retry').click();await retry.waitForFunction(()=>window.__LIMITLESS__?.ready,null,{timeout:60000});results.push({retry:'PASS'});await retry.close();
}finally{await writeFile(`${out}/results.json`,JSON.stringify(results,null,2));await browser.close();}
console.log('PASS: full skills, reset, resource stability, controls, reduced/low, resize, touch, retry');
