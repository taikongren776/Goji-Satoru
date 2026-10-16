"""Read-only artist GLB gate. Run with Blender --background --disable-autoexec.

Technical structure and evidence presence are machine-checkable; beauty and semantic
landmark correctness require the named human review. Never copies/publishes an asset.
"""
import argparse,base64,hashlib,json,math,struct,sys
from pathlib import Path
import bpy
from mathutils import Matrix,Quaternion,Vector

ROOT=Path(__file__).resolve().parents[1]
DURATIONS={'Idle':4,'CastBlue':5,'CastRed':4,'CastPurple':8,'RevealEyes':2.4,'CoverEyes':2.4}
SCORES={'Geometry':['Head','Face','Hair','Hands','Shoulder','Body','Clothing'],'Deformation':['Hands','Fingers','Thumb','Shoulder','Elbow','Wrist','Clothing'],'Presentation':['Skin','Hair material','Clothing material','Lighting','Silhouette'],'Animation':list(DURATIONS)}
EVIDENCE=['front-full','back-full','left-full','right-full','45-full','face-close','hand-close','face-side','face-threequarter','face-up','face-down','arms-down','front90','side90','side120','elbow-bend','forearm-twist','open-hand','half-fist','fist','thumb-opposition','CastBlue','CastRed','CastPurple','blindfold-on','blindfold-off','RevealEyes','CoverEyes']

