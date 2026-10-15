"""Surface crossing audit. BVH broad phase + non-coplanar triangle/segment narrow phase.

Not a physics/contact solver: no positive finding is an artistic score; no finding does
not exclude coplanar overlap, complete containment, or collisions between sample times.
"""
import argparse,sys,json,hashlib,collections
from pathlib import Path
import bpy,numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
sys.path.insert(0,str(Path(__file__).resolve().parent))
from character_common import get_rig,neutral,set_action,pose_case,CASES,write_json

def family(name):
    for f in ('Thumb','Index','Middle','Ring','Pinky'):
        if name.startswith(f):return f
    return 'Palm'

def prepare(obj):
    me=obj.data;me.calc_loop_triangles();names={g.index:g.name for g in obj.vertex_groups}
    weights=[{names[g.group]:g.weight for g in v.groups if g.weight>.00001} for v in me.vertices]
    triangles=[tuple(t.vertices) for t in me.loop_triangles]
    dominant=[]
    for t in triangles:
        sums=collections.defaultdict(float)
        for i in t:
            for n,w in weights[i].items():sums[family(n)]+=w/3
        dominant.append(max(sums,key=sums.get))
    if obj.name=='UniformAndBoots':
        # Both arm and torso regions, excluding boot/trouser components.
        ids=[i for i,t in enumerate(triangles) if any(sum(w for n,w in weights[v].items() if n.startswith(('Chest','UpperArm','Forearm','Spine')))>.5 for v in t)]
    else:ids=list(range(len(triangles)))
    return {'obj':obj,'triangles':triangles,'ids':ids,'dominant':dominant,'weights':weights}

def posed(data):
    ob=data['obj'];ev=ob.evaluated_get(bpy.context.evaluated_depsgraph_get());mesh=ev.to_mesh()
    vertices=[ev.matrix_world@v.co for v in mesh.vertices];ev.to_mesh_clear()
    selected=[data['triangles'][i] for i in data['ids']]
    return {'data':data,'v':vertices,'tree':BVHTree.FromPolygons(vertices,selected,all_triangles=True,epsilon=0)}

def segment_hit(a,b,t):
    # Moller-Trumbore, exclude grazing endpoints/triangle boundaries by a small tolerance.
    p,q,r=t;d=b-a;e1=q-p;e2=r-p;h=d.cross(e2);det=e1.dot(h)
    if abs(det)<1e-13:return None
    inv=1/det;s=a-p;u=inv*s.dot(h)
    if u<1e-5 or u>1-1e-5:return None
    v=inv*d.dot(s.cross(e1))
    if v<1e-5 or u+v>1-1e-5:return None
    time=inv*e2.dot(s.cross(e1))
    if time<1e-5 or time>1-1e-5:return None
    return a+d*time

def crossing(a,b,limit=12):
    da,db=a['data'],b['data'];same=a is b
    pairs=a['tree'].overlap(b['tree']);found=[];kinds=collections.Counter();count=0;max_span=0
    for ai,bi in pairs:
        ia,ib=da['ids'][ai],db['ids'][bi]
        if same and ia>=ib:continue
        ta,tb=da['triangles'][ia],db['triangles'][ib]
        if same and set(ta)&set(tb):continue # shared edges/vertices are continuous topology, not penetration
        # Separate uniform detailing components may legitimately overlap: report explicitly as review.
        va=[a['v'][i] for i in ta];vb=[b['v'][i] for i in tb];points=[]
        for v,w in ((va,vb),(vb,va)):
            for i in range(3):
                hit=segment_hit(v[i],v[(i+1)%3],w)
                if hit is not None and all((hit-p).length>1e-6 for p in points):points.append(hit)
        if len(points)<2:continue
        span=max((p-q).length for p in points for q in points)
        if span<.0002:continue # grazing crossings below 0.2mm are not classified as major penetration
        fa,fb=da['dominant'][ia],db['dominant'][ib]
        kind='/'.join(sorted((fa,fb))) if same else 'different_objects'
        kinds[kind]+=1;count+=1;max_span=max(max_span,span)
        if len(found)<limit:
            found.append({'triangles':[ia,ib],'vertices':[list(ta),list(tb)],'families':[fa,fb],
                          'intersection_segment_m':span,'location_world':list(sum(points,Vector())/len(points)),
                          'bones':[sorted({n for v in t for n,w in data['weights'][v].items() if w>.1}) for data,t in ((da,ta),(db,tb))]})
    return {'crossing_pairs':count,'max_intersection_segment_m':max_span,'family_pairs':dict(kinds),'examples':found,
            'classification':'SURFACE_CROSSING_REVIEW' if count else 'NO_NONCOPLANAR_CROSSING_FOUND'}

