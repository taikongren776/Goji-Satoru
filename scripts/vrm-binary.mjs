// Lossless GLB container access for editing the licensed VRoid candidate.
import {readFile,writeFile} from 'node:fs/promises';
export async function readVrm(path){
  const bytes=await readFile(path);
  if(bytes.toString('ascii',0,4)!=='glTF'||bytes.readUInt32LE(4)!==2)throw Error('Expected binary glTF 2');
  const length=bytes.readUInt32LE(12),json=JSON.parse(bytes.subarray(20,20+length).toString());
  const offset=20+length;
  return {json,bin:Buffer.from(bytes.subarray(offset+8,offset+8+bytes.readUInt32LE(offset)))};
}
export function accessor(asset,index){
  const a=asset.json.accessors[index],v=asset.json.bufferViews[a.bufferView];
  if(a.sparse)throw Error('Sparse accessor requires separate handling');
  const width={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16}[a.type],bytes={5121:1,5123:2,5125:4,5126:4}[a.componentType];
  const base=(v.byteOffset||0)+(a.byteOffset||0),stride=v.byteStride||width*bytes;
  const get={5121:'readUInt8',5123:'readUInt16LE',5125:'readUInt32LE',5126:'readFloatLE'}[a.componentType];
  const set={5121:'writeUInt8',5123:'writeUInt16LE',5125:'writeUInt32LE',5126:'writeFloatLE'}[a.componentType];
  return {count:a.count,width,get:(i,k=0)=>asset.bin[get](base+i*stride+k*bytes),set:(i,k,n)=>asset.bin[set](n,base+i*stride+k*bytes)};
}
export function appendBytes(asset,bytes){
  const pad=(4-asset.bin.length%4)%4,offset=asset.bin.length+pad;
  asset.bin=Buffer.concat([asset.bin,Buffer.alloc(pad),bytes]);
  asset.json.bufferViews.push({buffer:0,byteOffset:offset,byteLength:bytes.length});
  return asset.json.bufferViews.length-1;
}
export async function writeVrm(path,asset){
  asset.json.buffers[0].byteLength=asset.bin.length;
  let json=Buffer.from(JSON.stringify(asset.json));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]);
  const bin=Buffer.concat([asset.bin,Buffer.alloc((4-asset.bin.length%4)%4)]),header=Buffer.alloc(20),bh=Buffer.alloc(8);
  header.write('glTF');header.writeUInt32LE(2,4);header.writeUInt32LE(28+json.length+bin.length,8);header.writeUInt32LE(json.length,12);header.writeUInt32LE(0x4e4f534a,16);
  bh.writeUInt32LE(bin.length);bh.writeUInt32LE(0x004e4942,4);
  await writeFile(path,Buffer.concat([header,json,bh,bin]));
}
