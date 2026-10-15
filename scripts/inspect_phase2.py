"""Read-only structural snapshot for phase 2; no asset writes."""
import sys, json
from pathlib import Path
import bpy, bmesh
sys.path.insert(0,str(Path(__file__).resolve().parent))
from character_common import ROOT, neutral, get_rig, write_json, set_action

report={}
for label,path in [('baseline','output/backups/pre-milestone-a2/blender/candidates/gojo-hand-fit.blend'),('reference','blender/candidates/makehuman-reference.blend')]:
    bpy.ops.wm.open_mainfile(filepath=str(ROOT/path));rig=get_rig();neutral(rig)
    meshes={}
    for o in bpy.context.scene.objects:
        if o.type!='MESH':continue
        bm=bmesh.new();bm.from_mesh(o.data)
        meshes[o.name]={'vertices':len(o.data.vertices),'faces':len(o.data.polygons),'quads':sum(len(p.vertices)==4 for p in o.data.polygons),'triangles':sum(len(p.vertices)==3 for p in o.data.polygons),'boundary_edges':sum(e.is_boundary for e in bm.edges),'bounds':[[min(v.co[i] for v in o.data.vertices),max(v.co[i] for v in o.data.vertices)] for i in range(3)],'groups':list(o.vertex_groups.keys()),'modifiers':[m.type for m in o.modifiers]}
        bm.free()
    report[label]={'meshes':meshes,'bones':{b.name:{'head':list(b.head_local),'tail':list(b.tail_local),'matrix':[list(r) for r in b.matrix_local],'parent':b.parent.name if b.parent else None} for b in rig.data.bones},'poses':{}}
    if label=='baseline':
        for f in (0,30,60,90,108,120,132,150,168,180,210,240):
            neutral(rig);set_action(rig,'CastPurple',f)
            report[label]['poses'][f]={b.name:{'head':list(b.head),'tail':list(b.tail),'quaternion':list(b.rotation_quaternion)} for b in rig.pose.bones if b.name.startswith(('UpperArm','Forearm','Hand','Thumb'))}
write_json(ROOT/'output/milestone-a2/structure.json',report)
print('STRUCTURE',json.dumps({k:v['meshes'] for k,v in report.items()}))