def main():
    p=argparse.ArgumentParser();p.add_argument('--manifest',required=True);p.add_argument('--out',default='output/production-character-validation.json');p.add_argument('--mode',choices=['production','integration'],default='production')
    a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);mp=Path(a.manifest).resolve();out=Path(a.out).resolve()
    if not out.is_relative_to(ROOT/'output') or out.suffix!='.json':raise ValueError('Reports must be JSON under output/; no asset writes permitted')
    errors=[];warnings=[];checks={};report={'mode':a.mode,'manifest':str(mp),'errors':errors,'warnings':warnings,'checks':checks,'published':False,'artQualityAutomaticallyAssessed':False}
    def check(name,ok,detail=None):
        checks[name]={'pass':bool(ok),'detail':detail}
        if not ok:errors.append(name)
    try:
        m=json.loads(mp.read_text(encoding='utf-8-sig'));asset=(mp.parent/m['asset']).resolve()
        check('manifest_version',m.get('version')==1)
        if asset.suffix.lower()!='.glb':raise ValueError('Input must be GLB')
        raw=asset.read_bytes();sha=hashlib.sha256(raw).hexdigest();report.update(asset=str(asset),sha256=sha,bytes=len(raw))
        if len(raw)<20 or raw[:4]!=b'glTF' or struct.unpack_from('<II',raw,4)!=(2,len(raw)):raise ValueError('Invalid GLB header/length')
        chunks=[];offset=12
        while offset<len(raw):
            if offset+8>len(raw):raise ValueError('Truncated GLB chunk')
            size,kind=struct.unpack_from('<II',raw,offset);offset+=8
            if offset+size>len(raw) or size%4:raise ValueError('Invalid GLB chunk extent/alignment')
            chunks.append((kind,raw[offset:offset+size]));offset+=size
        if not chunks or chunks[0][0]!=0x4e4f534a:raise ValueError('Missing first JSON chunk')
        j=json.loads(chunks[0][1]);blob=next((v for k,v in chunks if k==0x004e4942),b'')
        check('glb_structure',j.get('asset',{}).get('version')=='2.0')
        check('self_contained',all('uri' not in b for b in j.get('buffers',[])) and all('uri' not in i or i['uri'].startswith('data:') for i in j.get('images',[])))
        if not checks['self_contained']['pass']:raise ValueError('External resources rejected before Blender import')
        check('buffer_length',len(j.get('buffers',[]))==1 and j['buffers'][0]['byteLength']<=len(blob))
        check('supported_extensions',not set(j.get('extensionsRequired',[])) - {'KHR_materials_unlit','KHR_texture_transform','KHR_materials_emissive_strength'})
        nodes=j.get('nodes',[]);meshes=j.get('meshes',[]);skins=j.get('skins',[])
        check('mesh',bool(meshes));check('skeleton',bool(skins) and all(s.get('joints') and all(0<=n<len(nodes) for n in s['joints']) for s in skins))
        names={}
        for i,n in enumerate(nodes):names.setdefault(n.get('name',''),[]).append(i)
        def node(name):
            found=names.get(name,[])
            if len(found)!=1:raise ValueError(f'Node {name}: expected one, got {len(found)}')
            return found[0]
        parent={}
        for i,n in enumerate(nodes):
            for child in n.get('children',[]):
                if child in parent:raise ValueError('Node has multiple parents')
                parent[child]=i
        local=[]
        for n in nodes:
            if 'matrix' in n:local.append(Matrix([n['matrix'][i:i+4] for i in range(0,16,4)]).transposed())
            else:
                q=n.get('rotation',[0,0,0,1]);local.append(Matrix.LocRotScale(Vector(n.get('translation',[0,0,0])),Quaternion((q[3],q[0],q[1],q[2])),Vector(n.get('scale',[1,1,1]))))
        def world(i,seen=None):
            seen=set() if seen is None else seen
            if i in seen:raise ValueError('Cyclic nodes')
            seen.add(i);return world(parent[i],seen)@local[i] if i in parent else local[i]
        for label in ('Blindfold','FX_Hand_L','FX_Hand_R','FX_Center'):
            try:
                b=m['nodes'][label];index=node(b['node'])
                for prop in ('offset','rotation'):
                    v=b.get(prop)
                    if v is not None and (len(v)!=3 or not all(isinstance(x,(int,float)) and math.isfinite(x) for x in v)):raise ValueError('invalid socket transform')
                if label=='Blindfold':
                    todo=[index];renderable=False;seen=set()
                    while todo:
                        k=todo.pop()
                        if k in seen:continue
                        seen.add(k);renderable|='mesh' in nodes[k];todo+=nodes[k].get('children',[])
                    if not renderable:raise ValueError('cover node has no renderable descendants')
                check('binding_'+label,True,{'node':b['node'],'world':list(world(index).translation)})
            except Exception as e:check('binding_'+label,False,str(e))
        formats={5120:('b',1),5121:('B',1),5122:('h',2),5123:('H',2),5125:('I',4),5126:('f',4)};widths={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}
        cache={}
        def accessor(i):
            if i in cache:return cache[i]
            acc=j['accessors'][i]
            if 'sparse' in acc:raise ValueError('Sparse accessors require an expanded export for this validator')
            view=j['bufferViews'][acc['bufferView']];fmt,size=formats[acc['componentType']];count=widths[acc['type']];stride=view.get('byteStride',size*count);start=view.get('byteOffset',0)+acc.get('byteOffset',0)
            if view.get('buffer',0)!=0 or stride<size*count or acc['count']<1 or start+stride*(acc['count']-1)+size*count>min(len(blob),view.get('byteOffset',0)+view['byteLength']):raise ValueError('Accessor bounds invalid')
            rows=[struct.unpack_from('<'+fmt*count,blob,start+k*stride) for k in range(acc['count'])]
            if acc.get('normalized') and acc['componentType']!=5126:
                maximum={5120:127,5121:255,5122:32767,5123:65535,5125:4294967295}[acc['componentType']];rows=[tuple(max(-1,v/maximum) for v in row) for row in rows]
            if not all(math.isfinite(v) for row in rows for v in row):raise ValueError('Non-finite accessor')
            cache[i]=rows;return rows
        primitives=[p for mesh in meshes for p in mesh['primitives']]
        check('uv',bool(primitives) and all('TEXCOORD_0' in p['attributes'] for p in primitives))
        check('materials',bool(j.get('materials')) and all(isinstance(p.get('material'),int) and 0<=p['material']<len(j['materials']) for p in primitives))
        check('textures',bool(j.get('images')) and bool(j.get('textures')))
        for prim in primitives:
            for attr in ('TEXCOORD_0','NORMAL'):
                if attr in prim['attributes']:accessor(prim['attributes'][attr])
        for skin in skins:
            if 'inverseBindMatrices' in skin:check('inverse_bind_'+str(skins.index(skin)),len(accessor(skin['inverseBindMatrices']))==len(skin['joints']))
        skinned_nodes=[n for n in nodes if 'skin' in n and 'mesh' in n];check('skin',bool(skinned_nodes))
        weight_errors=[]
        for n in skinned_nodes:
            skin=skins[n['skin']]
            for prim in meshes[n['mesh']]['primitives']:
                at=prim['attributes']
                if 'JOINTS_0' not in at or 'WEIGHTS_0' not in at:weight_errors.append('missing joints/weights');continue
                joints=accessor(at['JOINTS_0']);weights=accessor(at['WEIGHTS_0']);position=accessor(at['POSITION'])
                if len(joints)!=len(position) or len(weights)!=len(position):weight_errors.append('attribute count mismatch')
                if any(any(w<0 for w in row) or abs(sum(row)-1)>.001 for row in weights):weight_errors.append('invalid normalized weights')
                if any(any(i<0 or i>=len(skin['joints']) for i in row) for row in joints):weight_errors.append('joint index out of range')
                if 'WEIGHTS_1' in at and any(any(w>0 for w in row) for row in accessor(at['WEIGHTS_1'])):weight_errors.append('secondary influence set unsupported by runtime')
        check('linear_skin_weights',not weight_errors,weight_errors[:20])
        for name,duration in DURATIONS.items():
            try:
                binding=m['animations'][name];clips=[c for c in j.get('animations',[]) if c.get('name')==binding['clip']]
                if len(clips)!=1:raise ValueError('missing/duplicate mapped clip')
                clip=clips[0];times=[accessor(s['input']) for s in clip['samplers']];end=max(row[0] for seq in times for row in seq);start=min(row[0] for seq in times for row in seq)
                if not clip['channels'] or abs(start)>.001 or end<=0:raise ValueError('invalid clip range/channels')
                if binding['timing'] not in ('exact','fit') or binding['timing']=='exact' and abs(end-duration)>.01:raise ValueError('duration mismatch; explicit fit required')
                for seq in times:
                    if any(b[0]<=a[0] for a,b in zip(seq,seq[1:])):raise ValueError('unordered animation time')
                check('animation_'+name,True,{'source':binding['clip'],'seconds':end,'logicalSeconds':duration,'timing':binding['timing']})
            except Exception as e:check('animation_'+name,False,str(e))
        points=[]
        for i,n in enumerate(nodes):
            if 'mesh' not in n:continue
            transform=world(i)
            for prim in meshes[n['mesh']]['primitives']:
                for row in accessor(prim['attributes']['POSITION']):points.append(transform@Vector(row))
        low=min(v.y for v in points);high=max(v.y for v in points);height=high-low;c=m['coordinates']
        check('coordinate_declaration',c['unit']=='meter' and c['up']=='Y' and c['forward']=='+Z')
        check('height',c['heightRange'][0]<=height<=c['heightRange'][1],{'meters':height,'allowed':c['heightRange']})
        check('feet_ground',abs(low)<=min(.05,c['groundTolerance']),{'minY':low,'maxY':high})
        try:
            landmarks=c['landmarks'];feet=[world(node(n)).translation for n in landmarks['feet']];direction=world(node(landmarks['front'])).translation-world(node(landmarks['back'])).translation
            check('feet_landmarks',len(feet)>=2 and all(abs(v.y)<=c['groundTolerance'] for v in feet),[list(v) for v in feet])
            check('forward_landmarks',direction.z>.03 and abs(direction.x)<direction.z*.3 and abs(direction.y)<direction.z*.3,list(direction))
        except Exception as e:check('orientation_landmarks',False,str(e))
        # Actually load the GLB using Blender's importer, independent of JSON inspection.
        bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(asset))
        check('blender_load',any(o.type=='MESH' for o in bpy.context.scene.objects) and any(o.type=='ARMATURE' for o in bpy.context.scene.objects))
        check('asset_unmodified',hashlib.sha256(asset.read_bytes()).hexdigest()==sha)
        if a.mode=='production':
            check('production_manifest',m.get('usage')=='production' and m.get('version')==1 and m.get('presentation')=='authored')
            try:
                rp=(mp.parent/m['review']).resolve();review=json.loads(rp.read_text(encoding='utf-8-sig'))
                check('human_review_identity',bool(review.get('reviewer')) and bool(review.get('reviewedAt')) and review.get('assetSha256')==sha)
                missing_scores=[]
                for category,items in SCORES.items():
                    for item in items:
                        score=review.get('scores',{}).get(category,{}).get(item)
                        if not isinstance(score,(int,float)) or isinstance(score,bool) or not math.isfinite(score) or not 5<=score<=10:missing_scores.append(category+'/'+item)
                check('visual_scores',not missing_scores,missing_scores)
                missing_notes=[category+'/'+item for category,items in SCORES.items() for item in items if not str(review.get('observations',{}).get(category,{}).get(item) or '').strip()]
                check('visual_observations',not missing_notes,missing_notes)
                missing=[]
                for name in EVIDENCE:
                    ref=review.get('evidence',{}).get(name)
                    if not ref or not (rp.parent/ref).is_file():missing.append(name)
                check('visual_evidence',not missing,missing)
                check('human_approval',review.get('status')=='APPROVED')
            except Exception as e:check('human_review',False,str(e))
        else:
            # This mode permits legacy art omissions solely for integration testing.
            allowed={'uv','textures'}
            if not c.get('landmarks'):allowed.add('orientation_landmarks')
            for name in list(errors):
                if name in allowed:errors.remove(name);warnings.append('NOT_PRODUCTION_READY: '+name)
            warnings.append('INTEGRATION_ONLY: no human art acceptance; never eligible for publication')
        report['status']='PRODUCTION_GATE_PASS' if a.mode=='production' and not errors else 'INTEGRATION_ONLY_PASS' if not errors else 'FAIL'
    except Exception as e:
        errors.append(str(e));report['status']='FAIL'
    report['limitations']=['Landmark semantic meaning and actual beauty require human review.','Rest-space bounds do not prove all animation frames remain valid.','Run full deformation/contact and browser parity tests separately.','Unsupported compression/sparse data must be exported uncompressed/expanded, not silently skipped.']
    out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({'status':report['status'],'errors':errors,'warnings':warnings,'out':str(out)},ensure_ascii=False))
    if report['status']=='FAIL':raise SystemExit(2)

if __name__=='__main__':main()
