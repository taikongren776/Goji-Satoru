"""Blender --background --python scripts/audit_deformation.py -- --asset ... --out ...
Nonzero exit means blockers detected (Blender may map SystemExit(2) to exit 1).
Reports are evidence, never an artistic pass.
"""
import argparse, collections, hashlib, json, sys, subprocess
from pathlib import Path
import bpy, bmesh, numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parent))
from character_common import get_rig, neutral, set_action, pose_case, CASES, write_json

def coordinates(obj):
    ev = obj.evaluated_get(bpy.context.evaluated_depsgraph_get()); me = ev.to_mesh()
    co = np.empty(len(me.vertices)*3, dtype=np.float64); me.vertices.foreach_get('co', co)
    ev.to_mesh_clear()
    return co.reshape(-1, 3)

def finger_family(name):
    for key in ('Index', 'Middle', 'Ring', 'Pinky', 'Thumb'):
        if name.startswith(key): return key + name[-2:]
    if name.startswith('finger'): return name.split('-')[0] + name[-2:]
    return None

def inspect_mesh(obj, rig):
    me=obj.data; bm=bmesh.new(); bm.from_mesh(me)
    groups={g.index:g.name for g in obj.vertex_groups}
    skin_names=set(rig.data.bones.keys())
    weights=[{groups[g.group]:float(g.weight) for g in v.groups if groups[g.group] in skin_names and (abs(g.weight)>1e-8 or not np.isfinite(g.weight))} for v in me.vertices]
    invalid=[]; mixed=[]
    for i,w in enumerate(weights):
        if not all(np.isfinite(x) and x>=0 for x in w.values()) or abs(sum(w.values())-1)>1e-4 or len(w)>4:
            invalid.append({'vertex':i,'weights':w})
        families={finger_family(k) for k,v in w.items() if v>.05 and finger_family(k)}
        if len(families)>1: mixed.append(i)
    edges=np.array([e.vertices[:] for e in me.edges],dtype=np.int32)
    rest=np.array([v.co[:] for v in me.vertices])
    lengths=np.linalg.norm(rest[edges[:,0]]-rest[edges[:,1]],axis=1)
    jumps=np.array([sum(abs(weights[a].get(k,0)-weights[b].get(k,0)) for k in weights[a].keys()|weights[b].keys()) for a,b in edges])
    me.calc_loop_triangles();tri=np.array([t.vertices[:] for t in me.loop_triangles],dtype=np.int32)
    def area(p): return np.linalg.norm(np.cross(p[tri[:,1]]-p[tri[:,0]],p[tri[:,2]]-p[tri[:,0]]),axis=1)*.5
    area0=area(rest)
    # Connected components are recorded, not assumed defective (nails/eyes may be separate).
    adjacency=[[] for _ in me.vertices]
    for a,b in edges: adjacency[a].append(int(b));adjacency[b].append(int(a))
    unseen=set(range(len(rest))); components=[]
    while unseen:
        stack=[unseen.pop()]; n=0
        while stack:
            a=stack.pop();n+=1
            for b in adjacency[a]:
                if b in unseen:unseen.remove(b);stack.append(b)
        components.append(n)
    topology={'vertices':len(rest),'faces':len(me.polygons),'quads':sum(len(p.vertices)==4 for p in me.polygons),
              'boundary_edges':sum(e.is_boundary for e in bm.edges),'nonmanifold_edges':sum(not e.is_manifold for e in bm.edges),
              'zero_area_faces':sum(f.calc_area()<1e-12 for f in bm.faces),'component_sizes':sorted(components,reverse=True)}
    bm.free()
    # Restrict clothing/body scan to shoulders and hands using rig groups, not arbitrary spatial boxes.
    def relevant(k):return any(t in k.lower() for t in ('hand','finger','thumb','index','middle','ring','pinky','arm','clavicle','shoulder','wrist','metacarpal'))
    region=np.array([sum(v for k,v in w.items() if relevant(k))>.1 for w in weights])
    edge_region=region[edges].any(axis=1);tri_region=region[tri].any(axis=1)
    bridges=[]
    for side in ('L','R'):
        ref='wrist.'+side in rig.data.bones
        jointnames=[f'finger{i}-1.{side}' for i in range(2,6)] if ref else [f'{f}1.{side}' for f in ('Index','Middle','Ring','Pinky')]
        if not all(n in rig.data.bones for n in jointnames):continue
        bases=[rig.data.bones[n].head_local for n in jointnames];pips=[rig.data.bones[n].tail_local for n in jointnames]
        axis=sum((b-a for a,b in zip(bases,pips)),bases[0]*0).normalized()
        # In bone/armature coordinates. Beyond every PIP excludes ordinary palm webbing.
        transform=rig.matrix_world.inverted()@obj.matrix_world
        coords=np.array([tuple(transform@v.co) for v in me.vertices]);axis=np.array(axis)
        cutoff=max(float(np.dot(tuple(v),axis)) for v in pips)
        eligible={i for i,w in enumerate(weights) if float(coords[i]@axis)>cutoff and any(finger_family(k) and k.endswith('.'+side) for k in w)}
        while eligible:
            stack=[eligible.pop()];ids=[]
            while stack:
                i=stack.pop();ids.append(i)
                for j in adjacency[i]:
                    if j in eligible:eligible.remove(j);stack.append(j)
            families={finger_family(k) for i in ids for k,v in weights[i].items() if v>.8 and finger_family(k)}
            if len(families)>1:bridges.append({'side':side,'vertices':len(ids),'finger_families':sorted(families),'examples':ids[:20],'slice':'distal to all proximal interphalangeal joints'})
    return {'object':obj,'rest':rest,'edges':edges,'lengths':lengths,'weights':weights,'jumps':jumps,'tri':tri,'areas':area0,'area_fn':area,'edge_region':edge_region,'tri_region':tri_region,
            'public':{'topology':topology,'invalid_weight_count':len(invalid),'invalid_weight_examples':invalid[:20],
                      'cross_finger_vertices':len(mixed),'cross_finger_examples':mixed[:30],'distal_interfinger_bridges':bridges,
                      'armature_preserve_volume':[m.use_deform_preserve_volume for m in obj.modifiers if m.type=='ARMATURE']}}

