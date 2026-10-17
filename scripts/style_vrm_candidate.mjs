// Rest-shape edits to an existing CC0 authored mesh; no generated character geometry.
// Original topology, UVs and skin weights are retained. New rest matrices and morph
// deltas follow the same coordinate transform as the mesh.
import {mkdir,writeFile} from 'node:fs/promises';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {Matrix4,Vector3,Quaternion,Matrix3} from 'three';
import {readVrm,accessor,appendBytes,writeVrm} from './vrm-binary.mjs';
const source='public/models/candidates/fast-track-hairsample-male.vrm';
const destination='public/models/candidates/limitless-whitehair-study.vrm';
if(createHash('sha256').update(await readFile(source)).digest('hex')!=='4af2194f90ba846f3b13c00b50b14262419062d2171d17de922bcce2f89979c7')throw Error('Unrecognized source asset; do not apply rest edits');
const asset=await readVrm(source),j=asset.json;
const out='output/playwright/character-style';await mkdir(out,{recursive:true});
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
function shape(v,region='body'){
  let [x,y,z]=v;const oldY=y,cx=.000509;
  // Edit existing face and matching eyelid/iris/mouth geometry together.
  if(region==='face'){
    const eye=Math.exp(-(((y-1.604)/.029)**2))*smooth(.008,.024,Math.abs(x-cx))*(1-smooth(.078,.105,Math.abs(x-cx)))*(1-smooth(-.065,-.025,z));
    y-=.19*(y-1.604)*eye;
    x=cx+(x-cx)*(1+.055*Math.exp(-(((oldY-1.535)/.036)**2)));
  }
  if(region==='hair'){
    // Shorten the hanging fringe and open the eye line, retaining authored clumps.
    const fringe=(1-smooth(1.64,1.735,y))*(1-smooth(-.08,-.01,z));
    y+=.045*fringe;
    y+=.022*smooth(1.67,1.79,y);
    x=cx+(x-cx)*(1+.055*smooth(1.62,1.76,oldY));
  }
  const head=smooth(1.45,1.53,oldY);
  const chest=smooth(1.05,1.3,oldY)*(1-smooth(1.43,1.50,oldY));
  x=cx+(x-cx)*(1+.045*chest-.055*head);
  y=oldY<1.02?y*1.08:1.1016+(y-1.02)*1.025;
  y-=.06*Math.max(0,oldY-1.46);
  z*=1-.035*head;
  return [x,y,z];
}
// Gather mesh accessors once: the source shares attributes across primitives.
const changes=[];
for(const mesh of j.meshes){
  const region=mesh.name.startsWith('Face')?'face':mesh.name.startsWith('Hair')?'hair':'body';
  const seen=new Set();
  for(const p of mesh.primitives){
    if(seen.has(p.attributes.POSITION))continue;seen.add(p.attributes.POSITION);
    const pos=accessor(asset,p.attributes.POSITION),normal=accessor(asset,p.attributes.NORMAL);
    const originals=Array.from({length:pos.count},(_,i)=>[pos.get(i,0),pos.get(i,1),pos.get(i,2)]);
    const morphSeen=new Set();
    for(const target of p.targets||[]){
      if(target.POSITION===undefined||morphSeen.has(target.POSITION))continue;morphSeen.add(target.POSITION);
      const delta=accessor(asset,target.POSITION);
      for(let i=0;i<pos.count;i++){
        const base=originals[i],newBase=shape(base,region),end=shape(base.map((n,k)=>n+delta.get(i,k)),region);
        for(let k=0;k<3;k++)delta.set(i,k,end[k]-newBase[k]);
      }
    }
    const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
    for(let i=0;i<pos.count;i++){
      const base=originals[i],next=shape(base,region),eps=.00001,cols=[];
      for(let axis=0;axis<3;axis++){const q=[...base];q[axis]+=eps;const s=shape(q,region);cols.push(...s.map((v,k)=>(v-next[k])/eps));}
      const jac=new Matrix3().fromArray(cols).invert().transpose();
      const n=new Vector3(normal.get(i,0),normal.get(i,1),normal.get(i,2)).applyMatrix3(jac).normalize();
      for(let k=0;k<3;k++){pos.set(i,k,next[k]);normal.set(i,k,n.getComponent(k));min[k]=Math.min(min[k],next[k]);max[k]=Math.max(max[k],next[k]);}
    }
    j.accessors[p.attributes.POSITION].min=min;j.accessors[p.attributes.POSITION].max=max;
    changes.push({mesh:mesh.name,vertices:pos.count,region,min,max});
  }
}
// Preserve original bone orientation; move rest joint positions with the edited body.
const parents=new Map();j.nodes.forEach((n,i)=>(n.children||[]).forEach(c=>parents.set(c,i)));
const world=[];
function matrix(i){if(world[i])return world[i];const n=j.nodes[i],local=n.matrix?new Matrix4().fromArray(n.matrix):new Matrix4().compose(new Vector3(...(n.translation||[0,0,0])),new Quaternion(...(n.rotation||[0,0,0,1])),new Vector3(...(n.scale||[1,1,1])));return world[i]=parents.has(i)?matrix(parents.get(i)).clone().multiply(local):local;}
j.nodes.forEach((_,i)=>matrix(i));
const moved=world.map((m,i)=>{const p=new Vector3().setFromMatrixPosition(m);return j.nodes[i].mesh===undefined?m.clone().setPosition(...shape(p.toArray())):m.clone();});
j.nodes.forEach((n,i)=>{if(n.mesh!==undefined)return;const m=parents.has(i)?moved[parents.get(i)].clone().invert().multiply(moved[i]):moved[i];const p=new Vector3(),q=new Quaternion(),s=new Vector3();m.decompose(p,q,s);delete n.matrix;n.translation=p.toArray();n.rotation=q.toArray();n.scale=s.toArray();});
for(const skin of j.skins){const inv=accessor(asset,skin.inverseBindMatrices);skin.joints.forEach((id,i)=>{const values=moved[id].clone().invert().elements;values.forEach((v,k)=>inv.set(i,k,v));});}
// Texture colour edits retain the existing UV painting and alpha silhouettes.
// Canvas is used as an asset-processing step, never to substitute a character render.
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
  const page=await browser.newPage();await page.goto('about:blank');
  for(const [materialIndex,mode] of [[13,'hair'],[2,'iris'],[5,'skin']]){
    const mat=j.materials[materialIndex],tex=j.textures[mat.pbrMetallicRoughness.baseColorTexture.index],im=j.images[tex.source],bv=j.bufferViews[im.bufferView];
    const bytes=asset.bin.subarray(bv.byteOffset||0,(bv.byteOffset||0)+bv.byteLength);
    const png=await page.evaluate(async({url,mode})=>{
      const im=new Image();im.src=url;await im.decode();const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const ctx=c.getContext('2d');ctx.drawImage(im,0,0);const img=ctx.getImageData(0,0,c.width,c.height),d=img.data;
      for(let i=0;i<d.length;i+=4){const r=d[i],g=d[i+1],b=d[i+2],l=(r*.2126+g*.7152+b*.0722)/255;
        if(mode==='hair'){const value=.70+.29*Math.pow(Math.min(1,l/.4),.65);d[i]=255*value*.96;d[i+1]=255*value*.98;d[i+2]=255*value;}
        if(mode==='iris'){const light=Math.max(r,g,b)/255;d[i]=light*90;d[i+1]=light*202;d[i+2]=light*255;}
        if(mode==='skin'){const redness=Math.max(0,r-(g+b)/2)/255;const t=Math.min(.4,redness*.55);d[i]=r*(1-t)+255*l*t;d[i+1]=g*(1-t)+255*l*t;d[i+2]=b*(1-t)+255*l*t;}
      }ctx.putImageData(img,0,0);return c.toDataURL('image/png').split(',')[1];
    },{url:`data:${im.mimeType};base64,${bytes.toString('base64')}`,mode});
    const newImage=j.images.length;j.images.push({name:`LIMITLESS_${mode}`,bufferView:appendBytes(asset,Buffer.from(png,'base64')),mimeType:'image/png'});
    // Main and shade texture reference the same painted texture in this source.
    tex.source=newImage;
  }
}finally{await browser.close();}
function colour(i,c,shade){const mat=j.materials[i],vrm=j.extensions.VRM.materialProperties[i];vrm.vectorProperties._Color=[...c,1];vrm.vectorProperties._ShadeColor=[...shade,1];mat.pbrMetallicRoughness.baseColorFactor=[...c.map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4),1];}
colour(10,[.105,.12,.17],[.065,.075,.12]);
colour(11,[.6,.67,.77],[.38,.43,.55]);
colour(12,[.45,.48,.55],[.32,.34,.4]);
colour(0,[.72,.76,.82],[.50,.55,.62]);
colour(6,[.38,.42,.49],[.28,.31,.39]);
colour(13,[1,1,1],[.65,.71,.82]);
const hair=j.extensions.VRM.materialProperties[13];delete hair.textureProperties._SphereAdd;hair.vectorProperties._OutlineColor=[.27,.31,.4,1];
for(const i of [10,11,12])j.extensions.VRM.materialProperties[i].vectorProperties._OutlineColor=[.025,.03,.05,1];
j.extensions.VRM.meta.title='LIMITLESS white-hair style study — modified HairSample_Male';
j.extensions.VRM.meta.author='VRoid project; LIMITLESS rest-shape and colour edits';
j.extras={...j.extras,limitless:{status:'visual-candidate-not-production',sourceSha256:'4af2194f90ba846f3b13c00b50b14262419062d2171d17de922bcce2f89979c7',topology:'source retained',limitations:['Existing hoodie, not a rebuilt high collar uniform','No blindfold or skill animation approval']}};
await writeVrm(destination,asset);
await writeFile(`${out}/edits.json`,JSON.stringify({source,destination,changes,scope:'Authored mesh rest-shape and material edits; no shoulder or hand topology claim.'},null,2));
console.log(`Saved ${destination}`);
