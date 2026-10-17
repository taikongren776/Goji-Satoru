import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='output/playwright/vrm-integration';await mkdir(out,{recursive:true});
await writeFile(`${out}/audit.html`,`<!doctype html><style>body{margin:0}canvas{display:block}</style><script type="module">
import * as THREE from '/node_modules/three/build/three.module.js';
import {GLTFLoader} from '/node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import {VRMLoaderPlugin,VRMUtils} from '/node_modules/@pixiv/three-vrm/lib/three-vrm.module.js';
import {CharacterAdapter} from '/src/character-adapter.ts';
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(1000,1000);renderer.setClearColor(0x20252e);document.body.append(renderer.domElement);
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(30,1,.01,100);scene.add(new THREE.HemisphereLight(0xffffff,0x778899,2));const light=new THREE.DirectionalLight(0xffffff,2);light.position.set(-2,4,4);scene.add(light);
const loader=new GLTFLoader();loader.register(p=>new VRMLoaderPlugin(p));const gltf=await loader.loadAsync('/models/candidates/limitless-runtime.vrm');const vrm=gltf.userData.vrm;VRMUtils.rotateVRM0(vrm);vrm.humanoid.autoUpdateHumanBones=false;vrm.update(0);scene.add(gltf.scene);
const manifest=await(await fetch('/models/character-production/whitehair-preview.json')).json();const adapter=new CharacterAdapter(gltf.scene,gltf.animations,manifest);
const bone=n=>vrm.humanoid.getRawBoneNode(n);const cover=gltf.scene.getObjectByName('Blindfold');
function sample(name,time,view='front',uncovered=false){
  for(const a of adapter.actions.values()){a.stop();a.setEffectiveWeight(0);}
  const a=adapter.begin(name);a.setEffectiveWeight(1);a.time=time;adapter.evaluate();
  const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
  let opacity=uncovered?0:1,lift=0;
  if(name==='RevealEyes'){const t=ease((time-.72)/.52);opacity=1-t;lift=t*.055;}
  if(name==='CoverEyes'){const t=ease((time-1.05)/.42);opacity=t;lift=(1-t)*.055;}
  adapter.setCover(opacity,lift);
  let target=new THREE.Vector3(0,.97,0);camera.position.set(view==='side'?4.35:view==='45'?2.7:0,1.22,view==='side'?0:view==='45'?3.5:4.35);
  if(view==='face'){target=bone('head').getWorldPosition(new THREE.Vector3());target.y+=.055;camera.position.copy(target).add(new THREE.Vector3(0,.015,.85));}
  if(view==='face-side'){target=bone('head').getWorldPosition(new THREE.Vector3());target.y+=.035;camera.position.copy(target).add(new THREE.Vector3(.8,.015,.15));}
  if(view==='face-left'){target=bone('head').getWorldPosition(new THREE.Vector3());target.y+=.035;camera.position.copy(target).add(new THREE.Vector3(-.8,.015,.15));}
  if(view==='face-45'){target=bone('head').getWorldPosition(new THREE.Vector3());target.y+=.045;camera.position.copy(target).add(new THREE.Vector3(.60,.015,.60));}
  if(view==='hands'){target=bone('rightHand').getWorldPosition(new THREE.Vector3());camera.position.copy(target).add(new THREE.Vector3(-.22,.15,.60));}
  if(view==='upper'){target.set(0,1.45,.10);camera.position.set(1.2,1.7,2.4);}
  camera.lookAt(target);renderer.render(scene,camera);return {name,time,sockets:Object.fromEntries(['FX_Hand_L','FX_Hand_R','FX_Center'].map(n=>[n,adapter.socket(n).toArray()])),coverVisible:cover.visible};
}
// Compare animated edge lengths to the same asset in bind pose. Ignore sub-mm
// edges for stretch counts and report warnings, never a global artistic PASS.
const groups=new Map();gltf.scene.traverse(o=>{if(o.isSkinnedMesh){const p=o.geometry.attributes.position;let g=groups.get(p);if(!g){g={mesh:o,edges:new Map(),ids:new Set()};groups.set(p,g);}const idx=o.geometry.index;for(let i=0;i<idx.count;i+=3)for(let k=0;k<3;k++){const a=idx.getX(i+k),b=idx.getX(i+(k+1)%3),key=a<b?a+':'+b:b+':'+a;g.ids.add(a);g.ids.add(b);g.edges.set(key,[a,b]);}}});
const regions=[];
for(const g of groups.values()){
  const geo=g.mesh.geometry,si=geo.attributes.skinIndex,sw=geo.attributes.skinWeight;
  const selected=i=>{for(let k=0;k<4;k++)if(sw.getComponent(i,k)>.1&&/Hand|Index|Middle|Ring|Little|Thumb|Shoulder|UpperArm/.test(g.mesh.skeleton.bones[si.getComponent(i,k)].name))return true;return false;};
  const edges=[];for(const [a,b] of g.edges.values())if(selected(a)||selected(b)){const pa=new THREE.Vector3().fromBufferAttribute(geo.attributes.position,a),pb=new THREE.Vector3().fromBufferAttribute(geo.attributes.position,b),length=pa.distanceTo(pb);if(length>.001)edges.push({a,b,length});}
  if(edges.length)regions.push({mesh:g.mesh,edges,ids:[...new Set(edges.flatMap(e=>[e.a,e.b]))]});
}
function audit(){const results=[];let nonFinite=0;
 for(const name of ['Idle','CastBlue','CastRed','CastPurple','RevealEyes','CoverEyes']){
  const duration=adapter.actions.get(name).getClip().duration;let maxRatio=0,over3=0,worst=null,maxHandOverlapFrames=0;
  for(let f=0;f<=Math.round(duration*30);f++){
   sample(name,Math.min(duration,f/30));
   for(const r of regions){r.mesh.skeleton.update();const points=new Map();for(const i of r.ids){const v=r.mesh.getVertexPosition(i,new THREE.Vector3());points.set(i,v);if(!v.toArray().every(Number.isFinite))nonFinite++;}
    for(const e of r.edges){const ratio=points.get(e.a).distanceTo(points.get(e.b))/e.length;if(ratio>3)over3++;if(ratio>maxRatio){maxRatio=ratio;worst={frame:f,time:f/30,mesh:r.mesh.name,vertices:[e.a,e.b],restLength:e.length,ratio};}}
   }
  }results.push({name,frames:Math.round(duration*30)+1,maxRatio,edgeFrameEventsOver3:over3,worst});
 }return {results,nonFinite,note:'Bind-pose-relative hand/shoulder edge measurements, not collision or aesthetic approval.'};}
window.audit={sample,audit};sample('Idle',0);window.ready=true;
</script>`);
const browser=await chromium.launch({channel:'msedge',headless:true});const errors=[];
try{const page=await browser.newPage({viewport:{width:1000,height:1000}});page.on('pageerror',e=>errors.push(e.message));await page.goto(`http://127.0.0.1:5173/${out}/audit.html`);await page.waitForFunction(()=>window.ready,null,{timeout:60000});
 const shots=[['idle','Idle',0,'front'],['covered-face','Idle',0,'face'],['covered-side','Idle',0,'face-side'],['uncovered-face','Idle',0,'face',true],['blue','CastBlue',1.65,'upper'],['red-charge','CastRed',1.12,'upper'],['red-release','CastRed',1.5,'upper'],['red-hand','CastRed',1.5,'hands'],['purple-fuse','CastPurple',3.8,'upper'],['purple-release','CastPurple',4.7,'upper'],['reveal-contact','RevealEyes',.92,'face'],['reveal-lift','RevealEyes',1.35,'face'],['cover-contact','CoverEyes',1.32,'face']];
 shots.push(['covered-45','Idle',0,'face-45'],['covered-left','Idle',0,'face-left'],['reveal-side','RevealEyes',.92,'face-side'],['cover-side','CoverEyes',1.32,'face-side']);
 const snapshots=[];for(const [id,...args] of shots){snapshots.push(await page.evaluate(a=>window.audit.sample(...a),args));await page.screenshot({path:`${out}/${id}.png`});}
 const measurements=await page.evaluate(()=>window.audit.audit());await writeFile(`${out}/deformation.json`,JSON.stringify({...measurements,snapshots,errors},null,2));if(measurements.nonFinite||errors.length)throw Error('Non-finite mesh data or browser error');console.log(JSON.stringify(measurements));
}finally{await browser.close();}
