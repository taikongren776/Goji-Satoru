"""Require exactly one intended skinning edit; all meshes/bones/actions/sockets preserved."""
import bpy,sys,json,hashlib
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from character_common import get_rig
ROOT=Path(__file__).resolve().parents[1]
def digest(v):return hashlib.sha256(json.dumps(v,sort_keys=True).encode()).hexdigest()
def snapshot(file):
    bpy.ops.wm.open_mainfile(filepath=str(ROOT/file));rig=get_rig();meshes={};weights={};actions={}
    for o in bpy.context.scene.objects:
        if o.type!='MESH':continue
        meshes[o.name]=digest({'co':[list(v.co) for v in o.data.vertices],'faces':[list(p.vertices) for p in o.data.polygons],'uv':[[list(d.uv) for d in l.data] for l in o.data.uv_layers]})
        weights[o.name]=[{o.vertex_groups[g.group].name:g.weight for g in v.groups if g.weight>0} for v in o.data.vertices]
    for a in bpy.data.actions:
        curves=[]
        for layer in a.layers:
            for strip in layer.strips:
                for bag in strip.channelbags:
                    for f in bag.fcurves:curves.append((f.data_path,f.array_index,[(list(k.co),k.interpolation,list(k.handle_left),list(k.handle_right)) for k in f.keyframe_points]))
        actions[a.name]=digest(sorted(curves))
    return {'meshes':meshes,'weights':weights,'actions':actions,'bones':digest({b.name:([list(r) for r in b.matrix_local],b.parent.name if b.parent else None) for b in rig.data.bones}),
      'sockets':{n:([list(r) for r in bpy.data.objects[n].matrix_basis],bpy.data.objects[n].parent.name,bpy.data.objects[n].parent_bone) for n in ('FX_Hand_L','FX_Hand_R','FX_Center')}}
old=snapshot('blender/candidates/gojo-a2-purple-spacing.blend');new=snapshot('blender/candidates/gojo-a3-thumb-distal.blend')
changes=[{'mesh':name,'vertex':i,'before':a,'after':b} for name in old['weights'] for i,(a,b) in enumerate(zip(old['weights'][name],new['weights'][name])) if a!=b]
checks={k:old[k]==new[k] for k in ('meshes','actions','bones','sockets')}
checks['exact_weight_edit']=changes==[{'mesh':'HandMesh.L','vertex':775,'before':{'Thumb2.L':.875,'Thumb1.L':.125},'after':{'Thumb2.L':1.0}}]
protected={'blender/gojo.blend':'29d8bceac5c59fd3d28f08c2ec1d5c81076b40e1134abfa6d13b3c70fce2d65e','public/models/gojo.glb':'79c057bb6592722466cd794a6247cdf4e3c4f1d2fb48738412584512f4a33d7e','blender/candidates/gojo-a2-purple-spacing.blend':'ef83a16ac559285bbc233e9ae31a84ed3215f97c623f977271dac5d5fd0ad06a'}
for p,h in protected.items():checks[p]=hashlib.sha256((ROOT/p).read_bytes()).hexdigest()==h
report={'status':'PASS' if all(checks.values()) else 'FAIL','checks':checks,'changes':changes}
(ROOT/'output/milestone-a3/preservation.json').write_text(json.dumps(report,indent=2));print(report)
if not all(checks.values()):raise SystemExit(2)
