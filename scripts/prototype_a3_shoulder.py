"""Adapt an authored CC-BY garment, never synthesize a character/shoulder surface.

Input: Blender Studio Snow v4.2. Retains authored shoulder topology and rig.
This is an isolated short-sleeved shoulder study, NOT a finished Gojo uniform.
"""
import bpy, math, json, sys, argparse
from pathlib import Path
from mathutils import Vector, Matrix, Quaternion
P=argparse.ArgumentParser();P.add_argument('--out',default='output/milestone-a3/shoulder');P.add_argument('--cases',default='natural,front45,front90,front120,side45,side90,side120,twist,elbow,casting');P.add_argument('--view',choices=['overview','back-close'],default='overview');P.add_argument('--save',action='store_true');a=P.parse_args(sys.argv[sys.argv.index('--')+1:]);out=Path(a.out);out.mkdir(parents=True,exist_ok=True)
rig=bpy.data.objects['RIG-Snow'];shirt=bpy.data.objects['GEO-snow-shirt'];body=bpy.data.objects['GEO-snow-body']
for o in bpy.data.objects:
    if o.type=='MESH':o.hide_render=o not in (shirt,body)
for o in (shirt,body):
    o.hide_set(False);o.hide_render=False
    for m in o.modifiers:
        if m.type=='SUBSURF':
            m.levels=1;m.render_levels=1
    o.data.materials.clear()
    mat=bpy.data.materials.new('A3_Cloth' if o==shirt else 'A3_Anatomy');mat.use_nodes=True
    color=(.24,.31,.40,1) if o==shirt else (.5,.41,.34,1)
    mat.diffuse_color=color;mat.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=color
    mat.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.85;o.data.materials.append(mat)
    for p in o.data.polygons:p.material_index=0
# Edit the author's neckline bands only, preserving every shoulder vertex/edge.
# A broad round tee neckline needs human design before becoming the final uniform.
# Here an existing two-band neckline becomes a raised collar study; all shape keys
# receive identical offsets so source corrective deltas stay intact.
if 'a3_collar_study' not in shirt:
    coords=[v.co.copy() for v in shirt.data.vertices]; changed=[]
    # Locate neckline by topology: boundary component above chest, near the centre.
    import bmesh
    bm=bmesh.new();bm.from_mesh(shirt.data);bm.verts.ensure_lookup_table()
    boundary={v.index for e in bm.edges if e.is_boundary for v in e.verts if abs(v.co.x)<.15 and v.co.z>1.33}
    region=set(boundary)
    for _ in range(2):region|={e.other_vert(bm.verts[i]).index for i in list(region) for e in bm.verts[i].link_edges}
    for i in sorted(region):
        p=coords[i]
        if abs(p.x)>.16 or p.z<1.32:continue
        distance=0 if i in boundary else 1 if any(e.other_vert(bm.verts[i]).index in boundary for e in bm.verts[i].link_edges) else 2
        strength=(1,.70,.15)[distance]
        dest=Vector((p.x*.65,p.y*.76,1.485+(p.z-1.4)*.12))
        delta=(dest-p)*strength
        for k in shirt.data.shape_keys.key_blocks:k.data[i].co+=delta
        shirt.data.vertices[i].co+=delta;changed.append(i)
    bm.free();shirt['a3_collar_study']=True;shirt['a3_collar_changed_vertices']=changed
    (out/'collar-edits.json').write_text(json.dumps({'vertices':changed,'note':'Boundary band coordinate edit only; authored shoulder connectivity unchanged; not approved uniform collar.'},indent=2))
def reset():
    if rig.animation_data:rig.animation_data.action=None
    for b in rig.pose.bones:b.matrix_basis=Matrix.Identity(4)
    for side in ('left','right'):rig.pose.bones['Properties']['ik_'+side+'_upperarm']=0.
    rig.update_tag();bpy.context.view_layer.update()
def aim(name,direction):
    b=rig.pose.bones[name];m=b.matrix.copy();q=m.to_3x3().col[1].rotation_difference(Vector(direction).normalized());n=(q.to_matrix()@m.to_3x3()).to_4x4();n.translation=m.translation;b.matrix=n;bpy.context.view_layer.update()
def pose(case):
    reset()
    for side,sign in [('L',1),('R',-1)]:
        angle=0;plane='side'
        if case.startswith('front'):plane='front';angle=int(case[5:])
        if case.startswith('side'):angle=int(case[4:])
        if case in ('elbow','casting','twist'):angle={'elbow':20,'casting':65,'twist':80}[case];plane='front' if case=='casting' else 'side'
        t=math.radians(angle)
        clav=math.radians(max(0,angle-55)*.35)
        b=rig.pose.bones['FK-Shoulder.'+side];m=b.matrix.copy();q=Quaternion((0,1,0),-sign*clav);n=(q.to_matrix()@m.to_3x3()).to_4x4();n.translation=m.translation;b.matrix=n;bpy.context.view_layer.update()
        d=(0,-math.sin(t),-math.cos(t)) if plane=='front' else (sign*math.sin(t),0,-math.cos(t))
        aim('FK-UpperArm.'+side,d)
        if case=='twist':
            b=rig.pose.bones['FK-UpperArm.'+side];m=b.matrix.copy();q=Quaternion(m.to_3x3().col[1],math.radians(60));n=(q.to_matrix()@m.to_3x3()).to_4x4();n.translation=m.translation;b.matrix=n;bpy.context.view_layer.update()
        aim('FK-Forearm.'+side,(0,-1,.3) if case=='elbow' else (-sign*.3,-.7,.6) if case=='casting' else d)
    bpy.context.view_layer.update()
