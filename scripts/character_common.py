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

# A2 extends evidence coverage without removing any A1 cases.
CASES += [(name,None,0) for name in ('thumb-open','thumb-index','thumb-middle','fist-palm','half-fist-palm','elbow-bend')]
CASES += [(f'purple-{f}','CastPurple',f) for f in (31,73,90,108,120,138,144,152,185,210)]
CASES += [(f'shoulder-{motion}-{view}',None,0)
          for motion in ('natural','front-45','front-90','front-120','side-45','side-90','side-120','rotation')
          for view in ('frontview','sideview','threequarter','close')]

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
    hand_kind={'thumb-open':'open','thumb-index':'thumb-index','thumb-middle':'thumb-middle','fist-palm':'fist','half-fist-palm':'half-fist'}.get(label,label)
    if hand_kind in ('half-fist','fist','open','thumb-index','thumb-middle') and 'phase2_hand_poses' in rig:
        from phase2_kinematics import apply_library
        for side in ('L','R'):apply_library(rig,side,hand_kind)
        return
    if label in ('fist-palm','half-fist-palm'):label=hand_kind
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
        if any(label.endswith('-'+v) for v in ('frontview','sideview','threequarter','close')):
            from phase2_kinematics import aim_bone
            motion=label.removeprefix('shoulder-').rsplit('-',1)[0]
            for side in ('L','R'):
                sign=1 if side=='L' else -1
                if motion in ('natural','rotation'):desired=Vector((sign*.08,0,-1))
                else:
                    plane,angle=motion.split('-');theta=math.radians(float(angle))
                    desired=Vector((0,-math.sin(theta),-math.cos(theta))) if plane=='front' else Vector((sign*math.sin(theta),0,-math.cos(theta)))
                arm_name=('upperarm01.' if ref else 'UpperArm.')+side
                aim_bone(rig,arm_name,desired)
                aim_bone(rig,('lowerarm01.' if ref else 'Forearm.')+side,desired)
                if ref:aim_bone(rig,'lowerarm02.'+side,desired)
                if motion=='rotation':
                    b=rig.pose.bones[arm_name];b.rotation_quaternion=b.rotation_quaternion@Quaternion((0,1,0),math.radians(65))
            bpy.context.view_layer.update();return
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
    if label=='elbow-bend':
        from phase2_kinematics import aim_bone
        for side in ('L','R'):aim_bone(rig,('lowerarm01.' if ref else 'Forearm.')+side,(0,-1,.4))
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
    if label.startswith('purple'):
        target=Vector((0,-.22,1.43));return target,target+Vector((-.6,-2,.25)),.78
    if label.startswith('shoulder-') and any(label.endswith('-'+v) for v in ('frontview','sideview','threequarter','close')):
        view=label.rsplit('-',1)[1];target=Vector((0,0,1.38))
        offset={'frontview':(0,-2,.08),'sideview':(-2,0,.08),'threequarter':(-1.5,-2,.25),'close':(-1,-2,.3)}[view]
        if view=='close':target=Vector((-.19,0,1.41))
        return target,target+Vector(offset),.64 if view=='close' else 1.05
    if label=='elbow-bend':
        target=Vector((-.27,-.05,1.24));return target,target+Vector((-1,-2,.2)),.65
    if label.startswith('shoulder'):
        bone = rig.pose.bones['upperarm01.R' if is_reference(rig) else 'UpperArm.R']
        target = rig.matrix_world @ bone.head
        return target, target + Vector((-1.0, -2, .35)), .78
    bone = rig.pose.bones['wrist.R' if is_reference(rig) else 'Hand.R']
    target = rig.matrix_world @ (bone.head.lerp(bone.tail, .8))
    # Fixed offset in hand coordinates avoids changing camera when framing a curled hand.
    target += rig.matrix_world.to_3x3() @ bone.matrix.to_3x3() @ Vector((0, .025, 0))
    if label.endswith('-palm') or label.startswith('thumb'):
        return target,target+Vector((-.25,1,.1)),.27
    return target, target + Vector((-.25, -1.0, .30)), .27

def write_json(path, data):
    path = Path(path); path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2, allow_nan=False), encoding='utf-8')
