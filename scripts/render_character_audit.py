"""Render real diagnostic poses and export a matching animated QA GLB + camera manifest.
Source .blend is never saved. QA actions are explicitly separate from production clips.
"""
import argparse, sys, math, hashlib, json
from pathlib import Path
import bpy
from mathutils import Vector
sys.path.insert(0,str(Path(__file__).resolve().parent))
from character_common import CASES,get_rig,pose_case,neutral,framing,diagnostic_materials,write_json

p=argparse.ArgumentParser();p.add_argument('--asset',required=True);p.add_argument('--out',required=True);p.add_argument('--size',type=int,default=900);p.add_argument('--samples',type=int,default=32);p.add_argument('--cases',default='');p.add_argument('--export-dir');p.add_argument('--wire',action='store_true');p.add_argument('--report')
args=p.parse_args(sys.argv[sys.argv.index('--')+1:]);asset=Path(args.asset).resolve();out=Path(args.out).resolve();out.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(asset));rig=get_rig();scene=bpy.context.scene
diagnostic_materials()
for o in list(scene.objects):
    if o.type in ('LIGHT','CAMERA'):bpy.data.objects.remove(o,do_unlink=True)
world=bpy.data.worlds.new('AuditWorld');scene.world=world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.055,.065,.085,1);world.node_tree.nodes['Background'].inputs[1].default_value=.5
for name,pos,power,size in [('AuditKey',(-2,-4,5),650,4),('AuditFill',(3,-1,3),350,3),('AuditRim',(0,3,4),500,3)]:
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size
    obj=bpy.data.objects.new(name,data);scene.collection.objects.link(obj);obj.location=pos;obj.rotation_euler=(Vector((0,0,1))-obj.location).to_track_quat('-Z','Y').to_euler()
camdata=bpy.data.cameras.new('AuditCamera');camera=bpy.data.objects.new('AuditCamera',camdata);scene.collection.objects.link(camera);scene.camera=camera;camdata.type='ORTHO'
scene.render.engine='CYCLES';scene.cycles.samples=args.samples;scene.render.resolution_x=scene.render.resolution_y=args.size;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX';scene.view_settings.exposure=0;scene.view_settings.gamma=1;scene.render.image_settings.file_format='PNG';scene.render.film_transparent=False
if args.wire:
    for o in list(scene.objects):
        if o.type!='MESH' or not any(m.type=='ARMATURE' for m in o.modifiers):continue
        overlay=o.copy();overlay.data=o.data.copy();scene.collection.objects.link(overlay);overlay.name=o.name+'_WIRE'
        mat=bpy.data.materials.new('WireInk');mat.diffuse_color=(.015,.018,.02,1);overlay.data.materials.clear();overlay.data.materials.append(mat)
        mod=overlay.modifiers.new('WireOverlay','WIREFRAME');mod.thickness=.00025;mod.use_replace=True
selected=[c for c in CASES if not args.cases or c[0] in args.cases.split(',')]
manifest={'source':str(asset),'sha256':hashlib.sha256(asset.read_bytes()).hexdigest(),'source_modified':False,'renderer':'Cycles','samples':args.samples,'size':args.size,'wire':args.wire,'poses':[],'skipped':[]}
stored=[]
diagnosis=json.loads(Path(args.report).read_text()) if args.report else None
markers=[]
for case in selected:
    if case[1] and case[1] not in bpy.data.actions:
        manifest['skipped'].append({'case':case[0],'reason':'missing production clip'});continue
    pose_case(rig,case);target,position,scale=framing(rig,case[0]);camera.location=position;camdata.ortho_scale=scale;camera.rotation_euler=(target-position).to_track_quat('-Z','Y').to_euler()
    for marker in markers:bpy.data.objects.remove(marker,do_unlink=True)
    markers=[]
    if diagnosis:
        samples={}
        if case[1] in diagnosis['clips']:
            samples={name:next((s for s in seq if s['frame']==case[2]),{}) for name,seq in diagnosis['clips'][case[1]]['meshes'].items()}
        elif not case[1]:samples=diagnosis['diagnostic_poses'].get(case[0],{})
        for name,sample in samples.items():
            if sample.get('severity')=='clear':continue
            obj=bpy.data.objects.get(name)
            if not obj:continue
            evaluated=obj.evaluated_get(bpy.context.evaluated_depsgraph_get());me=evaluated.to_mesh()
            for edge in sample.get('worst_edges',[])[:3]:
                curve=bpy.data.curves.new('EvidenceEdge','CURVE');curve.dimensions='3D';curve.bevel_depth=.0007;curve.bevel_resolution=2
                spline=curve.splines.new('POLY');spline.points.add(1)
                for point,vi in zip(spline.points,edge['vertices']):point.co=(*(evaluated.matrix_world@me.vertices[vi].co),1)
                marker=bpy.data.objects.new('EvidenceEdge_'+str(edge['edge']),curve);scene.collection.objects.link(marker)
                ink=bpy.data.materials.new('ErrorRed');ink.diffuse_color=(1,.015,.01,1);curve.materials.append(ink);markers.append(marker)
            evaluated.to_mesh_clear()
    scene.render.filepath=str(out/(case[0]+'.png'));bpy.ops.render.render(write_still=True)
    transforms={b.name:([*b.location],[*b.rotation_quaternion],[*b.scale]) for b in rig.pose.bones}
    # World positions are reference data for independent Three.js skinning verification.
    vertices={}
    for o in scene.objects:
        if o.type!='MESH' or not any(m.type=='ARMATURE' for m in o.modifiers) or o.name.endswith('_WIRE'):continue
        ev=o.evaluated_get(bpy.context.evaluated_depsgraph_get());me=ev.to_mesh()
        vertices[o.name]=[[*(ev.matrix_world@v.co)] for v in me.vertices];ev.to_mesh_clear()
    stored.append((case[0],transforms))
    sockets={name:list(bpy.data.objects[name].matrix_world.translation) for name in ('FX_Hand_L','FX_Hand_R','FX_Center') if name in bpy.data.objects}
    manifest['poses'].append({'id':case[0],'source_clip':case[1],'source_frame':case[2],'camera':list(position),'target':list(target),'ortho_scale':scale,'vertices_blender_world':vertices,'sockets_blender_world':sockets})
if args.export_dir:
    export=Path(args.export_dir).resolve();export.mkdir(parents=True,exist_ok=True)
    # Add diagnostic actions using captured source poses. This tests exporter/skinning,
    # not production animation interpolation or Gojo suitability of a reference specimen.
    neutral(rig)
    for name,transforms in stored:
        action=bpy.data.actions.new('QA_'+name);rig.animation_data_create();rig.animation_data.action=action
        for frame in (0,1):
            for b in rig.pose.bones:
                loc,rot,scale=transforms[b.name];b.location=loc;b.rotation_quaternion=rot;b.scale=scale
                for prop in ('location','rotation_quaternion','scale'):b.keyframe_insert(data_path=prop,frame=frame)
        action.use_fake_user=True
    neutral(rig)
    for o in scene.objects:o.select_set(o.type in ('MESH','ARMATURE','EMPTY') and not o.name.endswith('_WIRE'))
    bpy.context.view_layer.objects.active=rig
    bpy.ops.export_scene.gltf(filepath=str(export/'audit.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_skins=True,export_yup=True)
    write_json(export/'manifest.json',manifest)
write_json(out/'manifest.json',manifest)
print('RENDERED',len(manifest['poses']),'SKIPPED',len(manifest['skipped']))
