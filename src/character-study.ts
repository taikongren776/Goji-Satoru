import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {VRMLoaderPlugin,VRMUtils} from '@pixiv/three-vrm';
import type {VRM,VRMHumanBoneName} from '@pixiv/three-vrm';
import {applyLegacyMaterials} from './legacy-character-materials';

type AssetId='styled'|'source'|'legacy';
type Loaded={root:THREE.Group;vrm?:VRM;mixer?:THREE.AnimationMixer};
const host=document.querySelector<HTMLElement>('#viewport')!;
const status=document.querySelector<HTMLOutputElement>('#status')!;
const assetSelect=document.querySelector<HTMLSelectElement>('#asset')!;
const viewSelect=document.querySelector<HTMLSelectElement>('#view')!;
const poseSelect=document.querySelector<HTMLSelectElement>('#pose')!;
const retry=document.querySelector<HTMLButtonElement>('#retry')!;
const cache=new Map<AssetId,Loaded>();
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(30,1,.01,100);
let renderer:THREE.WebGLRenderer;
try{renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});}
catch(error){status.textContent='WebGL 不可用，无法显示真实模型。';throw error;}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor(0x20252e);host.append(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xffffff,0x778899,2));
const light=new THREE.DirectionalLight(0xffffff,2);light.position.set(-2,4,4);scene.add(light);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.minDistance=.18;controls.maxDistance=7;
let active:Loaded|undefined,selected:AssetId='styled',ticket=0;
function bone(name:VRMHumanBoneName){return active?.vrm?.humanoid.getNormalizedBoneNode(name);}
function legacyBone(name:string){let found:THREE.Object3D|undefined;active?.root.traverse(o=>{if((o as THREE.Bone).isBone&&o.name===name)found=o;});return found;}
function targetBone(name:VRMHumanBoneName,fallback:string){return bone(name)||legacyBone(fallback);}
function pose(name:string){
  poseSelect.value=name;
  if(!active)return;
  if(active.vrm){
    active.vrm.humanoid.resetNormalizedPose();
    bone('leftUpperArm')!.rotation.z=1.3;bone('rightUpperArm')!.rotation.z=-1.3;
    if(name==='side90'||name==='side120'){
      const a=name==='side90'?0:-Math.PI/6;bone('leftUpperArm')!.rotation.z=a;bone('rightUpperArm')!.rotation.z=-a;
    }
    if(name==='forward90'){
      bone('leftUpperArm')!.rotation.set(0,-Math.PI/2,0);bone('rightUpperArm')!.rotation.set(0,Math.PI/2,0);
    }
    if(name==='half'||name==='fist')for(const side of ['left','right'] as const){
      const direction=side==='left'?1:-1,amount=name==='fist'?1:.5;
      for(const finger of ['Index','Middle','Ring','Little'])for(const [part,angle] of [['Proximal',.9],['Intermediate',1.2],['Distal',.75]] as const){
        const b=bone(`${side}${finger}${part}` as VRMHumanBoneName);if(b)b.rotation.z=direction*amount*angle;
      }
      const thumb=bone(`${side}ThumbMetacarpal`);if(thumb)thumb.rotation.y=direction*.25*amount;
      const proximal=bone(`${side}ThumbProximal`);if(proximal)proximal.rotation.z=direction*.35*amount;
      const distal=bone(`${side}ThumbDistal`);if(distal)distal.rotation.z=direction*.45*amount;
    }
    active.vrm.expressionManager?.setValue('blink',name==='blink'?1:0);
    active.vrm.update(0);
  }
  active.root.updateMatrixWorld(true);
}
function view(name:string){
  viewSelect.value=name;
  if(!active)return;
  const target=new THREE.Vector3(0,.97,0);camera.position.set(name==='side'?4.35:name==='45'?2.7:0,1.22,name==='side'?0:name==='45'?3.5:4.35);
  if(name==='face'){
    targetBone('head','Head')?.getWorldPosition(target);target.y+=.07;camera.position.copy(target).add(new THREE.Vector3(0,.02,.95));
  }
  if(name.includes('hand')){
    targetBone(name==='right-hand'?'rightHand':'leftHand',name==='right-hand'?'Hand.R':'Hand.L')?.getWorldPosition(target);target.y-=.055;
    camera.position.copy(target).add(new THREE.Vector3(name==='right-hand'?-.13:.13,.015,name==='hand-back'?-.43:.43));
  }
  if(name==='shoulder'){target.set(0,1.4,0);camera.position.set(1.15,1.66,2.25);}
  controls.target.copy(target);camera.lookAt(target);controls.update();renderer.render(scene,camera);
}
async function choose(id:AssetId){
  const current=++ticket;selected=id;status.textContent='正在加载模型…';retry.style.display='none';
  try{
    if(!cache.has(id)){
      const loader=new GLTFLoader();if(id!=='legacy')loader.register(p=>new VRMLoaderPlugin(p));
      const filename=id==='legacy'?'gojo.glb':`candidates/${id==='source'?'fast-track-hairsample-male':'limitless-whitehair-study'}.vrm`;
      const gltf=await loader.loadAsync(`${import.meta.env.BASE_URL}models/${filename}`,e=>{if(current===ticket&&e.total)status.textContent=`加载 ${Math.round(e.loaded/e.total*100)}%`;});
      const vrm=gltf.userData.vrm as VRM|undefined;
      if(vrm)VRMUtils.rotateVRM0(vrm);else{
        applyLegacyMaterials(gltf.scene);const cover=gltf.scene.getObjectByName('Blindfold');if(cover)cover.visible=false;
      }
      const model:Loaded={root:gltf.scene,vrm};
      if(!vrm){const clip=gltf.animations.find(a=>a.name==='Idle');if(clip){model.mixer=new THREE.AnimationMixer(gltf.scene);model.mixer.clipAction(clip).play();model.mixer.update(0);}}
      gltf.scene.traverse(o=>{if(o instanceof THREE.Mesh)o.frustumCulled=false;});cache.set(id,model);
    }
    if(current!==ticket)return;
    if(active)scene.remove(active.root);active=cache.get(id)!;scene.add(active.root);assetSelect.value=id;
    poseSelect.disabled=id==='legacy';pose(poseSelect.value);view(viewSelect.value);
    status.textContent=id==='styled'?'白发候选已加载 · 外观与绑定试验，非正式角色':id==='source'?'CC0 原始基础资产 · 与新候选使用同一套 MToon 渲染':'正式粗模基线 · 隐藏眼罩以比较面部';
  }catch(error){if(current===ticket){status.textContent=`加载失败：${error instanceof Error?error.message:String(error)}`;retry.style.display='block';}throw error;}
}
assetSelect.addEventListener('change',()=>void choose(assetSelect.value as AssetId).catch(()=>{}));
viewSelect.addEventListener('change',()=>view(viewSelect.value));
poseSelect.addEventListener('change',()=>{pose(poseSelect.value);view(viewSelect.value);});
document.querySelector('#reset')!.addEventListener('click',()=>view(viewSelect.value));
retry.addEventListener('click',()=>void choose(selected).catch(()=>{}));
function resize(){const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
window.addEventListener('resize',resize);resize();
renderer.setAnimationLoop(()=>{controls.update();renderer.render(scene,camera);});
function inspect(){
  let vertices=0,nonFinite=0;const bounds=new THREE.Box3();
  active?.root.updateMatrixWorld(true);
  active?.root.traverse(o=>{if(o instanceof THREE.SkinnedMesh){o.skeleton.update();const p=new THREE.Vector3();for(let i=0;i<o.geometry.attributes.position.count;i++){o.getVertexPosition(i,p);p.applyMatrix4(o.matrixWorld);vertices++;if(!p.toArray().every(Number.isFinite))nonFinite++;else bounds.expandByPoint(p);}}});
  return {asset:selected,pose:poseSelect.value,vertices,nonFinite,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},calls:renderer.info.render.calls,triangles:renderer.info.render.triangles};
}
// Read-only measurements and deterministic controls for screenshots of this isolated page.
Object.assign(window,{characterStudy:{choose,view,pose,inspect,render(){renderer.render(scene,camera);},canvas:renderer.domElement}});
void choose('styled').then(()=>Object.assign(window,{studyReady:true})).catch(()=>{});
