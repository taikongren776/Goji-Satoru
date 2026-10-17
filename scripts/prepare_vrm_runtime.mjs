import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {readVrm,appendBytes,writeVrm} from './vrm-binary.mjs';
const out='output/playwright/vrm-integration';await mkdir(out,{recursive:true});
await writeFile(`${out}/bake.html`,'<!doctype html><script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js"}}</script><script type="module">import {bake} from "/scripts/vrm-animation-bake.js";window.bake=bake;</script>');
const browser=await chromium.launch({channel:'msedge',headless:true});let baked;
try{const page=await browser.newPage();await page.goto(`http://127.0.0.1:5173/${out}/bake.html`);await page.waitForFunction(()=>window.bake);baked=await page.evaluate(()=>window.bake());}finally{await browser.close();}
const asset=await readVrm('public/models/candidates/limitless-whitehair-study.vrm'),j=asset.json;
function floats(values,type){const data=new Float32Array(values),width={SCALAR:1,VEC3:3,VEC4:4}[type],id=j.accessors.length;const a={bufferView:appendBytes(asset,Buffer.from(data.buffer)),componentType:5126,type,count:values.length/width};if(type==='SCALAR'){a.min=[Math.min(...values)];a.max=[Math.max(...values)];}if(type==='VEC3'){a.min=[0,1,2].map(k=>Math.min(...values.filter((_,i)=>i%3===k)));a.max=[0,1,2].map(k=>Math.max(...values.filter((_,i)=>i%3===k)));}j.accessors.push(a);return id;}
const node=name=>{const id=j.nodes.findIndex(n=>n.name===name);if(id<0)throw Error(`Missing raw bone ${name}`);return id;};
const mask=baked.mask,indices=new Uint32Array(mask.indices),index=j.accessors.length;j.accessors.push({bufferView:appendBytes(asset,Buffer.from(indices.buffer)),componentType:5125,type:'SCALAR',count:indices.length});
const material=j.materials.length;j.materials.push({name:'Blindfold',pbrMetallicRoughness:{baseColorFactor:[.009,.011,.016,1],metallicFactor:0,roughnessFactor:.96},doubleSided:true});
j.extensions.VRM.materialProperties.push({name:'Blindfold',shader:'VRM_USE_GLTFSHADER',renderQueue:2000,floatProperties:{},vectorProperties:{},textureProperties:{},keywordMap:{},tagMap:{}});
const mesh=j.meshes.length;j.meshes.push({name:'Blindfold',primitives:[{attributes:{POSITION:floats(mask.position,'VEC3'),NORMAL:floats(mask.normal,'VEC3')},indices:index,material}]});
const cover=j.nodes.length;j.nodes.push({name:'Blindfold',mesh});(j.nodes[node(mask.parent)].children??=[]).push(cover);
for(const [name,parent,offset] of [['FX_Hand_L','J_Bip_L_Hand',[-.075,0,-.035]],['FX_Hand_R','J_Bip_R_Hand',[.075,0,-.035]],['FX_Center','J_Bip_C_Chest',[0,.17,-.48]]]){
  const id=j.nodes.length;j.nodes.push({name,translation:offset});(j.nodes[node(parent)].children??=[]).push(id);
}
// Expose the same stable morph name consumed by the existing adapter.
const names=[...j.meshes[0].primitives[0].extras.targetNames];names[11]='Blink';j.meshes[0].extras={targetNames:names};for(const p of j.meshes[0].primitives)p.extras={...p.extras,targetNames:names};
j.animations=baked.clips.map(c=>{
  const times=floats(c.times,'SCALAR'),samplers=[],channels=[];
  for(const track of c.tracks){if(!j.nodes.some(n=>n.name===track.name))continue;
    for(const [path,type,values] of [['rotation','VEC4',track.rotations],['translation','VEC3',track.positions]]){
      const sampler=samplers.length;samplers.push({input:times,output:floats(values,type),interpolation:'LINEAR'});channels.push({sampler,target:{node:node(track.name),path}});
    }
  }return {name:c.name,samplers,channels};
});
j.extras.limitless={...j.extras.limitless,status:'animation-integration-candidate',acceptedVisualCommit:'6e3b824',runtime:'raw-bone baked animation; no procedural runtime IK',limitations:['Original hoodie and hairstyle retained as user-accepted appearance','Animation and cover require actual render validation']};
await writeVrm('public/models/candidates/limitless-runtime.vrm',asset);
await writeFile(`${out}/bake-summary.json`,JSON.stringify({clips:baked.clips.map(c=>({name:c.name,duration:c.duration,frames:c.times.length,tracks:c.tracks.length})),mask:{sourceBounds:baked.mask.sourceBounds,fittedVertices:baked.mask.fittedCount,vertices:baked.mask.position.length/3}},null,2));
console.log('Saved limitless-runtime.vrm with six raw-bone clips, reused fitted cover and three sockets.');