def verts(o):
    e=o.evaluated_get(bpy.context.evaluated_depsgraph_get());m=e.to_mesh();v=[list(e.matrix_world@p.co) for p in m.vertices];e.to_mesh_clear();return v
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=16;scene.cycles.use_denoising=True
scene.render.resolution_x=800;scene.render.resolution_y=800;scene.render.resolution_percentage=100
scene.world=bpy.data.worlds.new('A3_World');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.12,.12,.12,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.5
scene.view_settings.view_transform='AgX'
for o in list(scene.objects):
    if o.type in ('LIGHT','CAMERA'):bpy.data.objects.remove(o,do_unlink=True)
target=Vector((0,0,1.25))
for name,loc,power,size in [('Key',(-2,-3,4),380,3),('Fill',(3,-2,2.5),220,3),('Rim',(0,2,3),280,2)]:
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size;o=bpy.data.objects.new(name,data);scene.collection.objects.link(o);o.location=loc;o.rotation_euler=(target-o.location).to_track_quat('-Z','Y').to_euler()
data=bpy.data.cameras.new('A3_Camera');cam=bpy.data.objects.new('A3_Camera',data);scene.collection.objects.link(cam);scene.camera=cam;data.type='ORTHO';data.ortho_scale=1.35;cam.location=Vector((-1.9,-3,0))+target;cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
if a.view=='back-close':
    target=Vector((-.17,0,1.37));data.ortho_scale=.65;cam.location=target+Vector((-1.4,2,.1));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
manifest={'source':'Snow Rig (CC) Blender Foundation | studio.blender.org','license':'https://creativecommons.org/licenses/by/4.0/','limitation':'Short sleeves; exploratory collar; native B-bones / DQ / shape correctives are not yet a production GLB rig.','cases':{}}
# Source drivers can override subdivision quality; use fixed render subdivision.
for o in (shirt,body):
    if o.animation_data:
        for d in o.animation_data.drivers:
            if 'levels' in d.data_path:d.mute=True
    for m in o.modifiers:
        if m.type=='SUBSURF':m.levels=1;m.render_levels=1
for case in ([] if a.cases=='none' else a.cases.split(',')):
    pose(case);manifest['cases'][case]={'upperarm_directions':{s:list((rig.pose.bones['UpperArm.'+s].tail-rig.pose.bones['UpperArm.'+s].head).normalized()) for s in ('L','R')}}
    scene.render.filepath=str((out/(case+'.png')).resolve());bpy.ops.render.render(write_still=True)
    # Actual source control cage wires, no triangulated render wire shader.
    wire=shirt.copy();wire.data=shirt.data.copy();scene.collection.objects.link(wire);wire.name='A3_ControlCage'
    for m in list(wire.modifiers):
        if m.type=='SUBSURF':wire.modifiers.remove(m)
    wm=wire.modifiers.new('Control edges','WIREFRAME');wm.thickness=.0007;wm.offset=1
    black=bpy.data.materials.get('A3_Wire') or bpy.data.materials.new('A3_Wire');black.diffuse_color=(.008,.012,.018,1);black.use_nodes=True;black.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=black.diffuse_color;wire.data.materials.clear();wire.data.materials.append(black)
    scene.render.filepath=str((out/(case+'-wire.png')).resolve());bpy.ops.render.render(write_still=True);bpy.data.objects.remove(wire,do_unlink=True)
    # Keep identical lights/camera, encode real combined shoulder/upperarm weight.
    layer=shirt.data.color_attributes.get('A3_Weights') or shirt.data.color_attributes.new(name='A3_Weights',type='FLOAT_COLOR',domain='CORNER')
    for loop in shirt.data.loops:
        w=sum(g.weight for g in shirt.data.vertices[loop.vertex_index].groups if shirt.vertex_groups[g.group].name in ('DEF-UpperArm_1.R','DEF-UpperArm_2.R'))
        layer.data[loop.index].color=(w,.15*(1-w),1-w,1)
    mat=bpy.data.materials.get('A3_WeightMaterial') or bpy.data.materials.new('A3_WeightMaterial');mat.use_nodes=True;n=mat.node_tree.nodes.new('ShaderNodeVertexColor');n.layer_name=layer.name;mat.node_tree.links.new(n.outputs['Color'],mat.node_tree.nodes.get('Principled BSDF').inputs['Base Color']);original=shirt.data.materials[0];shirt.data.materials[0]=mat
    scene.render.filepath=str((out/(case+'-weights.png')).resolve());bpy.ops.render.render(write_still=True);shirt.data.materials[0]=original
    # Save source evaluated reference per pose for independent inspection.
    manifest['cases'][case]['shirt_vertices']=verts(shirt)
if a.save:
    pose('natural');rig['A3_NOTICE']='Licensed Snow shoulder feasibility prototype. Not an accepted Gojo replacement.'
    bpy.ops.wm.save_as_mainfile(filepath=str(Path('blender/candidates/a3-snow-shoulder-study.blend').resolve()),compress=True)
(out/'manifest.json').write_text(json.dumps(manifest),encoding='utf-8')
print('A3_SHOULDER_DONE')
