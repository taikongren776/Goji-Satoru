// Read-only vendor evidence. No checkout, account login or asset download.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='output/playwright/milestone-a5';await mkdir(out,{recursive:true});
const pages=[
 ['polyone-product','https://superhivemarket.com/products/base-mesh---stylized-male'],
 ['polyone-license','https://superhivemarket.com/page/creative-commons-license'],
 ['polyone-cover','https://assets.superhivemarket.com/store/product/240919/image/thumb-ad5ec63a219e8160bd11f14ae27ed7d6.jpg'],
 ['polyone-view1','https://assets.superhivemarket.com/store/productimage/1176239/image/thumb-d195b8596f15a69256003137421bf17e.jpg'],
 ['polyone-view2','https://assets.superhivemarket.com/store/productimage/1176238/image/thumb-b2156b3b65d3c4ba2c4b93b3566ba1f7.jpg'],
 ['polyone-view3','https://assets.superhivemarket.com/store/productimage/1176246/image/thumb-b5c8d7e77b2378c622a24f1377e00e35.jpg'],
 ['polyone-view4','https://assets.superhivemarket.com/store/productimage/1176249/image/thumb-9811bacea22e05fd0553b93e42346ac0.jpg'],
 ['cc-base','https://www.reallusion.com/character-creator/free-3d-character-base.html'],
 ['cc-hands','https://www.reallusion.com/character-creator/includes/images/base/cc3-base-plus-topology-hands.jpg'],
 ['cc-poses','https://www.reallusion.com/character-creator/includes/images/base/cc3-base-plus-skin-rigging-improvement-poses.jpg'],
];
const browser=await chromium.launch({channel:'msedge',headless:true}),results=[];
try{for(const [name,url] of pages){
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 try{
  const response=await page.goto(url,{waitUntil:'load',timeout:30000});
  if(name==='polyone-product'){
   const gallery=await page.locator('img').evaluateAll(xs=>[...new Set(xs.map(i=>i.src).filter(s=>s.includes('/productimage/')&&s.includes('/xlarge-')))]);
   for(const [i,src] of gallery.entries())pages.push([`polyone-gallery-${i+1}`,src]);
  }
  await page.screenshot({path:`${out}/${name}.png`,fullPage:!url.endsWith('.jpg')});
  const text=await page.locator('body').innerText();
  await writeFile(`${out}/${name}.txt`,text);
  results.push({name,url,status:response?.status(),title:await page.title(),images:await page.locator('img').evaluateAll(imgs=>imgs.map(i=>({src:i.currentSrc,width:i.naturalWidth,height:i.naturalHeight})))});
 }catch(e){results.push({name,url,error:String(e)});}finally{await page.close();}
 console.log(name,results.at(-1).status??results.at(-1).error);
}}finally{await browser.close();await writeFile(`${out}/sources.json`,JSON.stringify(results,null,2));}
