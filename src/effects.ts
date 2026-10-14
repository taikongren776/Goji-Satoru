import * as THREE from 'three';
import { SKILLS, ease } from './timeline';
import type { SkillId } from './timeline';

// Advected density fields, camera-facing GPU ribbons and a transparent scene warp.
const noise = /* glsl */`
float hash(vec3 p){p=fract(p*.3183099+vec3(.13,.27,.41));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float noise3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
 mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){return .57*noise3(p)+.28*noise3(p*2.13+3.4)+.15*noise3(p*4.31-2.1);}
`;
const coreVertex=/* glsl */`
uniform float uTime,uKind,uShell;
varying vec3 vLocal,vNormal,vView;
${noise}
void main(){
 vLocal=position;
 float n=fbm(position*3.4+vec3(uTime*.65,-uTime*.4,uTime*.27));
 float fold=sin(position.y*10.+n*7.+uTime*3.)*.045;
 vec3 p=position*(1.+(n-.5)*(.22+uKind*.065)+fold+uShell*.12);
 vec4 mv=modelViewMatrix*vec4(p,1.);vNormal=normalize(normalMatrix*normal);vView=normalize(-mv.xyz);
 gl_Position=projectionMatrix*mv;
}`;
const coreFragment=/* glsl */`
uniform float uTime,uPower,uKind,uShell;uniform vec3 uColor;
varying vec3 vLocal,vNormal,vView;
${noise}
void main(){
 float fres=pow(1.-abs(dot(normalize(vNormal),normalize(vView))),2.1);
 vec3 flow=vLocal*3.3+vec3(uTime*.45,-uTime*.8,uTime*.28);
 float density=fbm(flow+fbm(flow*1.7)*2.);
 float vein=pow(1.-abs(sin(density*12.+vLocal.y*4.-uTime*2.)),8.);
 float clouds=smoothstep(.35,.75,density);
 vec3 deep=mix(vec3(.001,.008,.055),uColor*.047,step(.5,uKind));
 vec3 color=deep+uColor*(clouds*.27+fres*1.6+vein*1.9);
 color+=vec3(.50,.68,.9)*pow(vein,3.)*.65;
 if(uKind<.5)color*=.045+fres*1.15+clouds*.085;
 if(uKind>1.5)color+=vec3(.20,.05,.38)*pow(clouds,3.);
 float alpha=uPower;
 if(uShell>.5){color=uColor*(.6+vein*2.);alpha*=fres*(.06+clouds*.18);}
 gl_FragColor=vec4(color,alpha);
}`;
const ribbonVertex=/* glsl */`
uniform float uTime,uPower,uMode,uRadius,uExtent,uAge;
uniform vec3 uCenter,uEnd;attribute vec3 aSeed;
varying vec2 vUv;varying float vAlpha,vHot;
const float TAU=6.2831853;
vec3 path(float t){
 float a=aSeed.x*TAU;
 if(uMode<.5){
   float head=fract(aSeed.y+uTime*(.22+aSeed.z*.16));
   float p=clamp(head-(1.-t)*(.18+aSeed.z*.15),0.,1.);
   float r=(.06+pow(1.-p,1.6)*uRadius)*(1.+.09*sin(p*27.+a*4.));
   a+=p*(6.+aSeed.z*4.)+uTime*.32;
   return uCenter+vec3(cos(a)*r,sin(a*.73+aSeed.y*8.)*r*.62,sin(a)*r);
 }
 if(uMode<1.5){
   float age=max(0.,uAge-aSeed.y*.13-(1.-t)*(.065+aSeed.z*.055));
   vec3 direction=normalize(vec3(cos(a)*(.4+aSeed.z),sin(a)*(.4+aSeed.z),.7+aSeed.y*1.2));
   float d=age*(4.5+aSeed.z*7.);
   return uCenter+direction*d+vec3(0.,-.23*age*age,0.);
 }
 if(uMode<2.5){
   float z=clamp(fract(aSeed.y+uTime*(.45+aSeed.z*.2))*uExtent-(1.-t)*(.45+aSeed.z*1.4),0.,uExtent);
   float taper=sin(clamp(z/max(.01,uExtent),0.,1.)*3.14159);
   float r=(.015+aSeed.z*.20)*(.25+.75*taper)*(1.+sin(z*8.+uTime*5.+a)*.35);
   a+=z*(2.+aSeed.z*1.5)-uTime*(1.+aSeed.z)+sin(z*3.2+aSeed.y*7.)*.5;
   return uCenter+vec3(cos(a)*r,sin(a)*r,z);
 }
 vec3 p=mix(uCenter,uEnd,t);
 float wave=sin(t*17.+uTime*6.+a)*sin(t*3.14159)*(.02+aSeed.z*.075);
 return p+vec3(sin(a)*wave,cos(a)*wave,sin(t*23.+a-uTime*3.)*wave);
}
void main(){
 float t=uv.x;vec4 mv=modelViewMatrix*vec4(path(t),1.);
 vec4 ahead=modelViewMatrix*vec4(path(min(1.,t+.012)),1.);
 vec4 behind=modelViewMatrix*vec4(path(max(0.,t-.012)),1.);
 vec2 tangent=ahead.xy-behind.xy;vec2 side=normalize(vec2(-tangent.y,tangent.x)+vec2(.00001));
 float width=(.0013+aSeed.z*.0035);
 if(uMode>1.5&&uMode<2.5)width=(.004+aSeed.z*.016)*(1.+.3*sin(t*16.+uTime*5.+aSeed.y*7.));
 mv.xy+=side*position.y*width;
 gl_Position=projectionMatrix*mv;vUv=uv;
 vAlpha=uPower*pow(max(0.,sin(t*3.14159)),.65)*(.3+aSeed.z*.7);
 if(uMode>.5&&uMode<1.5)vAlpha*=smoothstep(0.,.07,uAge-aSeed.y*.13)*(1.-smoothstep(.25,1.,uAge));
 vHot=aSeed.z;
}`;
const ribbonFragment=/* glsl */`
uniform vec3 uColor;varying vec2 vUv;varying float vAlpha,vHot;
void main(){float edge=pow(max(0.,1.-abs(vUv.y*2.-1.)),1.7);float a=edge*vAlpha;
 if(a<.006)discard;vec3 c=uColor*(1.8+vHot)+vec3(.2,.3,.5)*pow(edge,6.)*vHot;
 gl_FragColor=vec4(c,a);}`;

