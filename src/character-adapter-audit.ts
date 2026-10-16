/** Independent neutral-lit inspection. Not imported by the LIMITLESS production UI. */
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {CharacterAdapter} from './character-adapter';
import {ANIMATION_SECONDS,SOCKET_NAMES,parseCharacterManifest} from './character-contract';
import type {CharacterAnimation} from './character-contract';

if(!import.meta.env.DEV)throw new Error('Adapter audit is development-only');
type Audit={ready:boolean;error?:string;show:(name:CharacterAnimation,time:number,eyes?:boolean)=>unknown};
declare global{interface Window{adapterAudit?:Audit}}
const api:Audit={ready:false,show:()=>null};window.adapterAudit=api;
try{
  const params=new URLSearchParams(location.search),url=new URL(params.get('manifest')||'/models/character-production/fixtures/gojo-final.json',location.href);
  const response=await fetch(url);if(!response.ok)throw new Error(`Manifest HTTP ${response.status}`);
  const manifest=parseCharacterManifest(await response.json());
  const gltf=await new GLTFLoader().loadAsync(new URL(manifest.asset,url).href);
  if(params.get('asset'))throw new Error('Asset override not permitted; use a manifest');
  const adapter=new CharacterAdapter(gltf.scene,gltf.animations,manifest);
  const originalMaterials=new Map<THREE.Mesh,THREE.Material|THREE.Material[]>();adapter.root.traverse(o=>{if(o instanceof THREE.Mesh)originalMaterials.set(o,o.material);});
  const scene=new THREE.Scene();scene.background=new THREE.Color('#20242b');scene.add(adapter.root);
  scene.add(new THREE.HemisphereLight(0xffffff,0x60646a,2));const key=new THREE.DirectionalLight(0xffffff,2);key.position.set(-2,4,4);scene.add(key);
  const camera=new THREE.PerspectiveCamera(32,1,.01,30);camera.position.set(2.5,1.45,4);camera.lookAt(0,1,0);
  const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(800,800);renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;document.body.append(renderer.domElement);
  const markers=SOCKET_NAMES.map((name,i)=>{const o=new THREE.Mesh(new THREE.SphereGeometry(.015,12,8),new THREE.MeshBasicMaterial({color:[0x36aaff,0xff586b,0xbe8aff][i]}));scene.add(o);return {name,o};});
  api.show=(name,time,eyes=false)=>{
    if(!(name in ANIMATION_SECONDS)||!Number.isFinite(time))throw new Error('Invalid audit pose');
    adapter.mixer.stopAllAction();for(const a of adapter.actions.values())a.setEffectiveWeight(0);
    const action=adapter.begin(name,name==='CastBlue'?'blue':name==='CastRed'?'red':name==='CastPurple'?'purple':null);
    action.setEffectiveWeight(1);action.paused=true;action.time=THREE.MathUtils.clamp(time,0,ANIMATION_SECONDS[name]);
    adapter.appearance.visible=eyes;adapter.appearance.target=eyes;adapter.appearance.active=false;
    if(name==='RevealEyes'||name==='CoverEyes'){
      adapter.appearance.visible=name==='CoverEyes';adapter.appearance.start(name==='RevealEyes');adapter.appearance.advance(time);
      if(time>=2.4)adapter.appearance.finish();
    }
    adapter.evaluate();adapter.setCover(adapter.appearance.visible?0:1);
    const sockets=Object.fromEntries(markers.map(({name,o})=>{adapter.socket(name,o.position);return [name,o.position.toArray()];}));
    adapter.root.traverse(o=>{if(o instanceof THREE.SkinnedMesh){o.skeleton.update();o.computeBoundingSphere();o.frustumCulled=false;}});
    renderer.render(scene,camera);
    const materialsPreserved=[...originalMaterials].every(([o,m])=>o.material===m);
    const report={asset:manifest.id,animation:adapter.state.animation,skill:adapter.state.skill,progress:adapter.state.progress,blindfold:adapter.state.blindfold,eyesVisible:adapter.state.eyesVisible,sockets,materialsPreserved,logicalClips:[...adapter.actions.keys()]};
    document.getElementById('status')!.textContent=`仅验证接入 · 未通过美术验收\n${manifest.id}\n${name} · ${time.toFixed(2)}s · ${report.blindfold}`;
    return report;
  };
  api.show('Idle',0);api.ready=true;
  window.addEventListener('pagehide',()=>{adapter.dispose();renderer.dispose();});
}catch(e){api.error=String(e);document.getElementById('status')!.textContent=api.error;throw e;}
