"""Isolated hand/animation candidate. DOES NOT rebuild or claim acceptance of shoulders.
Retains authored hand topology and weights byte-for-byte; no generated character meshes.
"""
import sys,json,math,hashlib,argparse
from pathlib import Path
import bpy
from mathutils import Vector,Quaternion
sys.path.insert(0,str(Path(__file__).resolve().parent))
from character_common import ROOT,get_rig,neutral,set_action,write_json
from phase2_kinematics import hand_pose,arm_to,FINGERS

source=ROOT/'blender/candidates/gojo-hand-fit.blend'
parser=argparse.ArgumentParser();parser.add_argument('--output',default='blender/candidates/gojo-a2-motion-study.blend');parser.add_argument('--record',default='output/milestone-a2/motion-study.json')
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
output=(ROOT/args.output).resolve()
if not output.is_relative_to((ROOT/'blender/candidates').resolve()):raise ValueError('Candidate directory only')
if output.exists():raise FileExistsError('Preserve previous study before rerunning')
bpy.ops.wm.open_mainfile(filepath=str(source));rig=get_rig();neutral(rig)
clips=('Idle','CastBlue','CastRed','CastPurple','RevealEyes','CoverEyes')
durations={n:tuple(bpy.data.actions[n].frame_range) for n in clips}
# Capture the original body at integer frames before changing any action.
original={}
for name in clips:
    original[name]={}
    for f in range(int(durations[name][1])+1):
        neutral(rig);set_action(rig,name,f)
        original[name][f]={b.name:(b.location.copy(),b.rotation_quaternion.copy(),b.scale.copy()) for b in rig.pose.bones}
neutral(rig);bpy.context.view_layer.objects.active=rig
bpy.ops.object.mode_set(mode='EDIT')
for side in ('L','R'):
    for j in range(3):rig.data.edit_bones[f'Thumb{j}.{side}'].align_roll(Vector((0,1,0)))
bpy.ops.object.mode_set(mode='OBJECT')
library={};diagnostics={}
for kind in ('open','relax','half-fist','fist','point','seal','cup','thumb-index','thumb-middle'):
    neutral(rig);library[kind]={};diagnostics[kind]={}
    for side in ('L','R'):
        diagnostics[kind][side]=hand_pose(rig,side,kind)
        library[kind][side]={b.name:list(b.rotation_quaternion) for b in rig.pose.bones if b.name.endswith('.'+side) and b.name.startswith(FINGERS+('Thumb',))}
rig['phase2_hand_poses']=json.dumps(library)
rig['asset_status']='A2_MOTION_STUDY_SHOULDER_UNCHANGED_NOT_ACCEPTED'
rig['phase2_shoulder_status']='NOT_REBUILT; original voxel/decimated uniform remains'
thumbs=[f'Thumb{j}.{s}' for s in ('L','R') for j in range(3)]
purple_names=[b.name for b in rig.pose.bones if b.name.startswith(('UpperArm','Forearm','Hand')+FINGERS+('Thumb',))]
def smooth(t):t=max(0,min(1,t));return t*t*(3-2*t)
def restore(name,frame):
    neutral(rig)
    for n,(loc,q,s) in original[name][frame].items():
        b=rig.pose.bones[n];b.location=loc;b.rotation_quaternion=q;b.scale=s
    bpy.context.view_layer.update()
def gesture(side,a,b,t,names=None):
    for n in library[a][side]:
        if names is not None and n not in names:continue
        rig.pose.bones[n].rotation_quaternion=Quaternion(library[a][side][n]).slerp(Quaternion(library[b][side][n]),t)

# World-space waypoints: two separate cores, staggered cupped hands around an empty center,
# then one forward release and a lower supporting hand. Hands never share a target point.
waypoints=[
 (0,None),
 (31,{'R':((-.20,-.23,1.43),(.15,-.25,.96),(.75,-.5,.15),'cup'),'L':((.20,-.23,1.45),(-.15,-.25,.96),(-.75,-.5,.15),'cup')}),
 (73,{'R':((-.18,-.25,1.44),(.18,-.28,.94),(.8,-.45,.15),'cup'),'L':((.18,-.23,1.47),(-.18,-.28,.94),(-.8,-.45,.15),'cup')}),
 (108,{'R':((-.105,-.30,1.415),(.12,-.25,.96),(.8,-.45,.12),'cup'),'L':((.105,-.235,1.485),(-.12,-.25,.96),(-.8,-.45,.12),'cup')}),
 (138,{'R':((-.105,-.30,1.415),(.12,-.25,.96),(.8,-.45,.12),'cup'),'L':((.105,-.235,1.485),(-.12,-.25,.96),(-.8,-.45,.12),'cup')}),
 (152,{'R':((-.12,-.37,1.46),(0,-.99,.1),(0,.1,1),'point'),'L':((.23,-.20,1.24),(-.1,-.15,-.98),(-.8,-.6,0),'relax')}),
 (185,{'R':((-.12,-.37,1.46),(0,-.99,.1),(0,.1,1),'point'),'L':((.23,-.20,1.24),(-.1,-.15,-.98),(-.8,-.6,0),'relax')}),
 (240,None)]
