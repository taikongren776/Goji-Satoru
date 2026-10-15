"""Conservative A2 candidate: only CastPurple arm/wrist tracks are changed.

Rejects the experimental thumb retargeting from motion-v2. All mesh data, bind bones,
weights, finger tracks, other five clips and socket local transforms remain untouched.
"""
import sys,math,hashlib
from pathlib import Path
import bpy
from mathutils import Quaternion
sys.path.insert(0,str(Path(__file__).resolve().parent))
from character_common import ROOT,neutral,set_action,get_rig,write_json
from phase2_kinematics import arm_to

source=ROOT/'blender/candidates/gojo-hand-fit.blend';out=ROOT/'blender/candidates/gojo-a2-purple-spacing.blend'
if out.exists():raise FileExistsError('Preserve existing candidate; do not overwrite')
bpy.ops.wm.open_mainfile(filepath=str(source));rig=get_rig();names=[f'{b}.{s}' for s in ('L','R') for b in ('UpperArm','Forearm','Hand')]
original={}
for f in range(241):
    neutral(rig);set_action(rig,'CastPurple',f)
    original[f]={b.name:(b.location.copy(),b.rotation_quaternion.copy(),b.scale.copy()) for b in rig.pose.bones}
def restore(f):
    neutral(rig)
    for n,(l,q,s) in original[f].items():rig.pose.bones[n].location=l;rig.pose.bones[n].rotation_quaternion=q;rig.pose.bones[n].scale=s
    bpy.context.view_layer.update()
waypoints=[(0,None),(31,((.20,-.23,1.43),(.20,-.23,1.45))),
           (73,((.18,-.25,1.44),(.18,-.23,1.47))),
           (108,((.105,-.30,1.415),(.105,-.235,1.485))),
           (138,((.105,-.30,1.415),(.105,-.235,1.485))),
           (152,((.12,-.37,1.46),(.23,-.20,1.24))),
           (185,((.12,-.37,1.46),(.23,-.20,1.24))),(240,None)]
poses={}
for f,targets in waypoints:
    restore(f)
    if targets:
        for side,target in zip(('R','L'),targets):
            sign=-1 if side=='R' else 1
            # Start wrist at neutral relative orientation; avoid imposing a 180-degree palm twist.
            hand=rig.pose.bones['Hand.'+side];hand.rotation_quaternion=Quaternion();bpy.context.view_layer.update()
            direction=(sign*-.12,-.25,.96) if f<152 else (0,-.99,.1) if side=='R' else (-.1,-.15,-.98)
            arm_to(rig,side,(sign*target[0],target[1],target[2]),(sign*.35,-.08,1.23),direction,None)
            q=hand.rotation_quaternion.normalized()
            if q.w<0:q.negate()
            if q.angle>math.radians(50):hand.rotation_quaternion=Quaternion().slerp(q,math.radians(50)/q.angle)
            bpy.context.view_layer.update()
    poses[f]={n:(rig.pose.bones[n].location.copy(),rig.pose.bones[n].rotation_quaternion.copy(),rig.pose.bones[n].scale.copy()) for n in names}
action=bpy.data.actions['CastPurple']
for layer in action.layers:
    for strip in layer.strips:
        for bag in strip.channelbags:
            for fc in list(bag.fcurves):
                if any(fc.data_path.startswith('pose.bones["'+n+'"]') for n in names):bag.fcurves.remove(fc)
previous={}
for f in range(241):
    restore(f);i=next(i for i in range(len(waypoints)-1) if waypoints[i][0]<=f<=waypoints[i+1][0]);a,b=waypoints[i][0],waypoints[i+1][0]
    t=(f-a)/(b-a);t=t*t*(3-2*t)
    for n in names:
        l,q,s=poses[a][n];ll,qq,ss=poses[b][n];bone=rig.pose.bones[n];value=q.slerp(qq,t)
        if n in previous and previous[n].dot(value)<0:value.negate()
        previous[n]=value.copy();bone.location=l.lerp(ll,t);bone.rotation_quaternion=value;bone.scale=s.lerp(ss,t)
    rig.animation_data.action=action
    if action.slots:rig.animation_data.action_slot=action.slots[0]
    for n in names:
        for prop in ('location','rotation_quaternion','scale'):rig.pose.bones[n].keyframe_insert(data_path=prop,frame=f,group=n)
for layer in action.layers:
    for strip in layer.strips:
        for bag in strip.channelbags:
            for fc in bag.fcurves:
                if any(fc.data_path.startswith('pose.bones["'+n+'"]') for n in names):
                    for k in fc.keyframe_points:k.interpolation='LINEAR'
for m in list(action.pose_markers):action.pose_markers.remove(m)
for label,frame in [('Prepare',0),('SeparateCores',31),('Position',73),('Form',108),('Release',138),('Recover',197)]:action.pose_markers.new(label).frame=frame
rig['asset_status']='A2_PURPLE_SPACING_ONLY_NOT_MILESTONE_ACCEPTED'
rig['phase2_shoulder_status']='NOT_REBUILT; original voxel/decimated uniform remains'
neutral(rig);bpy.ops.wm.save_as_mainfile(filepath=str(out))
write_json(ROOT/'output/milestone-a2/spacing-candidate.json',{'source':str(source),'sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'candidate':str(out),'modified_tracks':names,'clip':'CastPurple','duration_seconds':8,'modified_geometry':False,'modified_bind_bones':False,'modified_weights':False,'thumb_retargeting':'REJECTED; original tracks retained','shoulder_rebuild':'NOT_COMPLETED','status':'NOT_MILESTONE_ACCEPTED'})