def inspect(rig,data):
    posed_data={n:posed(d) for n,d in data.items()};result={}
    for n in ('HandMesh.L','HandMesh.R'):result[n+'__self']=crossing(posed_data[n],posed_data[n])
    result['left__right']=crossing(posed_data['HandMesh.L'],posed_data['HandMesh.R'])
    for n in ('HandMesh.L','HandMesh.R'):result[n+'__uniform']=crossing(posed_data[n],posed_data['UniformAndBoots'])
    # Accurate nearest surface distance between hands (sampled at vertices); contact can exist without crossing.
    minimum=min((posed_data['HandMesh.R']['tree'].find_nearest(v)[3] for v in posed_data['HandMesh.L']['v']),default=0)
    return {'pairs':result,'left_right_vertex_surface_gap_m':minimum,
            'sockets':{n:list(bpy.data.objects[n].matrix_world.translation) for n in ('FX_Hand_L','FX_Hand_R','FX_Center')}}

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--asset',required=True);parser.add_argument('--out',required=True);parser.add_argument('--hz',type=int,default=30);parser.add_argument('--clips',default='Idle,CastBlue,CastRed,CastPurple,RevealEyes,CoverEyes');parser.add_argument('--poses-only',action='store_true')
    a=parser.parse_args(sys.argv[sys.argv.index('--')+1:]);asset=Path(a.asset).resolve();bpy.ops.wm.open_mainfile(filepath=str(asset));rig=get_rig();neutral(rig)
    data={n:prepare(bpy.data.objects[n]) for n in ('HandMesh.L','HandMesh.R','UniformAndBoots')}
    report={'asset':str(asset),'sha256':hashlib.sha256(asset.read_bytes()).hexdigest(),'hz':a.hz,'status':'REVIEW_REQUIRED',
            'limitations':['Surface crossings are not penetration depth or contact forces.','Coplanar overlap, containment, and between-sample collisions are not excluded.','Uniform overlaps can include legal cuff coverage. Shoulder/torso self-crossing is not yet implemented.','Zero crossings is not a visual pass.'],'clips':{},'poses':{}}
    fps=bpy.context.scene.render.fps/bpy.context.scene.render.fps_base
    if not a.poses_only:
        for name in a.clips.split(','):
            lo,hi=bpy.data.actions[name].frame_range;frames=set(np.arange(lo,hi+.00001,fps/a.hz).round(6))|{float(hi)}
            if name=='CastRed':frames.update(np.arange(40,48.0001,.25))
            seq=[]
            for f in sorted(frames):
                neutral(rig);set_action(rig,name,float(f));sample=inspect(rig,data);sample['frame']=float(f);seq.append(sample)
            report['clips'][name]=seq;write_json(a.out,report);print('CONTACTS',name,len(seq),flush=True)
    for case in CASES:
        if case[0] not in ('rest','open','half-fist','fist','thumb-open','thumb-index','thumb-middle','wrist-flexion','wrist-twist','elbow-bend'):continue
        pose_case(rig,case);report['poses'][case[0]]=inspect(rig,data)
    report['completed']=True;write_json(a.out,report)
    print('CONTACTS_COMPLETE',flush=True)

if __name__=='__main__':main()
