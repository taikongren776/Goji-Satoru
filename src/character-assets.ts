import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {CharacterAdapter} from './character-adapter';
import {parseCharacterManifest,requireCharacterReview} from './character-contract';
import {applyLegacyMaterials} from './legacy-character-materials';
import type {EyeTransition} from './appearance';

export async function loadCharacterAsset(appearance:EyeTransition,progress:(percent:number)=>void):Promise<CharacterAdapter>{
  const base=new URL(import.meta.env.BASE_URL,location.href);
  let url=new URL('models/character-production/active.json',base);
  // Explicit local development preview; production builds always use active.json.
  const preview=import.meta.env.DEV?new URLSearchParams(location.search).get('character'):null;
  if(preview){
    const candidate=new URL(preview,location.href);
    if(candidate.origin!==location.origin||!candidate.pathname.startsWith(new URL('models/character-production/',base).pathname)||!candidate.pathname.endsWith('.json'))throw new Error('Character preview must be a local character-production manifest');
    url=candidate;
  }
  const response=await fetch(url);if(!response.ok)throw new Error(`Character manifest HTTP ${response.status}`);
  const manifest=parseCharacterManifest(await response.json());
  if(!import.meta.env.DEV&&manifest.usage==='integration-test')throw new Error('Integration fixtures cannot be selected by a production build');
  const assetUrl=new URL(manifest.asset,url),loader=new GLTFLoader();
  const gltf=await (async()=>{
    if(manifest.usage!=='production')return loader.loadAsync(assetUrl.href,event=>{if(event.total)progress(Math.min(95,event.loaded/event.total*95));});
    const reviewResponse=await fetch(new URL(manifest.review!,url));if(!reviewResponse.ok)throw new Error(`Human review HTTP ${reviewResponse.status}`);
    const assetResponse=await fetch(assetUrl);if(!assetResponse.ok)throw new Error(`Production GLB HTTP ${assetResponse.status}`);
    const bytes=await assetResponse.arrayBuffer();progress(80);
    const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');
    requireCharacterReview(await reviewResponse.json(),hash);
    return loader.parseAsync(bytes,new URL('.',assetUrl).href);
  })();
  try{
    if(manifest.presentation==='legacy')applyLegacyMaterials(gltf.scene);
    gltf.scene.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=true;o.receiveShadow=false;o.frustumCulled=false;}});
    return new CharacterAdapter(gltf.scene,gltf.animations,manifest,appearance);
  }catch(error){
    // A rejected import never replaces a model or leaks its GPU resources.
    const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>();
    gltf.scene.traverse(o=>{if(o instanceof THREE.Mesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);}if(o instanceof THREE.SkinnedMesh)o.skeleton.dispose();});
    for(const m of materials){for(const v of Object.values(m))if(v instanceof THREE.Texture)textures.add(v);m.dispose();}geometries.forEach(g=>g.dispose());textures.forEach(t=>t.dispose());
    throw error;
  }
}
