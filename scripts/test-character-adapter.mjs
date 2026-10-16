import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const out='output/playwright/milestone-a4';await mkdir(out,{recursive:true});
const origin='http://127.0.0.1:5173';
const browser=await chromium.launch({channel:'msedge',headless:true});
const rows=[],errors=[];const durations={Idle:4,CastBlue:5,CastRed:4,CastPurple:8,RevealEyes:2.4,CoverEyes:2.4};
try{
  const pages=[];
  for(const file of ['original-reference','gojo-final']){
    const page=await browser.newPage({viewport:{width:800,height:800}});page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`${origin}/character-adapter-audit.html?manifest=/models/character-production/fixtures/${file}.json`);
    await page.waitForFunction(()=>window.adapterAudit?.ready||window.adapterAudit?.error);
    assert.equal(await page.evaluate(()=>window.adapterAudit.error),undefined);pages.push(page);
  }
  for(const [name,duration] of Object.entries(durations)){
    for(const t of [0,duration*.5,duration]){
      const results=await Promise.all(pages.map(p=>p.evaluate(({name,t})=>window.adapterAudit.show(name,t),{name,t})));
      const [reference,candidate]=results;let error=0;
      for(const key of ['FX_Hand_L','FX_Hand_R','FX_Center']){
        assert.ok(candidate.sockets[key].every(Number.isFinite));error=Math.max(error,Math.hypot(...candidate.sockets[key].map((v,i)=>v-reference.sockets[key][i])));
      }
      assert.ok(error<.00001,`socket parity ${name} ${t}: ${error}`);assert.equal(candidate.animation,name);assert.equal(candidate.materialsPreserved,true);
      assert.equal(candidate.logicalClips.length,6);rows.push({name,time:t,socketErrorMeters:error,state:candidate});
      if(t===duration*.5)await pages[1].locator('canvas').screenshot({path:`${out}/${name}.png`});
    }
  }
  for(const visible of [false,true]){
    const state=await pages[1].evaluate(v=>window.adapterAudit.show('Idle',0,v),visible);assert.equal(state.eyesVisible,visible);assert.equal(state.blindfold,visible?'uncovered':'covered');
  }
  const page=await browser.newPage({viewport:{width:1280,height:900}});page.on('pageerror',e=>errors.push(e.message));
  const preview=`${origin}/?character=/models/character-production/fixtures/gojo-final.json`;
  await page.goto(preview);await page.waitForFunction(()=>window.__LIMITLESS__?.ready);
  assert.equal(await page.evaluate(()=>window.__LIMITLESS__.character.id),'a4-renamed-candidate-not-art-approved');
  const idle=()=>page.waitForFunction(()=>!window.__LIMITLESS__.skill&&!window.__LIMITLESS__.activity,null,{timeout:30000});
  for(const [key,id,clip] of [['1','blue','CastBlue'],['2','red','CastRed'],['3','purple','CastPurple']]){
    await page.keyboard.press(key);await page.waitForFunction(id=>window.__LIMITLESS__.skill===id,id);
    assert.equal(await page.evaluate(()=>window.__LIMITLESS__.character.animation),clip);
    await page.keyboard.press(key==='1'?'2':'1');assert.equal(await page.evaluate(()=>window.__LIMITLESS__.skill),id);
    await idle();assert.equal(await page.evaluate(()=>window.__LIMITLESS__.character.animation),'Idle');
  }
  await page.keyboard.press('2');await page.waitForFunction(()=>window.__LIMITLESS__.skill==='red');await page.keyboard.press('Escape');await idle();
  for(const visible of [true,false]){await page.locator('#eyes').click();await idle();assert.equal(await page.locator('#eyes').getAttribute('aria-pressed'),String(visible));}
  await page.locator('#eyes').click();await page.waitForFunction(()=>window.__LIMITLESS__.activity==='RevealEyes');await page.keyboard.press('Escape');await idle();assert.equal(await page.locator('#eyes').getAttribute('aria-pressed'),'false');
  await page.screenshot({path:`${out}/limitless-adapter-preview.png`});
  // A malformed mapping must block readiness and leave retry functional.
  const broken=JSON.parse(await readFile('public/models/character-production/fixtures/gojo-final.json','utf8'));broken.nodes.FX_Hand_R.node='NO_SUCH_BONE';
  const manifestRequest=url=>url.pathname==='/models/character-production/fixtures/gojo-final.json';
  await page.route(manifestRequest,r=>r.fulfill({json:broken}));await page.reload();
  await page.locator('#retry').waitFor({state:'visible'});assert.equal(await page.evaluate(()=>window.__LIMITLESS__?.ready),false);
  await page.unroute(manifestRequest);await page.locator('#retry').click();await page.waitForFunction(()=>window.__LIMITLESS__?.ready);
  const unreviewed=JSON.parse(await readFile('public/models/character-production/fixtures/gojo-final.json','utf8'));unreviewed.usage='production';unreviewed.review='denied-review.json';
  await page.route(manifestRequest,r=>r.fulfill({json:unreviewed}));
  await page.route(url=>url.pathname.endsWith('/denied-review.json'),r=>r.fulfill({json:{status:'NOT_REVIEWED'}}));
  await page.reload();await page.locator('#retry').waitFor({state:'visible'});assert.equal(await page.evaluate(()=>window.__LIMITLESS__?.ready),false);
  await page.unroute(manifestRequest);await page.locator('#retry').click();await page.waitForFunction(()=>window.__LIMITLESS__?.ready);
  assert.deepEqual(errors,[]);
  const result={status:'PASS',scope:'Renamed metadata fixture, six logical animations, sockets, cover state, actual LIMITLESS interaction; not art acceptance.',samples:rows.length,maxSocketErrorMeters:Math.max(...rows.map(r=>r.socketErrorMeters)),fullSkills:['blue','red','purple'],cancellation:true,duplicateTriggerBlocked:true,missingNodeRetry:true,unreviewedProductionRejected:true,errors,rows};
  await writeFile(`${out}/adapter-results.json`,JSON.stringify(result,null,2));console.log(JSON.stringify({...result,rows:undefined},null,2));
}finally{await browser.close();}
