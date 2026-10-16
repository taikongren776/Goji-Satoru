/** Stable application vocabulary. Asset names and skeleton layout belong in a manifest. */
export const ANIMATION_SECONDS = {Idle:4, CastBlue:5, CastRed:4, CastPurple:8, RevealEyes:2.4, CoverEyes:2.4} as const;
export type CharacterAnimation = keyof typeof ANIMATION_SECONDS;
export const SOCKET_NAMES = ['FX_Hand_L','FX_Hand_R','FX_Center'] as const;
export type CharacterSocket = typeof SOCKET_NAMES[number];
export const VISUAL_CATEGORIES={Geometry:['Head','Face','Hair','Hands','Shoulder','Body','Clothing'],Deformation:['Hands','Fingers','Thumb','Shoulder','Elbow','Wrist','Clothing'],Presentation:['Skin','Hair material','Clothing material','Lighting','Silhouette'],Animation:Object.keys(ANIMATION_SECONDS)} as const;
/** Verifies the human record, not the truth of its artistic assessment. */
export function requireCharacterReview(value:unknown,sha256:string):void {
  const r=value as {status?:string;reviewer?:string;reviewedAt?:string;assetSha256?:string;scores?:Record<string,Record<string,number>>};
  if(!r||r.status!=='APPROVED'||!r.reviewer?.trim()||!r.reviewedAt||r.assetSha256!==sha256)throw new Error('Production asset lacks a matching human approval record');
  for(const [category,items] of Object.entries(VISUAL_CATEGORIES))for(const item of items){const score=r.scores?.[category]?.[item];if(typeof score!=='number'||!Number.isFinite(score)||score<5||score>10)throw new Error(`Production visual gate: ${category}/${item}`);}
}
export type NodeBinding = {node:string; offset?:[number,number,number]; rotation?:[number,number,number]};
export interface CharacterManifest {
  version:1;
  id:string;
  asset:string;
  usage:'legacy-reference'|'integration-test'|'production';
  animations:Record<CharacterAnimation,{clip:string; timing:'exact'|'fit'}>;
  nodes:{Blindfold:{node:string; mode:'fade-lift'|'authored'} } & Record<CharacterSocket,NodeBinding>;
  presentation:'legacy'|'authored';
  blink?:{target:string; nodes?:string[]};
  coordinates:{unit:'meter';up:'Y';forward:'+Z';heightRange:[number,number];groundTolerance:number;landmarks?:{feet:string[];front:string;back:string}};
  review?:string;
}
export function parseCharacterManifest(value:unknown):CharacterManifest {
  if(!value || typeof value!=='object')throw new Error('Character manifest must be an object');
  const m=value as CharacterManifest;
  const text=(v:unknown)=>typeof v==='string'&&v.trim().length>0;
  if(m.version!==1||!text(m.id)||!text(m.asset))throw new Error('Invalid character manifest version/id/asset');
  if(!['legacy-reference','integration-test','production'].includes(m.usage))throw new Error('Invalid asset usage');
  if(!['legacy','authored'].includes(m.presentation))throw new Error('Invalid presentation profile');
  for(const name of Object.keys(ANIMATION_SECONDS) as CharacterAnimation[]){
    const b=m.animations?.[name];if(!b||!text(b.clip)||!['exact','fit'].includes(b.timing))throw new Error(`Missing animation mapping: ${name}`);
  }
  if(!text(m.nodes?.Blindfold?.node)||!['fade-lift','authored'].includes(m.nodes.Blindfold.mode))throw new Error('Invalid Blindfold binding');
  for(const name of SOCKET_NAMES){
    const b=m.nodes?.[name];if(!text(b?.node))throw new Error(`Missing socket mapping: ${name}`);
    for(const v of [b.offset,b.rotation])if(v!==undefined&&(!Array.isArray(v)||v.length!==3||!v.every(Number.isFinite)))throw new Error(`Invalid socket transform: ${name}`);
  }
  const c=m.coordinates;
  if(!c||c.unit!=='meter'||c.up!=='Y'||c.forward!=='+Z'||!Array.isArray(c.heightRange)||c.heightRange.length!==2||!c.heightRange.every(Number.isFinite)||c.heightRange[0]<=0||c.heightRange[1]<=c.heightRange[0]||!Number.isFinite(c.groundTolerance)||c.groundTolerance<0||c.groundTolerance>.05)throw new Error('Invalid coordinate contract');
  if(c.landmarks&&(!Array.isArray(c.landmarks.feet)||c.landmarks.feet.length<2||!c.landmarks.feet.every(text)||!text(c.landmarks.front)||!text(c.landmarks.back)))throw new Error('Invalid coordinate landmarks');
  if(m.blink&&(!text(m.blink.target)||(m.blink.nodes!==undefined&&(!Array.isArray(m.blink.nodes)||!m.blink.nodes.every(text)))))throw new Error('Invalid blink mapping');
  if(m.usage==='production'&&!text(m.review))throw new Error('Production requires a human visual review record');
  return m;
}
