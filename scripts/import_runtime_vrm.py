"""Editable candidate import; the native VRM remains the browser source."""
import bpy
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
destination = root / 'blender/candidates/limitless-runtime.blend'
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(root / 'public/models/candidates/limitless-runtime.vrm'))
bpy.context.scene.render.fps = 30
bpy.context.scene['asset_status'] = 'ANIMATION_PREVIEW_NOT_FINAL_ART_APPROVAL'
bpy.context.scene['material_note'] = 'glTF fallback; browser VRM/MToon is the visual reference'
bpy.context.scene['source_license'] = 'VRoid Project HairSample_Male CC0; project blindfold accessory'
bpy.data.texts.new('READ_ME').write(
    'Six raw-bone animation clips imported as actions/NLA tracks.\n'
    'Accepted whitehair study mesh, UVs, weights and textures unchanged.\n'
    'Select the corresponding NLA track to inspect a clip. FPS: 30.\n'
    'Blindfold fade/lift is controlled by CharacterAdapter, not baked here.\n'
    'VRM MToon and secondary-animation metadata do not round-trip through this import.\n'
    'Known warning: CastRed middle/ring finger-web edge stretches 3.03x.\n')
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(destination))
bpy.ops.wm.open_mainfile(filepath=str(destination))
names = ['Idle', 'CastBlue', 'CastRed', 'CastPurple', 'RevealEyes', 'CoverEyes']
tracks = {t.name for o in bpy.data.objects if o.animation_data for t in o.animation_data.nla_tracks}
assert all(n in tracks for n in names), (names, tracks)
assert all(n in bpy.data.objects for n in ['Blindfold', 'FX_Hand_L', 'FX_Hand_R', 'FX_Center'])
report = {'reopened': True, 'file': str(destination),
          'actions': [a.name for a in bpy.data.actions], 'nla_tracks': sorted(tracks),
          'rigs': {o.name: len(o.data.bones) for o in bpy.data.objects if o.type == 'ARMATURE'},
          'meshes': {o.name: len(o.data.vertices) for o in bpy.data.objects if o.type == 'MESH'},
          'packed_images': sum(bool(i.packed_file) for i in bpy.data.images),
          'material_parity': 'Not asserted; glTF fallback import'}
(root / 'output/playwright/vrm-integration/blender-import.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
print(json.dumps(report))
