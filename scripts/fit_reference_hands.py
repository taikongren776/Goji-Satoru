"""Fit authored CC0 hand topology to the existing rig in an isolated candidate.
No primitives, remeshing, decimation, or nearest-neighbour weight transfer.
The existing body remains an explicitly unaccepted comparison scaffold.
"""
import sys,json
from pathlib import Path
import bpy
from mathutils import Vector, Matrix
sys.path.insert(0,str(Path(__file__).resolve().parent))
from character_common import ROOT,neutral,write_json

bpy.ops.wm.open_mainfile(filepath=str(ROOT/'blender/candidates/makehuman-reference.blend'))
ref=bpy.data.objects['ReferenceBody'];rr=bpy.data.objects['ReferenceRig']
v=[x.co.copy() for x in ref.data.vertices];faces=[p.vertices[:] for p in ref.data.polygons]
uv=[[tuple(ref.data.uv_layers.active.data[i].uv) for i in p.loop_indices] for p in ref.data.polygons]
names={g.index:g.name for g in ref.vertex_groups};weights=[{names[g.group]:g.weight for g in x.groups} for x in ref.data.vertices]
bones={b.name:{'head':b.head_local.copy(),'tail':b.tail_local.copy(),'z':b.matrix_local.to_3x3().col[2].copy(),'parent':b.parent.name if b.parent else None} for b in rr.data.bones}
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'blender/gojo.blend'));rig=bpy.data.objects['GojoRig'];neutral(rig)
def basis(wrist,index,pinky,tip):
    u=(index-pinky).normalized();long=tip-wrist;long=(long-u*long.dot(u)).normalized();normal=u.cross(long).normalized()
    return Matrix((u,long,normal)).transposed()
results=[]
for side in ('L','R'):
    wrist=bones['wrist.'+side]['head'];tip=bones['finger3-3.'+side]['tail']
    source_basis=basis(wrist,bones['finger2-1.'+side]['head'],bones['finger5-1.'+side]['head'],tip)
    target=rig.data.bones['Hand.'+side].head_local.copy();targettip=rig.data.bones['Middle3.'+side].tail_local.copy()
    target_basis=basis(target,rig.data.bones['Index1.'+side].head_local,rig.data.bones['Pinky1.'+side].head_local,targettip)
    scale=(targettip-target).length/(tip-wrist).length;rotation=target_basis@source_basis.transposed()
    def fitted(point):return target+rotation@(point-wrist)*scale
    def part(name):return name.endswith('.'+side) and name.startswith(('wrist','finger','metacarpal'))
    # Keep complete authored polygons, with the only permitted open boundary beneath the sleeve.
    long=source_basis.col[1]
    selected={i for i,w in enumerate(weights) if sum(a for k,a in w.items() if part(k) or k=='lowerarm02.'+side)>.5 and (v[i]-wrist).dot(long)>-.028}
    faceids=[i for i,f in enumerate(faces) if all(x in selected for x in f)]
    used=sorted({x for i in faceids for x in faces[i]});mapping={x:i for i,x in enumerate(used)}
    rename={'wrist.'+side:'Hand.'+side,'lowerarm01.'+side:'Forearm.'+side,'lowerarm02.'+side:'Forearm.'+side}
    for digit,name in enumerate(('Thumb','Index','Middle','Ring','Pinky'),1):
        for j in range(1,4):rename[f'finger{digit}-{j}.{side}']=f'{name}{j-1 if digit==1 else j}.{side}'
    for j in range(1,5):rename[f'metacarpal{j}.{side}']=f'Metacarpal{j}.{side}'
    bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
    for old,new in rename.items():
        if new.startswith(('Hand','Forearm')):continue
        b=bones[old];eb=rig.data.edit_bones.get(new) or rig.data.edit_bones.new(new)
        eb.head=fitted(b['head']);eb.tail=fitted(b['tail'])
        # Existing clips use positive local X for flexion. Target nail surfaces
        # face -Y, so the flexion axis must move fingertips toward +Y.
        eb.align_roll(Vector((0,1,0)) if new.startswith(('Index','Middle','Ring','Pinky')) else rotation@b['z'])
    for old,new in rename.items():
        if new.startswith(('Hand','Forearm')):continue
        rig.data.edit_bones[new].parent=rig.data.edit_bones[rename[bones[old]['parent']]]
    bpy.ops.object.mode_set(mode='OBJECT')
    old=bpy.data.objects['HandMesh.'+side];materials=list(old.data.materials);bpy.data.objects.remove(old,do_unlink=True)
    mesh=bpy.data.meshes.new('AuthoredHandTopology.'+side);mesh.from_pydata([fitted(v[i]) for i in used],[],[[mapping[x] for x in faces[i]] for i in faceids]);mesh.update()
    layer=mesh.uv_layers.new(name='UVMap')
    for poly,fi in zip(mesh.polygons,faceids):
        for li,coord in zip(poly.loop_indices,uv[fi]):layer.data[li].uv=coord
        poly.use_smooth=True
    hand=bpy.data.objects.new('HandMesh.'+side,mesh);bpy.context.scene.collection.objects.link(hand);hand.parent=rig
    if materials:mesh.materials.append(materials[0])
    for vi,oldvi in enumerate(used):
        w={}
        for key,value in weights[oldvi].items():
            if key not in rename:raise ValueError('Unexpected graft influence '+key)
            name=rename[key];w[name]=w.get(name,0)+value
        # The donor wrist spans a different forearm length. Rebind only the
        # wrist strip between fixed forearm and palm landmarks, preserving
        # the authored finger/metacarpal partitions outside that strip.
        longitudinal=(v[oldvi]-wrist).dot(long)
        if longitudinal<.020:
            t=max(0.0,min(1.0,(longitudinal+.025)/.045));hand_fraction=t*t*(3-2*t)
            w.pop('Forearm.'+side,None)
            total=sum(w.values())
            w={k:a/total*hand_fraction for k,a in w.items()} if total else {'Hand.'+side:hand_fraction}
            w['Forearm.'+side]=1-hand_fraction
            # Keep the existing glTF four-influence contract, then normalize.
            w=dict(sorted(w.items(),key=lambda kv:kv[1],reverse=True)[:4])
        for name,value in w.items():
            group=hand.vertex_groups.get(name) or hand.vertex_groups.new(name=name);group.add([vi],value/sum(w.values()),'REPLACE')
    mod=hand.modifiers.new('Linear skinning','ARMATURE');mod.object=rig;mod.use_deform_preserve_volume=False
    hand['source']='MakeHuman hm08 CC0 authored topology';hand['source_reference_vertex_ids']=json.dumps(used)
    results.append({'side':side,'vertices':len(used),'faces':len(faceids),'scale':scale,'added_bones':['Thumb0.'+side]+[f'Metacarpal{j}.{side}' for j in range(1,5)],'wrist_rebind':'smooth longitudinal transition between donor wrist -25 mm and +20 mm; finger partitions retained','open_boundary':'proximal forearm beneath original sleeve; final sleeve integration pending'})
neutral(rig)
rig['asset_status']='HAND_FIT_CANDIDATE_NOT_ACCEPTED'
output=ROOT/'blender/candidates/gojo-hand-fit.blend';bpy.ops.wm.save_as_mainfile(filepath=str(output))
write_json(ROOT/'output/milestone-a/hand-fit.json',{'candidate':str(output),'operations':results,'remaining':['Thumb opposition and finger axes must be visually calibrated','Production gestures require retargeting review','Original shoulder and body remain unaccepted','Wrist seam fit needs visual inspection']})
