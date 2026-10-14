/** Separate development diagnostic surface. Never imported by the LIMITLESS application. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

type Pose = {id:string;camera:number[];target:number[];ortho_scale:number;vertices_blender_world:Record<string,number[][]>;sockets_blender_world?:Record<string,number[]>};
type Manifest = {poses:Pose[];sha256:string;size:number};
declare global { interface Window { characterAudit?: {ready:boolean;error?:string;report?:unknown;show:(id:string)=>unknown} } }
if (!import.meta.env.DEV) throw new Error('Character audit is development-only');
const api: NonNullable<Window['characterAudit']> = {ready:false,show:()=>null}; window.characterAudit=api;
const params=new URLSearchParams(location.search), base=params.get('assets') || '/output/milestone-a/baseline-web';
function convert(v:number[]) {return new THREE.Vector3(v[0],v[2],-v[1]);}
function clean(s:string) {return s.replace(/\W/g,'');}
try {
  const response=await fetch(`${base}/manifest.json`);if(!response.ok)throw new Error(`Manifest HTTP ${response.status}`);
  const manifest=await response.json() as Manifest;
  const originalModel=params.get('model');
  const gltf=await new GLTFLoader().loadAsync(originalModel||`${base}/audit.glb`);
  const scene=new THREE.Scene();scene.background=new THREE.Color('#10131a');scene.add(gltf.scene);
  scene.add(new THREE.HemisphereLight(0xe5efff,0x50505c,1.5));
  for(const [pos,power] of [[[ -2,5,4],2.2],[[3,3,1],1.0],[[0,4,-3],1.5]] as [number[],number][]){const l=new THREE.DirectionalLight(0xffffff,power);l.position.fromArray(pos);scene.add(l);}
  const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(manifest.size,manifest.size);renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;document.body.appendChild(renderer.domElement);
  const camera=new THREE.OrthographicCamera(-1,1,1,-1,.01,20);
  const mixer=new THREE.AnimationMixer(gltf.scene);
  const neutral=new THREE.MeshStandardMaterial({color:0xb8c2cc,roughness:.8,metalness:0});
  const meshes:THREE.SkinnedMesh[]=[];
  gltf.scene.traverse(o=>{if(o instanceof THREE.Mesh)o.material=neutral;if(o instanceof THREE.SkinnedMesh)meshes.push(o);});
  scene.updateMatrixWorld(true);for(const m of meshes)m.skeleton.update();
  let bindResidual=0;
  for(const mesh of meshes)for(let i=0;i<mesh.skeleton.bones.length;i++){
    const matrix=mesh.bindMatrixInverse.clone().multiply(mesh.skeleton.bones[i].matrixWorld).multiply(mesh.skeleton.boneInverses[i]).multiply(mesh.bindMatrix);
    matrix.elements.forEach((v,j)=>{bindResidual=Math.max(bindResidual,Math.abs(v-(j%5===0?1:0)));});
  }
  const rest=manifest.poses.find(p=>p.id==='rest');if(!rest)throw new Error('A rest capture is required for vertex correspondence');
  // Exporters duplicate vertices at UV seams; map by neutral world position rather than index.
  const mapping=new Map<THREE.SkinnedMesh,{source:string;indices:number[];unmatched:number}>();
  const key=(v:THREE.Vector3)=>`${Math.round(v.x*1e5)},${Math.round(v.y*1e5)},${Math.round(v.z*1e5)}`;
  for(const m of meshes){
    const aliases:string[]=[];
    for(let node:THREE.Object3D|null=m;node;node=node.parent){
      aliases.push(node.name);
      const associated=gltf.parser.associations.get(node);
      if(associated?.nodes!==undefined)aliases.push(gltf.parser.json.nodes[associated.nodes].name);
    }
    const source=Object.keys(rest.vertices_blender_world).find(k=>aliases.some(a=>clean(k)===clean(a)));
    if(!source)throw new Error(`Unmapped exported mesh ${m.name}`);
    const reference=rest.vertices_blender_world[source].map(convert),buckets=new Map<string,number[]>();
    reference.forEach((v,i)=>{const k=key(v);buckets.set(k,[...(buckets.get(k)||[]),i]);});
    const indices:number[]=[];let unmatched=0;
    for(let i=0;i<m.geometry.attributes.position.count;i++){
      const v=m.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(m.matrixWorld);let best=-1,d=Infinity;
      const k=key(v).split(',').map(Number);let possible:number[]=[];
      for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++)possible.push(...(buckets.get(`${k[0]+x},${k[1]+y},${k[2]+z}`)||[]));
      for(const j of possible){const dist=v.distanceToSquared(reference[j]);if(dist<d){d=dist;best=j;}}
      if(best<0||d>1e-8){unmatched++;indices.push(-1);}else indices.push(best);
    }
    mapping.set(m,{source,indices,unmatched});
  }
  api.show=(id:string)=>{
    const pose=manifest.poses.find(p=>p.id===id);if(!pose)throw new Error(`Missing pose ${id}`);
    const sourcePose=pose as Pose & {source_clip:string|null;source_frame:number};
    const clipName=originalModel?sourcePose.source_clip:`QA_${id}`;
    const clip=gltf.animations.find(a=>a.name===clipName);
    mixer.stopAllAction();
    if(clip){const action=mixer.clipAction(clip);action.reset().play();action.time=originalModel?sourcePose.source_frame/30:0;mixer.update(0);}
    else if(id!=='rest')throw new Error(`Missing clip ${clipName}`);
    scene.updateMatrixWorld(true);for(const m of meshes){m.skeleton.update();m.computeBoundingSphere();m.computeBoundingBox();}
    const scale=pose.ortho_scale;camera.left=-scale/2;camera.right=scale/2;camera.top=scale/2;camera.bottom=-scale/2;camera.position.copy(convert(pose.camera));camera.lookAt(convert(pose.target));camera.updateProjectionMatrix();
    renderer.render(scene,camera);
    const result:Record<string,unknown>={};let maxError=0,unmatched=0;
    for(const m of meshes){
      const map=mapping.get(m)!;const reference=pose.vertices_blender_world[map.source].map(convert);let max=0,sq=0,n=0;
      map.indices.forEach((j,i)=>{if(j<0)return;const v=m.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(m.matrixWorld);const d=v.distanceTo(reference[j]);max=Math.max(max,d);sq+=d*d;n++;});
      result[map.source]={max_error_m:max,rms_error_m:Math.sqrt(sq/Math.max(1,n)),matched_vertices:n,unmatched:map.unmatched};maxError=Math.max(maxError,max);unmatched+=map.unmatched;
    }
    const socketErrors:Record<string,number|null>={};let socketMax=0,missingSocket=false;
    for(const [name,position] of Object.entries(pose.sockets_blender_world||{})){
      const node=gltf.scene.getObjectByName(name);
      if(!node){socketErrors[name]=null;missingSocket=true;continue;}
      const distance=node.getWorldPosition(new THREE.Vector3()).distanceTo(convert(position));socketErrors[name]=distance;socketMax=Math.max(socketMax,distance);
    }
    const report={pose:id,sha256:manifest.sha256,meshes:result,max_error_m:maxError,unmatched,bind_rest_matrix_residual:bindResidual,socket_errors_m:socketErrors,status:unmatched||maxError>.0005||bindResidual>1e-4||missingSocket||socketMax>.001?'FAIL':'SKINNING_PARITY_PASS',scope:'Sampled pose geometry and sockets only; full production interpolation and artistic quality not implied',renderer:renderer.getContext().getParameter(renderer.getContext().RENDERER)};
    api.report=report;return report;
  };
  api.show(params.get('pose')||'rest');api.ready=true;document.body.dataset.auditReady='true';
}catch(e){api.error=String(e);document.body.textContent=String(e);document.body.dataset.auditError='true';throw e;}
