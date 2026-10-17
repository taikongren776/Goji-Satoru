// One candidate, one bounded visual/rig inspection. No changes to the VRM or active asset.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.argv[3]||'output/playwright/fast-track/candidate';await mkdir(out,{recursive:true});
const asset=process.argv[2]||'/models/candidates/fast-track-hairsample-male.vrm';
const html=`<!doctype html><html><head><style>body{margin:0;background:#20252e}canvas{display:block}</style></head><body><script type="module">
import * as THREE from '/node_modules/three/build/three.module.js';
import {GLTFLoader} from '/node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import {VRMLoaderPlugin,VRMUtils} from '/node_modules/@pixiv/three-vrm/lib/three-vrm.module.js';
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(1000,1000);renderer.setPixelRatio(1);renderer.setClearColor(0x20252e);document.body.append(renderer.domElement);
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(30,1,.01,100);scene.add(new THREE.HemisphereLight(0xffffff,0x778899,2));const light=new THREE.DirectionalLight(0xffffff,2);light.position.set(-2,4,4);scene.add(light);
const loader=new GLTFLoader();loader.register(p=>new VRMLoaderPlugin(p));
const gltf=await loader.loadAsync(${JSON.stringify(asset)});const vrm=gltf.userData.vrm;VRMUtils.rotateVRM0(vrm);scene.add(vrm.scene);
const bone=n=>vrm.humanoid.getNormalizedBoneNode(n);
window.audit={meta:vrm.meta,animations:gltf.animations.map(a=>a.name),bones:Object.keys(vrm.humanoid.humanBones),render(view){
bone('leftUpperArm').rotation.z=1.3;bone('rightUpperArm').rotation.z=-1.3;
if(view==='shoulder90'){bone('leftUpperArm').rotation.z=0;bone('rightUpperArm').rotation.z=0;}
if(view==='shoulder120'){bone('leftUpperArm').rotation.z=-Math.PI/6;bone('rightUpperArm').rotation.z=Math.PI/6;}
vrm.update(0);vrm.scene.updateMatrixWorld(true);
let target=new THREE.Vector3(0,.88,0);camera.position.set(view==='side'?3.8:view==='45'?2.6:0,1.15,view==='side'?0:3.8);
if(view==='face'){target=bone('head').getWorldPosition(new THREE.Vector3());target.y+=.07;camera.position.copy(target).add(new THREE.Vector3(0,.02,.95));}
if(view==='hand'||view==='hand-back'){target=bone('leftHand').getWorldPosition(new THREE.Vector3());target.y-=.055;camera.position.copy(target).add(new THREE.Vector3(.12,.03,view==='hand'?.42:-.42));}
if(view.startsWith('shoulder')){target.set(0,1.25,0);camera.position.set(1.5,1.7,2.7);}
camera.lookAt(target);renderer.render(scene,camera);
}};window.audit.render('front');window.ready=true;
</script></body></html>`;
await writeFile(`${out}/viewer.html`,html);
const browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1000,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(`http://127.0.0.1:5173/${out}/viewer.html`);await page.waitForFunction(()=>window.ready,null,{timeout:60000});
 for(const view of ['front','45','side','face','hand','hand-back','shoulder90','shoulder120']){await page.evaluate(v=>window.audit.render(v),view);await page.screenshot({path:`${out}/${view}.png`});}
 await writeFile(`${out}/inspection.json`,JSON.stringify({...(await page.evaluate(()=>({meta:window.audit.meta,animations:window.audit.animations,bones:window.audit.bones}))),errors,scope:'Static views and normalized humanoid shoulder poses only. No casting/cover animation approval.'},null,2));
}finally{await browser.close();}
if(errors.length)throw new Error(errors.join('\n'));
console.log('Candidate VRM rendered: 8 views; source unchanged; no production approval.');
