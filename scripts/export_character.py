"""Export an authored Blender asset to an isolated candidate; never save source or publish."""
import argparse, hashlib, sys
from pathlib import Path
import bpy
sys.path.insert(0,str(Path(__file__).resolve().parent))
from character_common import ROOT, get_rig, neutral, write_json

p=argparse.ArgumentParser()
p.add_argument('--source',required=True);p.add_argument('--output',required=True)
p.add_argument('--replace-candidate',action='store_true')
args=p.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
source=Path(args.source).resolve();output=Path(args.output).resolve()
allowed=[(ROOT/'public/models/candidates').resolve(),(ROOT/'output').resolve()]
if source.suffix.lower()!='.blend' or not source.is_file():raise ValueError('An existing authored .blend source is required')
if output.suffix.lower()!='.glb' or not any(output.is_relative_to(root) for root in allowed):raise ValueError('Output must be a .glb under public/models/candidates or output; publishing is intentionally separate')
if output.exists() and not args.replace_candidate:raise FileExistsError('Candidate exists. Preserve it or explicitly pass --replace-candidate')
source_hash=hashlib.sha256(source.read_bytes()).hexdigest()
bpy.ops.wm.open_mainfile(filepath=str(source));rig=get_rig()
expected={'Idle':4,'CastBlue':5,'CastRed':4,'CastPurple':8,'RevealEyes':2.4,'CoverEyes':2.4}
fps=bpy.context.scene.render.fps/bpy.context.scene.render.fps_base
for name,duration in expected.items():
    if name not in bpy.data.actions:raise ValueError('Missing public animation '+name)
    lo,hi=bpy.data.actions[name].frame_range
    if abs(lo)>1e-5 or abs(hi/fps-duration)>.01:raise ValueError(f'Animation duration mismatch: {name} {lo}..{hi} at {fps} fps')
for name in ('Blindfold','FX_Hand_L','FX_Hand_R','FX_Center'):
    if name not in bpy.data.objects:raise ValueError('Missing public node '+name)
for obj in bpy.context.scene.objects:
    for mod in obj.modifiers:
        if mod.type=='ARMATURE' and mod.use_deform_preserve_volume:raise ValueError('Dual-quaternion-only deformation is not supported: '+obj.name)
neutral(rig)
for obj in bpy.context.scene.objects:obj.select_set(obj.type in ('MESH','ARMATURE','EMPTY'))
bpy.context.view_layer.objects.active=rig;output.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(output),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_skins=True,export_yup=True)
if hashlib.sha256(source.read_bytes()).hexdigest()!=source_hash:raise RuntimeError('Source changed during export')
write_json(output.with_suffix('.export.json'),{'source':str(source),'source_sha256':source_hash,'output':str(output),'output_sha256':hashlib.sha256(output.read_bytes()).hexdigest(),'status':'CANDIDATE_NOT_ART_ACCEPTED','clips':expected,'bones':len(rig.data.bones),'source_modified':False})
print('CANDIDATE_EXPORTED',output)
