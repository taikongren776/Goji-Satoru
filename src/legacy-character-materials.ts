/** Frozen legacy display profile. Professional assets retain their authored materials. */
import * as THREE from 'three';
export function applyLegacyMaterials(root:THREE.Group):void {
    const rampData=new Uint8Array([65,65,65,255,139,139,139,255,214,214,214,255,255,255,255,255]);
    const ramp=new THREE.DataTexture(rampData,4,1);ramp.minFilter=ramp.magFilter=THREE.NearestFilter;ramp.needsUpdate=true;
    const cache=new Map<string,THREE.MeshToonMaterial|THREE.MeshStandardMaterial>();
    const meshes:THREE.Mesh[]=[];root.traverse(o=>{if((o as THREE.Mesh).isMesh)meshes.push(o as THREE.Mesh);});
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
    }
    originalMaterials.forEach(m=>m.dispose());
}