def sample(data, frame):
    co=coordinates(data['object']); e=data['edges']; l=data['lengths']
    if co.shape != data['rest'].shape: raise ValueError('Topology-changing modifier prevents vertex correspondence')
    if not np.isfinite(co).all():return {'frame':frame,'nonfinite':True,'severity':'blocker'}
    deformed=np.linalg.norm(co[e[:,0]]-co[e[:,1]],axis=1)
    ratio=deformed/np.maximum(l,1e-10); expansion=deformed-l
    mask=data['edge_region']&(l>1e-6)
    # Multiple corroborating measurements: large ratio + absolute expansion + abrupt weight gradient.
    severe=mask&(ratio>3)&(expansion>.003)&(data['jumps']>.35)
    area_ratio=data['area_fn'](co)/np.maximum(data['areas'],1e-15)
    collapsed=data['tri_region']&(data['areas']>1e-10)&(area_ratio<.03)
    ids=np.flatnonzero(mask);worst=ids[np.argsort(ratio[ids])[-5:][::-1]] if len(ids) else []
    details=[{'edge':int(i),'vertices':e[i].tolist(),'rest_m':float(l[i]),'deformed_m':float(deformed[i]),'ratio':float(ratio[i]),'weight_L1_jump':float(data['jumps'][i]),'weights':[data['weights'][v] for v in e[i]]} for i in worst]
    return {'frame':frame,'max_edge_ratio':float(np.max(ratio[mask])) if mask.any() else 1,
            'edges_over_3':int(np.sum(mask&(ratio>3))),'corroborated_stretch_edges':int(severe.sum()),
            'collapsed_triangles_review':int(collapsed.sum()),'severity':'blocker' if severe.any() else 'review' if collapsed.any() else 'clear',
            'worst_edges':details,'edge_lengths':deformed}

