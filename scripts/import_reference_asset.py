"""Import authored CC0 MakeHuman topology/weights, without procedural anatomy generation.
The result is a deformation reference specimen, NOT a replacement Gojo character.
"""
import sys, json, hashlib
from pathlib import Path
import bpy
from mathutils import Vector
sys.path.insert(0,str(Path(__file__).resolve().parent))
from character_common import ROOT, write_json

source=ROOT/'assets/vendor/makehuman'
verts=[];uvs=[];faces=[];face_uv=[];group=''
for line in (source/'base.obj').read_text().splitlines():
    bits=line.split()
    if not bits:continue
    if bits[0]=='v':verts.append(Vector(tuple(map(float,bits[1:4]))))
    elif bits[0]=='vt':uvs.append(tuple(map(float,bits[1:3])))
    elif bits[0]=='g':group=bits[1]
    elif bits[0]=='f' and group=='body':
        faces.append([int(v.split('/')[0])-1 for v in bits[1:]])
        face_uv.append([int(v.split('/')[1])-1 for v in bits[1:]])
spec=json.loads((source/'default.mhskel').read_text())
assert spec['license']=='CC0'
weights=json.loads((source/'default_weights.mhw').read_text());assert weights['license']=='CC0'
used=sorted({v for face in faces for v in face});index={v:i for i,v in enumerate(used)}
# MH: Y up, +Z forward, units decimetres. Blender: Z up, -Y forward.
floor=min(verts[i].y for i in used)
def convert(v):return Vector((v.x*.1,-v.z*.1,(v.y-floor)*.1))
points=[convert(v) for v in verts]
def joint(name):return sum((points[i] for i in spec['joints'][name]),Vector())/len(spec['joints'][name])
bpy.ops.wm.read_factory_settings(use_empty=True)
mesh=bpy.data.meshes.new('AuthoredQuadBody');mesh.from_pydata([points[i] for i in used],[],[[index[v] for v in f] for f in faces]);mesh.update()
obj=bpy.data.objects.new('ReferenceBody',mesh);bpy.context.collection.objects.link(obj)
uv=mesh.uv_layers.new(name='UVMap')
for poly,indices in zip(mesh.polygons,face_uv):
    for loop,vi in zip(poly.loop_indices,indices):uv.data[loop].uv=uvs[vi]
for poly in mesh.polygons:poly.use_smooth=True
rigdata=bpy.data.armatures.new('ReferenceRig');rig=bpy.data.objects.new('ReferenceRig',rigdata);bpy.context.collection.objects.link(rig)
bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
for name,b in spec['bones'].items():
    eb=rigdata.edit_bones.new(name);eb.head=joint(b['head']);eb.tail=joint(b['tail'])
    plane=spec['planes'].get(b['rotation_plane'])
    if plane:
        a,c,d=map(joint,plane);normal=(c-a).cross(d-a)
        if normal.length>1e-8:eb.align_roll(normal.normalized())
for name,b in spec['bones'].items():
    if b['parent']:rigdata.edit_bones[name].parent=rigdata.edit_bones[b['parent']]
bpy.ops.object.mode_set(mode='OBJECT')
pervertex=[{} for _ in used]
for name,pairs in weights['weights'].items():
    if name not in rigdata.bones:raise ValueError('Unknown weighted bone '+name)
    for vi,w in pairs:
        if vi in index and w>0:pervertex[index[vi]][name]=float(w)
trimmed=0;unweighted=[]
for vi,w in enumerate(pervertex):
    entries=sorted(w.items(),key=lambda a:a[1],reverse=True)
    if len(entries)>4:trimmed+=1
    entries=entries[:4];total=sum(v for _,v in entries)
    if not total:unweighted.append(vi);continue
    for name,value in entries:
        g=obj.vertex_groups.get(name) or obj.vertex_groups.new(name=name);g.add([vi],value/total,'REPLACE')
assert not unweighted,unweighted[:20]
obj.parent=rig;mod=obj.modifiers.new('Linear skinning','ARMATURE');mod.object=rig;mod.use_deform_preserve_volume=False
rig['asset_status']='REFERENCE_ONLY_NOT_ACCEPTED';obj['source']='MakeHuman hm08 / CC0';obj['source_vertex_map']=json.dumps(used)
bpy.context.scene.render.fps=30
out=ROOT/'blender/candidates/makehuman-reference.blend';out.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(out))
manifest={'status':'licensed reference specimen; no Gojo integration or production clips',
          'repository':'https://github.com/makehumancommunity/makehuman','revision':'a8bc2d54ff0ac92e78ff71431b1023eda42bf482',
          'license':'CC0-1.0','downloaded':'2026-10-14','source_files':{p.name:{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in source.iterdir() if p.is_file()},
          'operations':['Selected authored body faces only; excluded helper meshes','Converted coordinates and units','Imported authored skeleton joints and plane orientation','Imported authored weights; kept strongest 4 and normalized'],
          'vertices':len(used),'faces':len(faces),'quads':sum(len(f)==4 for f in faces),'bones':len(rigdata.bones),'vertices_trimmed_to_4_weights':trimmed,
          'remaining':['Validate finger rotation axes visually','Check four-influence truncation','Fit Gojo proportions','Build tailored shoulder sleeve','Retarget production animations and sockets']}
write_json(ROOT/'assets/licenses/makehuman/asset-record.json',manifest)
print(json.dumps(manifest,ensure_ascii=False))
