import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {Matrix4,Vector3,Quaternion} from 'three';
import {readVrm,accessor} from './vrm-binary.mjs';
const source=await readVrm('public/models/candidates/fast-track-hairsample-male.vrm');
const target=await readVrm('public/models/candidates/limitless-whitehair-study.vrm');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
let vertices=0,triangles=0,morphs=0;
assert.equal(source.json.meshes.length,target.json.meshes.length);
for(let mi=0;mi<source.json.meshes.length;mi++){
  const sm=source.json.meshes[mi],tm=target.json.meshes[mi],seen=new Set();
  assert.equal(sm.primitives.length,tm.primitives.length);
  for(let pi=0;pi<sm.primitives.length;pi++){
    const p=sm.primitives[pi],q=tm.primitives[pi];
    for(const id of [p.indices,p.attributes.TEXCOORD_0,p.attributes.JOINTS_0,p.attributes.WEIGHTS_0]){
      const a=accessor(source,id),b=accessor(target,id);assert.equal(a.count,b.count);
      for(let i=0;i<a.count;i++)for(let k=0;k<a.width;k++)assert.equal(a.get(i,k),b.get(i,k),'Source topology / UV / weights changed');
    }
    triangles+=accessor(target,q.indices).count/3;
    if(seen.has(q.attributes.POSITION))continue;seen.add(q.attributes.POSITION);
    const pos=accessor(target,q.attributes.POSITION);vertices+=pos.count;
    for(const id of [q.attributes.POSITION,q.attributes.NORMAL,...(q.targets||[]).flatMap(t=>Object.values(t))]){
      const a=accessor(target,id);for(let i=0;i<a.count;i++)for(let k=0;k<a.width;k++)assert.ok(Number.isFinite(a.get(i,k)),'Non-finite rest/morph data');
    }
    morphs+=(q.targets||[]).length;
  }
}
const j=target.json,parents=new Map(),world=[];j.nodes.forEach((n,i)=>(n.children||[]).forEach(c=>parents.set(c,i)));
function matrix(i){if(world[i])return world[i];const n=j.nodes[i],m=n.matrix?new Matrix4().fromArray(n.matrix):new Matrix4().compose(new Vector3(...(n.translation||[0,0,0])),new Quaternion(...(n.rotation||[0,0,0,1])),new Vector3(...(n.scale||[1,1,1])));return world[i]=parents.has(i)?matrix(parents.get(i)).clone().multiply(m):m;}
let maxBindError=0;
for(const s of j.skins){const inv=accessor(target,s.inverseBindMatrices);s.joints.forEach((id,i)=>{const result=matrix(id).clone().multiply(new Matrix4().fromArray(Array.from({length:16},(_,k)=>inv.get(i,k))));result.elements.forEach((v,k)=>maxBindError=Math.max(maxBindError,Math.abs(v-(k%5===0?1:0))));});}
assert.ok(maxBindError<1e-5);
const preserved={};
for(const file of ['public/models/gojo.glb','blender/gojo.blend','src/experience.ts','src/effects.ts','src/audio.ts','public/models/character-production/active.json']){
  const now=await readFile(file),base=execFileSync('git',['show',`a20b0fc:${file}`],{maxBuffer:30*1024*1024,windowsHide:true});
  const pointer=/^version https:\/\/git-lfs/.test(base.toString('utf8',0,60));
  const expected=pointer?base.toString().match(/oid sha256:([a-f0-9]+)/)[1]:hash(base);
  assert.equal(hash(now),expected,`Protected file changed: ${file}`);preserved[file]=hash(now);
}
const result={status:'DATA_CONSISTENCY_PASS_NOT_ART_APPROVAL',vertices,triangles,morphs,maxBindError,topologyUVWeights:'identical to source',preserved};
await writeFile('output/playwright/character-style/data-validation.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
