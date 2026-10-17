import * as THREE from '/node_modules/three/build/three.module.js';
import {GLTFLoader} from '/node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import {VRMLoaderPlugin,VRMUtils} from '/node_modules/@pixiv/three-vrm/lib/three-vrm.module.js';

// Pose the licensed humanoid rig, then bake RAW bone transforms. Runtime playback
// needs no IK, normalized-bone update or second clock.
export async function bake(){
  const loader=new GLTFLoader();loader.register(p=>new VRMLoaderPlugin(p));
  const gltf=await loader.loadAsync('/models/candidates/limitless-whitehair-study.vrm');
  const vrm=gltf.userData.vrm;VRMUtils.rotateVRM0(vrm);
  const bone=n=>vrm.humanoid.getNormalizedBoneNode(n);
  const update=()=>{vrm.update(0);vrm.scene.updateMatrixWorld(true);};update();
  const V=(a)=>new THREE.Vector3(...a),Q=()=>new THREE.Quaternion();
  const point=b=>b.getWorldPosition(new THREE.Vector3());
  const raw=[];vrm.scene.traverse(o=>{if(o.isBone&&!o.name.startsWith('Normalized_'))raw.push(o);});
  const footRest=Object.fromEntries(['left','right'].map(side=>[side,{
    position:point(bone(side+'Foot')),rotation:bone(side+'Foot').getWorldQuaternion(Q())
  }]));
  const frame=(f,n)=>{f=f.clone().normalize();n=n.clone().addScaledVector(f,-n.dot(f)).normalize();return Q().setFromRotationMatrix(new THREE.Matrix4().makeBasis(f,n,new THREE.Vector3().crossVectors(f,n)));};
  const handFrames={};
  for(const side of ['left','right']){
    const h=bone(side+'Hand'),inv=h.matrixWorld.clone().invert();
    const f=point(bone(side+'MiddleProximal')).applyMatrix4(inv).normalize();
    const across=point(bone(side+'LittleProximal')).sub(point(bone(side+'IndexProximal'))).transformDirection(inv);
    const n=side==='left'?new THREE.Vector3().crossVectors(across,f):new THREE.Vector3().crossVectors(f,across);
    handFrames[side]=frame(f,n).invert();
  }
  function aim(b,child,target){
    const p=point(b),from=point(child).sub(p).normalize(),to=target.clone().sub(p).normalize();
    const delta=Q().setFromUnitVectors(from,to),world=b.getWorldQuaternion(Q());
    b.quaternion.copy(b.parent.getWorldQuaternion(Q()).invert().multiply(delta.multiply(world)));update();
  }
  function arm(side,target,pole,fingers,palm){
    const upper=bone(side+'UpperArm'),lower=bone(side+'LowerArm'),hand=bone(side+'Hand'),a=point(upper);
    const l1=a.distanceTo(point(lower)),l2=point(lower).distanceTo(point(hand)),t=V(target),u=t.clone().sub(a);
    const d=THREE.MathUtils.clamp(u.length(),Math.abs(l1-l2)+.02,l1+l2-.012);u.normalize();t.copy(a).addScaledVector(u,d);
    const x=(l1*l1-l2*l2+d*d)/(2*d),h=Math.sqrt(Math.max(0,l1*l1-x*x));
    const perp=V(pole).sub(a);perp.addScaledVector(u,-perp.dot(u)).normalize();
    const e=a.clone().addScaledVector(u,x).addScaledVector(perp,h);
    aim(upper,lower,e);
    // Establish a consistent elbow hinge before bending the forearm. A shortest
    // arc aim alone can leave a large roll at the sleeve's elbow transition.
    const upperDirection=e.clone().sub(a).normalize(),lowerDirection=t.clone().sub(e).normalize();
    const hinge=new THREE.Vector3().crossVectors(upperDirection,lowerDirection).normalize().multiplyScalar(side==='left'?1:-1);
    const current=new THREE.Vector3(0,0,1).applyQuaternion(upper.getWorldQuaternion(Q()));
    current.addScaledVector(upperDirection,-current.dot(upperDirection)).normalize();
    const angle=Math.atan2(upperDirection.dot(new THREE.Vector3().crossVectors(current,hinge)),current.dot(hinge));
    upper.quaternion.copy(upper.parent.getWorldQuaternion(Q()).invert().multiply(Q().setFromAxisAngle(upperDirection,angle).multiply(upper.getWorldQuaternion(Q()))));update();
    aim(lower,hand,t);
    const orientation=frame(V(fingers),V(palm)).multiply(handFrames[side]);
    hand.quaternion.copy(hand.parent.getWorldQuaternion(Q()).invert().multiply(orientation));update();
  }
  function curl(side,amount,pointing=false){
    const s=side==='left'?1:-1;
    for(const digit of ['Index','Middle','Ring','Little'])for(const [part,a] of [['Proximal',.65],['Intermediate',.85],['Distal',.55]]){
      bone(side+digit+part).rotation.z=s*a*(pointing&&(digit==='Index'||digit==='Middle')?.05:amount);
    }
    bone(side+'ThumbMetacarpal').rotation.y=s*.18*amount;
    bone(side+'ThumbProximal').rotation.z=s*.28*amount;bone(side+'ThumbDistal').rotation.z=s*.30*amount;
  }
  function baseRest(){vrm.humanoid.resetNormalizedPose();bone('leftUpperArm').rotation.z=1.3;bone('rightUpperArm').rotation.z=-1.3;curl('left',.12);curl('right',.12);update();}
  function relaxedLeg(side,x,z,yaw){
    const upper=bone(side+'UpperLeg'),lower=bone(side+'LowerLeg'),foot=bone(side+'Foot');
    const a=point(upper),l1=a.distanceTo(point(lower)),l2=point(lower).distanceTo(point(foot));
    const target=footRest[side].position.clone();target.x=x;target.z+=z;
    const direction=target.clone().sub(a),distance=direction.length();direction.normalize();
    if(distance>=l1+l2-.0005)throw Error('Relaxed stance exceeds leg reach: '+side);
    const along=(l1*l1-l2*l2+distance*distance)/(2*distance);
    const bend=new THREE.Vector3(Math.sin(yaw),0,Math.cos(yaw));bend.addScaledVector(direction,-bend.dot(direction)).normalize();
    const knee=a.clone().addScaledVector(direction,along).addScaledVector(bend,Math.sqrt(Math.max(0,l1*l1-along*along)));
    aim(upper,lower,knee);aim(lower,foot,target);
    const orientation=Q().setFromAxisAngle(V([0,1,0]),yaw).multiply(footRest[side].rotation);
    foot.quaternion.copy(foot.parent.getWorldQuaternion(Q()).invert().multiply(orientation));update();
  }
  function rest(){
    baseRest();
    // Offset the pelvis toward the supporting left foot; the right foot is
    // slightly forward and turned out. Bake IK offline so soles remain planted.
    const hips=bone('hips'),hipPosition=point(hips).add(V([.045,-.012,0]));
    hips.position.copy(hips.parent.worldToLocal(hipPosition));hips.rotation.z=-.045;update();
    relaxedLeg('left',.125,0,.08);relaxedLeg('right',-.15,.075,-.16);
    bone('spine').rotation.z=.040;bone('chest').rotation.z=-.015;
    bone('leftUpperArm').rotation.z=1.36;bone('rightUpperArm').rotation.z=-1.29;
    update();
  }
  function pose(kind){
    rest();
    if(kind==='blue'){
      bone('chest').rotation.y=-.07;update();
      arm('right',[-.32,1.43,.28],[-.65,1.0,.0],[0,1,.08],[0,-.08,1]);curl('right',.25);
    }else if(kind==='red-charge'||kind==='red-release'){
      const release=kind==='red-release';bone('chest').rotation.y=release?.07:-.08;update();
      arm('right',release?[-.22,1.40,.39]:[-.27,1.49,.20],[-.65,1.12,.05],release?[0,.15,1]:[0,1,.18],[1,0,0]);curl('right',.9,true);
    }else if(kind==='purple-charge'||kind==='purple-fuse'||kind==='purple-release'){
      const fuse=kind==='purple-fuse',release=kind==='purple-release';
      bone('chest').rotation.x=release?.045:-.035;update();
      arm('left',release?[.31,1.30,.22]:[fuse?.22:.34,1.43,.29],[.65,1.03,.03],[0,.65,.7],[0,-.7,.65]);
      arm('right',release?[-.17,1.42,.40]:[fuse?-.22:-.34,1.43,.29],[-.65,1.03,.03],release?[0,.12,1]:[0,.65,.7],release?[0,1,-.12]:[0,-.7,.65]);
      curl('left',.25);curl('right',release?.8:.25,release);
    }else if(kind==='eye-contact'||kind==='eye-lift'){
      const p=point(bone('head'));const lift=kind==='eye-lift';
      // Right fingertips reach the outer brow; wrist remains outside the face.
      arm('right',[-.15,p.y-.08+(lift?.045:0),p.z+.14],[-.55,1.28,.1],[.60,.80,-.05],[0,0,-1]);curl('right',.12);
    }
    update();return raw.map(b=>({name:b.name,q:b.quaternion.toArray(),p:b.position.toArray()}));
  }
  const poses=Object.fromEntries(['rest','blue','red-charge','red-release','purple-charge','purple-fuse','purple-release','eye-contact','eye-lift'].map(k=>[k,pose(k)]));
  const schedule={
    Idle:[[0,'rest'],[4,'rest']],
    CastBlue:[[0,'rest'],[.35,'rest'],[1.20,'blue'],[3.75,'blue'],[5,'rest']],
    CastRed:[[0,'rest'],[.30,'rest'],[1.12,'red-charge'],[1.42,'red-release'],[2.40,'red-release'],[4,'rest']],
    CastPurple:[[0,'rest'],[1.25,'purple-charge'],[2.8,'purple-charge'],[3.65,'purple-fuse'],[4.40,'purple-fuse'],[4.68,'purple-release'],[6.4,'purple-release'],[8,'rest']],
    RevealEyes:[[0,'rest'],[.70,'eye-contact'],[.92,'eye-contact'],[1.24,'eye-lift'],[1.55,'eye-lift'],[2.4,'rest']],
    CoverEyes:[[0,'rest'],[.82,'eye-lift'],[1.10,'eye-contact'],[1.4,'eye-contact'],[1.70,'eye-contact'],[2.4,'rest']]
  };
  const clips=[];
  for(const [name,keys] of Object.entries(schedule)){
    const duration=keys.at(-1)[0],tracks=raw.map(b=>({name:b.name,rotations:[],positions:[]})),times=[];
    for(let f=0;f<=Math.round(duration*30);f++){
      const t=Math.min(duration,f/30);times.push(t);let k=0;while(k<keys.length-2&&t>keys[k+1][0])k++;
      const [a,ka]=keys[k],[b,kb]=keys[k+1];let u=Math.max(0,Math.min(1,(t-a)/(b-a)));u=u*u*(3-2*u);
      tracks.forEach((track,i)=>{
        const pa=poses[ka][i],pb=poses[kb][i],q=Q().fromArray(pa.q).slerp(Q().fromArray(pb.q),u),p=V(pa.p).lerp(V(pb.p),u);
        if(name==='Idle'&&track.name==='J_Bip_C_Chest')q.multiply(Q().setFromAxisAngle(V([1,0,0]),Math.sin(t/4*Math.PI*2)*.008));
        track.rotations.push(...q.toArray());track.positions.push(...p.toArray());
      });
    }
    clips.push({name,duration,times,tracks});
  }
  // Fit the accessory in the same neutral pose as earlier revisions. A change
  // to the standing animation must not alter the accepted head accessory.
  baseRest();
  // Reuse the old accessory mesh only; no old face/eye/body geometry is copied.
  const legacy=await new GLTFLoader().loadAsync('/models/gojo.glb');legacy.scene.updateMatrixWorld(true);
  let mask;legacy.scene.getObjectByName('Blindfold').traverse(o=>{if(o.isSkinnedMesh&&!mask)mask=o;});if(!mask)throw Error('Missing source cover mesh');mask.skeleton.update();
  const vertices=[];for(let i=0;i<mask.geometry.attributes.position.count;i++)vertices.push(mask.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(mask.matrixWorld));
  const bounds=new THREE.Box3().setFromPoints(vertices),center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3());
  const head=vrm.humanoid.getRawBoneNode('head'),headPos=point(head),inverse=head.matrixWorld.clone().invert();
  const eye=vrm.humanoid.getRawBoneNode('leftEye'),eyeY=point(eye).y;
  const surfaces=[];vrm.scene.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.update();if(o.isMesh&&(Array.isArray(o.material)?o.material:[o.material]).some(m=>/SKIN/.test(m.name)))surfaces.push(o);});
  if(!surfaces.length)throw Error('No skin surface for accessory fitting');
  // Freeze deformed skin once; repeated rays must not recompute skinning for
  // every triangle and every height sample.
  const fittingSurfaces=surfaces.map(o=>{
    const g=o.geometry.clone(),p=g.attributes.position;
    for(let i=0;i<p.count;i++){const v=o.getVertexPosition(i,new THREE.Vector3());p.setXYZ(i,v.x,v.y,v.z);}
    g.computeBoundingBox();g.computeBoundingSphere();
    const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));m.matrixAutoUpdate=false;m.matrixWorld.copy(o.matrixWorld);return m;
  });
  const ray=new THREE.Raycaster();
  // Measure a smooth head contour above the ears. The previous maximum over
  // the entire face/lift interval included the ears and made a rigid visor.
  const contourCount=128,contour=[];
  for(let i=0;i<contourCount;i++){
    const angle=i/contourCount*Math.PI*2,direction=new THREE.Vector3(Math.sin(angle),0,Math.cos(angle));
    let radius=0;
    const front=direction.z>.5;
    for(let dy=front?-.035:.040;dy<=.090;dy+=.005){
      const probe=new THREE.Vector3(headPos.x,eyeY+dy,headPos.z+.012);
      ray.set(probe.clone().addScaledVector(direction,.32),direction.clone().negate());
      const hit=ray.intersectObjects(fittingSurfaces,false)[0];
      if(hit)radius=Math.max(radius,hit.point.distanceTo(probe));
    }
    contour.push(radius);
  }
  const smoothContour=contour.map((r,i)=>[-2,-1,0,1,2].reduce((sum,k)=>sum+contour[(i+k+contourCount)%contourCount]*[1,2,3,2,1][k+2],0)/9);
  let fittedCount=0;
  const position=[];
  for(const v of vertices){
    const x=(v.x-center.x)/size.x,y=(v.y-center.y)/size.y,z=(v.z-center.z)/size.z;
    const direction=new THREE.Vector3(x*.218,0,z*.230).normalize();
    const angle=(Math.atan2(direction.x,direction.z)+Math.PI*2)%(Math.PI*2);
    const index=angle/(Math.PI*2)*contourCount,lo=Math.floor(index),mix=index-lo;
    const radius=THREE.MathUtils.lerp(smoothContour[lo],smoothContour[(lo+1)%contourCount],mix);
    const front=Math.max(0,direction.z),temple=direction.x*direction.x;
    // The anime silhouette is a broad cloth wrap covering brows and eyes,
    // not an eye-level strap. Keep the lower edge above the cheek and carry
    // the added coverage upwards across the forehead.
    const width=.064+.046*Math.pow(front,.65);
    const bridge=.012*Math.pow(front,20)*Math.max(0,-y*2);
    const around=Math.min(angle,Math.PI*2-angle);
    const aboveEar=.056*Math.exp(-Math.pow((around-1.72)/.48,2));
    const height=eyeY+.001-.030*Math.pow(front,.30)+.006*temple+aboveEar+y*width+bridge;
    const crown=.003*Math.max(0,1-4*y*y);
    // Two shallow oblique tension folds, fading at the hem, give real
    // geometry shading without adding painted stripes or a glossy visor.
    const edgeFade=Math.max(0,1-4*y*y);
    const fold=edgeFade*(.0028*Math.exp(-Math.pow((y-.16-.09*direction.x)/.095,2))
      -.0012*Math.exp(-Math.pow((y+.17+.12*direction.x)/.09,2)));
    const fitted=new THREE.Vector3(headPos.x,height,headPos.z+.012);
    if(radius){fitted.addScaledVector(direction,radius+.0025+crown+fold);fittedCount++;}
    fitted.applyMatrix4(inverse);position.push(...fitted.toArray());
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(position,3));g.setIndex(Array.from(mask.geometry.index.array));g.computeVertexNormals();
  if(fittedCount<vertices.length*.95)throw Error('Accessory fitting missed too many skin vertices');
  return {clips,mask:{position,normal:Array.from(g.attributes.normal.array),indices:Array.from(g.index.array),parent:head.name,eyeY,fittedCount,sourceBounds:{min:bounds.min.toArray(),max:bounds.max.toArray()}},bones:raw.map(b=>b.name)};
}
