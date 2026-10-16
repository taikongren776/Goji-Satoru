"""Explicitly lossy LBS feasibility probe, not a production Snow rig converter.

Drops B-bone segments, DQ and CorrectiveSmooth; preserves native shape keys,
bakes deform matrices into independent bones, and measures the resulting loss.
No attempt is made to hide this loss with smoothing or changed poses.
"""
import bpy,sys,runpy,json,hashlib
from pathlib import Path
from mathutils import Vector,Matrix
root=Path(__file__).resolve().parents[1];out=root/'output/milestone-a3/lbs-web';out.mkdir(parents=True,exist_ok=True)
sys.argv=['prototype_a3_shoulder.py','--','--cases','none','--out','output/milestone-a3/lbs-preparation']
ns=runpy.run_path(str(root/'scripts/prototype_a3_shoulder.py'));source=ns['shirt'];rig=ns['rig'];scene=ns['scene'];pose=ns['pose'];camera=ns['cam']
body=ns['body'];body.hide_render=True
# Compare same authored cage indices; subdivision and masks are not part of this comparison.
for m in source.modifiers:
    if m.type in ('SUBSURF','MASK'):m.show_viewport=False;m.show_render=False
names=sorted({source.vertex_groups[g.group].name for v in source.data.vertices for g in v.groups if g.weight>1e-8 and source.vertex_groups[g.group].name in rig.data.bones and rig.data.bones[source.vertex_groups[g.group].name].use_deform})
mesh=source.copy();mesh.data=source.data.copy();scene.collection.objects.link(mesh);mesh.name='A3_Shirt_LBS';mesh.parent=None;mesh.matrix_world=source.matrix_world.copy();mesh.animation_data_clear()
if mesh.data.shape_keys:mesh.data.shape_keys.animation_data_clear()
for m in list(mesh.modifiers):mesh.modifiers.remove(m)
weights=[{source.vertex_groups[g.group].name:g.weight for g in v.groups if source.vertex_groups[g.group].name in names} for v in source.data.vertices]
mesh.vertex_groups.clear()
for name in names:mesh.vertex_groups.new(name=name)
loss=[]
for i,w in enumerate(weights):
    top=sorted(w.items(),key=lambda x:-x[1])[:4];total=sum(v for _,v in top);loss.append(sum(w.values())-total)
    if total<=0:raise ValueError('Unweighted garment vertex '+str(i))
    for name,value in top:mesh.vertex_groups[name].add([i],value/total,'REPLACE')
data=bpy.data.armatures.new('A3_LBS_Rig');export_rig=bpy.data.objects.new('A3_LBS_Rig',data);scene.collection.objects.link(export_rig)
if bpy.context.object and bpy.context.object.mode!='OBJECT':bpy.ops.object.mode_set(mode='OBJECT')
bpy.ops.object.select_all(action='DESELECT');export_rig.select_set(True);bpy.context.view_layer.objects.active=export_rig;bpy.ops.object.mode_set(mode='EDIT')
for name in names:
    original=rig.data.bones[name];bone=data.edit_bones.new(name)
    # A newly created EditBone has zero length: initialize head/tail BEFORE matrix.
    bone.head=original.head_local;bone.tail=original.tail_local;bone.matrix=original.matrix_local.copy()
bpy.ops.object.mode_set(mode='OBJECT');mod=mesh.modifiers.new('Linear skinning only','ARMATURE');mod.object=export_rig;mod.use_deform_preserve_volume=False
bind_error=max(abs(rig.data.bones[n].matrix_local[i][j]-data.bones[n].matrix_local[i][j]) for n in names for i in range(4) for j in range(4))
assert bind_error<1e-5,('Export adapter bind error',bind_error)
def world(o):
    e=o.evaluated_get(bpy.context.evaluated_depsgraph_get());m=e.to_mesh();v=[list(e.matrix_world@p.co) for p in m.vertices];e.to_mesh_clear();return v
