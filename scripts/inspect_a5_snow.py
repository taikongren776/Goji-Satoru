"""Read-only source asset inspection and neutral evidence renders. Never saves a blend.
Uses the authored Snow topology, skinning, modifiers and rig without reconstruction.
"""
import bpy,sys,json,math,hashlib
from pathlib import Path
from mathutils import Vector,Matrix,Quaternion
out=Path('output/milestone-a5/snow-v2');out.mkdir(parents=True,exist_ok=True)
source=Path(bpy.data.filepath);before=hashlib.sha256(source.read_bytes()).hexdigest()
rig=bpy.data.objects['RIG-Snow'];scene=bpy.context.scene
meshes=[o for o in scene.objects if o.type=='MESH' and o.name.startswith('GEO') and not o.hide_render]
inventory=[]
for o in meshes:
 d={'name':o.name,'vertices':len(o.data.vertices),'faces':len(o.data.polygons),'quads':sum(len(p.vertices)==4 for p in o.data.polygons),'uvLayers':[u.name for u in o.data.uv_layers],
    'materials':[s.material.name if s.material else None for s in o.material_slots],'shapeKeys':len(o.data.shape_keys.key_blocks) if o.data.shape_keys else 0,
    'modifiers':[{'type':m.type,'name':m.name,'render':m.show_render,'preserveVolume':getattr(m,'use_deform_preserve_volume',None),'subdivision':getattr(m,'render_levels',None)} for m in o.modifiers]}
 deform={g.index for g in o.vertex_groups if g.name in rig.data.bones and rig.data.bones[g.name].use_deform}
 counts=[sum(g.weight>1e-6 and g.group in deform for g in v.groups) for v in o.data.vertices]
 d['maxDeformInfluences']=max(counts,default=0);d['verticesOver4Influences']=sum(c>4 for c in counts)
 d['rawBounds']={'min':[min((o.matrix_world@v.co)[i] for v in o.data.vertices) for i in range(3)],'max':[max((o.matrix_world@v.co)[i] for v in o.data.vertices) for i in range(3)]}
 inventory.append(d)
data={'source':str(source),'sha256':before,'license':'CC BY 4.0','credit':'Snow Rig (CC) Blender Foundation | studio.blender.org','blender':bpy.app.version_string,
 'meshes':inventory,'bones':len(rig.data.bones),'deformBones':sum(b.use_deform for b in rig.data.bones),'segmentedBones':sum(b.bbone_segments>1 for b in rig.data.bones),
 'images':[{'name':i.name,'filepath':i.filepath,'size':list(i.size),'packed':bool(i.packed_file)} for i in bpy.data.images],
 'conditions':'Original source; no geometry, weights, source modifiers or corrective shapes edited. Neutral material override and fixed audit lights including lower fill for palmar visibility; wire copy removes subdivision and masks only to show the full control cage. Embedded scripts disabled. No saved blend or GLB.', 'views':[]}
for o in list(scene.objects):
 if o.type in ('CAMERA','LIGHT'):bpy.data.objects.remove(o,do_unlink=True)
scene.render.engine='CYCLES';scene.cycles.samples=12;scene.cycles.use_denoising=True
scene.render.resolution_x=800;scene.render.resolution_y=800;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.film_transparent=False
scene.world=bpy.data.worlds.new('A5_AuditWorld');scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.12,.12,.12,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.5
scene.view_settings.view_transform='AgX'
neutral=bpy.data.materials.new('A5_InspectionClay');neutral.use_nodes=True
neutral.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.43,.46,.50,1)
neutral.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.8
scene.view_layers[0].material_override=neutral
for name,loc,power,size in [('Key',(-3,-4,5),450,3),('Fill',(4,-2,3),250,3),('Back',(0,3,4),220,3),('LowerFill',(0,-3,-2),300,3)]:
 ld=bpy.data.lights.new(name,'AREA');ld.energy=power;ld.size=size
 ob=bpy.data.objects.new(name,ld);scene.collection.objects.link(ob);ob.location=loc;ob.rotation_euler=(Vector((0,0,1))-ob.location).to_track_quat('-Z','Y').to_euler()
cd=bpy.data.cameras.new('A5_AuditCamera');cam=bpy.data.objects.new('A5_AuditCamera',cd);scene.collection.objects.link(cam);scene.camera=cam;cd.type='ORTHO'
def reset():
 if rig.animation_data:rig.animation_data.action=None
 for b in rig.pose.bones:b.matrix_basis=Matrix.Identity(4)
 for side in ('left','right'):rig.pose.bones['Properties']['ik_'+side+'_upperarm']=0.
 rig.update_tag();bpy.context.view_layer.update()
