import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const file=process.argv[2] || new URL('../public/models/gojo.glb',import.meta.url);
const buffer=readFileSync(file);
assert.equal(buffer.toString('ascii',0,4),'glTF');assert.equal(buffer.readUInt32LE(4),2);
assert.equal(buffer.length,buffer.readUInt32LE(8));
const json=JSON.parse(buffer.toString('utf8',20,20+buffer.readUInt32LE(12)));
const expected={Idle:4,CastBlue:5,CastRed:4,CastPurple:8,RevealEyes:2.4,CoverEyes:2.4};
for(const [name,duration] of Object.entries(expected)){
  const clip=json.animations.find(a=>a.name===name);assert.ok(clip,`missing ${name}`);
  const end=Math.max(...clip.samplers.map(s=>json.accessors[s.input].max[0]));
  assert.ok(Math.abs(end-duration)<.01,`${name}: expected ${duration}s, got ${end}s`);
  assert.ok(clip.channels.length>30,`${name} must animate the actual rig`);
}
for(const name of ['Blindfold','FX_Hand_L','FX_Hand_R','FX_Center'])assert.ok(json.nodes.some(n=>n.name===name),`missing ${name}`);
assert.ok(json.skins.length>0,'must contain a skinned rig');
assert.ok(json.skins.every(s=>s.joints.length>0),'every skin must have joints');
for(const name of ['Hand.L','Hand.R','UpperArm.L','UpperArm.R'])assert.ok(json.nodes.some(n=>n.name===name),`missing canonical joint ${name}`);
const eyes=json.meshes.find(m=>m.name.startsWith('Eye white'));
assert.ok(eyes?.primitives.some(p=>p.targets?.length),'Blink morph target must be exported');
const blindfold=json.nodes.find(n=>n.name==='Blindfold');assert.ok(blindfold.children?.length,'blindfold must own the mesh for visibility control');
const triangles=json.meshes.flatMap(m=>m.primitives).reduce((sum,p)=>sum+(p.indices!==undefined?json.accessors[p.indices].count/3:0),0);
const report={file:process.argv[2]||'public/models/gojo.glb',bytes:buffer.length,triangles,meshes:json.meshes.length,joints:json.skins[0].joints.length,animations:Object.keys(expected),externalResources:json.images?.filter(i=>i.uri)||[]};
assert.equal(report.externalResources.length,0,'GLB must be self-contained');
console.log(JSON.stringify(report,null,2));
