"""Isolated distal thumb skinning experiment. No CMC axes/poses/mesh edits.

Vertex 775 is distal to the IP joint, with a stray 12.5% proximal influence;
the adjacent close-facing surface is rigidly distal. Test, do not assume acceptance.
"""
import bpy,sys,json,math
from pathlib import Path
from mathutils import Vector
sys.path.insert(0,str(Path(__file__).resolve().parent))
from character_common import get_rig,set_action,neutral
from audit_contacts import prepare,posed,crossing
out=Path('output/milestone-a3/thumb');out.mkdir(parents=True,exist_ok=True)
rig=get_rig();hand=bpy.data.objects['HandMesh.L'];scene=bpy.context.scene
for o in scene.objects:
    if o.type=='MESH':o.hide_render=o!=hand
mat=bpy.data.materials.new('A3_ThumbClay');mat.use_nodes=True;mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.6,.42,.3,1);hand.data.materials.clear();hand.data.materials.append(mat)
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True;scene.render.resolution_x=800;scene.render.resolution_y=800;scene.render.resolution_percentage=100
scene.world=bpy.data.worlds.new('A3_ThumbWorld');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.15,.15,.15,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.7
scene.view_settings.view_transform='AgX'
for o in list(scene.objects):
    if o.type in ('CAMERA','LIGHT'):bpy.data.objects.remove(o,do_unlink=True)
data=bpy.data.cameras.new('A3_ThumbCamera');cam=bpy.data.objects.new('A3_ThumbCamera',data);scene.collection.objects.link(cam);scene.camera=cam;data.type='ORTHO'
light=bpy.data.lights.new('A3_ThumbLight','AREA');light.energy=12;light.size=.15;lo=bpy.data.objects.new('A3_ThumbLight',light);scene.collection.objects.link(lo)
result={'scope':'Only HandMesh.L vertex 775 weights. No animation, mesh coordinates, rest bones or axes altered.','ablations':{},'projection':{}}
b=rig.data.bones['Thumb2.L'];axis=(b.tail_local-b.head_local).normalized()
for i in (775,788,790,868,875,874):result['projection'][i]={'distance_beyond_IP_mm':(hand.data.vertices[i].co-b.head_local).dot(axis)*1000,'distal_segment_length_mm':b.length*1000}
for version in ('baseline','candidate'):
    if version=='candidate':
        hand.vertex_groups['Thumb1.L'].remove([775]);hand.vertex_groups['Thumb2.L'].add([775],1.,'REPLACE')
    set_action(rig,'CastPurple',90);d=prepare(hand);p=posed(d);result['ablations'][version]=crossing(p,p)
    for view in ('dorsal','palm','detail'):
        bone=rig.pose.bones['Thumb2.L'];target=rig.matrix_world@bone.head;orient=rig.matrix_world.to_3x3()@bone.matrix.to_3x3()
        if view=='detail':target=sum((p['v'][i] for i in (775,788,790,868,875,874)),Vector())/6
        else:target=target+orient@Vector((.002,-.012,0))
        camera_direction=orient@Vector((.45,.1,1 if view!='palm' else -1));cam.location=target+camera_direction*.2;cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();data.ortho_scale=.014 if view=='detail' else .09
        lo.location=cam.location+orient@Vector((.05,0,.03));lo.rotation_euler=(target-lo.location).to_track_quat('-Z','Y').to_euler()
        scene.render.filepath=str((out/(version+'-'+view+'.png')).resolve());bpy.ops.render.render(write_still=True)
    # Exact issue faces shown on actual deformed geometry, not a generated illustration.
    overlay_mesh=bpy.data.meshes.new('A3_IssueFaces');ids=[775,788,790,868,875,874];overlay_mesh.from_pydata([p['v'][i] for i in ids],[],[(0,1,2),(3,4,5)]);ob=bpy.data.objects.new('A3_IssueFaces',overlay_mesh);scene.collection.objects.link(ob)
    red=bpy.data.materials.new('A3_IssueHighlight');red.diffuse_color=(1,.02,.01,1);red.use_nodes=True;red.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=red.diffuse_color;ob.data.materials.append(red)
    wm=ob.modifiers.new('Located triangle edges','WIREFRAME');wm.thickness=.00004;wm.offset=1
    scene.render.filepath=str((out/(version+'-located.png')).resolve());bpy.ops.render.render(write_still=True);bpy.data.objects.remove(ob,do_unlink=True)
(out/'local-test.json').write_text(json.dumps(result,indent=2))
# Reopen input to save ONLY the single weight edit, not audit materials/cameras/visibility.
source=bpy.data.filepath;bpy.ops.wm.open_mainfile(filepath=source);hand=bpy.data.objects['HandMesh.L'];hand.vertex_groups['Thumb1.L'].remove([775]);hand.vertex_groups['Thumb2.L'].add([775],1.,'REPLACE')
bpy.ops.wm.save_as_mainfile(filepath=str(Path('blender/candidates/gojo-a3-thumb-distal.blend').resolve()),compress=True)
print('A3_THUMB_CANDIDATE_SAVED')
