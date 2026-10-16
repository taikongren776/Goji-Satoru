import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const baseline='f006c13';
const paths=execFileSync('git',['ls-tree','-r','--name-only',baseline,'--','blender','public/models','src/main.ts','src/style.css','src/effects.ts','src/audio.ts','scripts/audit_deformation.py','scripts/audit_contacts.py'],{encoding:'utf8'}).trim().split('\n');
const diff=execFileSync('git',['diff','--name-only',baseline,'--',...paths],{encoding:'utf8'}).trim();assert.equal(diff,'','Frozen tracked files changed');
const assets=[];
for(const file of paths.filter(p=>/\.(blend|glb)$/.test(p))){
  const pointer=execFileSync('git',['show',`${baseline}:${file}`],{encoding:'utf8'}),expected=pointer.match(/oid sha256:([a-f0-9]+)/)?.[1];
  assert.ok(expected,`Expected LFS pointer ${file}`);const actual=createHash('sha256').update(await readFile(file)).digest('hex');assert.equal(actual,expected,file);assets.push({file,sha256:actual});
}
const fixture=JSON.parse(await readFile('public/models/character-production/fixtures/provenance.json','utf8'));assert.equal(fixture.binaryChunkUnchanged,true);
const sourceBytes=await readFile(fixture.source),fixtureBytes=await readFile('public/models/character-production/fixtures/gojo-final.glb');
assert.equal(createHash('sha256').update(sourceBytes).digest('hex'),fixture.sourceSHA256);
assert.equal(createHash('sha256').update(fixtureBytes).digest('hex'),fixture.fixtureSHA256);
assert.ok(sourceBytes.subarray(20+sourceBytes.readUInt32LE(12)).equals(fixtureBytes.subarray(20+fixtureBytes.readUInt32LE(12))),'Fixture binary data changed');
await mkdir('output/milestone-a4',{recursive:true});await writeFile('output/milestone-a4/freeze-verification.json',JSON.stringify({status:'PASS',baseline,frozenPaths:paths,assets,fixtureGeometryUnchanged:fixture.binaryChunkUnchanged},null,2));console.log(JSON.stringify({status:'PASS',frozenFiles:paths.length,lfsAssets:assets.length,fixtureGeometryUnchanged:true}));