function haloTexture():THREE.DataTexture {
  const data=new Uint8Array(64*64*4);
  for(let y=0;y<64;y++)for(let x=0;x<64;x++){
    const r=Math.hypot((x+.5)/32-1,(y+.5)/32-1),i=(y*64+x)*4;
    data[i]=data[i+1]=data[i+2]=255;data[i+3]=Math.floor(Math.pow(Math.max(0,1-r),3)*255);
  }
  const texture=new THREE.DataTexture(data,64,64);texture.needsUpdate=true;return texture;
}
class EnergyCore {
  readonly group=new THREE.Group();
  readonly material:THREE.ShaderMaterial;
  readonly shell:THREE.Mesh<THREE.IcosahedronGeometry,THREE.ShaderMaterial>;
  private halo:THREE.Sprite;
  constructor(kind:number,color:number,geometry:THREE.IcosahedronGeometry,texture:THREE.Texture){
    this.material=new THREE.ShaderMaterial({vertexShader:coreVertex,fragmentShader:coreFragment,uniforms:{uTime:{value:0},uPower:{value:0},uKind:{value:kind},uShell:{value:0},uColor:{value:new THREE.Color(color)}},transparent:true,depthWrite:false});
    this.group.add(new THREE.Mesh(geometry,this.material));
    const shellMat=this.material.clone();shellMat.uniforms.uShell.value=1;shellMat.blending=THREE.AdditiveBlending;
    this.shell=new THREE.Mesh(geometry,shellMat);this.group.add(this.shell);
    this.halo=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,color,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}));
    this.halo.scale.setScalar(6);this.group.add(this.halo);this.group.visible=false;
  }
  update(position:THREE.Vector3,radius:number,power:number,time:number,reduced:boolean):void{
    this.group.visible=power>.004&&radius>.002;this.group.position.copy(position);this.group.scale.setScalar(Math.max(.001,radius));
    for(const m of [this.material,this.shell.material]){m.uniforms.uTime.value=time;m.uniforms.uPower.value=power;}
    this.halo.material.opacity=power*(reduced?.13:.28);
    this.group.rotation.set(time*.14,time*.21,time*.12);
  }
}
class FilamentField {
  readonly geometry:THREE.InstancedBufferGeometry;
  readonly material:THREE.ShaderMaterial;
  readonly mesh:THREE.Mesh;
  constructor(count:number,mode:number,color:number){
    const segments=48,vertices:number[]=[],uvs:number[]=[],indices:number[]=[];
    for(let i=0;i<=segments;i++){const t=i/segments;vertices.push(t,-1,0,t,1,0);uvs.push(t,0,t,1);if(i<segments){const j=i*2;indices.push(j,j+2,j+1,j+1,j+2,j+3);}}
    this.geometry=new THREE.InstancedBufferGeometry();this.geometry.setIndex(indices);
    this.geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));this.geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
    const seeds=new Float32Array(count*3);let state=153;
    for(let i=0;i<seeds.length;i++){state=state*16807%2147483647;seeds[i]=(state-1)/2147483646;}
    this.geometry.setAttribute('aSeed',new THREE.InstancedBufferAttribute(seeds,3));this.geometry.instanceCount=count;
    this.material=new THREE.ShaderMaterial({vertexShader:ribbonVertex,fragmentShader:ribbonFragment,uniforms:{uTime:{value:0},uPower:{value:0},uMode:{value:mode},uRadius:{value:1},uExtent:{value:1},uAge:{value:0},uCenter:{value:new THREE.Vector3()},uEnd:{value:new THREE.Vector3()},uColor:{value:new THREE.Color(color)}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide});
    this.mesh=new THREE.Mesh(this.geometry,this.material);this.mesh.frustumCulled=false;this.mesh.visible=false;
  }
  update(center:THREE.Vector3,power:number,time:number,radius=1,age=0,extent=1):void{
    this.mesh.visible=power>.004;
    const u=this.material.uniforms;u.uCenter.value.copy(center);u.uPower.value=power;u.uTime.value=time;u.uRadius.value=radius;u.uAge.value=age;u.uExtent.value=extent;
  }
}
const shockFragment=/* glsl */`
uniform float uTime,uPower,uAge;uniform vec3 uColor;varying vec2 vUv;
${noise}
void main(){vec2 p=vUv*2.-1.;float r=length(p),angle=atan(p.y,p.x);
 float n=fbm(vec3(p*6.,uTime*1.5));
 float front=.70+sin(angle*7.+uTime)*.018+sin(angle*13.-uTime*3.)*.014+(n-.5)*.085;
 float edge=exp(-pow((r-front)/.025,2.)),wake=exp(-pow((r-front+.085)/.065,2.))*.32;
 float alpha=(edge+wake)*smoothstep(.21,.6,n)*uPower;
 if(alpha<.005)discard;gl_FragColor=vec4(uColor*2.4,alpha);
}`;

