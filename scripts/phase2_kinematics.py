"""Pose authoring helpers, not a mesh generator. All results are baked as LBS bone TRS.

Thumb targets are a pose study, not an assertion of anatomical/visual acceptance.
"""
import math
import bpy
from mathutils import Vector, Matrix, Quaternion

FINGERS=('Index','Middle','Ring','Pinky')

def aim_bone(rig,name,direction,normal=None):
    """Set a world/armature-space orientation without changing a bone's length."""
    b=rig.pose.bones[name]
    if normal is None:
        q=(b.tail-b.head).rotation_difference(Vector(direction))@b.matrix.to_quaternion()
    else:
        y=Vector(direction).normalized();z=Vector(normal);z=(z-y*z.dot(y)).normalized()
        x=y.cross(z).normalized();q=Matrix((x,y,z)).transposed().to_quaternion()
    m=q.to_matrix().to_4x4();m.translation=b.head;b.matrix=m
    bpy.context.view_layer.update()

def arm_to(rig,side,wrist,pole,direction,palm_normal):
    """Analytic two-bone solve, followed by an explicit palm orientation."""
    upper=rig.pose.bones['UpperArm.'+side];fore=rig.pose.bones['Forearm.'+side]
    a=upper.head.copy();target=Vector(wrist);axis=target-a
    l1=upper.bone.length;l2=fore.bone.length
    distance=max(abs(l1-l2)+.002,min(axis.length,l1+l2-.003));axis.normalize()
    along=(l1*l1+distance*distance-l2*l2)/(2*distance)
    p=Vector(pole)-a;p-=axis*p.dot(axis);p.normalize()
    elbow=a+axis*along+p*math.sqrt(max(0,l1*l1-along*along))
    aim_bone(rig,upper.name,elbow-a)
    aim_bone(rig,fore.name,a+axis*distance-fore.head)
    aim_bone(rig,'Hand.'+side,direction,palm_normal)