def aim(name,direction):
 b=rig.pose.bones[name];m=b.matrix.copy();q=m.to_3x3().col[1].rotation_difference(Vector(direction).normalized());n=(q.to_matrix()@m.to_3x3()).to_4x4();n.translation=m.translation;b.matrix=n;bpy.context.view_layer.update()
def pose(angle=0,front=False):
 reset();t=math.radians(angle)
 for side,sign in [('L',1),('R',-1)]:
  b=rig.pose.bones['FK-Shoulder.'+side];m=b.matrix.copy();q=Quaternion((0,1,0),-sign*math.radians(max(0,angle-55)*.35));n=(q.to_matrix()@m.to_3x3()).to_4x4();n.translation=m.translation;b.matrix=n;bpy.context.view_layer.update()
  d=(0,-math.sin(t),-math.cos(t)) if front else (sign*math.sin(t),0,-math.cos(t))
  aim('FK-UpperArm.'+side,d);aim('FK-Forearm.'+side,d)
def view(name,target,offset,scale,only=None,wire=None):
 visibility={o:o.hide_render for o in meshes}
 if only is not None:
  for o in meshes:o.hide_render=o.name not in only
 target=Vector(target);cam.location=target+Vector(offset);cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();cd.ortho_scale=scale
 copy=None
 if wire:
  original=bpy.data.objects[wire];copy=original.copy();copy.data=original.data.copy();scene.collection.objects.link(copy);copy.hide_render=False;copy.hide_set(False)
  for m in list(copy.modifiers):
   if m.type in ('SUBSURF','MASK'):copy.modifiers.remove(m)
  wm=copy.modifiers.new('A5_ControlCage','WIREFRAME');wm.thickness=.00045;wm.offset=1
  # Material override colors all objects uniformly; wire-only view avoids hidden edges.
  original.hide_render=True
 scene.render.filepath=str((out/(name+'.png')).resolve());bpy.ops.render.render(write_still=True)
 data['views'].append({'name':name,'target':list(target),'offset':list(offset),'scale':scale,'only':only,'wire':wire,
  'upperArmDirections':{s:list((rig.pose.bones['UpperArm.'+s].tail-rig.pose.bones['UpperArm.'+s].head).normalized()) for s in ('L','R')}})
 if copy:bpy.data.objects.remove(copy,do_unlink=True)
 for o,v in visibility.items():o.hide_render=v
 (out/'inspection.json').write_text(json.dumps(data,indent=2),encoding='utf-8')
pose()
view('full-front',(0,0,.92),(0,-4,0),2.02)
view('full-side',(0,0,.92),(4,0,0),2.02)
view('head-front',(0,-.02,1.64),(0,-3,0),.47)
view('head-side',(0,-.02,1.64),(3,0,0),.47)
view('head-45',(0,-.02,1.64),(3,-3,0),.47)
view('head-wire',(0,-.02,1.64),(2,-3,0),.43,['GEO-snow-head'],wire='GEO-snow-head')
reset()
# Authored rest hand, both sides; no guessed finger curl or weight changes.
view('hand-dorsal',(.79,-.025,1.32),(0,0,2),.26,['GEO-snow-body'])
view('hand-palmar',(.79,-.025,1.32),(0,0,-2),.26,['GEO-snow-body'])
view('hand-web-thumb',(.77,-.04,1.31),(.4,-1,-.4),.25,['GEO-snow-body'])
view('hand-wire',(.79,-.025,1.32),(0,0,2),.26,['GEO-snow-body'],wire='GEO-snow-body')
for name,angle,front in [('down',0,False),('front90',90,True),('side90',90,False),('side120',120,False)]:
 pose(angle,front)
 view('shoulder-'+name,(0,0,1.30),(-2,-4,.25),1.02,['GEO-snow-body','GEO-snow-shirt'])
 view('shoulder-'+name+'-wire',(0,0,1.30),(-2,-4,.25),1.02,['GEO-snow-shirt'],wire='GEO-snow-shirt')
pose(120)
view('axilla-back',(-.17,0,1.35),(-1,3,0),.62,['GEO-snow-body','GEO-snow-shirt'])
view('body-shoulder-wire',(-.18,0,1.36),(-1,3,0),.62,['GEO-snow-body'],wire='GEO-snow-body')
data['sourceUnchanged']=before==hashlib.sha256(source.read_bytes()).hexdigest()
assert data['sourceUnchanged']
(out/'inspection.json').write_text(json.dumps(data,indent=2),encoding='utf-8')
print('A5_SOURCE_INSPECTION_DONE',len(data['views']))
