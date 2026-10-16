import * as THREE from 'three';
import { SKILLS, ease } from './timeline';
import type { SkillId } from './timeline';

// Separate ink-like kernels, short advected strokes, dust, pressure fronts and scene refraction.
const noise = /* glsl */`
float hash(vec3 p){p=fract(p*.3183099+vec3(.13,.27,.41));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float noise3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
 mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){return .57*noise3(p)+.28*noise3(p*2.13+3.4)+.15*noise3(p*4.31-2.1);}
`;
const coreVertex=/* glsl */`
varying vec2 vUv;
void main(){
 vUv=uv;
 vec4 center=modelViewMatrix*vec4(0.,0.,0.,1.);
 vec2 scale=vec2(length(modelMatrix[0].xyz),length(modelMatrix[1].xyz));
 center.xy+=position.xy*scale;
 gl_Position=projectionMatrix*center;
}`;
const coreFragment=/* glsl */`
uniform float uTime,uPower,uKind,uShell;uniform vec3 uColor;
varying vec2 vUv;
${noise}
void main(){
 vec2 p=(vUv-.5)*2.;float r=length(p),a=atan(p.y,p.x);
 float n=fbm(vec3(p*5.5,uTime*.7));
 float edge=.43+.05*sin(a*3.+uTime*1.1)+.025*sin(a*11.-uTime*2.3)+(n-.5)*.12;
 float band=exp(-pow((r-edge)/.023,2.));
 float curl=sin(a*3.+r*19.-uTime*3.+n*5.);
 float arcs=pow(max(0.,curl),7.)*exp(-pow((r-.57)/.19,2.));
 float shards=pow(max(0.,sin(a*13.+n*8.+uTime)),19.)*exp(-pow((r-.57)/.23,2.));
 float dark=1.-smoothstep(edge-.025,edge,r);
 vec3 color=vec3(.001,.003,.012);float alpha=dark*.97;
 if(uKind<.5){
   // A void with discontinuous accretion strokes, never a lit glass surface.
   float light=band*(.22+.78*pow(max(0.,sin(a*2.-uTime)),2.))+arcs*.8+shards*.25;
   color+=uColor*light*2.6+vec3(.48,.75,.85)*pow(light,3.)*.55;
   alpha=max(alpha,clamp(light*1.8,0.,1.));
 }else{
   float star=.09/(r+.06)*pow(abs(sin(a*(uKind>1.5?3.:2.)+n*1.7)),13.);
   float cut=pow(max(0.,1.-abs(p.y+sin(p.x*12.+uTime*5.)*.035)*22.),3.)*exp(-r*5.);
   float hot=exp(-r*r*100.)+star*.35+cut*.5;
   float plasma=arcs*.8+shards*.7+band*.22;
   vec3 edgeColor=uColor;
   if(uKind>1.5)edgeColor=mix(vec3(.04,.35,1.),vec3(1.,.06,.25),smoothstep(-.5,.5,sin(a+n*3.)));
   color=uColor*(plasma+hot)*1.6+edgeColor*arcs*.8+vec3(1.,.8,.96)*hot*2.3;
   alpha=clamp(plasma*1.5+hot,0.,1.);
 }
 if(uShell>.5){color=uColor*(arcs+shards)*1.5;alpha=(arcs+shards)*.20;}
 alpha*=uPower*(1.-smoothstep(.86,1.,r));if(alpha<.008)discard;
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
   float p=clamp(head-(1.-t)*(.045+aSeed.z*.115),0.,1.);
   float r=(.045+pow(1.-p,1.8)*uRadius)*(1.+.055*sin(p*27.+a*4.));
   a+=p*(3.+aSeed.z*3.)+uTime*.24;
   return uCenter+vec3(cos(a)*r,sin(a*.93+aSeed.y*8.)*r*.73,sin(a)*r*.7);
 }
 if(uMode<1.5){
   float age=max(0.,uAge-aSeed.y*.09-(1.-t)*(.025+aSeed.z*.035));
   vec3 direction=normalize(vec3(cos(a)*(.2+aSeed.z),sin(a)*(.2+aSeed.z),1.+aSeed.y*1.5));
   float d=age*(3.5+aSeed.z*6.);
   return uCenter+direction*d+vec3(0.,-.23*age*age,0.);
 }
 if(uMode<2.5){
   float z=clamp(fract(aSeed.y+uTime*(.45+aSeed.z*.2))*uExtent-(1.-t)*(.3+aSeed.z*1.1),0.,uExtent);
   float taper=sin(clamp(z/max(.01,uExtent),0.,1.)*3.14159);
   float r=(.025+aSeed.z*.26)*(.35+.65*taper)*(1.+sin(z*8.+uTime*5.+a)*.22);
   a+=z*(.5+aSeed.z*.6)-uTime*(1.+aSeed.z)+sin(z*3.2+aSeed.y*7.)*.25;
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
 float width=(.002+aSeed.z*.010)*pow(max(.001,sin(t*3.14159)),.65);
 if(uMode>1.5&&uMode<2.5)width=(.012+aSeed.z*.045)*(1.+.3*sin(t*16.+uTime*5.+aSeed.y*7.))*sin(t*3.14159);
 mv.xy+=side*position.y*width;
 gl_Position=projectionMatrix*mv;vUv=uv;
 vAlpha=uPower*pow(max(0.,sin(t*3.14159)),.65)*(.3+aSeed.z*.7);
 if(uMode>.5&&uMode<1.5)vAlpha*=smoothstep(0.,.07,uAge-aSeed.y*.13)*(1.-smoothstep(.25,1.,uAge));
 vHot=aSeed.z;
}`;
const ribbonFragment=/* glsl */`
uniform vec3 uColor;varying vec2 vUv;varying float vAlpha,vHot;
void main(){float edge=pow(max(0.,1.-abs(vUv.y*2.-1.)),1.7);float a=edge*vAlpha;
 if(a<.006)discard;vec3 c=uColor*(.7+vHot*1.1)+vec3(.2,.3,.5)*pow(edge,6.)*vHot;
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
  readonly shell:THREE.Mesh<THREE.PlaneGeometry,THREE.ShaderMaterial>;
  private halo:THREE.Sprite;
  constructor(kind:number,color:number,geometry:THREE.PlaneGeometry,texture:THREE.Texture){
    this.material=new THREE.ShaderMaterial({vertexShader:coreVertex,fragmentShader:coreFragment,uniforms:{uTime:{value:0},uPower:{value:0},uKind:{value:kind},uShell:{value:0},uColor:{value:new THREE.Color(color)}},transparent:true,depthWrite:false});
    this.group.add(new THREE.Mesh(geometry,this.material));
    const shellMat=this.material.clone();shellMat.uniforms.uShell.value=1;shellMat.blending=THREE.AdditiveBlending;
    this.shell=new THREE.Mesh(geometry,shellMat);this.group.add(this.shell);
    this.halo=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,color,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}));
    this.halo.scale.setScalar(3.6);this.group.add(this.halo);this.group.visible=false;
  }
  update(position:THREE.Vector3,radius:number,power:number,time:number,reduced:boolean):void{
    this.group.visible=power>.004&&radius>.002;this.group.position.copy(position);this.group.scale.setScalar(Math.max(.001,radius));
    for(const m of [this.material,this.shell.material]){m.uniforms.uTime.value=time;m.uniforms.uPower.value=power;}
    this.halo.material.opacity=power*(reduced?.055:.12);
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
 float front=.62+sin(angle*5.+uTime)*.06+sin(angle*11.-uTime*3.)*.035+(n-.5)*.11;
 float edge=exp(-pow((r-front)/.019,2.)),wake=exp(-pow((r-front+.085)/.055,2.))*.22;
 float gaps=smoothstep(.15,.6,sin(angle*7.+n*8.));
 float alpha=(edge+wake)*gaps*uPower;
 if(alpha<.005)discard;gl_FragColor=vec4(uColor*1.9,alpha);
}`;

