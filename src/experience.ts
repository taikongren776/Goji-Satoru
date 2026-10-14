import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { TechniqueEffects, gravityDistortionShader } from './effects';
import { TechniqueAudio } from './audio';
import { EyeTransition } from './appearance';
import { SKILLS, SkillTimeline, ease, clamp } from './timeline';
import type { SkillId, Phase } from './timeline';

type Callbacks = {
  state: (skill: SkillId | null, phase: Phase | null, progress: number, activity?: string | null) => void;
  eyes: (visible: boolean) => void;
  fps: (fps: number) => void;
  contextLost: () => void;
};
type Rock = { mesh: THREE.Object3D; home: THREE.Vector3; rotation: THREE.Euler; scale: number };

export class Experience {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(30, 1, .05, 40);
  readonly renderer: THREE.WebGLRenderer;
  readonly controls: OrbitControls;
  readonly timeline = new SkillTimeline();
  readonly appearance = new EyeTransition();
  readonly audio = new TechniqueAudio();
  private composer: EffectComposer;
  private bloom: UnrealBloomPass;
  private distortion: ShaderPass;
  private effects: TechniqueEffects;
  private model?: THREE.Group;
  private mixer?: THREE.AnimationMixer;
  private actions = new Map<string, THREE.AnimationAction>();
  private blindfold?: THREE.Object3D;
  private leftSocket?: THREE.Object3D;
  private rightSocket?: THREE.Object3D;
  private centerSocket?: THREE.Object3D;
  private rocks: Rock[] = [];
  private rockInstances: THREE.InstancedMesh;
  private floorRing: THREE.Mesh<THREE.TorusGeometry,THREE.MeshBasicMaterial>;
  private aura: THREE.Points;
  private clock = 0;
  private last = 0;
  private raf = 0;
  private frames = 0;
  private frameTime = 0;
  private latestFps = 0;
  private low = false;
  private reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  private savedPosition = new THREE.Vector3();
  private savedTarget = new THREE.Vector3();
  private savedFov = 30;
  private defaultPosition = new THREE.Vector3(1.95, 1.78, 4.18);
  private defaultTarget = new THREE.Vector3(0, .99, 0);
  private leftPoint = new THREE.Vector3();
  private rightPoint = new THREE.Vector3();
  private centerPoint = new THREE.Vector3();
  private temporary = new THREE.Vector3();
  private observer: ResizeObserver;
  private eyeMeshes: THREE.Mesh[] = [];
  private coverMaterials: THREE.Material[] = [];
  private returning?: { time: number; action?: THREE.AnimationAction; weight: number; position: THREE.Vector3; target: THREE.Vector3; fov: number };
  private loadMs = 0;
  private disposed = false;
  ready = false;