def main():
    p=argparse.ArgumentParser();p.add_argument('--asset',required=True);p.add_argument('--out',required=True);p.add_argument('--baseline');p.add_argument('--hz',type=int,default=60);p.add_argument('--render-evidence',action='store_true')
    args=p.parse_args(sys.argv[sys.argv.index('--')+1:]);asset=Path(args.asset).resolve()
    bpy.ops.wm.open_mainfile(filepath=str(asset));rig=get_rig();neutral(rig)
    meshes=[inspect_mesh(o,rig) for o in bpy.context.scene.objects if o.type=='MESH' and any(m.type=='ARMATURE' for m in o.modifiers)]
    fps=bpy.context.scene.render.fps/bpy.context.scene.render.fps_base
    report={'asset':str(asset),'sha256':hashlib.sha256(asset.read_bytes()).hexdigest(),'fps':fps,'sample_hz':args.hz,'scope':'hands and shoulders',
            'thresholds':{'ratio':3,'absolute_expansion_m':.003,'weight_L1_jump':.35,'collapsed_area_ratio':.03},
            'limitations':['Cross-finger counts include legitimate palm web transitions; distal examples require review.','Surface self-intersection is not conclusively detected by area/edge tests.','No visual quality score is inferred.'],
            'rig':{'name':rig.name,'bones':len(rig.data.bones),'determinant':rig.matrix_world.determinant(),'bones_detail':{b.name:{'parent':b.parent.name if b.parent else None,'rest_matrix':[list(row) for row in b.matrix_local]} for b in rig.data.bones}},
            'meshes':{d['object'].name:d['public'] for d in meshes},'clips':{},'diagnostic_poses':{},'missing_clips':[]}
    blockers=0;reviews=0
    for name in ('CastBlue','CastRed','CastPurple'):
        if name not in bpy.data.actions:report['missing_clips'].append(name);continue
        act=bpy.data.actions[name];lo,hi=map(float,act.frame_range)
        frames=set(np.arange(lo,hi+1e-6,fps/args.hz).round(6).tolist())|{hi}
        if name=='CastRed':frames.update(np.arange(40,48.001,.25).tolist())
        curves=[fc for layer in act.layers for strip in layer.strips for bag in strip.channelbags for fc in bag.fcurves]
        clip={'range':[lo,hi],'interpolation':dict(collections.Counter(k.interpolation for fc in curves for k in fc.keyframe_points)),'meshes':{}}
        previous={}
        for f in sorted(frames):
            set_action(rig,name,f)
            for d in meshes:
                n=d['object'].name;s=sample(d,f);lengths=s.pop('edge_lengths',None)
                if n in previous and lengths is not None:
                    prevf,prev=previous[n]; dt=(f-prevf)/fps
                    s['max_edge_length_rate_m_s']=float(np.max(np.abs(lengths-prev))/max(dt,1e-9))
                    abrupt=np.flatnonzero(d['edge_region']&(np.abs(lengths-prev)>.004)&(np.abs(lengths-prev)/max(dt,1e-9)>.5))
                    if len(abrupt):
                        s['temporal_discontinuity_review']={'previous_frame':prevf,'edge_ids':abrupt[:20].tolist(),'count':len(abrupt),'criterion':'over 4 mm edge-length change and over 0.5 m/s; requires visual review'}
                        if s['severity']=='clear':s['severity']='review'
                if lengths is not None:previous[n]=(f,lengths)
                blockers+=s['severity']=='blocker'
                reviews+=s['severity']=='review'
                clip['meshes'].setdefault(n,[]).append(s)
        report['clips'][name]=clip
        print('AUDITED',name,len(frames),'samples',flush=True)
    for case in CASES:
        if case[1]:continue
        pose_case(rig,case);results={}
        for d in meshes:
            s=sample(d,0);s.pop('edge_lengths',None);results[d['object'].name]=s;blockers+=s['severity']=='blocker';reviews+=s['severity']=='review'
        report['diagnostic_poses'][case[0]]=results
    report['blocker_samples']=blockers
    report['review_samples']=reviews
    report['status']='FAIL' if blockers or report['missing_clips'] or any(d['public']['invalid_weight_count'] or d['public']['distal_interfinger_bridges'] or d['public']['topology']['zero_area_faces'] for d in meshes) else 'REVIEW_REQUIRED' if reviews else 'NUMERICAL_CHECKS_CLEAR_VISUAL_REVIEW_REQUIRED'
    if args.baseline:
        base=json.loads(Path(args.baseline).read_text(encoding='utf-8'))
        report['comparison']={'baseline_sha256':base['sha256'],'baseline_blocker_samples':base['blocker_samples'],'candidate_blocker_samples':blockers,
                              'comparable_clips':sorted(set(base['clips'])&set(report['clips'])),'warning':'Different topology requires region/pose review; raw counts alone are not a quality comparison.'}
    write_json(args.out,report);print('RESULT',report['status'],'blocker samples',blockers,flush=True)
    if args.render_evidence and report['status']=='FAIL':
        evidence=Path(args.out).resolve().parent/(Path(args.out).stem+'-evidence')
        command=[bpy.app.binary_path,'--background','--python-exit-code','2','--python',str(Path(__file__).with_name('render_character_audit.py')),'--','--asset',str(asset),'--out',str(evidence),'--report',str(Path(args.out).resolve()),'--wire','--cases','rest,red-40,red-44,red-48,blue-46,purple-132,fist,shoulder-front,shoulder-side','--size','900','--samples','16']
        completed=subprocess.run(command,check=False)
        report['evidence']={'directory':str(evidence),'render_exit_code':completed.returncode};write_json(args.out,report)
    if report['status']=='FAIL':raise SystemExit(2)

if __name__=='__main__':main()