class EnergyDust {
  readonly mesh:THREE.Points<THREE.BufferGeometry,THREE.ShaderMaterial>;
  constructor(){
    const seeds=new Float32Array(270*3);let state=91;
    for(let i=0;i<seeds.length;i++){state=state*16807%2147483647;seeds[i]=(state-1)/2147483646;}
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(seeds,3));
    const material=new THREE.ShaderMaterial({uniforms:{uTime:{value:0},uAge:{value:0},uMode:{value:0},uPower:{value:0},uPixel:{value:1},uExtent:{value:1},uCenter:{value:new THREE.Vector3()},uColor:{value:new THREE.Color()}},
      vertexShader:/* glsl */`
      uniform float uTime,uAge,uMode,uPower,uPixel,uExtent;uniform vec3 uCenter;varying float vAlpha;
      void main(){vec3 s=position;float a=s.x*6.283185;vec3 p;
        if(uMode<.5){float life=fract(s.y+uTime*(.19+s.z*.12)),r=pow(1.-life,1.6)*1.0+.06;a+=life*5.;p=vec3(cos(a)*r,sin(a+s.z*8.)*r*.7,sin(a)*r*.7);vAlpha=sin(life*3.14159);}
        else if(uMode<1.5){float age=max(0.,uAge-s.y*.18);p=normalize(vec3(cos(a)*.9,sin(a)*.9,.7+s.z))*age*(2.+s.z*6.);p.y-=age*age*.4;vAlpha=smoothstep(0.,.07,age)*(1.-smoothstep(.35,1.1,age));}
        else{float z=fract(s.y+uTime*(.7+s.z*.3))*uExtent;float r=.06+s.z*.48;p=vec3(cos(a+z)*r,sin(a+z)*r,z);vAlpha=sin(z/max(.01,uExtent)*3.14159);}
        vec4 mv=modelViewMatrix*vec4(p+uCenter,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp((2.+s.z*4.)*uPixel/max(.6,-mv.z*.5),1.,10.);vAlpha*=uPower;
      }`,fragmentShader:/* glsl */`
      uniform vec3 uColor;varying float vAlpha;
      void main(){vec2 p=gl_PointCoord-.5;float d=abs(p.x)+abs(p.y);float a=(1.-smoothstep(.12,.48,d))*vAlpha;if(a<.01)discard;gl_FragColor=vec4(uColor*1.8,a);}`,
      transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});
    this.mesh=new THREE.Points(geometry,material);this.mesh.frustumCulled=false;this.mesh.visible=false;
  }
  update(center:THREE.Vector3,color:number,mode:number,power:number,time:number,age:number,extent=1):void{
    this.mesh.visible=power>.004;const u=this.mesh.material.uniforms;
    u.uCenter.value.copy(center);u.uColor.value.set(color);u.uMode.value=mode;u.uPower.value=power;u.uTime.value=time;u.uAge.value=age;u.uExtent.value=extent;
  }
}

