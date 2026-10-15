"""Prove the conservative candidate preserves authored mesh/weights/binds and five clips."""
import sys,json,hashlib
from pathlib import Path
import bpy
sys.path.insert(0,str(Path(__file__).resolve().parent))
from character_common import ROOT,get_rig,write_json
def digest(value):return hashlib.sha256(json.dumps(value,sort_keys=True,separators=(',',':')).encode()).hexdigest()
def snapshot(path):
    bpy.ops.wm.open_mainfile(filepath=str(path));rig=get_rig();meshes={};actions={}
    for o in bpy.context.scene.objects:
        if o.type!='MESH':continue
        groups={g.index:g.name for g in o.vertex_groups}
        meshes[o.name]=digest({'vertices':[list(v.co) for v in o.data.vertices],'faces':[list(p.vertices) for p in o.data.polygons],
                              'weights':[{groups[g.group]:g.weight for g in v.groups} for v in o.data.vertices],
                              'uv':[[list(d.uv) for d in layer.data] for layer in o.data.uv_layers]})
    for a in bpy.data.actions:
        curves=[]
        for layer in a.layers:
            for strip in layer.strips:
                for bag in strip.channelbags:
                    for f in bag.fcurves:
                        if a.name=='CastPurple' and any(f.data_path.startswith('pose.bones["'+b+'.') for b in ('UpperArm','Forearm','Hand')):continue
                        curves.append((f.data_path,f.array_index,[(list(k.co),k.interpolation,list(k.handle_left),list(k.handle_right)) for k in f.keyframe_points]))
        actions[a.name]=digest(sorted(curves))
    return {'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'meshes':meshes,'bones':digest({b.name:([list(r) for r in b.matrix_local],b.parent.name if b.parent else None) for b in rig.data.bones}),
            'actions_excluding_purple_arm_tracks':actions,'durations':{a.name:list(a.frame_range) for a in bpy.data.actions},
            'sockets':{n:([list(r) for r in bpy.data.objects[n].matrix_basis],bpy.data.objects[n].parent.name,bpy.data.objects[n].parent_bone) for n in ('FX_Hand_L','FX_Hand_R','FX_Center')}}
old=snapshot(ROOT/'blender/candidates/gojo-hand-fit.blend');new=snapshot(ROOT/'blender/candidates/gojo-a2-purple-spacing.blend')
checks={key:old[key]==new[key] for key in ('meshes','bones','actions_excluding_purple_arm_tracks','durations','sockets')}
protected={'blender/gojo.blend':'29d8bceac5c59fd3d28f08c2ec1d5c81076b40e1134abfa6d13b3c70fce2d65e','public/models/gojo.glb':'79c057bb6592722466cd794a6247cdf4e3c4f1d2fb48738412584512f4a33d7e','blender/candidates/gojo-hand-fit.blend':'7a454e281f15a26e64e187385c955550f8ea5bdcf50e277860abaa24e48b15e5','public/models/candidates/gojo-hand-fit.glb':'a01f8b9049949b2c41c07d0ab30024f9af5388f8e293eb768235b5ff5a6b2614'}
for path,expected in protected.items():checks[path]=hashlib.sha256((ROOT/path).read_bytes()).hexdigest()==expected
write_json(ROOT/'output/milestone-a2/preservation.json',{'checks':checks,'baseline':old,'candidate':new,'status':'PASS' if all(checks.values()) else 'FAIL'})
print(json.dumps(checks))
if not all(checks.values()):raise SystemExit(2)
