"""Read-only inspection of a licensed source; run with Blender --disable-autoexec."""
import bpy, json, sys
from pathlib import Path
out=Path(sys.argv[sys.argv.index('--')+1]);out.parent.mkdir(parents=True,exist_ok=True)
data={'version':bpy.app.version_string,'objects':[],'texts':[t.name for t in bpy.data.texts]}
for o in bpy.data.objects:
    if o.type not in ('MESH','ARMATURE'):continue
    d={'name':o.name,'type':o.type,'hide':o.hide_render,'parent':o.parent.name if o.parent else None,
       'bounds':[list(o.matrix_world@__import__('mathutils').Vector(v)) for v in o.bound_box],
       'modifiers':[{'name':m.name,'type':m.type,'object':getattr(getattr(m,'object',None),'name',None)} for m in o.modifiers]}
    if o.type=='MESH':
        d.update(vertices=len(o.data.vertices),faces=len(o.data.polygons),quads=sum(len(p.vertices)==4 for p in o.data.polygons),groups=[g.name for g in o.vertex_groups],shapes=[k.name for k in o.data.shape_keys.key_blocks] if o.data.shape_keys else [])
    else:
        d['bones']=[{'name':b.name,'parent':b.parent.name if b.parent else None,'deform':b.use_deform,'head':list(b.head_local),'tail':list(b.tail_local),'segments':b.bbone_segments,'constraints':[{'type':c.type,'target':getattr(getattr(c,'target',None),'name',None),'subtarget':getattr(c,'subtarget',None)} for c in o.pose.bones[b.name].constraints]} for b in o.data.bones]
        d['properties']={b.name:dict(b.items()) for b in o.pose.bones if b.keys()}
    data['objects'].append(d)
out.write_text(json.dumps(data,indent=2,default=str),encoding='utf-8')
print('A3_INSPECT_OK',out)