class AnnihilationWake {
  readonly mesh:THREE.Mesh<THREE.PlaneGeometry,THREE.ShaderMaterial>;
  constructor(){
    const material=new THREE.ShaderMaterial({uniforms:{uCenter:{value:new THREE.Vector3()},uExtent:{value:0},uTime:{value:0},uPower:{value:0}},
      vertexShader:/* glsl */`
      uniform vec3 uCenter;uniform float uExtent,uTime;varying vec2 vUv;
      void main(){vUv=uv;float z=uv.x*uExtent;vec3 p=uCenter+vec3(sin(z*5.-uTime*7.)*.025,cos(z*3.+uTime*4.)*.03,z);
        vec4 mv=modelViewMatrix*vec4(p,1.);vec4 end=modelViewMatrix*vec4(p+vec3(0.,0.,.05),1.);
        vec2 dir=end.xy-mv.xy;vec2 side=normalize(vec2(-dir.y,dir.x)+vec2(.00001));
        float width=(.06+.26*pow(sin(uv.x*3.14159),.65))*(.87+.13*sin(z*13.-uTime*18.));
        mv.xy+=side*(uv.y*2.-1.)*width;gl_Position=projectionMatrix*mv;
      }`,fragmentShader:/* glsl */`
      uniform float uTime,uPower;varying vec2 vUv;
      ${noise}
      void main(){float x=vUv.x,y=vUv.y*2.-1.;float n=fbm(vec3(x*15.-uTime*7.,y*4.,uTime));
        float boundary=.55+(n-.5)*.5;float body=1.-smoothstep(boundary-.12,boundary+.04,abs(y));
        float seam=exp(-pow((abs(y)-boundary)/.075,2.));
        float slash=pow(max(0.,sin(x*67.-uTime*18.+y*8.+n*5.)),14.)*body;
        vec3 flank=mix(vec3(.08,.25,1.),vec3(.8,.05,.34),smoothstep(-.3,.3,y));
        vec3 c=vec3(.018,.002,.045)*body+flank*seam*1.8+vec3(.9,.55,1.)*slash*1.3;
        float alpha=(body*.85+seam*.8)*pow(sin(x*3.14159),.4)*uPower;if(alpha<.008)discard;gl_FragColor=vec4(c,alpha);
      }`,transparent:true,depthWrite:false,side:THREE.DoubleSide});
    this.mesh=new THREE.Mesh(new THREE.PlaneGeometry(1,1,64,1),material);this.mesh.frustumCulled=false;this.mesh.visible=false;
  }
  update(center:THREE.Vector3,extent:number,power:number,time:number):void{
    this.mesh.visible=power>.004&&extent>.01;const u=this.mesh.material.uniforms;u.uCenter.value.copy(center);u.uExtent.value=extent;u.uPower.value=power;u.uTime.value=time;
  }
}

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
  private dust=new EnergyDust();private wake=new AnnihilationWake();
  constructor(scene:THREE.Scene){
    const texture=haloTexture(),geometry=new THREE.PlaneGeometry(2,2);
    this.blue=new EnergyCore(0,SKILLS.blue.color,geometry,texture);this.red=new EnergyCore(1,SKILLS.red.color,geometry,texture);this.purple=new EnergyCore(2,SKILLS.purple.color,geometry,texture);
    this.pull=new FilamentField(76,0,0x398cff);this.redFlow=new FilamentField(26,0,0xff1539);
    this.burst=new FilamentField(68,1,0xff2449);this.torrent=new FilamentField(32,2,0x9160ff);this.interference=new FilamentField(9,3,0x9870ff);
    this.group.add(this.blue.group,this.red.group,this.purple.group,this.pull.mesh,this.redFlow.mesh,this.burst.mesh,this.wake.mesh,this.torrent.mesh,this.interference.mesh,this.dust.mesh,this.light,this.secondLight);
    const shockGeo=new THREE.PlaneGeometry(2,2);
    for(let i=0;i<2;i++){
      const material=new THREE.ShaderMaterial({uniforms:{uTime:{value:0},uPower:{value:0},uAge:{value:0},uColor:{value:new THREE.Color()}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:shockFragment,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide});
      const mesh=new THREE.Mesh(shockGeo,material);this.shocks.push(mesh);this.group.add(mesh);
    }
    scene.add(this.group);this.reset();
  }
  quality(low:boolean,pixel:number):void{
    this.low=low;
    for(const [field,count] of [[this.pull,76],[this.redFlow,26],[this.burst,68],[this.torrent,32],[this.interference,9]] as const)field.geometry.instanceCount=low?Math.floor(count*.42):count;
    this.dust.mesh.geometry.setDrawRange(0,low?90:270);this.dust.mesh.material.uniforms.uPixel.value=pixel;
    for(const core of [this.blue,this.red,this.purple])core.shell.visible=!low;
  }
  update(id:SkillId,time:number,handLeft:THREE.Vector3,handRight:THREE.Vector3,_center:THREE.Vector3,reduced:boolean):void{
    this.group.visible=true;
    const d=SKILLS[id],recovery=1-ease((time-d.releaseUntil)/(d.duration-d.releaseUntil)),fade=ease(time/.5)*recovery,age=Math.max(0,time-d.chargeUntil);
    this.left.copy(handLeft);this.left.y+=.06;this.left.z+=.11;
    this.right.copy(handRight);this.right.y+=.045;this.right.z+=.14;
    for(const core of [this.blue,this.red,this.purple])core.group.visible=false;
    for(const field of [this.pull,this.redFlow,this.burst,this.torrent,this.interference])field.mesh.visible=false;
    this.dust.mesh.visible=this.wake.mesh.visible=false;
    this.secondLight.intensity=0;this.warpStrength=0;this.warpRadius=.55;
    if(id==='blue'){
      this.midpoint.set(-.55,1.38,.85);this.center.copy(this.right).lerp(this.midpoint,ease((time-1.35)/1.3));
      const collapse=1-ease((time-3.05)/.85),charge=ease(time/1.65);
      this.blue.update(this.center,(.10+.19*charge)*(.18+.82*collapse),fade,time*(1+charge*.45),reduced);
      this.pull.update(this.center,fade*(.25+.75*collapse),time*(1+charge*.65),1.0-.25*charge);
      this.dust.update(this.center,d.color,0,fade*collapse*.65,time,age);
      this.warpStrength=fade*(.2+.8*charge)*collapse;
    }else if(id==='red'){
      this.center.copy(this.right);
      if(time>=d.chargeUntil){if(!this.launched){this.origin.copy(this.center);this.launched=true;}this.center.copy(this.origin);this.center.z+=age*8.5;}
      const coreFade=fade*(1-ease(age/.40)),radius=age>0?.16+.18*ease(age/.12):.22-.11*ease(time/d.chargeUntil);
      this.red.update(this.center,radius,coreFade,time*1.8,reduced);
      this.redFlow.update(this.right,fade*(1-ease(age/.2))*.7,time*1.5,.20-.12*ease(time/d.chargeUntil));
      this.burst.material.uniforms.uColor.value.set(d.color);this.burst.update(this.origin,age>0?fade:0,time,1,age);
      this.dust.update(age>0?this.origin:this.right,d.color,age>0?1:0,fade*(age>0?.9:.20),time,age);
      this.warpStrength=age>0?Math.exp(-age*5)*fade:.13*ease(time/1.4);this.warpRadius=.7+age*1.5;
    }else{
      const merge=ease((time-2.45)/1.35);
      this.midpoint.copy(this.left).add(this.right).multiplyScalar(.5);this.midpoint.z+=.10;
      this.left.x+=.22*(1-merge);this.right.x-=.22*(1-merge);
      this.left.lerp(this.midpoint,merge);this.right.lerp(this.midpoint,merge);
      const dual=fade*(1-ease((time-3.28)/.70));
      this.blue.update(this.left,.22,dual,time,reduced);this.red.update(this.right,.19,dual,time*1.5,reduced);
      this.pull.update(this.left,dual*.65,time,.5*(1-merge)+.18);this.redFlow.update(this.right,dual*.8,time*1.6,.24);
      this.interference.material.uniforms.uEnd.value.copy(this.right);this.interference.update(this.left,dual*ease((time-1.45)/.8),time);
      this.center.copy(this.midpoint);
      if(time>=d.chargeUntil){if(!this.launched){this.origin.copy(this.center);this.launched=true;}this.center.copy(this.origin);this.center.z+=age*9.2;}
      const fusion=ease((time-3.15)/1.15)*fade;
      this.purple.update(this.center,.18+.28*ease((time-3.15)/1.3),fusion*(1-ease((age-.30)/.75)),time,reduced);
      const extent=Math.min(9,age*9.2),trail=age>0?fusion*(1-ease((age-.65)/.9)):0;
      this.torrent.update(this.origin,trail*.8,time,.3,age,extent);
      this.wake.update(this.origin,extent,trail,time);
      this.dust.update(age>0?this.origin:this.midpoint,d.color,age>0?2:0,age>0?trail*.75:dual*.3+fusion*.3,time,age,extent);
      this.burst.material.uniforms.uColor.value.set(d.color);this.burst.update(this.origin,age>0?fusion*.7:0,time,1,age);
      this.secondLight.position.copy(this.right);this.secondLight.intensity=dual*(reduced?.06:.2);
      this.warpStrength=fusion*(age>0?Math.exp(-age*2.5):.6);this.warpRadius=.45+age*2;
    }
    this.focus.copy(time>=d.chargeUntil&&id!=='blue'?this.origin:this.center);
    this.light.color.set(id==='purple'&&time<3.4?SKILLS.blue.color:d.color);
    this.light.position.copy(id==='purple'&&time<3.4?this.left:this.focus);
    const flash=id==='blue'?0:Math.exp(-age*12)*(age>0?1:0);
    this.light.intensity=fade*(reduced?.3:1)*((id==='purple'?.42:.28)+flash*.7);
    for(let i=0;i<this.shocks.length;i++){
      const mesh=this.shocks[i],a=age-i*.075;
      mesh.visible=id!=='blue'&&age>0&&a>0&&a<.72;
      mesh.position.copy(this.origin);mesh.position.z+=.12+a*1.2;mesh.rotation.z=time*.05;
      mesh.scale.setScalar(.08+a*(id==='purple'?3.3:2.8));
      const u=mesh.material.uniforms;u.uTime.value=time+i*3;u.uAge.value=a;u.uPower.value=(1-ease(a/.72))*(reduced?.12:.7);u.uColor.value.set(d.color);
    }
    if(this.low||reduced)this.warpStrength=0;
  }
  reset():void{
    this.group.visible=false;this.light.intensity=this.secondLight.intensity=0;this.launched=false;this.warpStrength=0;
    for(const field of [this.pull,this.redFlow,this.burst,this.torrent,this.interference])field.mesh.visible=false;
    for(const core of [this.blue,this.red,this.purple])core.group.visible=false;
    this.shocks.forEach(s=>s.visible=false);
    this.dust.mesh.visible=this.wake.mesh.visible=false;
  }
  get diagnostics(){return {
    active:this.group.visible,warp:this.warpStrength,
    lights:[this.light.intensity,this.secondLight.intensity],
    layers:{blue:this.blue.group.visible,red:this.red.group.visible,purple:this.purple.group.visible,
      inflow:this.pull.mesh.visible,compression:this.redFlow.mesh.visible,burst:this.burst.mesh.visible,
      torrent:this.torrent.mesh.visible,interference:this.interference.mesh.visible,dust:this.dust.mesh.visible,
      wake:this.wake.mesh.visible,shock:this.shocks.some(s=>s.visible)},
    particleBudget:this.dust.mesh.geometry.drawRange.count,
  };}
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
    float angle=atan(p.y,p.x),ripple=sin(d*90.-uTime*8.+sin(angle*5.)*.7);
    vec2 radial=normalize(p+vec2(.0001)),tangent=vec2(-radial.y,radial.x);
    vec2 offset=(radial*(.65+ripple*.35)+tangent*sin(angle*3.+uTime)*.24)*mask*uStrength*.008;offset.x/=uAspect;
    gl_FragColor=texture2D(tDiffuse,clamp(vUv+offset,vec2(.001),vec2(.999)));
  }`,
};