def transfer():
    export_rig.animation_data_create();export_rig.animation_data.action=None
    if mesh.data.shape_keys.animation_data:mesh.data.shape_keys.animation_data.action=None
    for name in names:export_rig.pose.bones[name].matrix=rig.pose.bones[name].matrix.copy()
    for k in mesh.data.shape_keys.key_blocks:k.value=source.data.shape_keys.key_blocks[k.name].value
    bpy.context.view_layer.update()
def reset_export():
    if export_rig.animation_data:export_rig.animation_data.action=None
    if mesh.data.shape_keys.animation_data:mesh.data.shape_keys.animation_data.action=None
    for b in export_rig.pose.bones:b.matrix_basis=Matrix.Identity(4)
    for k in mesh.data.shape_keys.key_blocks:k.value=0
    bpy.context.view_layer.update()
reset_export();manifest={'source':'a3-snow-shoulder-study.blend','sha256':hashlib.sha256(Path(bpy.data.filepath).read_bytes()).hexdigest(),'size':800,'poses':[]};metrics={'method':'ONE rigid bone per native DEF bone; top 4 weights; no DQ/B-bones/CorrectiveSmooth. This is intentionally a lossy probe.','bind_matrix_residual':bind_error,'bones':len(names),'max_discarded_weight':max(loss),'cases':{}}
def record(label):
    manifest['poses'].append({'id':label,'camera':list(camera.location),'target':list(ns['target']),'ortho_scale':camera.data.ortho_scale,'vertices_blender_world':{mesh.name:world(mesh)}})
record('rest')
for case in ('natural','front45','front90','front120','side45','side90','side120','twist','elbow','casting'):
    pose(case);transfer();native=world(source);linear=world(mesh)
    if len(native)!=len(linear):raise ValueError('Cage correspondence changed')
    dist=[(Vector(x)-Vector(y)).length for x,y in zip(native,linear)];metrics['cases'][case]={'max_native_to_lbs_mm':max(dist)*1000,'rms_native_to_lbs_mm':(sum(d*d for d in dist)/len(dist))**.5*1000}
    source.hide_render=True;mesh.hide_render=False;scene.render.filepath=str((out/(case+'-lbs.png')).resolve());bpy.ops.render.render(write_still=True)
    record(case)
    action=bpy.data.actions.new('QA_'+case);export_rig.animation_data_create();export_rig.animation_data.action=action
    for b in export_rig.pose.bones:
        for f in (0,1):
            b.keyframe_insert('location',frame=f);b.keyframe_insert('rotation_quaternion' if b.rotation_mode=='QUATERNION' else 'rotation_euler',frame=f);b.keyframe_insert('scale',frame=f)
    action.use_fake_user=True
    # Shape animation is merged with the armature by NLA track name.
    track=export_rig.animation_data.nla_tracks.new();track.name='QA_'+case;track.strips.new('QA_'+case,0,action);track.mute=True
    keys=mesh.data.shape_keys;keys.animation_data_create();sa=bpy.data.actions.new('Shapes_'+case);keys.animation_data.action=sa
    for k in keys.key_blocks:
        if k.name!='Basis':
            k.keyframe_insert('value',frame=0);k.keyframe_insert('value',frame=1)
    sa.use_fake_user=True;tr=keys.animation_data.nla_tracks.new();tr.name='QA_'+case;tr.strips.new('QA_'+case,0,sa);tr.mute=True
reset_export()
for o in bpy.context.selected_objects:o.select_set(False)
mesh.select_set(True);export_rig.select_set(True);bpy.context.view_layer.objects.active=export_rig
bpy.ops.export_scene.gltf(filepath=str(out/'audit.glb'),use_selection=True,export_format='GLB',export_animations=True,export_animation_mode='NLA_TRACKS',export_force_sampling=True,export_skins=True,export_yup=True)
(out/'manifest.json').write_text(json.dumps(manifest));(out/'loss.json').write_text(json.dumps(metrics,indent=2))
bpy.ops.wm.save_as_mainfile(filepath=str(root/'blender/candidates/a3-snow-lbs-probe.blend'),compress=True)
print('LBS_PROBE_SAVED',metrics)
