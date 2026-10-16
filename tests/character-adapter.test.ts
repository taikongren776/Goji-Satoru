import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {CharacterAdapter} from '../src/character-adapter.ts';
import {ANIMATION_SECONDS,parseCharacterManifest,requireCharacterReview,VISUAL_CATEGORIES} from '../src/character-contract.ts';
import type {CharacterManifest} from '../src/character-contract.ts';

function fixture(){
  const root=new THREE.Group();root.position.set(2,0,0);
  const wrist=new THREE.Bone();wrist.name='Artist_Wrist_37';wrist.position.set(0,1,0);root.add(wrist);
  const material=new THREE.MeshStandardMaterial({map:new THREE.Texture()});
  const face=new THREE.Mesh(new THREE.BoxGeometry(),material);face.name='Face_v2';root.add(face);
  const cover=new THREE.Mesh(new THREE.BoxGeometry(),material);cover.name='ClothCover_v7';cover.position.y=.32;root.add(cover);
  const animations=Object.fromEntries(Object.keys(ANIMATION_SECONDS).map((n,i)=>[n,{clip:`Take_${i}`,timing:'exact'}]));
  const manifest=parseCharacterManifest({version:1,id:'test',usage:'integration-test',asset:'x.glb',presentation:'authored',animations,
    nodes:{Blindfold:{node:cover.name,mode:'fade-lift'},FX_Hand_L:{node:wrist.name,offset:[.1,0,0]},FX_Hand_R:{node:face.name},FX_Center:{node:root.name='ArtistRoot'}},
    coordinates:{unit:'meter',up:'Y',forward:'+Z',heightRange:[1.8,2.1],groundTolerance:.02}});
  const clips=Object.entries(ANIMATION_SECONDS).map(([,duration],i)=>new THREE.AnimationClip(`Take_${i}`,duration,[new THREE.VectorKeyframeTrack(`${wrist.name}.position`,[0,duration],[0,1,0,0,2,0])]));
  return {root,wrist,material,face,cover,manifest,clips};
}
test('renamed clips map to all logical actions; socket follows bone and transformed root',()=>{
  const f=fixture(),a=new CharacterAdapter(f.root,f.clips,f.manifest);
  assert.deepEqual([...a.actions.keys()],Object.keys(ANIMATION_SECONDS));
  a.actions.get('Idle')!.setEffectiveWeight(0);const action=a.begin('CastBlue','blue');action.time=2.5;a.evaluate();
  assert.ok(a.socket('FX_Hand_L').distanceTo(new THREE.Vector3(2.1,1.5,0))<1e-6);
  assert.equal(a.state.skill,'blue');assert.equal(a.state.animation,'CastBlue');assert.equal(a.state.progress,.5);
  assert.equal(f.face.material,f.material);assert.ok(f.material.map);
  a.endSkill();assert.equal(a.state.skill,null);a.idle();assert.equal(a.state.animation,'Idle');
  a.dispose();a.dispose();assert.throws(()=>a.begin('Idle'),/disposed/);
});
test('cover fade preserves rest offset and cannot fade a shared face material',()=>{
  const f=fixture(),a=new CharacterAdapter(f.root,f.clips,f.manifest);a.setCover(.3,.05);
  assert.ok(Math.abs(f.cover.position.y-.37)<1e-6);assert.equal(f.cover.material.opacity,.3);assert.equal(f.face.material.opacity,1);
  a.setCover(1);assert.equal(f.cover.position.y,.32);a.dispose();
});
test('authored cover retains animated transforms and commits visibility with EyeTransition',()=>{
  const f=fixture();f.manifest.nodes.Blindfold.mode='authored';const a=new CharacterAdapter(f.root,f.clips,f.manifest);
  f.cover.position.set(1,2,3);a.appearance.start(true);a.appearance.advance(1.3);a.setCover(0,.055);
  assert.deepEqual(f.cover.position.toArray(),[1,2,3]);assert.equal(f.cover.visible,true);
  a.appearance.cancel();a.setCover(0);assert.equal(f.cover.visible,false);assert.equal(a.state.blindfold,'uncovered');a.dispose();
});
test('duration mismatch rejects exact mode; explicit fit retimes cloned clips only',()=>{
  const f=fixture();f.clips[1].duration=2.5;f.clips[1].tracks[0].times[1]=2.5;
  assert.throws(()=>new CharacterAdapter(f.root,f.clips,f.manifest),/duration/);
  f.manifest.animations.CastBlue.timing='fit';const a=new CharacterAdapter(f.root,f.clips,f.manifest);
  assert.equal(a.actions.get('CastBlue')!.getClip().duration,5);assert.equal(a.actions.get('CastBlue')!.getClip().tracks[0].times[1],5);
  assert.equal(f.clips[1].tracks[0].times[1],2.5);a.dispose();
});
test('missing and ambiguous bindings or clips fail rather than silently selecting one',()=>{
  for(const mutate of [(f:ReturnType<typeof fixture>)=>{f.manifest.nodes.FX_Center.node='missing';},(f:ReturnType<typeof fixture>)=>{const duplicate=new THREE.Object3D();duplicate.name=f.wrist.name;f.root.add(duplicate);},(f:ReturnType<typeof fixture>)=>{f.clips.pop();}]){
    const f=fixture();mutate(f);assert.throws(()=>new CharacterAdapter(f.root,f.clips,f.manifest));assert.equal(f.root.getObjectByName('LIMITLESS_FX_Hand_L'),undefined);
  }
});
test('manifest validation rejects nonfinite transforms and unreviewed production assets',()=>{
  const f=fixture();const m=structuredClone(f.manifest);m.nodes.FX_Hand_L.offset=[NaN,0,0];assert.throws(()=>parseCharacterManifest(m));
  const p:CharacterManifest={...f.manifest,usage:'production'};assert.throws(()=>parseCharacterManifest(p),/review/);
});
test('production approval is bound to asset bytes and every visual score',()=>{
  const r={status:'APPROVED',reviewer:'UNIT TEST ONLY',reviewedAt:'2026-10-16',assetSha256:'test-digest',scores:Object.fromEntries(Object.entries(VISUAL_CATEGORIES).map(([c,items])=>[c,Object.fromEntries(items.map(i=>[i,7]))]))};
  assert.doesNotThrow(()=>requireCharacterReview(r,'test-digest'));assert.throws(()=>requireCharacterReview(r,'changed-digest'));
  r.scores.Geometry.Clothing=4;assert.throws(()=>requireCharacterReview(r,'test-digest'),/Clothing/);
});
