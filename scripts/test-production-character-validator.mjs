/** Negative import fixtures; never edits the artist source or active mapping. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import path from 'node:path';
const root=path.resolve('output/milestone-a4/validator-tests');await mkdir(root,{recursive:true});
const exe='C:/Users/48749/AppData/Local/Programs/Blender Foundation/Blender 5.2/blender.exe';
const source=await readFile('public/models/character-production/fixtures/gojo-final.glb');
const base=JSON.parse(await readFile('public/models/character-production/fixtures/gojo-final.json','utf8'));
const length=source.readUInt32LE(12),json=JSON.parse(source.subarray(20,20+length).toString()),binary=source.subarray(20+length);
const sha=b=>createHash('sha256').update(b).digest('hex');const protectedPath='public/models/gojo.glb',before=sha(await readFile(protectedPath));
const cases=[
  {name:'integration-valid',mode:'integration',expected:'INTEGRATION_ONLY_PASS'},
  {name:'production-rejects-coarse-fixture',mode:'production',expected:'FAIL'},
  {name:'missing-socket',mutate:(j,m)=>{m.nodes.FX_Hand_R.node='MISSING';}},
  {name:'missing-animation',mutate:j=>{j.animations.pop();}},
  {name:'missing-skin',mutate:j=>{j.skins=[];j.nodes.forEach(n=>delete n.skin);}},
  {name:'wrong-units',mutate:(j,m)=>{m.coordinates.unit='centimeter';}},
  {name:'nonfinite-weight',mutate:(j,m,bin)=>{const a=j.accessors[j.meshes.flatMap(m=>m.primitives).find(p=>p.attributes.WEIGHTS_0!==undefined).attributes.WEIGHTS_0];assert.equal(a.componentType,5126);const view=j.bufferViews[a.bufferView];bin.writeFloatLE(NaN,8+(view.byteOffset||0)+(a.byteOffset||0));}},
  {name:'invalid-glb-header',badHeader:true},
];
const rows=[];
for(const c of cases){
  const j=structuredClone(json),m=structuredClone(base),bin=Buffer.from(binary);c.mutate?.(j,m,bin);m.asset=`${c.name}.glb`;
  const text=Buffer.from(JSON.stringify(j)),body=Buffer.concat([text,Buffer.alloc((4-text.length%4)%4,32)]),header=Buffer.alloc(20);header.write(c.badHeader?'FAIL':'glTF');header.writeUInt32LE(2,4);header.writeUInt32LE(20+body.length+bin.length,8);header.writeUInt32LE(body.length,12);header.writeUInt32LE(0x4e4f534a,16);
  await writeFile(path.join(root,m.asset),Buffer.concat([header,body,bin]));const manifest=path.join(root,`${c.name}.json`);await writeFile(manifest,JSON.stringify(m));
  const output=path.join(root,`${c.name}-result.json`);const run=spawnSync(exe,['-b','--disable-autoexec','--python-exit-code','2','--python','scripts/validate-production-character.py','--','--manifest',manifest,'--mode',c.mode||'integration','--out',output],{encoding:'utf8',windowsHide:true,timeout:60000});
  if(run.error)throw run.error;const result=JSON.parse(await readFile(output,'utf8'));assert.equal(result.status,c.expected||'FAIL',c.name);if(result.status==='FAIL')assert.notEqual(run.status,0,`${c.name} must return a failing exit code`);
  rows.push({case:c.name,status:result.status,errors:result.errors,exitCode:run.status});
}
assert.equal(sha(await readFile(protectedPath)),before);
await writeFile('output/milestone-a4/validator-tests.json',JSON.stringify({status:'PASS',productionAssetUnchanged:true,rows},null,2));console.log(JSON.stringify({status:'PASS',cases:rows.length,productionAssetUnchanged:true},null,2));
