"""Save the rest-shape study as an editable Blender file; never touch production assets.

Blender's glTF importer reads the skin, textures and morphs. VRM/MToon metadata
remains authoritative in the .vrm; this .blend is an editing reference and is not
a round-trip VRM exporter or a claim of Blender/VRM material parity.
"""
import bpy
from pathlib import Path
import json

root = Path(__file__).resolve().parents[1]
source = root / 'public/models/candidates/limitless-whitehair-study.vrm'
destination = root / 'blender/candidates/limitless-whitehair-study.blend'
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source))
bpy.context.scene['asset_status'] = 'VISUAL_CANDIDATE_NOT_PRODUCTION'
bpy.context.scene['source_license'] = 'CC0 / VRoid Project HairSample_Male'
bpy.context.scene['material_note'] = 'Blender glTF fallback materials; browser MToon is visual reference.'
bpy.context.scene['known_gaps'] = 'Hoodie remains; no blindfold; no skill clips; fist contact requires adjustment.'
text = bpy.data.texts.new('READ_ME')
text.write('Existing CC0 VRoid mesh edited for a white-haired anime character study.\n'
           'This is NOT a final Gojo character or a new generated humanoid.\n'
           'Original connectivity and skin weights retained.\n'
           'Rest proportions, face, hair and texture colours edited.\n'
           'Use character-study.html for the MToon appearance and fixed comparisons.\n'
           'This import is an editing reference; VRM secondary animation metadata does not round-trip.\n')
bpy.ops.file.pack_all()
destination.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(destination))
# Open the actual saved file again; do not infer success from save alone.
bpy.ops.wm.open_mainfile(filepath=str(destination))
meshes = [o for o in bpy.data.objects if o.type == 'MESH']
rigs = [o for o in bpy.data.objects if o.type == 'ARMATURE']
assert meshes and rigs, 'Missing mesh or editable armature after reopen'
report = {'file': str(destination), 'reopened': True,
          'meshes': [{'name': o.name, 'vertices': len(o.data.vertices), 'polygons': len(o.data.polygons),
                      'vertex_groups': len(o.vertex_groups)} for o in meshes],
          'rigs': [{'name': o.name, 'bones': len(o.data.bones)} for o in rigs],
          'packed_images': sum(bool(i.packed_file) for i in bpy.data.images),
          'material_parity': 'Not asserted: glTF fallback import, not native MToon'}
(root / 'output/playwright/character-style/blender-import.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
print(json.dumps(report))
