"""Shared diagnostic poses. Does not generate character geometry or save source files."""
import json, math
from pathlib import Path
import bpy
from mathutils import Matrix, Quaternion, Vector

ROOT = Path(__file__).resolve().parents[1]
CASES = [('rest', None, 0), ('open', None, 0), ('half-fist', None, 0),
         ('fist', None, 0), ('red-40', 'CastRed', 40), ('red-44', 'CastRed', 44),
         ('red-48', 'CastRed', 48), ('blue-46', 'CastBlue', 46),
         ('purple-132', 'CastPurple', 132), ('shoulder-front', None, 0),
         ('shoulder-side', None, 0), ('shoulder-high', None, 0),
         ('shoulder-rotate', None, 0), ('wrist-flexion', None, 0), ('wrist-twist', None, 0)]

def get_rig():
    rigs = [o for o in bpy.context.scene.objects if o.type == 'ARMATURE']
    if len(rigs) != 1:
        raise ValueError(f'Expected one rig, found {[o.name for o in rigs]}')
    return rigs[0]

def set_action(rig, name, frame):
    if name not in bpy.data.actions:
        raise ValueError(f'Missing animation: {name}')
    rig.animation_data_create()
    rig.animation_data.action = bpy.data.actions[name]
    # Blender 4.4+ layered actions require a matching slot after action switches.
    if bpy.data.actions[name].slots:
        rig.animation_data.action_slot = bpy.data.actions[name].slots[0]
    bpy.context.scene.frame_set(int(frame), subframe=frame % 1)
    bpy.context.view_layer.update()

def neutral(rig):
    if rig.animation_data:
        rig.animation_data.action = None
        for track in rig.animation_data.nla_tracks:
            track.mute = True
    for b in rig.pose.bones:
        b.matrix_basis = Matrix.Identity(4)
        b.rotation_mode = 'QUATERNION'
    bpy.context.view_layer.update()

def is_reference(rig):
    return 'wrist.R' in rig.data.bones

def pose_case(rig, case):
    label, action, frame = case
    if action:
        set_action(rig, action, frame)
        return
    neutral(rig)
    ref = is_reference(rig)
    if label in ('half-fist', 'fist'):
        strength = .5 if label == 'half-fist' else 1
        for side in ('L', 'R'):
            for digit, legacy in enumerate(('Thumb', 'Index', 'Middle', 'Ring', 'Pinky'), 1):
                count = 3 if ref or digit != 1 else 2
                for joint in range(1, count + 1):
                    name = f'finger{digit}-{joint}.{side}' if ref else f'{legacy}{joint}.{side}'
                    angle = (0.4 if digit == 1 else (0.85, 1.15, .65)[joint-1]) * strength
                    rig.pose.bones[name].rotation_quaternion = Quaternion((1, 0, 0), angle)
    if label.startswith('shoulder'):
        for side in ('L', 'R'):
            name = f'upperarm01.{side}' if ref else f'UpperArm.{side}'
            bone = rig.pose.bones[name]
            # Aim upper arm in world space. This is a diagnostic pose, not production animation.
            sign=1 if side=='L' else -1
            desired = Vector((0, -1, .1)) if label == 'shoulder-front' else Vector((sign, 0, .35))
            if label=='shoulder-high':desired=Vector((sign*.4,0,1))
            rest = bone.bone.matrix_local.to_quaternion()
            delta = (bone.bone.tail_local-bone.bone.head_local).rotation_difference(desired)
            bone.rotation_quaternion = rest.inverted() @ delta @ rest
            if label=='shoulder-rotate':bone.rotation_quaternion=Quaternion((0,1,0),math.radians(80))
    if label.startswith('wrist'):
        for side in ('L','R'):
            bone=rig.pose.bones[('wrist.' if ref else 'Hand.')+side]
            bone.rotation_quaternion=Quaternion((1,0,0) if label=='wrist-flexion' else (0,1,0),math.radians(65))
    bpy.context.view_layer.update()

def diagnostic_materials():
    mat = bpy.data.materials.new('AuditNeutral')
    mat.diffuse_color = (.48, .54, .60, 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = mat.diffuse_color
    bsdf.inputs['Roughness'].default_value = .8
    for obj in bpy.context.scene.objects:
        if obj.type == 'MESH':
            obj.data.materials.clear()
            obj.data.materials.append(mat)

def world_vertices(obj):
    deps = bpy.context.evaluated_depsgraph_get()
    evaluated = obj.evaluated_get(deps)
    mesh = evaluated.to_mesh()
    result = [evaluated.matrix_world @ v.co for v in mesh.vertices]
    evaluated.to_mesh_clear()
    return result

def framing(rig, label):
    if label.startswith('shoulder'):
        bone = rig.pose.bones['upperarm01.R' if is_reference(rig) else 'UpperArm.R']
        target = rig.matrix_world @ bone.head
        return target, target + Vector((-1.0, -2, .35)), .78
    bone = rig.pose.bones['wrist.R' if is_reference(rig) else 'Hand.R']
    target = rig.matrix_world @ (bone.head.lerp(bone.tail, .8))
    # Fixed offset in hand coordinates avoids changing camera when framing a curled hand.
    target += rig.matrix_world.to_3x3() @ bone.matrix.to_3x3() @ Vector((0, .025, 0))
    return target, target + Vector((-.25, -1.0, .30)), .27

def write_json(path, data):
    path = Path(path); path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2, allow_nan=False), encoding='utf-8')