keyposes={}
for frame,config in waypoints:
    restore('CastPurple',frame)
    if config:
        for side,(w,d,n,kind) in config.items():
            sign=1 if side=='L' else -1
            arm_to(rig,side,w,(sign*.35,-.08,1.23),d,n)
            gesture(side,kind,kind,0)
    else:
        for side in ('L','R'):gesture(side,'relax','relax',0)
    keyposes[frame]={n:(rig.pose.bones[n].location.copy(),rig.pose.bones[n].rotation_quaternion.copy(),rig.pose.bones[n].scale.copy()) for n in purple_names}
for name in clips:
    action=bpy.data.actions[name];names=purple_names if name=='CastPurple' else thumbs
    for layer in action.layers:
        for strip in layer.strips:
            for bag in strip.channelbags:
                for fc in list(bag.fcurves):
                    if any(fc.data_path.startswith('pose.bones["'+n+'"]') for n in names):bag.fcurves.remove(fc)
    for f in range(int(durations[name][1])+1):
        restore(name,f)
        if name=='CastPurple':
            i=next((i for i in range(len(waypoints)-1) if waypoints[i][0]<=f<=waypoints[i+1][0]),len(waypoints)-2)
            a,b=waypoints[i][0],waypoints[i+1][0];t=smooth((f-a)/(b-a))
            for n in names:
                al,aq,asc=keyposes[a][n];bl,bq,bsc=keyposes[b][n];bone=rig.pose.bones[n]
                bone.location=al.lerp(bl,t);bone.rotation_quaternion=aq.slerp(bq,t);bone.scale=asc.lerp(bsc,t)
        else:
            # Keep original long fingers, shoulders, eye actions and body. Only thumb joints change.
            for side in ('L','R'):
                kind='relax';amount=0
                if name=='CastBlue' and side=='R':kind='open';amount=smooth(f/24)*(1-smooth((f-101)/49))
                if name=='CastRed' and side=='R':kind='point';amount=smooth(f/22)*(1-smooth((f-82)/38))
                if name in ('RevealEyes','CoverEyes') and side=='R':kind='cup';amount=smooth(f/18)*(1-smooth((f-49)/23))
                gesture(side,'relax',kind,amount,thumbs)
        rig.animation_data_create();rig.animation_data.action=action
        if action.slots:rig.animation_data.action_slot=action.slots[0]
        for n in names:
            b=rig.pose.bones[n]
            for prop in ('location','rotation_quaternion','scale'):b.keyframe_insert(data_path=prop,frame=f,group=n)
    # Integer-frame baked curves use linear interpolation; waypoint easing is baked, no Bezier overshoot.
    for layer in action.layers:
        for strip in layer.strips:
            for bag in strip.channelbags:
                for fc in bag.fcurves:
                    if any(fc.data_path.startswith('pose.bones["'+n+'"]') for n in names):
                        for k in fc.keyframe_points:k.interpolation='LINEAR'
    action.use_fake_user=True
    print('BAKED',name,flush=True)
purple=bpy.data.actions['CastPurple']
for marker in list(purple.pose_markers):purple.pose_markers.remove(marker)
for label,frame in [('Prepare',0),('SeparateCores',31),('Position',73),('Form',108),('Release',138),('Recover',197)]:purple.pose_markers.new(label).frame=frame
neutral(rig);bpy.ops.wm.save_as_mainfile(filepath=str(output))
write_json(ROOT/args.record,{'source':str(source),'source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'candidate':str(output),'sha256':hashlib.sha256(output.read_bytes()).hexdigest(),'hand_pose_diagnostics':diagnostics,'modified':['Thumb bone rolls, baked multiaxis CMC/MCP/IP poses','CastPurple arms and hands; 8-second duration unchanged'],'not_modified':['All mesh positions, topology and weights','Shoulder/garment geometry and skeleton','Head, hair, public socket local transforms, UI, VFX'],'status':'STUDY_NOT_ACCEPTED','waypoints':[{'frame':f,'pose':c} for f,c in waypoints]})
