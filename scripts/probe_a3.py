import bpy,json,sys,collections
from pathlib import Path
from mathutils import Matrix
sys.path.insert(0,str(Path(__file__).resolve().parent))
from character_common import get_rig,set_action,neutral
from audit_contacts import prepare,posed,crossing
out=Path('output/milestone-a3')
if 'RIG-Snow' in bpy.data.objects:
    o=bpy.data.objects['GEO-snow-shirt'];e=collections.Counter(tuple(sorted((p.vertices[i],p.vertices[(i+1)%len(p.vertices)]))) for p in o.data.polygons for i in range(len(p.vertices)))
    ids=sorted({v for ab,n in e.items() if n==1 for v in ab})
    data={'boundary':[{'i':i,'co':list(o.data.vertices[i].co)} for i in ids],
          'modifiers':[{k:getattr(m,k,None) for k in ('name','type','use_deform_preserve_volume','levels','render_levels','vertex_group','factor','iterations')} for m in o.modifiers]}
    (out/'snow-boundary.json').write_text(json.dumps(data,indent=2))
else:
    rig=get_rig();o=bpy.data.objects['HandMesh.L'];data=prepare(o);set_action(rig,'CastPurple',90)
    ids=[775,788,790,868,875,874]
    result={'vertices':[{'id':i,'rest':list(o.data.vertices[i].co),'weights':data['weights'][i]} for i in ids],
      'bones':{n:{'head':list(rig.data.bones[n].head_local),'tail':list(rig.data.bones[n].tail_local),'matrix':list(map(list,rig.data.bones[n].matrix_local)),'quaternion':list(rig.pose.bones[n].rotation_quaternion)} for n in ('Thumb0.L','Thumb1.L','Thumb2.L')},'ablations':{}}
    for n in ('none','Thumb0.L','Thumb1.L','Thumb2.L','all-thumb'):
        set_action(rig,'CastPurple',90)
        names=['Thumb0.L','Thumb1.L','Thumb2.L'] if n=='all-thumb' else [n] if n!='none' else []
        for name in names:rig.pose.bones[name].matrix_basis=Matrix.Identity(4)
        bpy.context.view_layer.update();p=posed(data);result['ablations'][n]=crossing(p,p)
    (out/'thumb-root-cause.json').write_text(json.dumps(result,indent=2))
print('PROBE_OK')