  constructor(private container: HTMLElement, private callbacks: Callbacks) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setClearColor(0x080c12, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.info.autoReset = false;
    this.renderer.domElement.setAttribute('aria-label', '五条悟 3D 模型，拖动旋转，滚轮缩放');
    this.renderer.domElement.setAttribute('role','img');
    this.container.append(this.renderer.domElement);
    this.renderer.domElement.addEventListener('webglcontextlost', event => {
      event.preventDefault(); this.stop(); this.ready = false; this.callbacks.contextLost();
    });
    this.camera.position.copy(this.defaultPosition);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.copy(this.defaultTarget);
    this.controls.enableDamping = true; this.controls.dampingFactor = .065;
    this.controls.enablePan = false;
    this.controls.minDistance = 2.1; this.controls.maxDistance = 8;
    this.controls.minPolarAngle = .45; this.controls.maxPolarAngle = Math.PI * .55;
    this.controls.update();
    this.scene.fog = new THREE.FogExp2(0x080c12, .042);
    this.scene.add(new THREE.HemisphereLight(0xdbe5f4, 0x20232b, 1.2));
    const key = new THREE.DirectionalLight(0xffeadb, 2.1);key.position.set(-2, 5, 4);
    key.castShadow = true;key.shadow.mapSize.set(1024,1024);
    Object.assign(key.shadow.camera, {left:-2,right:2,top:3,bottom:-2,near:.1,far:12});
    key.shadow.normalBias=.025;key.shadow.bias=-.0001;this.scene.add(key);
    key.shadow.radius=3;
    const rim = new THREE.DirectionalLight(0x9dbbff, 1.7);rim.position.set(1.5, 3, -3);this.scene.add(rim);
    const fill = new THREE.DirectionalLight(0xd7e8ff, .7);fill.position.set(3,1,2);this.scene.add(fill);

    const stage = new THREE.Mesh(new THREE.CylinderGeometry(1.03,1.08,.065,96),new THREE.MeshStandardMaterial({color:0x17212c,roughness:.75,metalness:.42}));
    stage.position.y=-.031;stage.receiveShadow=true;this.scene.add(stage);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(80,80),new THREE.ShadowMaterial({color:0x000000,opacity:.25}));
    floor.rotation.x=-Math.PI/2;floor.position.y=-.067;floor.receiveShadow=true;this.scene.add(floor);
    this.floorRing=new THREE.Mesh(new THREE.TorusGeometry(1.04,.0025,5,128),new THREE.MeshBasicMaterial({color:0x739abb,transparent:true,opacity:.55}));
    this.floorRing.rotation.x=-Math.PI/2;this.floorRing.position.y=.004;this.scene.add(this.floorRing);
    for(const radius of [.90,1.27,1.30]) {
      const ring=new THREE.Mesh(new THREE.TorusGeometry(radius,.0014,4,128),new THREE.MeshBasicMaterial({color:0x65839c,transparent:true,opacity:radius>.99?.16:.25}));
      ring.rotation.x=-Math.PI/2;ring.position.y=-.025;this.scene.add(ring);
    }
    const tickGeo=new THREE.BoxGeometry(.002,.001,.035);
    const tickMat=new THREE.MeshBasicMaterial({color:0x658aa5,transparent:true,opacity:.32});
    const ticks=new THREE.InstancedMesh(tickGeo,tickMat,72),tick=new THREE.Object3D();
    for(let i=0;i<72;i++) {
      const a=i/72*Math.PI*2;
      tick.position.set(Math.sin(a)*1.23,-.021,Math.cos(a)*1.23);tick.rotation.y=a;tick.scale.z=i%6===0?1.8:1;
      tick.updateMatrix();ticks.setMatrixAt(i,tick.matrix);
    }
    this.scene.add(ticks);
    const rockGeo=new THREE.DodecahedronGeometry(1,0);
    const rockMat=new THREE.MeshStandardMaterial({color:0x344352,roughness:.93,metalness:.13,flatShading:true});
    this.rockInstances=new THREE.InstancedMesh(rockGeo,rockMat,32);this.rockInstances.castShadow=true;this.rockInstances.receiveShadow=true;this.rockInstances.frustumCulled=false;
    this.rockInstances.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.scene.add(this.rockInstances);
    for(let i=0;i<32;i++) {
      const a=i*2.39996,r=.70+(Math.sin(i*7.7)*.5+.5)*.49,size=.018+(Math.sin(i*9.1)*.5+.5)*.040;
      const mesh=new THREE.Object3D();mesh.position.set(Math.cos(a)*r,size*.30,Math.sin(a)*r);
      mesh.scale.set(size,size*.65,size*.84);mesh.rotation.set(i*1.2,i*.7,i*.4);
      this.rocks.push({mesh,home:mesh.position.clone(),rotation:mesh.rotation.clone(),scale:size});
    }
    this.syncDebris();
    const points=new Float32Array(180*3);
    for(let i=0;i<points.length;i+=3){points[i]=Math.sin(i*12.3)*2.2;points[i+1]=(Math.sin(i*1.4)*.5+.5)*3;points[i+2]=Math.cos(i*5.7)*1.8;}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(points,3));
    this.aura=new THREE.Points(geo,new THREE.PointsMaterial({color:0x96c4e3,size:.008,transparent:true,opacity:.35,depthWrite:false,sizeAttenuation:true}));this.scene.add(this.aura);
    this.effects=new TechniqueEffects(this.scene);
    this.composer=new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene,this.camera));
    this.distortion=new ShaderPass(gravityDistortionShader);this.composer.addPass(this.distortion);
    this.bloom=new UnrealBloomPass(new THREE.Vector2(1,1),.38,.52,2.1);
    // The stock bloom forces alpha to 1 and creates a black rectangle over the
    // page. Carry actual glow coverage through the blur and compose it over alpha.
    for(const material of this.bloom.separableBlurMaterials){
      material.fragmentShader=material.fragmentShader.replace('gl_FragColor = vec4(diffuseSum/weightSum, 1.0);','vec3 glow = diffuseSum / weightSum; gl_FragColor = vec4(glow, clamp(max(max(glow.r,glow.g),glow.b),0.0,1.0));');
    }
    Object.assign(this.bloom.blendMaterial,{blending:THREE.CustomBlending,blendEquation:THREE.AddEquation,blendSrc:THREE.OneFactor,blendDst:THREE.OneFactor,blendEquationAlpha:THREE.AddEquation,blendSrcAlpha:THREE.OneFactor,blendDstAlpha:THREE.OneMinusSrcAlphaFactor});
    this.composer.addPass(this.bloom);this.composer.addPass(new OutputPass());
    this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(container);
    document.addEventListener('visibilitychange',this.visibilityChanged);
    this.resize();this.raf=requestAnimationFrame(this.frame);
  }

  async load(progress:(percent:number)=>void):Promise<void> {
    const began=performance.now();
    const gltf=await new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}models/gojo.glb`,event=>{
      if(event.total)progress(Math.min(95,event.loaded/event.total*95));
    });
    const names=['Blindfold','FX_Hand_L','FX_Hand_R','FX_Center'];
    for(const name of names)if(!gltf.scene.getObjectByName(name))throw new Error(`模型缺少节点：${name}`);
    for(const name of ['Idle','RevealEyes','CoverEyes',...Object.values(SKILLS).map(s=>s.clip)])if(!gltf.animations.find(a=>a.name===name))throw new Error(`模型缺少动画：${name}`);
    this.model=gltf.scene;this.scene.add(this.model);
    this.blindfold=this.model.getObjectByName('Blindfold');
    this.leftSocket=this.model.getObjectByName('FX_Hand_L');
    this.rightSocket=this.model.getObjectByName('FX_Hand_R');
    this.centerSocket=this.model.getObjectByName('FX_Center');
    const rampData=new Uint8Array([65,65,65,255,139,139,139,255,214,214,214,255,255,255,255,255]);
    const ramp=new THREE.DataTexture(rampData,4,1);ramp.minFilter=ramp.magFilter=THREE.NearestFilter;ramp.needsUpdate=true;
    const cache=new Map<string,THREE.MeshToonMaterial|THREE.MeshStandardMaterial>();
    const meshes:THREE.Mesh[]=[];this.model.traverse(o=>{if((o as THREE.Mesh).isMesh)meshes.push(o as THREE.Mesh);});
    const makeMaterial=(source:THREE.Material):THREE.MeshToonMaterial|THREE.MeshStandardMaterial=>{
      if(cache.has(source.name))return cache.get(source.name)!;
      const old=source as THREE.MeshStandardMaterial;
      const fabric=/Uniform|Blindfold|Seam/.test(source.name);
      const skin=/^Skin/.test(source.name);
      const leather=/^Boot/.test(source.name);
      const mat=fabric||skin||leather?new THREE.MeshStandardMaterial({name:source.name,color:old.color,roughness:fabric?.94:skin?.79:.72,metalness:0}):new THREE.MeshToonMaterial({name:source.name,color:old.color,gradientMap:ramp});
      if(source.name.startsWith('SixEyes')||source.name==='EyeGlint'){
        mat.emissive.copy(old.color);mat.emissiveIntensity=source.name==='EyeGlint'?1.35:.6;
      }
      if(source.name==='Uniform')mat.color.set(0x373f50);
      if(source.name==='UniformFold')mat.color.set(0x354453);
      if(source.name.startsWith('Hair'))mat.color.multiplyScalar(.74);
      if(source.name==='SkinHighlight')mat.color.set(0xf0cbbb);
      if(source.name==='Skin')mat.color.set(0xd8a995);
      cache.set(source.name,mat);return mat;
    };
    const originalMaterials=new Set<THREE.Material>();
    for(const mesh of meshes){
      for(const mat of Array.isArray(mesh.material)?mesh.material:[mesh.material])originalMaterials.add(mat);
      mesh.material=Array.isArray(mesh.material)?mesh.material.map(makeMaterial):makeMaterial(mesh.material);
      mesh.castShadow=true;mesh.receiveShadow=false;mesh.frustumCulled=false;
      if(mesh.morphTargetDictionary?.Blink!==undefined)this.eyeMeshes.push(mesh);
    }
    originalMaterials.forEach(m=>m.dispose());
    this.coverMaterials=[...cache.values()].filter(m=>m.name.startsWith('Blindfold'));
    this.coverMaterials.forEach(m=>{m.transparent=true;});
    this.mixer=new THREE.AnimationMixer(this.model);
    for(const clip of gltf.animations){
      const action=this.mixer.clipAction(clip);this.actions.set(clip.name,action);
      if(clip.name==='Idle')action.play();else{action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;}
    }
    this.model.updateMatrixWorld(true);this.ready=true;this.loadMs=Math.round(performance.now()-began);progress(100);
  }

  start(id:SkillId):boolean {
    if(!this.ready||this.appearance.active||this.returning||!this.timeline.start(id))return false;
    // Flush OrbitControls damping before saving the exact view to restore.
    this.controls.enableDamping=false;this.controls.update();this.controls.enableDamping=true;
    this.savedPosition.copy(this.camera.position);this.savedTarget.copy(this.controls.target);this.savedFov=this.camera.fov;
    this.controls.enabled=false;
    const action=this.actions.get(SKILLS[id].clip)!;action.reset().play();action.paused=true;action.enabled=true;
    this.audio.start(id);this.callbacks.state(id,'charge',0);return true;
  }
  stop():void {
    const id=this.timeline.active;
    if(this.returning)return;
    const action=id?this.actions.get(SKILLS[id].clip):this.appearance.active?this.actions.get(this.appearance.clip):undefined;
    if(action){
      this.returning={time:0,action,weight:action.getEffectiveWeight(),position:this.camera.position.clone(),target:this.camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(this.camera.position.distanceTo(this.controls.target)).add(this.camera.position),fov:this.camera.fov};
      this.controls.enabled=false;
    }
    this.appearance.cancel();this.applyCover(this.appearance.visible?0:1);this.callbacks.eyes(this.appearance.visible);
    this.timeline.reset();this.effects.reset();this.audio.stop();
    if(!this.returning){this.actions.get('Idle')?.setEffectiveWeight(1);this.controls.enabled=true;}
    for(const rock of this.rocks){rock.mesh.position.copy(rock.home);rock.mesh.rotation.copy(rock.rotation);rock.mesh.scale.set(rock.scale,rock.scale*.65,rock.scale*.84);}
    this.syncDebris();
    this.floorRing.material.color.set(0x739abb);
    this.callbacks.state(null,null,0,this.returning?'return':null);
  }
  setEyes(visible:boolean,animate=true):boolean {
    if(!animate){this.appearance.visible=visible;this.appearance.target=visible;this.applyCover(visible?0:1);return true;}
    if(!this.ready||this.timeline.active||this.returning||!this.appearance.start(visible))return false;
    this.savedPosition.copy(this.camera.position);this.savedTarget.copy(this.controls.target);this.savedFov=this.camera.fov;
    this.controls.enabled=false;
    const action=this.actions.get(this.appearance.clip)!;action.reset().play();action.paused=true;
    this.callbacks.state(null,null,0,visible?'reveal':'cover');return true;
  }
  private applyCover(opacity:number,lift=0):void {
    if(this.blindfold){this.blindfold.visible=opacity>.005;this.blindfold.position.y=lift;}
    this.coverMaterials.forEach(m=>m.opacity=opacity);
  }
  resetView():void {
    this.stop();
    this.savedPosition.copy(this.defaultPosition);this.savedTarget.copy(this.defaultTarget);this.savedFov=30;
    if(!this.returning)this.returning={time:0,weight:0,position:this.camera.position.clone(),target:this.controls.target.clone(),fov:this.camera.fov};
    this.controls.enabled=false;this.callbacks.state(null,null,0,'return');
  }
  setReduced(value:boolean):void {this.reduced=value;this.bloom.strength=value?.15:.4;}
  setQuality(value:'high'|'low'):void {this.low=value==='low';this.bloom.enabled=!this.low;this.resize();}
  get reducedMotion():boolean{return this.reduced;}
  get diagnostics(){const memory=(performance as Performance&{memory?:{usedJSHeapSize:number}}).memory;return{ready:this.ready,skill:this.timeline.active,time:this.timeline.elapsed,phase:this.timeline.phase,activity:this.appearance.active?this.appearance.clip:this.returning?'return':null,fps:this.latestFps,loadMs:this.loadMs,heapMB:memory?Math.round(memory.usedJSHeapSize/1048576*10)/10:null,clips:[...this.actions.keys()],camera:this.camera.position.toArray(),target:this.controls.target.toArray(),eyesVisible:this.appearance.visible,drawCalls:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles,geometries:this.renderer.info.memory.geometries,textures:this.renderer.info.memory.textures,quality:this.low?'low':'high',reduced:this.reduced};}

  private resize():void {
    const width=Math.max(1,this.container.clientWidth),height=Math.max(1,this.container.clientHeight);
    const pixel=Math.min(window.devicePixelRatio,this.low?1:1.65);
    this.renderer.setPixelRatio(pixel);this.renderer.setSize(width,height);
    this.composer.setPixelRatio(pixel);this.composer.setSize(width,height);
    this.effects.quality(this.low,pixel);this.camera.aspect=width/height;this.camera.updateProjectionMatrix();
  }
  private visibilityChanged=():void=>{
    this.last=0;
    if(document.hidden)this.audio.stop();
    else if(this.timeline.active)this.audio.start(this.timeline.active);
  };
  private frame=(stamp:number):void=>{
    if(this.disposed)return;
    this.raf=requestAnimationFrame(this.frame);
    if(document.hidden)return;
    const rawDelta=this.last?(stamp-this.last)/1000:0;
    const delta=Math.min(rawDelta,.05);this.last=stamp;this.clock+=delta;
    if(rawDelta>0){this.frames++;this.frameTime+=rawDelta;}
    if(this.frameTime>1){
      this.latestFps=Math.round(this.frames/this.frameTime);this.callbacks.fps(this.latestFps);this.frameTime=0;this.frames=0;
      this.renderer.domElement.dataset.diagnostics=JSON.stringify(this.diagnostics);
    }
    const idle=this.actions.get('Idle');if(idle)idle.time=this.clock%4;
    const finished=this.timeline.advance(delta);
    const id=this.timeline.active;
    if(id){
      const d=SKILLS[id],time=this.timeline.elapsed;
      const action=this.actions.get(d.clip)!;
      const weight=Math.min(ease(time/.18),1-ease((time-d.duration+.22)/.22));
      action.time=time;action.setEffectiveWeight(weight);idle?.setEffectiveWeight(1-weight);
      this.mixer?.update(0);this.model?.updateMatrixWorld(true);
      this.leftSocket!.getWorldPosition(this.leftPoint);this.rightSocket!.getWorldPosition(this.rightPoint);this.centerSocket!.getWorldPosition(this.centerPoint);
      this.effects.update(id,time,this.leftPoint,this.rightPoint,this.centerPoint,this.reduced);
      this.animateDebris(id,time);this.animateCamera(id,time);
      this.audio.update(time);this.callbacks.state(id,this.timeline.phase,this.timeline.progress);
      this.floorRing.material.color.set(d.color);
      if(finished)this.stop();
    }else if(this.appearance.active){
      const state=this.appearance,done=state.advance(delta),time=state.elapsed;
      const action=this.actions.get(state.clip)!;
      const weight=ease(time/.2)*(1-ease((time-2.15)/.25));
      action.time=time;action.setEffectiveWeight(weight);idle?.setEffectiveWeight(1-weight);
      this.mixer?.update(0);
      const reveal=ease((time-.72)/.52),cover=ease((time-1.05)/.42);
      this.applyCover(state.target?1-reveal:cover,state.target?reveal*.055:(1-cover)*.055);
      this.callbacks.eyes(state.visible);
      if(done){action.stop();state.finish();this.applyCover(state.visible?0:1);idle?.setEffectiveWeight(1);this.controls.enabled=true;this.callbacks.state(null,null,0);}
    }else if(this.returning){
      const r=this.returning;r.time+=delta;const progress=ease(r.time/.55);
      r.action?.setEffectiveWeight(r.weight*(1-progress));idle?.setEffectiveWeight(1-r.weight*(1-progress));this.mixer?.update(0);
      this.camera.position.copy(r.position).lerp(this.savedPosition,progress);this.controls.target.copy(r.target).lerp(this.savedTarget,progress);
      this.camera.fov=THREE.MathUtils.lerp(r.fov,this.savedFov,progress);this.camera.updateProjectionMatrix();this.camera.lookAt(this.controls.target);
      if(progress===1){r.action?.stop();this.returning=undefined;this.controls.enabled=true;this.callbacks.state(null,null,0);}
    }else{
      this.mixer?.update(0);
      // Move the orbit center toward the face while zooming in, so facial
      // details remain inspectable instead of disappearing above the canvas.
      const faceFocus=.99+.61*ease((3.8-this.controls.getDistance())/1.7);
      const shift=(faceFocus-this.controls.target.y)*.16;
      this.controls.target.y+=shift;this.camera.position.y+=shift;
      this.controls.update();
    }
    const blinkPhase=this.clock%4.7;
    const blink=blinkPhase<.16?Math.sin(blinkPhase/.16*Math.PI):0;
    for(const mesh of this.eyeMeshes)mesh.morphTargetInfluences![mesh.morphTargetDictionary!.Blink]=this.appearance.active?Math.max(blink,1-ease((this.appearance.elapsed-.85)/.40)):blink;
    if(!this.reduced){this.aura.rotation.y=this.clock*.025;this.aura.position.y=Math.sin(this.clock*.4)*.03;}
    this.distortion.enabled=this.effects.warpStrength>.001;
    if(this.distortion.enabled){
      this.temporary.copy(this.effects.focus).project(this.camera);
      const u=this.distortion.uniforms;u.uCenter.value.set(this.temporary.x*.5+.5,this.temporary.y*.5+.5);
      u.uAspect.value=this.camera.aspect;u.uStrength.value=this.effects.warpStrength;u.uTime.value=this.timeline.elapsed;
      u.uRadius.value=this.effects.warpRadius/(Math.max(1,this.camera.position.distanceTo(this.effects.focus))*Math.tan(THREE.MathUtils.degToRad(this.camera.fov)*.5)*2);
    }
    this.renderer.info.reset();this.composer.render();
  };
  private animateDebris(id:SkillId,t:number):void{
    const d=SKILLS[id];const recover=ease((t-d.releaseUntil)/(d.duration-d.releaseUntil));
    const p=ease(t/d.chargeUntil)*(1-recover);
    this.rocks.forEach((rock,i)=>{
      const home=rock.home;
      if(id==='blue'){
        const a=i*2.4+t*(1+i%3*.18),r=.3+(i%5)*.10;
        this.temporary.set(this.effects.focus.x+Math.cos(a)*r,this.effects.focus.y+Math.sin(a*1.3)*r*.6,this.effects.focus.z+Math.sin(a)*r);
        rock.mesh.position.copy(home).lerp(this.temporary,p*.84);
      }else if(id==='red'){
        const shock=ease((t-d.chargeUntil)/.65)*(1-recover),r=1+shock*1.5;
        rock.mesh.position.set(home.x*r,home.y+Math.sin(shock*Math.PI)*(.25+i%4*.11),home.z*r);
      }else{
        const lift=ease(t/3)*(1-recover),release=ease((t-d.chargeUntil)/.75)*(1-recover);
        rock.mesh.position.set(home.x*(1+release*.8),home.y+lift*(.10+i%4*.09),home.z+release*1.5);
        const size=rock.scale*(1-release*.85);rock.mesh.scale.set(size,size*.65,size*.84);
      }
      rock.mesh.rotation.set(rock.rotation.x+t*p*.6,rock.rotation.y+t*p*.8,rock.rotation.z+t*p*.2);
    });
    this.syncDebris();
  }
  private syncDebris():void {this.rocks.forEach((rock,i)=>{rock.mesh.updateMatrix();this.rockInstances.setMatrixAt(i,rock.mesh.matrix);});this.rockInstances.instanceMatrix.needsUpdate=true;}
  private animateCamera(id:SkillId,t:number):void{
    if(this.reduced){this.camera.position.copy(this.savedPosition);this.camera.lookAt(this.savedTarget);return;}
    const d=SKILLS[id],enter=ease(t/.85),recover=ease((t-d.releaseUntil)/(d.duration-d.releaseUntil));
    const amount=enter*(1-recover);
    const position=id==='blue'?new THREE.Vector3(2.4,1.93,3.55):id==='red'?new THREE.Vector3(3.6,2.2,4.7):new THREE.Vector3(1.4,1.88,3.7);
    const target=id==='blue'?new THREE.Vector3(-.12,1.15,.30):id==='red'?new THREE.Vector3(0,1.20,.85):new THREE.Vector3(0,1.30,.30);
    if(id==='purple'){
      const widen=ease((t-3.7)/1.0);
      position.lerp(new THREE.Vector3(4.1,2.3,5.3),widen);
      target.lerp(new THREE.Vector3(0,1.20,1.35),widen);
    }
    this.camera.position.copy(this.savedPosition).lerp(position,amount);
    this.temporary.copy(this.savedTarget).lerp(target,amount);
    const hit=clamp((t-d.chargeUntil)/.12)*(1-ease((t-d.chargeUntil)/.5));
    if(id!=='blue'){this.camera.position.x+=Math.sin(t*95)*hit*.013;this.camera.position.y+=Math.cos(t*83)*hit*.008;}
    this.camera.fov=THREE.MathUtils.lerp(this.savedFov,id==='purple'?35:32,amount);this.camera.updateProjectionMatrix();this.camera.lookAt(this.temporary);
  }
  dispose():void{
    this.disposed=true;cancelAnimationFrame(this.raf);this.audio.dispose();this.observer.disconnect();this.controls.dispose();
    document.removeEventListener('visibilitychange',this.visibilityChanged);
    const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>();
    this.scene.traverse(o=>{const mesh=o as THREE.Mesh;if(mesh.geometry)geometries.add(mesh.geometry);if(mesh.material)for(const m of Array.isArray(mesh.material)?mesh.material:[mesh.material])materials.add(m);});
    for(const mat of materials){for(const value of Object.values(mat))if(value instanceof THREE.Texture)textures.add(value);mat.dispose();}
    geometries.forEach(g=>g.dispose());textures.forEach(t=>t.dispose());
    this.model?.traverse(o=>{if((o as THREE.SkinnedMesh).isSkinnedMesh)(o as THREE.SkinnedMesh).skeleton.dispose();});
    this.composer.passes.forEach(pass=>pass.dispose());this.composer.dispose();this.renderer.dispose();this.renderer.domElement.remove();
  }
}
