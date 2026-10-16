import * as THREE from 'three';
import {EyeTransition} from './appearance.ts';
import {ANIMATION_SECONDS,SOCKET_NAMES,parseCharacterManifest} from './character-contract.ts';
import type {CharacterAnimation,CharacterManifest,CharacterSocket} from './character-contract.ts';
import type {SkillId} from './timeline.ts';

/** Resolves only unique names. Ambiguous names fail instead of attaching to the wrong bone. */
export function resolveCharacterNode(root:THREE.Object3D,name:string):THREE.Object3D {
  const matches:THREE.Object3D[]=[];root.traverse(o=>{if(o.name===name)matches.push(o);});
  if(matches.length!==1)throw new Error(`Character node ${name}: expected 1 match, got ${matches.length}`);
  return matches[0];
}

export class CharacterAdapter {
  readonly root:THREE.Group;
  readonly manifest:CharacterManifest;
  readonly appearance:EyeTransition;
  readonly mixer:THREE.AnimationMixer;
  private actionMap=new Map<string,THREE.AnimationAction>();
  private sockets=new Map<CharacterSocket,THREE.Object3D>();
  private cover:THREE.Object3D;
  private coverRest:THREE.Vector3;
  private coverMaterials:THREE.Material[]=[];
  private blinkMeshes:{mesh:THREE.Mesh;index:number}[]=[];
  private activeAnimation:CharacterAnimation='Idle';
  private activeSkill:SkillId|null=null;
  private disposed=false;

  constructor(root:THREE.Group,clips:THREE.AnimationClip[],manifest:CharacterManifest,appearance=new EyeTransition()) {
    this.root=root;this.manifest=parseCharacterManifest(manifest);this.appearance=appearance;
    // Validate all bindings before creating helpers or altering materials.
    this.cover=resolveCharacterNode(root,manifest.nodes.Blindfold.node);
    let coverMeshes=0;this.cover.traverse(o=>{if(o instanceof THREE.Mesh)coverMeshes++;});
    if(!coverMeshes)throw new Error('Blindfold binding must contain its renderable cover mesh');
    const sources=SOCKET_NAMES.map(name=>[name,resolveCharacterNode(root,manifest.nodes[name].node)] as const);
    const normalized=(Object.keys(ANIMATION_SECONDS) as CharacterAnimation[]).map(name=>{
      const binding=manifest.animations[name],found=clips.filter(c=>c.name===binding.clip);
      if(found.length!==1)throw new Error(`Animation ${name}: expected one clip ${binding.clip}, got ${found.length}`);
      const source=found[0],duration=ANIMATION_SECONDS[name];
      if(!Number.isFinite(source.duration)||source.duration<=0||source.tracks.length===0)throw new Error(`Invalid animation: ${binding.clip}`);
      if(binding.timing==='exact'&&Math.abs(source.duration-duration)>.01)throw new Error(`${name}: duration ${source.duration} must be ${duration}s (or explicitly use fit)`);
      const copy=source.clone();copy.name=name;
      if(binding.timing==='fit')for(const track of copy.tracks)track.scale(duration/source.duration);
      copy.duration=duration;return copy;
    });
    if(manifest.blink){
      const targets=manifest.blink.nodes?.map(n=>resolveCharacterNode(root,n))||[root];
      const seen=new Set<THREE.Mesh>();
      for(const node of targets)node.traverse(o=>{
        if(o instanceof THREE.Mesh&&!seen.has(o)){const index=o.morphTargetDictionary?.[manifest.blink!.target];if(index!==undefined){seen.add(o);this.blinkMeshes.push({mesh:o,index});}}
      });
      if(!this.blinkMeshes.length)throw new Error(`Missing blink morph: ${manifest.blink.target}`);
    }
    this.coverRest=this.cover.position.clone();
    for(const [name,parent] of sources){
      const binding=manifest.nodes[name],socket=new THREE.Object3D();socket.name=`LIMITLESS_${name}`;
      if(binding.offset)socket.position.fromArray(binding.offset);
      if(binding.rotation)socket.rotation.set(...binding.rotation);
      parent.add(socket);this.sockets.set(name,socket);
    }
    if(manifest.nodes.Blindfold.mode==='fade-lift'){
      // Clone only cover materials: opacity must not fade a shared face/hair material.
      const cache=new Map<THREE.Material,THREE.Material>();
      this.cover.traverse(o=>{if(o instanceof THREE.Mesh){
        const clone=(m:THREE.Material)=>{if(!cache.has(m)){const copy=m.clone();copy.transparent=true;cache.set(m,copy);this.coverMaterials.push(copy);}return cache.get(m)!;};
        o.material=Array.isArray(o.material)?o.material.map(clone):clone(o.material);
      }});
      const used=new Set<THREE.Material>();root.traverse(o=>{if(o instanceof THREE.Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material])used.add(m);});
      for(const original of cache.keys())if(!used.has(original))original.dispose();
    }
    this.mixer=new THREE.AnimationMixer(root);
    for(const clip of normalized){
      const action=this.mixer.clipAction(clip);this.actionMap.set(clip.name,action);
      if(clip.name==='Idle')action.play();else{action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;}
    }
    this.evaluate();
  }
  /** Keys are logical names only, never imported animation names. */
  get actions():ReadonlyMap<string,THREE.AnimationAction>{return this.actionMap;}
  begin(name:CharacterAnimation,skill:SkillId|null=null):THREE.AnimationAction {
    if(this.disposed)throw new Error('Character adapter disposed');
    const action=this.actionMap.get(name)!;action.reset().play();action.paused=name!=='Idle';action.enabled=true;
    this.activeAnimation=name;this.activeSkill=skill;return action;
  }
  endSkill():void {this.activeSkill=null;}
  idle():void {this.activeAnimation='Idle';this.activeSkill=null;}
  get state(){
    const action=this.actionMap.get(this.activeAnimation)!;
    return {animation:this.activeAnimation,skill:this.activeSkill,progress:THREE.MathUtils.clamp(action.time/ANIMATION_SECONDS[this.activeAnimation],0,1),eyesVisible:this.appearance.visible,
      blindfold:this.appearance.active?(this.appearance.target?'revealing':'covering'):(this.appearance.visible?'uncovered':'covered'),root:this.root};
  }
  evaluate():void {this.mixer.update(0);this.root.updateMatrixWorld(true);}
  socket(name:CharacterSocket,target=new THREE.Vector3()):THREE.Vector3 {
    this.root.updateWorldMatrix(true,true);return this.sockets.get(name)!.getWorldPosition(target);
  }
  setCover(opacity:number,lift=0):void {
    if(this.manifest.nodes.Blindfold.mode==='authored'){
      // The clip owns transformations and morphs. Visibility commits at the same
      // logical hand-contact event as cancellation, without overriding the clip.
      this.cover.visible=this.appearance.active||!this.appearance.visible;
    }else{
      this.cover.visible=opacity>.005;this.cover.position.copy(this.coverRest);this.cover.position.y+=lift;
      this.coverMaterials.forEach(m=>m.opacity=THREE.MathUtils.clamp(opacity,0,1));
    }
  }
  blink(value:number):void {for(const {mesh,index} of this.blinkMeshes)mesh.morphTargetInfluences![index]=THREE.MathUtils.clamp(value,0,1);}
  dispose():void {
    if(this.disposed)return;this.disposed=true;this.mixer.stopAllAction();this.mixer.uncacheRoot(this.root);
    for(const socket of this.sockets.values())socket.removeFromParent();
    // Meshes/materials/textures remain owned by the loading scene and are disposed
    // there once. The adapter owns only its mixer and generated socket helpers.
  }
}
