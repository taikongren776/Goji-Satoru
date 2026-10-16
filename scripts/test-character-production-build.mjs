import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';

// Exercise the actual built bundle, without changing active.json on disk.
const origin='http://127.0.0.1:4175';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4175','--strictPort'],{windowsHide:true,stdio:['ignore','pipe','pipe']});
let log='';server.stdout.on('data',b=>log+=b);server.stderr.on('data',b=>log+=b);
let browser;
try{
  let ready=false;
  for(let i=0;i<100;i++){
    if(server.exitCode!==null)throw new Error(`Preview exited: ${log}`);
    try{ready=(await fetch(origin)).ok;}catch{}
    if(ready)break;
    await new Promise(r=>setTimeout(r,100));
  }
  assert.ok(ready,'Preview did not start');
  browser=await chromium.launch({channel:'msedge',headless:true});
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${origin}/?character=/models/character-production/fixtures/gojo-final.json`);
  await page.waitForFunction(()=>window.__LIMITLESS__?.ready);
  assert.equal(await page.evaluate(()=>window.__LIMITLESS__.character.id),'legacy-display-not-art-approved');
  const fixture=JSON.parse(await readFile('public/models/character-production/fixtures/gojo-final.json','utf8'));
  const active=url=>url.pathname==='/models/character-production/active.json';
  await page.route(active,r=>r.fulfill({json:fixture}));await page.reload();
  await page.locator('#retry').waitFor({state:'visible'});
  assert.equal(await page.evaluate(()=>window.__LIMITLESS__?.ready),false);
  await page.unroute(active);await page.locator('#retry').click();
  await page.waitForFunction(()=>window.__LIMITLESS__?.ready);
  assert.deepEqual(errors,[]);
  const result={status:'PASS',developmentQueryIgnored:true,integrationManifestRejected:true,retryRecovered:true,errors};
  await mkdir('output/milestone-a4',{recursive:true});
  await writeFile('output/milestone-a4/production-build-smoke.json',JSON.stringify(result,null,2));
  console.log(JSON.stringify(result,null,2));
}finally{await browser?.close();server.kill();}
