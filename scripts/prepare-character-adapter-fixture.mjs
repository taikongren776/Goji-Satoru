/** Rename GLB metadata only. Geometry, weights and animation samples are byte-preserved. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {Matrix4,Vector3,Quaternion,Euler} from 'three';
const source='public/models/candidates/gojo-a3-thumb-distal.glb';
const out='public/models/character-production/fixtures';await mkdir(out,{recursive:true});
const input=await readFile(source),jsonLength=input.readUInt32LE(12);
const json=JSON.parse(input.subarray(20,20+jsonLength).toString());
const names=new Map();for(const [i,n] of json.nodes.entries()){if(n.name)names.set(n.name,`Artist_Node_${i}`);n.name=`Artist_Node_${i}`;}
for(const [i,m] of json.meshes.entries())m.name=`Artist_Mesh_${i}`;
const manifest=JSON.parse(await readFile('public/models/character-production/active.json','utf8'));
const reference=structuredClone(manifest);reference.id='a4-original-candidate-reference';reference.asset='../../candidates/gojo-a3-thumb-distal.glb';reference.usage='integration-test';reference.presentation='authored';
await writeFile(`${out}/original-reference.json`,JSON.stringify(reference,null,2));
manifest.id='a4-renamed-candidate-not-art-approved';manifest.asset='gojo-final.glb';manifest.usage='integration-test';manifest.presentation='authored';
for(const [i,clip] of json.animations.entries()){const name=clip.name;clip.name=`Artist_Take_${i}`;manifest.animations[name].clip=clip.name;}
for(const binding of Object.values(manifest.nodes))binding.node=names.get(binding.node);
// Demonstrate a bone socket binding by composing the existing helper's local
// matrix relative to its parent, rather than referring to any vertex number.
const original=JSON.parse(input.subarray(20,20+jsonLength).toString());
const li=original.nodes.findIndex(n=>n.name==='FX_Hand_L'),parentIndex=original.nodes.findIndex(n=>n.children?.includes(li));
const socket=original.nodes[li];
if(parentIndex<0)throw new Error('Fixture socket has no stable parent');
const position=new Vector3(),rotation=new Quaternion(),scale=new Vector3();
const matrix=socket.matrix?new Matrix4().fromArray(socket.matrix):new Matrix4().compose(new Vector3().fromArray(socket.translation||[0,0,0]),new Quaternion().fromArray(socket.rotation||[0,0,0,1]),new Vector3().fromArray(socket.scale||[1,1,1]));
matrix.decompose(position,rotation,scale);
if(scale.distanceTo(new Vector3(1,1,1))>1e-5)throw new Error('Fixture socket has non-unit scale; requires an explicit helper');
const euler=new Euler().setFromQuaternion(rotation);
manifest.nodes.FX_Hand_L={node:json.nodes[parentIndex].name,offset:position.toArray(),rotation:[euler.x,euler.y,euler.z]};
const encoded=Buffer.from(JSON.stringify(json)),padding=(4-encoded.length%4)%4,body=Buffer.concat([encoded,Buffer.alloc(padding,32)]);
const tail=input.subarray(20+jsonLength),header=Buffer.alloc(20);header.write('glTF');header.writeUInt32LE(2,4);header.writeUInt32LE(20+body.length+tail.length,8);header.writeUInt32LE(body.length,12);header.writeUInt32LE(0x4e4f534a,16);
const output=Buffer.concat([header,body,tail]);await writeFile(`${out}/gojo-final.glb`,output);await writeFile(`${out}/gojo-final.json`,JSON.stringify(manifest,null,2));
await writeFile(`${out}/provenance.json`,JSON.stringify({source,sourceSHA256:createHash('sha256').update(input).digest('hex'),fixtureSHA256:createHash('sha256').update(output).digest('hex'),binaryChunkUnchanged:tail.equals(output.subarray(20+body.length)),nodesRenamed:json.nodes.length,clipsRenamed:json.animations.length,leftSocketBoundTo:manifest.nodes.FX_Hand_L,artStatus:'NOT_APPROVED; metadata integration fixture only'},null,2));
console.log('Prepared metadata-only fixture',out);