def hand_pose(rig,side,kind):
    # Local X was already calibrated to palmar flexion in the accepted hand-fit candidate.
    recipes={
        'open':[(.04,.06,.04),(.05,.07,.04),(.09,.10,.06),(.14,.13,.08)],
        'relax':[(.14,.17,.10),(.18,.20,.12),(.23,.25,.15),(.28,.30,.18)],
        'half-fist':[(.61,.72,.34),(.65,.75,.38),(.69,.78,.40),(.73,.80,.42)],
        'fist':[(.98,1.12,.54),(1.02,1.16,.57),(1.05,1.17,.58),(1.08,1.18,.60)],
        'point':[(.04,.07,.03),(.85,1.15,.55),(.92,1.18,.58),(.98,1.20,.60)],
        'seal':[(.10,.12,.06),(.12,.14,.07),(.90,1.15,.55),(.98,1.20,.60)],
        'cup':[(.33,.43,.24),(.40,.48,.28),(.47,.53,.30),(.53,.57,.32)],
        'thumb-index':[(.55,.80,.30),(.20,.25,.12),(.30,.35,.18),(.37,.42,.22)],
        'thumb-middle':[(.25,.30,.16),(.62,.85,.32),(.32,.38,.20),(.40,.46,.23)],
    }
    for finger,angles in zip(FINGERS,recipes[kind]):
        for j,angle in enumerate(angles,1):rig.pose.bones[f'{finger}{j}.{side}'].rotation_quaternion=Quaternion((1,0,0),angle)
    bpy.context.view_layer.update()
    # Anatomical hand basis derived from authored metacarpal landmarks.
    hand=rig.pose.bones['Hand.'+side]
    inv=hand.matrix.inverted()
    radial=(inv@rig.pose.bones['Index1.'+side].head-inv@rig.pose.bones['Pinky1.'+side].head).normalized()
    longitudinal=(inv@rig.pose.bones['Middle3.'+side].tail-inv@hand.head).normalized()
    # Rest nail side is -Y in armature space; convert the rest palmar normal into the hand frame.
    palm=hand.bone.matrix_local.to_3x3().inverted()@Vector((0,1,0));palm.normalize()
    if kind in ('thumb-index','thumb-middle'):
        f='Index' if kind=='thumb-index' else 'Middle'
        target=inv@rig.pose.bones[f+'3.'+side].tail+radial*.010+palm*.003
    elif kind in ('fist','half-fist','point','seal'):
        f='Middle' if kind=='point' else 'Index' if kind in ('fist','half-fist') else 'Ring'
        target=(inv@rig.pose.bones[f+'1.'+side].head).lerp(inv@rig.pose.bones[f+'2.'+side].head,.45)+palm*.023+radial*.004
    elif kind=='cup':
        target=inv@rig.pose.bones['Index2.'+side].head+radial*.012+palm*.012
    else:
        # Natural abduction does not need an endpoint constraint.
        for i,a in enumerate((.08,.15,.10)):
            rig.pose.bones[f'Thumb{i}.{side}'].rotation_quaternion=Quaternion((1,0,0),a*(.4 if kind=='open' else 1))
        bpy.context.view_layer.update();return {'kind':kind,'target_error_m':None}
    names=[f'Thumb{i}.{side}' for i in range(3)]
    bs=[rig.data.bones[n] for n in names]
    local=[hand.bone.matrix_local.inverted()@bs[0].matrix_local]+[bs[i-1].matrix_local.inverted()@bs[i].matrix_local for i in (1,2)]
    def rotations(x):
        return [Quaternion((0,0,1),x[2])@Quaternion((0,1,0),x[1])@Quaternion((1,0,0),x[0]),Quaternion((1,0,0),x[3]),Quaternion((1,0,0),x[4])]
    obstacles=[(inv@rig.pose.bones[f'{f}{j}.{side}'].head,inv@rig.pose.bones[f'{f}{j}.{side}'].tail) for f in FINGERS for j in (1,2,3)]
    def distance(p,a,b):
        ab=b-a;t=max(0,min(1,(p-a).dot(ab)/max(ab.length_squared,1e-9)))
        return (p-a-ab*t).length
    def objective(x):
        m=Matrix.Identity(4)
        samples=[]
        for i,(a,q) in enumerate(zip(local,rotations(x))):
            m=m@a@q.to_matrix().to_4x4()
            if i>0:samples.extend(m@Vector((0,bs[i].length*t,0)) for t in (.3,.65,1))
        tip=m@Vector((0,bs[2].length,0))
        # Bone capsule clearance is a pose-authoring heuristic, never a substitute for mesh intersections.
        collision=sum(max(0,.011-min(distance(p,a,b) for a,b in obstacles))**2 for p in samples)
        return (tip-target).length_squared+collision*3+.000004*x[1]**2+.000003*((x[3]-.4)**2+(x[4]-.3)**2)
    bounds=[(-.8,1.35),(-1.05,1.05),(-1.25,1.25),(.12,1.05),(.08,.85)]
    best=None
    for seed in ((.5,0,0,.4,.2),(.8,.35,.5,.5,.3),(.8,-.35,-.5,.5,.3)):
        x=list(seed);step=.32
        for _ in range(45):
            changed=False
            for i in range(5):
                current=objective(x)
                for sign in (-1,1):
                    y=x.copy();y[i]=max(bounds[i][0],min(bounds[i][1],y[i]+step*sign));v=objective(y)
                    if v<current:x=y;current=v;changed=True
            if not changed:step*=.55
            if step<.001:break
        if best is None or objective(x)<best[0]:best=(objective(x),x)
    qs=rotations(best[1])
    for n,q in zip(names,qs):rig.pose.bones[n].rotation_quaternion=q
    bpy.context.view_layer.update()
    actual=hand.matrix.inverted()@rig.pose.bones[names[-1]].tail
    return {'kind':kind,'target_error_m':(actual-target).length,'angles_rad':best[1],'note':'Endpoint fitting only; surface intersections and visual review remain necessary'}

def apply_library(rig,side,kind):
    import json
    library=json.loads(rig['phase2_hand_poses'])
    for n,q in library[kind][side].items():rig.pose.bones[n].rotation_quaternion=q
    bpy.context.view_layer.update()
