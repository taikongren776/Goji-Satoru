import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {parseArgs} from 'node:util';
const {values}=parseArgs({options:{label:{type:'string',default:'after'},url:{type:'string',default:'http://127.0.0.1:5173/'}}});
const out=`output/playwright/fast-track/${values.label}`;await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});const results=[];
try{
  for(const [name,key,time] of [['idle',null,0],['blue','1',2.05],['red','2',1.58],['purple-fusion','3',3.95],['purple-release','3',4.95]]){
    const page=await browser.newPage({viewport:{width:1920,height:1080}});const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await page.addInitScript(({time})=>{
      const raf=window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame=callback=>raf(stamp=>{
        if(window.__captureArmed&&window.__LIMITLESS__?.time>=time){window.__captureFrozen=true;return;}
        callback(stamp);
      });
    },{time});
    await page.goto(values.url);await page.waitForFunction(()=>window.__LIMITLESS__?.ready,null,{timeout:60000});
    if(key){await page.evaluate(()=>window.__captureArmed=true);await page.keyboard.press(key);await page.waitForFunction(()=>window.__captureFrozen,null,{timeout:60000,polling:100});}
    else await page.waitForTimeout(500);
    await page.screenshot({path:`${out}/${name}.png`});
    results.push({name,requestedTime:time,diagnostics:await page.evaluate(()=>window.__LIMITLESS__),errors});await page.close();
  }
}finally{await browser.close();await writeFile(`${out}/capture.json`,JSON.stringify(results,null,2));}
if(results.some(x=>x.errors.length))process.exitCode=1;
console.log(results.map(x=>({name:x.name,time:x.diagnostics.time,fps:x.diagnostics.fps,errors:x.errors})));
