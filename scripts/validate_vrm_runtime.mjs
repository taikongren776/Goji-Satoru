import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readVrm,accessor} from './vrm-binary.mjs';

const source=await readVrm('public/models/candidates/limitless-whitehair-study.vrm');
const runtime=await readVrm('public/models/candidates/limitless-runtime.vrm');
// All original binary data (positions, skinning, morphs, UVs, images) is intact.
assert.ok(source.bin.equals(runtime.bin.subarray(0,source.bin.length)));
assert.deepEqual(runtime.json.materials.slice(0,source.json.materials.length),source.json.materials);
assert.deepEqual(runtime.json.skins,source.json.skins);
for(let i=0;i<source.json.meshes.length;i++){
  const clean=m=>({...m,extras:undefined,primitives:m.primitives.map(p=>({...p,extras:undefined}))});
  assert.deepEqual(clean(runtime.json.meshes[i]),clean(source.json.meshes[i]));
}
const timings={Idle:4,CastBlue:5,CastRed:4,CastPurple:8,RevealEyes:2.4,CoverEyes:2.4};
assert.equal(runtime.json.animations.length,6);
for(const [name,duration] of Object.entries(timings)){
  const clip=runtime.json.animations.find(c=>c.name===name);assert.ok(clip,name);
  for(const sampler of clip.samplers){
    const times=accessor(runtime,sampler.input);assert.ok(Math.abs(times.get(times.count-1)-duration)<1e-5);
    const data=accessor(runtime,sampler.output);
    for(let i=0;i<data.count;i++)for(let k=0;k<data.width;k++)assert.ok(Number.isFinite(data.get(i,k)));
  }
}
for(const name of ['Blindfold','FX_Hand_L','FX_Hand_R','FX_Center'])assert.equal(runtime.json.nodes.filter(n=>n.name===name).length,1);
const hash=b=>createHash('sha256').update(b).digest('hex');
const protectedFiles=['public/models/gojo.glb','blender/gojo.blend','src/experience.ts','src/effects.ts','src/audio.ts','src/style.css','public/models/character-production/active.json'];
const unchanged={};
for(const path of protectedFiles){
  // Git LFS stores pointers: compare binaries with established full hashes.
  const actual=hash(await readFile(path));
  const known={'public/models/gojo.glb':'79c057bb6592722466cd794a6247cdf4e3c4f1d2fb48738412584512f4a33d7e','blender/gojo.blend':'29d8bceac5c59fd3d28f08c2ec1d5c81076b40e1134abfa6d13b3c70fce2d65e'};
  if(known[path])assert.equal(actual,known[path]);
  else assert.equal((await readFile(path,'utf8')).replaceAll('\r\n','\n'),execFileSync('git',['show',`6e3b824:${path}`],{encoding:'utf8'}).replaceAll('\r\n','\n'));
  unchanged[path]=actual;
}
const result={status:'TECHNICAL_CONTRACT_PASS_NOT_ART_APPROVAL',coreBinaryUnchanged:true,materialsAndSkinUnchanged:true,timings,protectedFiles:unchanged,runtimeSha256:hash(await readFile('public/models/candidates/limitless-runtime.vrm'))};
await writeFile('output/playwright/vrm-integration/contract.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