export class TechniqueEffects {
  readonly group=new THREE.Group();
  readonly light=new THREE.PointLight(0x46aaff,0,4.5,2);
  readonly secondLight=new THREE.PointLight(0xff264f,0,3.5,2);
  readonly focus=new THREE.Vector3();
  warpStrength=0;warpRadius=.6;
  private blue:EnergyCore;private red:EnergyCore;private purple:EnergyCore;
  private pull:FilamentField;private redFlow:FilamentField;private burst:FilamentField;private torrent:FilamentField;private interference:FilamentField;
  private shocks:THREE.Mesh<THREE.PlaneGeometry,THREE.ShaderMaterial>[]=[];
  private left=new THREE.Vector3();private right=new THREE.Vector3();private center=new THREE.Vector3();
  private origin=new THREE.Vector3();private midpoint=new THREE.Vector3();
  private launched=false;private low=false;
  constructor(scene:THREE.Scene){
    const texture=haloTexture(),geometry=new THREE.IcosahedronGeometry(1,4);
    this.blue=new EnergyCore(0,SKILLS.blue.color,geometry,texture);this.red=new EnergyCore(1,SKILLS.red.color,geometry,texture);this.purple=new EnergyCore(2,SKILLS.purple.color,geometry,texture);
    this.pull=new FilamentField(52,0,0x368cff);this.redFlow=new FilamentField(24,0,0xff305a);
    this.burst=new FilamentField(82,1,0xff315b);this.torrent=new FilamentField(72,2,0xb367ff);this.interference=new FilamentField(12,3,0x9870ff);
    this.group.add(this.blue.group,this.red.group,this.purple.group,this.pull.mesh,this.redFlow.mesh,this.burst.mesh,this.torrent.mesh,this.interference.mesh,this.light,this.secondLight);
    const shockGeo=new THREE.PlaneGeometry(2,2);
    for(let i=0;i<2;i++){
      const material=new THREE.ShaderMaterial({uniforms:{uTime:{value:0},uPower:{value:0},uAge:{value:0},uColor:{value:new THREE.Color()}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:shockFragment,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide});
      const mesh=new THREE.Mesh(shockGeo,material);this.shocks.push(mesh);this.group.add(mesh);
    }
    scene.add(this.group);this.reset();
  }
  quality(low:boolean,_pixel:number):void{
    this.low=low;
    for(const [field,count] of [[this.pull,52],[this.redFlow,24],[this.burst,82],[this.torrent,72],[this.interference,12]] as const)field.geometry.instanceCount=low?Math.floor(count*.42):count;
    for(const core of [this.blue,this.red,this.purple])core.shell.visible=!low;
  }
  update(id:SkillId,time:number,handLeft:THREE.Vector3,handRight:THREE.Vector3,_center:THREE.Vector3,reduced:boolean):void{
    this.group.visible=true;
    const d=SKILLS[id],recovery=1-ease((time-d.releaseUntil)/(d.duration-d.releaseUntil)),fade=ease(time/.5)*recovery,age=Math.max(0,time-d.chargeUntil);
    this.left.copy(handLeft);this.left.y+=.06;this.left.z+=.11;
    this.right.copy(handRight);this.right.y+=.045;this.right.z+=.14;
    for(const core of [this.blue,this.red,this.purple])core.group.visible=false;
    for(const field of [this.pull,this.redFlow,this.burst,this.torrent,this.interference])field.mesh.visible=false;
    this.secondLight.intensity=0;this.warpStrength=0;this.warpRadius=.55;
    if(id==='blue'){
      this.midpoint.set(-.55,1.38,.85);this.center.copy(this.right).lerp(this.midpoint,ease((time-1.35)/1.3));
      const collapse=1-ease((time-3.05)/.85),charge=ease(time/1.65);
      this.blue.update(this.center,(.045+.105*charge)*(.18+.82*collapse),fade,time*(1+charge*.45),reduced);
      this.pull.update(this.center,fade*(.25+.75*collapse),time*(1+charge*.65),1.13-.4*charge);
      this.warpStrength=fade*(.2+.8*charge)*collapse;
    }else if(id==='red'){
      this.center.copy(this.right);
      if(time>=d.chargeUntil){if(!this.launched){this.origin.copy(this.center);this.launched=true;}this.center.copy(this.origin);this.center.z+=age*8.5;}
      const coreFade=fade*(1-ease(age/.55)),radius=age>0?.075+.16*ease(age/.12):.105-.050*ease(time/d.chargeUntil);
      this.red.update(this.center,radius,coreFade,time*1.8,reduced);
      this.redFlow.update(this.right,fade*(1-ease(age/.2))*.7,time*1.5,.20-.12*ease(time/d.chargeUntil));
      this.burst.material.uniforms.uColor.value.set(d.color);this.burst.update(this.origin,age>0?fade:0,time,1,age);
      this.warpStrength=age>0?Math.exp(-age*5)*fade:.13*ease(time/1.4);this.warpRadius=.7+age*1.5;
    }else{
      const merge=ease((time-2.45)/1.35);
      this.midpoint.copy(this.left).add(this.right).multiplyScalar(.5);this.midpoint.z+=.10;
      this.left.x+=.22*(1-merge);this.right.x-=.22*(1-merge);
      this.left.lerp(this.midpoint,merge);this.right.lerp(this.midpoint,merge);
      const dual=fade*(1-ease((time-3.28)/.70));
      this.blue.update(this.left,.095,dual,time,reduced);this.red.update(this.right,.082,dual,time*1.5,reduced);
      this.pull.update(this.left,dual*.65,time,.5*(1-merge)+.18);this.redFlow.update(this.right,dual*.8,time*1.6,.24);
      this.interference.material.uniforms.uEnd.value.copy(this.right);this.interference.update(this.left,dual*ease((time-1.45)/.8),time);
      this.center.copy(this.midpoint);
      if(time>=d.chargeUntil){if(!this.launched){this.origin.copy(this.center);this.launched=true;}this.center.copy(this.origin);this.center.z+=age*9.2;}
      const fusion=ease((time-3.15)/1.15)*fade;
      this.purple.update(this.center,.075+.15*ease((time-3.15)/1.3),fusion*(1-ease((age-.30)/.75)),time,reduced);
      this.torrent.update(this.origin,age>0?fusion*(1-ease((age-1.15)/.8)):0,time,.3,age,Math.min(9,age*9.2));
      this.burst.material.uniforms.uColor.value.set(d.color);this.burst.update(this.origin,age>0?fusion*.7:0,time,1,age);
      this.secondLight.position.copy(this.right);this.secondLight.intensity=dual*(reduced?.035:.09);
      this.warpStrength=fusion*(age>0?Math.exp(-age*2.5):.6);this.warpRadius=.45+age*2;
    }
    this.focus.copy(time>=d.chargeUntil&&id!=='blue'?this.origin:this.center);
    this.light.color.set(id==='purple'&&time<3.4?SKILLS.blue.color:d.color);
    this.light.position.copy(id==='purple'&&time<3.4?this.left:this.focus);
    this.light.intensity=fade*(reduced?.38:1)*(id==='purple'?.22:.12);
    for(let i=0;i<this.shocks.length;i++){
      const mesh=this.shocks[i],a=age-i*.075;
      mesh.visible=id!=='blue'&&age>0&&a>0&&a<.5;
      mesh.position.copy(this.origin);mesh.position.z+=.12+a*1.2;mesh.rotation.z=time*.05;
      mesh.scale.setScalar(.08+a*(id==='purple'?2.0:1.7));
      const u=mesh.material.uniforms;u.uTime.value=time+i;u.uAge.value=a;u.uPower.value=(1-ease(a/.5))*(reduced?.18:.55);u.uColor.value.set(d.color);
    }
    if(this.low||reduced)this.warpStrength=0;
  }
  reset():void{
    this.group.visible=false;this.light.intensity=this.secondLight.intensity=0;this.launched=false;this.warpStrength=0;
    for(const field of [this.pull,this.redFlow,this.burst,this.torrent,this.interference])field.mesh.visible=false;
    for(const core of [this.blue,this.red,this.purple])core.group.visible=false;
    this.shocks.forEach(s=>s.visible=false);
  }
}
/** Warp only the rendered scene, preserving the canvas alpha and crisp DOM text. */
export const gravityDistortionShader={
  uniforms:{tDiffuse:{value:null},uCenter:{value:new THREE.Vector2(.5,.5)},uRadius:{value:.15},uAspect:{value:1},uStrength:{value:0},uTime:{value:0}},
  vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:/* glsl */`
  uniform sampler2D tDiffuse;uniform vec2 uCenter;uniform float uRadius,uAspect,uStrength,uTime;varying vec2 vUv;
  void main(){vec2 p=vUv-uCenter;p.x*=uAspect;float d=length(p);
    if(uStrength<.001||d>uRadius){gl_FragColor=texture2D(tDiffuse,vUv);return;}
    float mask=pow(1.-smoothstep(0.,uRadius,d),2.);
    float ripple=sin(d*110.-uTime*9.+sin(atan(p.y,p.x)*7.)*.5);
    vec2 offset=normalize(p+vec2(.0001))*mask*ripple*uStrength*.004;offset.x/=uAspect;
    gl_FragColor=texture2D(tDiffuse,clamp(vUv+offset,vec2(.001),vec2(.999)));
  }`,
};
