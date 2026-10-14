"""Build an original, editable anime character, rig and actions in Blender 5.2.

Run: blender --background --python scripts/build_character.py
All geometry is authored here. No downloaded character or generated 3D asset.
"""
import bpy
import math
import os
import random
from mathutils import Vector, Quaternion
from mathutils.kdtree import KDTree

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'models')
SOURCE = os.path.join(ROOT, 'blender')
PREVIEW = os.path.join(ROOT, 'output', 'blender')
for path in (OUT, SOURCE, PREVIEW):
    os.makedirs(path, exist_ok=True)
random.seed(17)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for d in bpy.data.materials:
    bpy.data.materials.remove(d)
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene.render.fps = 30

def material(name, color, roughness=.65, metallic=0, glow=0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Roughness'].default_value = roughness
    p.inputs['Metallic'].default_value = metallic
    if glow:
        p.inputs['Emission Color'].default_value = (*color, 1)
        p.inputs['Emission Strength'].default_value = glow
    return m

skin = material('Skin', (.83, .58, .47), .85)
skinLight = material('SkinHighlight', (.95, .73, .61), .85)
skinShade = material('SkinShadow', (.54, .29, .24))
cloth = material('Uniform', (.018, .024, .045), .88)
clothLit = material('UniformFold', (.034, .048, .082), .88)
seam = material('Seam', (.07, .083, .116))
hair = material('Hair', (.77, .83, .94), .62)
hairLit = material('HairHighlight', (.95, .97, 1), .6)
hairShade = material('HairShadow', (.50, .60, .75), .68)
blind = material('BlindfoldFabric', (.007, .009, .016), .95)
blindFold = material('BlindfoldFold', (.025, .030, .044), .88)
boot = material('BootLeather', (.012, .016, .025), .36)
sole = material('BootSole', (.008, .009, .015), .88)
ink = material('FaceInk', (.07, .035, .036))
white = material('EyeWhite', (.87, .95, 1), .32)
iris = material('SixEyes', (.025, .46, .95), .25, glow=.65)
irisLight = material('SixEyesLight', (.1, .8, 1), .25, glow=1.3)
pupil = material('EyePupil', (.003, .035, .12), .28)
glint = material('EyeGlint', (.65, .97, 1), .2, glow=2)
metal = material('Fastener', (.3, .34, .44), .35, .75)

arm_data = bpy.data.armatures.new('GojoSkeleton')
rig = bpy.data.objects.new('GojoRig', arm_data)
scene.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig
rig.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
def bone(name, head, tail, parent=None):
    b = arm_data.edit_bones.new(name)
    b.head, b.tail = head, tail
    if parent: b.parent = arm_data.edit_bones[parent]
    return b
bone('Root', (0,0,0), (0,0,.16))
bone('Hips', (0,0,.94), (0,0,1.09), 'Root')
bone('Spine', (0,0,1.09), (0,0,1.29), 'Hips')
bone('Chest', (0,0,1.29), (0,0,1.46), 'Spine')
bone('Neck', (0,0,1.46), (0,0,1.61), 'Chest')
bone('Head', (0,0,1.61), (0,0,1.82), 'Neck')
REST = {}
for suffix, s in [('L',1), ('R',-1)]:
    sh = Vector((s*.196,0,1.409))
    el = Vector((s*.302,-.012,1.217))
    wr = Vector((s*.336,-.035,1.035))
    palm = Vector((s*.343,-.047,.981))
    REST[suffix] = (sh,el,wr,palm)
    bone('UpperArm.'+suffix, sh, el, 'Chest')
    bone('Forearm.'+suffix, el, wr, 'UpperArm.'+suffix)
    bone('Hand.'+suffix, wr, palm, 'Forearm.'+suffix)
    for i, name in enumerate(['Index','Middle','Ring','Pinky']):
        x = palm.x + s*(-.023 + i*.0155)
        base = Vector((x,-.047,.984+(0 if i<3 else .005)))
        length = [.064,.073,.066,.051][i]
        mid = base + Vector((s*(i-1.5)*.002,-.001,-length*.40))
        distal = base + Vector((s*(i-1.5)*.003,-.004,-length*.73))
        end = base + Vector((s*(i-1.5)*.004,-.007,-length))
        bone(name+'1.'+suffix, base, mid, 'Hand.'+suffix)
        bone(name+'2.'+suffix, mid, distal, name+'1.'+suffix)
        bone(name+'3.'+suffix, distal, end, name+'2.'+suffix)
    base = Vector((s*.319,-.045,1.014))
    mid = Vector((s*.299,-.060,.991))
    end = Vector((s*.293,-.073,.965))
    bone('Thumb1.'+suffix,base,mid,'Hand.'+suffix)
    bone('Thumb2.'+suffix,mid,end,'Thumb1.'+suffix)
    bone('Thigh.'+suffix, (s*.087,0,.986), (s*.106,-.01,.56), 'Hips')
    bone('Calf.'+suffix, (s*.106,-.01,.56), (s*.12,.012,.17), 'Thigh.'+suffix)
    bone('Foot.'+suffix, (s*.12,.012,.17), (s*.12,-.135,.065), 'Calf.'+suffix)
bpy.ops.object.mode_set(mode='OBJECT')
rig.select_set(False)
rig.show_in_front = True

def bind(obj, weights):
    if isinstance(weights, str):
        obj.vertex_groups.new(name=weights).add(list(range(len(obj.data.vertices))),1,'REPLACE')
    else:
        for i, entries in enumerate(weights):
            for key,value in entries.items():
                group = obj.vertex_groups.get(key) or obj.vertex_groups.new(name=key)
                if value > 0: group.add([i],value,'REPLACE')
    mod = obj.modifiers.new('Deform • GojoSkeleton', 'ARMATURE')
    mod.object = rig
    obj.parent = rig
    return obj

def mesh(name, verts, faces, mat, weights=None, smooth=True):
    data = bpy.data.meshes.new(name)
    data.from_pydata(verts,[],faces)
    data.update()
    obj = bpy.data.objects.new(name,data)
    scene.collection.objects.link(obj)
    data.materials.append(mat)
    for poly in data.polygons: poly.use_smooth = smooth
    if weights: bind(obj, weights)
    return obj

def loft(name, rings, mat, weight='Root', seg=32):
    # Rings: z, x center, y center, x radius, y radius.
    if name.startswith(('Uniform •','Trousers.','Trouser pelvis','Boot upper')):
        source=rings;rings=[]
        for j in range(len(source)-1):
            a,b=source[j],source[j+1];p=source[max(0,j-1)];q=source[min(len(source)-1,j+2)]
            for k in range(4):
                t=k/4
                rings.append((a[0]+(b[0]-a[0])*t,*[.5*(2*a[c]+(-p[c]+b[c])*t+(2*p[c]-5*a[c]+4*b[c]-q[c])*t*t+(-p[c]+3*a[c]-3*b[c]+q[c])*t*t*t) for c in range(1,5)]))
        rings.append(source[-1])
    v,f,w=[],[],[]
    for j,(z,x,y,rx,ry) in enumerate(rings):
        for i in range(seg):
            a=2*math.pi*i/seg
            v.append((x+rx*math.cos(a),y+ry*math.sin(a),z))
            w.append(weight(z,j) if callable(weight) else {weight:1})
            if j:
                k=j*seg+i; n=j*seg+(i+1)%seg
                f.append((k-seg,n-seg,n,k))
    f.append(tuple(reversed(range(seg))))
    f.append(tuple((len(rings)-1)*seg+i for i in range(seg)))
    return mesh(name,v,f,mat,w)

def tube(name, points, radii, mat, weight, seg=12):
    v,f,w=[],[],[]
    for j,p in enumerate(points):
        p=Vector(p)
        tangent=Vector(points[min(j+1,len(points)-1)])-Vector(points[max(j-1,0)])
        tangent.normalize()
        u=tangent.cross(Vector((0,1,0))).normalized()
        if u.length<.5: u=tangent.cross(Vector((1,0,0))).normalized()
        vv=tangent.cross(u).normalized()
        rx,ry=radii[j] if isinstance(radii[j],tuple) else (radii[j],radii[j])
        for i in range(seg):
            a=2*math.pi*i/seg
            v.append(p+u*(math.cos(a)*rx)+vv*(math.sin(a)*ry))
            w.append(weight(j) if callable(weight) else {weight:1})
            if j:
                k=j*seg+i; n=j*seg+(i+1)%seg
                f.append((k-seg,n-seg,n,k))
    f.append(tuple(reversed(range(seg))))
    f.append(tuple((len(points)-1)*seg+i for i in range(seg)))
    return mesh(name,v,f,mat,w)

def line(name, points, radius, mat, weight):
    return tube(name,points,[radius]*len(points),mat,weight,8)

def ellipsoid(name, center, scale, mat, weight, seg=24, rings=12):
    rr=[]
    for j in range(rings+1):
        a=math.pi*j/rings
        rr.append((center[2]-scale[2]*math.cos(a),center[0],center[1],max(.0001,scale[0]*math.sin(a)),max(.0001,scale[1]*math.sin(a))))
    return loft(name,rr,mat,weight,seg)

def blend_z(z, lower, upper, a, b):
    t=max(0,min(1,(z-lower)/(upper-lower)))
    return {a:1-t,b:t}

def torso_weight(z,j=0):
    if z<1.15: return blend_z(z,1.05,1.15,'Hips','Spine')
    return blend_z(z,1.23,1.39,'Spine','Chest')

body_parts=[]
body_parts.append(loft('Uniform • tailored body',[
    (1.00,0,.004,.140,.101),(1.01,0,.004,.153,.111),(1.04,0,.006,.152,.114),
    (1.10,0,.009,.145,.111),(1.17,0,.011,.139,.108),(1.23,0,.012,.143,.117),
    (1.32,0,.010,.166,.135),(1.40,0,.006,.192,.135),(1.437,0,.006,.213,.115),
    (1.454,0,.008,.182,.093),(1.471,0,.008,.103,.069),(1.48,0,.008,.074,.060)],cloth,torso_weight,48))
loft('Neck',[(1.45,0,.006,.059,.054),(1.54,0,.006,.052,.05),(1.625,0,.006,.048,.048)],skin,'Neck')
body_parts.append(loft('High collar',[(1.457,0,.003,.082,.081),(1.48,0,.003,.082,.079),(1.547,0,.005,.075,.075),(1.574,0,.009,.072,.068)],cloth,'Chest'))
body_parts.append(line('Collar edge',[(-.069,-.016,1.57),(-.054,-.048,1.565),(0,-.062,1.558),(.054,-.048,1.565),(.069,-.016,1.57)],.0014,seam,'Chest'))
body_parts.append(line('Jacket closure',[(.030,-.075,1.51),(.027,-.114,1.44),(.024,-.133,1.38),(.020,-.126,1.31),(.014,-.111,1.20),(.010,-.105,1.10),(.006,-.108,1.024)],.00085,seam,'Spine'))
body_parts.append(line('Hem piping',[(-.11,-.073,1.023),(-.07,-.096,1.019),(0,-.105,1.017),(.07,-.096,1.019),(.11,-.073,1.023)],.0013,clothLit,'Hips'))
for z in [1.444,1.372]:
    body_parts.append(ellipsoid('Collar fastener',(.032,-.108,z),(.0038,.002,.0038),metal,'Chest',12,6))
for s in [-1,1]:
    for z,xx in [(1.19,.10),(1.09,.11),(1.345,.126)]:
    # Folds are sculpted into the cloth surface below, rather than raised tubes.
        pass

for suffix,s in [('L',1),('R',-1)]:
    sh,el,wr,palm=REST[suffix]
    pts=[sh+Vector((-s*.040,0,.005)),sh,sh.lerp(el,.40),sh.lerp(el,.84),el,el.lerp(wr,.22),el.lerp(wr,.70),wr+Vector((0,0,.017)),wr]
    def armw(j,suffix=suffix):
        t=max(0,min(1,(j-3)/2))
        return {'UpperArm.'+suffix:1-t,'Forearm.'+suffix:t}
    body_parts.append(tube('Sleeve.'+suffix,pts,[(.062,.086),(.073,.082),(.065,.071),(.055,.061),(.057,.060),(.055,.058),(.044,.047),(.038,.040),(.034,.037)],cloth,armw,32))
    body_parts.append(tube('Cuff.'+suffix,[wr+Vector((0,0,.009)),wr+Vector((0,0,.001))],[.041,.042],clothLit,'Forearm.'+suffix,24))
    for dz in [-.028,.014]:
        body_parts.append(line('Elbow crease.'+suffix,[(el.x-s*.039,-.039,el.z+dz),(el.x,-.074,el.z+dz-.012),(el.x+s*.025,-.055,el.z+dz+.003)],.0018,clothLit,'Forearm.'+suffix))
    # Palm with a flattened cross section and independently weighted fingers.
    handparts=[]
    handparts.append(loft('Palm.'+suffix,[(.973,palm.x,-.047,.026,.011),(.981,palm.x,-.047,.032,.014),(.997,palm.x-s*.002,-.047,.034,.019),(1.014,wr.x-s*.001,-.041,.031,.021),(1.028,wr.x,-.037,.025,.021),(1.044,wr.x,-.035,.023,.022)],skinLight,'Hand.'+suffix,28))
    for finger in ['Index','Middle','Ring','Pinky','Thumb']:
        b1=arm_data.bones[finger+'1.'+suffix]; b2=arm_data.bones[finger+'2.'+suffix]
        a=Vector(b1.head_local); b=Vector(b1.tail_local); c=Vector(b2.tail_local)
        end=Vector(arm_data.bones[finger+'3.'+suffix].tail_local) if finger!='Thumb' else c
        radius=.010 if finger=='Thumb' else (.0068 if finger=='Pinky' else .0082)
        coords=[a,b.lerp(a,.5),b,b.lerp(c,.45),c,c.lerp(end,.68),end] if finger!='Thumb' else [a,a.lerp(b,.5),b,b.lerp(c,.4),b.lerp(c,.8),c.lerp(b,.06),c]
        def fw(j, finger=finger, suffix=suffix):
            n=1 if j<2 else (2 if j<4 or finger=='Thumb' else 3)
            if j in [2,4] and not(finger=='Thumb' and j==4):return {finger+str(n-1)+'.'+suffix:.35,finger+str(n)+'.'+suffix:.65}
            return {finger+str(n)+'.'+suffix:1}
        handparts.append(tube(finger+'.'+suffix,coords,[radius*1.04,radius*.97,radius,radius*.87,radius*.83,radius*.65,.0025],skinLight,fw,16))
        nailCenter=c.lerp(end,.48)+Vector((0,-radius*.80,0)) if finger!='Thumb' else b.lerp(c,.76)+Vector((0,-radius*.80,0))
        handparts.append(ellipsoid('Nail.'+suffix,nailCenter,(radius*.53,.0006,radius*.72),skin,(finger+('2' if finger=='Thumb' else '3')+'.'+suffix),12,6))
    # Pants: enough room at thigh, narrowing below the knee.
    def legw(z,j,suffix=suffix):
        return blend_z(z,.50,.62,'Calf.'+suffix,'Thigh.'+suffix)
    body_parts.append(loft('Trousers.'+suffix,[(.185,s*.12,.012,.051,.055),(.205,s*.12,.012,.057,.057),(.25,s*.12,.012,.055,.052),(.34,s*.117,.010,.053,.054),(.46,s*.11,0,.059,.061),(.53,s*.106,-.013,.065,.067),(.57,s*.106,-.014,.071,.071),(.67,s*.10,-.005,.074,.078),(.82,s*.09,0,.083,.09),(.95,s*.084,0,.087,.093),(1.015,s*.078,0,.077,.080)],cloth,legw,28))
    for z in [.22,.535,.582,.88]:
        x=s*(.12 if z<.3 else .105)
        body_parts.append(line('Trouser fold',[(x-.038,-.039,z+.015),(x,-.064,z),(x+.037,-.042,z+.006)],.002,clothLit,'Calf.'+suffix if z<.53 else 'Thigh.'+suffix))
    body_parts.append(line('Outer trouser seam',[(s*.176,.002,.22),(s*.17,.002,.42),(s*.173,.002,.58),(s*.18,.006,.78),(s*.164,.006,.99)],.0011,seam,'Thigh.'+suffix))
    for name,ma,rings in [
        ('Boot sole',sole,[(.000,s*.12,-.052,.063,.123),(.022,s*.12,-.052,.068,.127),(.036,s*.12,-.052,.068,.126),(.043,s*.12,-.052,.063,.12)]),
        ('Boot upper',boot,[(.036,s*.12,-.049,.064,.121),(.061,s*.12,-.054,.065,.12),(.080,s*.12,-.044,.062,.11),(.104,s*.12,-.010,.055,.078),(.144,s*.12,.012,.049,.054),(.208,s*.12,.012,.047,.051)]),
    ]:
        body_parts.append(loft(name+'.'+suffix,rings,ma,'Foot.'+suffix,28))
    body_parts.append(line('Boot vamp seam',[(s*.12-.052,-.085,.106),(s*.12-.04,-.118,.10),(s*.12,-.13,.101),(s*.12+.04,-.118,.10),(s*.12+.052,-.085,.106)],.0013,seam,'Foot.'+suffix))

# Continuous facial surface: jaw, cheek plane, eye sockets, brow and integrated nose.
headparts=[]
HEAD_PROFILE=[(1.587,-.006,.008,.014),(1.598,-.005,.032,.039),(1.615,.001,.057,.060),(1.638,.008,.079,.073),(1.667,.013,.096,.085),(1.705,.017,.105,.096),(1.746,.022,.108,.096),(1.786,.026,.099,.088),(1.815,.031,.078,.071),(1.838,.035,.043,.043),(1.849,.035,.002,.002)]
def head_profile(z):
    for i in range(len(HEAD_PROFILE)-1):
        a,b=HEAD_PROFILE[i],HEAD_PROFILE[i+1]
        if z<=b[0]:
            t=max(0,min(1,(z-a[0])/(b[0]-a[0])))
            p=HEAD_PROFILE[max(0,i-1)];q=HEAD_PROFILE[min(len(HEAD_PROFILE)-1,i+2)]
            return [(.5*((2*a[k])+(-p[k]+b[k])*t+(2*p[k]-5*a[k]+4*b[k]-q[k])*t*t+(-p[k]+3*a[k]-3*b[k]+q[k])*t*t*t)) for k in [1,2,3]]
    return list(HEAD_PROFILE[-1][1:])
def facial_depth(x,z):
    nose=.019*math.exp(-(x/.011)**2-((z-1.692)/.027)**2)+.023*math.exp(-(x/.013)**2-((z-1.666)/.010)**2)
    cheek=.004*math.exp(-((abs(x)-.062)/.026)**2-((z-1.672)/.023)**2)
    brow=.004*math.exp(-((abs(x)-.047)/.035)**2-((z-1.732)/.010)**2)
    socket=.004*math.exp(-((abs(x)-.049)/.025)**2-((z-1.712)/.010)**2)
    lip=.0035*math.exp(-(x/.027)**2-((z-1.637)/.007)**2)
    return nose+cheek+brow+lip-socket
face_rings=[]
for i in range(65):
    z=1.587+(1.849-1.587)*i/64;cy,rx,ry=head_profile(z)
    face_rings.append((z,0,cy,max(.001,rx),max(.001,ry)))
headmesh=loft('Head • sculpted facial planes',face_rings,skinLight,'Head',80)
for vert in headmesh.data.vertices:
    x,y,z=vert.co;cy,rx,ry=head_profile(z)
    front=max(0,min(1,(cy-y)/max(.001,ry)))**3
    vert.co.y-=facial_depth(x,z)*front
headparts.append(headmesh)
for s in [-1,1]:
    headparts.append(ellipsoid('Ear', (s*.102,.008,1.691),(.018,.019,.032),skinLight,'Head'))
    headparts.append(ellipsoid('Ear inner', (s*.109,-.008,1.691),(.007,.003,.020),skinShade,'Head',16,8))
    headparts.append(line('Ear helix',[(s*.108,-.013,1.708),(s*.115,-.014,1.699),(s*.113,-.014,1.680)],.0025,skin,'Head'))
def eyeSurface(x,z,offset=0):
    cy,rx,ry=head_profile(z)
    front=math.sqrt(max(.03,1-(x/rx)**2))
    return (x,cy-ry*front-facial_depth(x,z)*front**3-offset-.0012,z)
headparts.append(line('Mouth • slight smile',[eyeSurface(x,z,.001) for x,z in [(-.024,1.637),(-.014,1.635),(0,1.634),(.013,1.636),(.024,1.640)]],.00085,ink,'Head'))
headparts.append(line('Lower lip light',[eyeSurface(-.010,1.628,.0007),eyeSurface(0,1.627,.0008),eyeSurface(.011,1.629,.0007)],.001,skin,'Head'))
for s in [-1,1]:
    headparts.append(line('Nostril', [eyeSurface(s*.006,1.659,.0006),eyeSurface(s*.009,1.659,.0006),eyeSurface(s*.011,1.662,.0004)],.0006,skinShade,'Head'))
eyeParts=[]
for s in [-1,1]:
    cx=s*.049; cz=1.711
    perimeter=[]
    for i in range(24):
        a=math.pi*2*i/24
        x=cx+.029*math.cos(a)
        z=cz+.0085*math.sin(a)+s*(x-cx)*.15
        perimeter.append(eyeSurface(x,z,.001))
    eyeParts.append(mesh('Eye white', [eyeSurface(cx,cz,.002)]+perimeter,[(0,i+1,(i+1)%24+1) for i in range(24)],white,'Head'))
    for name,r,ma,off in [('Iris',.0086,iris,.0026),('Iris inner',.0058,irisLight,.0033),('Pupil',.0030,pupil,.0042)]:
        pts=[eyeSurface(cx,cz,off)]+[eyeSurface(cx+r*math.cos(i*2*math.pi/24),cz+r*math.sin(i*2*math.pi/24),off) for i in range(24)]
        eyeParts.append(mesh(name,pts,[(0,i+1,(i+1)%24+1) for i in range(24)],ma,'Head'))
    for a in range(12):
        t=a*math.pi/6
        eyeParts.append(line('Iris filament',[eyeSurface(cx+.0062*math.cos(t),cz+.0062*math.sin(t),.004),eyeSurface(cx+.008*math.cos(t+.03),cz+.008*math.sin(t+.03),.004)],.00038,glint,'Head'))
    eyeParts.append(ellipsoid('Eye catchlight',eyeSurface(cx-.0025,cz+.0032,.005),(.0018,.0009,.0018),glint,'Head',12,6))
    upper=[eyeSurface(cx+.029*math.cos(a*math.pi/12),cz+.0085*math.sin(a*math.pi/12)+s*.029*math.cos(a*math.pi/12)*.15,.003) for a in range(13)]
    lower=[eyeSurface(cx+.028*math.cos(a*math.pi/12),cz-.008*math.sin(a*math.pi/12)+s*.028*math.cos(a*math.pi/12)*.15,.002) for a in range(13)]
    eyeParts.append(line('Upper eyelid',upper,.00135,ink,'Head'))
    eyeParts.append(line('Lower eyelid',lower,.00075,skinShade,'Head'))
    brow=[]
    for k in range(13):
        t=k/12;x=s*(.019+t*.058);z=1.730+t*.009
        width=.0003+.0017*math.sin(t*math.pi)**.55
        brow.extend([eyeSurface(x,z-width,.003),eyeSurface(x,z+width,.003)])
    eyeParts.append(mesh('Tapered white eyebrow',brow,[(k*2,k*2+1,k*2+3,k*2+2) for k in range(12)],hair,'Head'))

# Eye cover is its own exported parent so a single visibility toggle works.
blindroot=bpy.data.objects.new('Blindfold',None)
scene.collection.objects.link(blindroot)
blindroot.parent=rig
blindparts=[]
for lo,hi,rx,ry,ma in [(1.691,1.747,.112,.112,blind),(1.697,1.698,.1128,.113,blindFold),(1.740,1.741,.1128,.113,blindFold)]:
    v,f=[],[]
    for j in range(8):
        for i in range(80):
            a=2*math.pi*i/80
            z=lo+(hi-lo)*j/7+.003*math.cos(a*2)+.0012*math.sin(a*5+j*.18)
            fold=1+.009*math.sin(a*7+j*.8)*math.sin(j/7*math.pi)
            v.append((rx*math.cos(a)*fold,.020+ry*math.sin(a)*fold,z))
            if j:
                k=j*80+i;n=j*80+(i+1)%80
                f.append((k-80,n-80,n,k))
    ob=mesh('Blindfold • woven wrap',v,f,ma,'Head'); ob.parent=blindroot;blindparts.append(ob)
for s in [-1,1]:
    ob=tube('Blindfold tie',[(s*.012,.116,1.727),(s*.024,.147,1.725),(s*.035,.166,1.680),(s*.044,.167,1.641)],[(.017,.006),(.012,.006),(.014,.003),(.002,.001)],blind,'Head',8)
    ob.parent=blindroot;blindparts.append(ob)

# Art-directed curved locks: broad primary sweeps, finer fringe and occipital layers.
hairparts=[]
hairparts.append(loft('Hair cap',[(1.731,0,.037,.099,.076),(1.769,0,.034,.114,.095),(1.81,0,.031,.109,.096),(1.845,0,.035,.069,.068),(1.86,0,.037,.003,.004)],hairShade,'Head',48))
def hair_lock(name,root,bend,tip,width,depth,ma=hair):
    root,bend,tip=map(Vector,[root,bend,tip]);v,f=[],[]
    length_steps,segments=14,12
    for j in range(length_steps+1):
        t=j/length_steps
        center=(1-t)**2*root+2*(1-t)*t*bend+t*t*tip
        tangent=(2*(1-t)*(bend-root)+2*t*(tip-bend)).normalized()
        u=tangent.cross(Vector((0,-1,0))).normalized()
        if u.length<.1:u=tangent.cross(Vector((1,0,0))).normalized()
        normal=tangent.cross(u).normalized()
        taper=(.88+.28*math.sin(math.pi*t))*(1-t)**.86
        for k in range(segments):
            a=k/segments*2*math.pi
            ridge=1+.15*math.cos(a*3)
            co=center+u*(math.cos(a)*max(.0003,width*taper))+normal*(math.sin(a)*depth*taper*ridge)
            v.append(co)
            if j:
                ix=j*segments+k;n=j*segments+(k+1)%segments
                f.append((ix-segments,n-segments,n,ix))
    f.append(tuple(reversed(range(segments))));f.append(tuple(length_steps*segments+k for k in range(segments)))
    obj=mesh(name,v,f,ma,'Head');obj.data.materials.append(hairShade);obj.data.materials.append(hairLit)
    for face in obj.data.polygons:
        k=face.index%segments
        if k in [2,3]:face.material_index=2
        elif k in [8,9,10]:face.material_index=1
    hairparts.append(obj)
# The crown sweeps predominantly up and back, with varying heights and overlap.
PRIMARY_LOCKS=[
    ((-.078,-.005,1.803),(-.130,-.015,1.864),(-.152,.012,1.902),.024),
    ((-.058,-.032,1.807),(-.094,-.049,1.908),(-.110,-.009,1.953),.024),
    ((-.020,-.046,1.816),(-.038,-.044,1.916),(-.025,.009,1.977),.026),
    ((.015,-.039,1.816),(.031,-.019,1.912),(.071,.020,1.948),.025),
    ((.058,-.023,1.808),(.089,-.002,1.880),(.130,.026,1.922),.024),
    ((-.063,.030,1.813),(-.101,.062,1.906),(-.084,.116,1.947),.027),
    ((-.026,.021,1.835),(-.067,.037,1.930),(-.078,.080,1.986),.027),
    ((.016,.012,1.833),(.006,.045,1.929),(.031,.076,1.995),.026),
    ((.052,.024,1.823),(.082,.042,1.916),(.106,.087,1.966),.025),
    ((-.043,.069,1.820),(-.070,.111,1.882),(-.049,.164,1.922),.025),
    ((.006,.077,1.825),(.020,.121,1.901),(.050,.168,1.932),.026),
    ((.071,.055,1.810),(.126,.075,1.859),(.151,.106,1.895),.024),
    ((-.087,.055,1.800),(-.137,.070,1.858),(-.152,.105,1.876),.023),
]
for i,(root,bend,tip,w) in enumerate(PRIMARY_LOCKS):
    bend=(bend[0],bend[1],1.82+(bend[2]-1.82)*.72)
    tip=(tip[0],tip[1],1.82+(tip[2]-1.82)*.72)
    hair_lock('Hair • primary sweep',root,bend,tip,w,.012+(i%3)*.001,hairLit if i%3 else hair)
    if i%2==0:
        rr=Vector(root)+Vector((.009,-.007,.009));bb=Vector(bend)+Vector((.009,-.008,-.010));tt=Vector(tip)+Vector((.016,-.013,-.029))
        hair_lock('Hair • secondary split',rr,bb,tt,w*.42,.006,hair)
# Broken fringe with oblique tips, never a row of identical rounded blocks.
for i,(x,tipx,tipz) in enumerate([(-.082,-.115,1.742),(-.048,-.068,1.755),(-.017,-.043,1.731),(.026,.008,1.744),(.064,.083,1.748)]):
    hair_lock('Hair • diagonal fringe',(x*.80,-.036,1.815+.009*(i%2)),(x+.011,-.103,1.796),(tipx,-.108+abs(x)*.15,tipz),.023+(i%2)*.004,.009,hairLit)
for s in [-1,1]:
    for j in range(5):
        hair_lock('Hair • temporal sweep',(s*.077,.002+j*.018,1.791-j*.002),(s*.124,.027+j*.019,1.820-j*.012),(s*(.142-j*.007),.068+j*.018,1.833-j*.026),.019-j*.0014,.011,hair)
    hair_lock('Hair • temple wisp',(s*.094,-.012,1.761),(s*.112,-.02,1.741),(s*.107,-.018,1.709),.008,.006,hairShade)
for j in range(10):
    a=.10+j/9*math.pi
    x=math.cos(a)*.08;y=.045+math.sin(a)*.044
    hair_lock('Hair • occipital layer',(x,y,1.82),(x*1.25,y+.05,1.83),(x*1.39,y+.07,1.772+.04*math.sin(j*1.5)),.023,.012,hair)

# Merge visual parts by semantic component, preserving editable materials and weights.
def join_parts(parts,name,parent=rig):
    bpy.ops.object.select_all(action='DESELECT')
    parts=[p for p in parts if p and p.type=='MESH']
    for p in parts:p.select_set(True)
    bpy.context.view_layer.objects.active=parts[0]
    bpy.ops.object.join()
    obj=bpy.context.object;obj.name=name;obj.parent=parent
    return obj

def unify_surface(parts,name,voxel,fold_region=None):
    """Create a connected garment/hand volume, then reconstruct skin weights.

    Unlike subdivision of separate primitives, the remesh resolves shoulder,
    crotch and thumb intersections into one continuous deforming surface.
    """
    obj=join_parts(parts,name)
    coords=[v.co.copy() for v in obj.data.vertices]
    group_names={g.index:g.name for g in obj.vertex_groups}
    weights=[{group_names[g.group]:g.weight for g in v.groups} for v in obj.data.vertices]
    kd=KDTree(len(coords))
    for i,co in enumerate(coords):kd.insert(co,i)
    kd.balance()
    for modifier in list(obj.modifiers):obj.modifiers.remove(modifier)
    remesh=obj.modifiers.new('Continuous anatomical surface','REMESH')
    remesh.mode='VOXEL';remesh.voxel_size=voxel;remesh.use_smooth_shade=True
    bpy.context.view_layer.objects.active=obj
    bpy.ops.object.modifier_apply(modifier=remesh.name)
    smooth=obj.modifiers.new('Relax surface transitions','SMOOTH');smooth.factor=.8;smooth.iterations=5
    bpy.ops.object.modifier_apply(modifier=smooth.name)
    if fold_region:
        for v in obj.data.vertices:
            x,y,z=v.co
            if fold_region=='jacket':
                if z>1.425 and .10<abs(x)<.27:
                    v.co.z=min(z,1.489-.22*abs(x))
                if abs(x)<.18 and 1.035<z<1.35:
                    fold=0
                    for side in [-1,1]:
                        fold+=.0035*math.exp(-((x-side*.10)/.055)**2-((z-(1.10+side*x*.40))/.012)**2)
                        fold-=.0015*math.exp(-((x-side*.08)/.055)**2-((z-(1.12+side*x*.40))/.011)**2)
                    v.co.y+=fold*(1 if y>0 else -1)
                elif abs(x)>.24 and 1.15<z<1.28:
                    v.co.y+=.0035*math.sin(z*105+x*13)*math.exp(-((z-1.215)/.035)**2)
            else:
                if .47<z<.64 and y<0:v.co.y+=.0035*math.exp(-((z-(.53+abs(x)*.14))/.012)**2)-.0018*math.exp(-((z-(.548+abs(x)*.14))/.009)**2)
                if .20<z<.31 and y<0:v.co.y+=.0028*math.exp(-((z-(.232+abs(x)*.1))/.008)**2)
    if fold_region=='jacket':
        relax=obj.modifiers.new('Soften tailored shoulder edge','SMOOTH');relax.factor=.72;relax.iterations=4
        bpy.ops.object.modifier_apply(modifier=relax.name)
    # Preserve enough smooth surface for silhouette without bloating web geometry.
    decimate=obj.modifiers.new('Web topology budget','DECIMATE');decimate.ratio=.25 if fold_region else .42
    bpy.ops.object.modifier_apply(modifier=decimate.name)
    obj.vertex_groups.clear()
    newweights=[]
    for vert in obj.data.vertices:
        if fold_region=='jacket':
            x,y,z=vert.co;suffix='L' if x>=0 else 'R'
            arm=max(0,min(1,(abs(x)-.135)/.105));arm=arm*arm*(3-2*arm)
            elbow=REST[suffix][1];fore=max(0,min(1,(elbow.z-z+.052)/.104));fore=fore*fore*(3-2*fore)
            entries={key:value*(1-arm) for key,value in torso_weight(z).items()}
            entries['UpperArm.'+suffix]=arm*(1-fore);entries['Forearm.'+suffix]=arm*fore
            newweights.append(entries)
            continue
        if fold_region=='pants':
            x,y,z=vert.co
            suffix='L' if x>=0 else 'R'
            hip=max(0,min(1,(z-.83)/.17));hip=hip*hip*(3-2*hip)
            knee=max(0,min(1,(z-.48)/.16));knee=knee*knee*(3-2*knee)
            newweights.append({'Hips':hip,'Thigh.'+suffix:(1-hip)*knee,'Calf.'+suffix:(1-hip)*(1-knee)})
            continue
        accum={};normalizer=0
        for co,i,d in kd.find_n(vert.co,4):
            k=1/max(d,.0003)**2;normalizer+=k
            for key,value in weights[i].items():accum[key]=accum.get(key,0)+value*k
        weighted=sorted(((key,value/normalizer) for key,value in accum.items()),key=lambda p:p[1],reverse=True)[:4]
        total=sum(v for _,v in weighted)
        newweights.append({key:value/total for key,value in weighted})
    bind(obj,newweights)
    for poly in obj.data.polygons:poly.use_smooth=True
    return obj

# Replace separate torso / sleeve shells with a unified shoulder and armhole.
jacketparts=[o for o in body_parts if o.name.startswith(('Uniform • tailored body','Sleeve.'))]
body_parts=[o for o in body_parts if o not in jacketparts]
body_parts.append(unify_surface(jacketparts,'TailoredJacket',.0038,'jacket'))
# A continuous pelvis joins the two tapered trouser legs above the crotch.
pelvis=loft('Trouser pelvis',[(.878,0,.008,.057,.045),(.929,0,.008,.145,.097),(.982,0,.008,.164,.114),(1.024,0,.008,.151,.107)],cloth,'Hips',40)
pants=[o for o in body_parts if o.name.startswith('Trousers.')]+[pelvis]
body_parts=[o for o in body_parts if o not in pants]
body_parts.append(unify_surface(pants,'TailoredTrousers',.0045,'pants'))
obsolete=[o for o in body_parts if o.name.startswith(('Elbow crease','Trouser fold','Outer trouser seam'))]
body_parts=[o for o in body_parts if o not in obsolete]
for obj in obsolete:bpy.data.objects.remove(obj,do_unlink=True)
for obj in body_parts:
    if obj.name.startswith('Jacket closure'):
        for modifier in list(obj.modifiers):obj.modifiers.remove(modifier)
        obj.vertex_groups.clear();bind(obj,[torso_weight(v.co.z) for v in obj.data.vertices])
join_parts(hairparts,'Hair')
join_parts(headparts,'HeadMesh')
eye_model=join_parts(eyeParts,'SixEyesMesh')
eye_model.shape_key_add(name='Basis')
blink_shape=eye_model.shape_key_add(name='Blink')
blink_shape.value=0
for vert in blink_shape.data:
    x,y,z=vert.co
    if 1.695<z<1.725:
        side=1 if x>0 else -1
        lidline=1.711+side*(x-side*.049)*.15
        vert.co.z=lidline+(z-lidline)*.035
        vert.co.y+=.001
join_parts(blindparts,'BlindfoldMesh',blindroot)
# Group all clothes into one skin and hands into one skin each.
join_parts(body_parts,'UniformAndBoots')
for suffix in ['L','R']:
    parts=[o for o in scene.objects if o.type=='MESH' and any(g.name.endswith('.'+suffix) and (g.name.startswith(('Hand','Thumb','Index','Middle','Ring','Pinky'))) for g in o.vertex_groups)]
    nails=[o for o in parts if o.name.startswith('Nail.')]
    anatomy=[o for o in parts if o not in nails]
    hand=unify_surface(anatomy,'HandMesh.'+suffix,.0015)
    join_parts([hand]+nails,'HandMesh.'+suffix)

def socket(name,parentBone,location):
    o=bpy.data.objects.new(name,None)
    scene.collection.objects.link(o)
    o.parent=rig;o.parent_type='BONE';o.parent_bone=parentBone
    o.location=location
    o.empty_display_size=.035
    return o
# Bone-parent space uses the tail as origin; fingers emit ahead of the palm.
socket('FX_Hand_L','Hand.L',(0,.005,-.042))
socket('FX_Hand_R','Hand.R',(0,.005,-.042))
socket('FX_Center','Chest',(0,.02,.35))

def neutral():
    for p in rig.pose.bones:
        p.rotation_mode='QUATERNION';p.rotation_quaternion=Quaternion();p.location=(0,0,0);p.scale=(1,1,1)

def rotate_world(name,axis,angle):
    p=rig.pose.bones[name];rest=p.bone.matrix_local.to_quaternion()
    p.rotation_quaternion=rest.inverted() @ Quaternion(axis,angle) @ rest

def planted_legs():
    """Analytic two-bone IK bakes both feet in place while the pelvis shifts."""
    bpy.context.view_layer.update()
    parent=rig.pose.bones['Hips'].matrix @ arm_data.bones['Hips'].matrix_local.inverted()
    parentQ=parent.to_quaternion()
    for suffix in ['L','R']:
        upper=arm_data.bones['Thigh.'+suffix];lower=arm_data.bones['Calf.'+suffix]
        root=parent @ upper.head_local
        ankle=lower.tail_local.copy();direction=ankle-root;distance=direction.length;direction.normalize()
        l1=upper.length;l2=lower.length
        cosA=max(-1,min(1,(l1*l1+distance*distance-l2*l2)/(2*l1*distance)))
        bend=Vector((0,-1,0));bend=(bend-direction*bend.dot(direction)).normalized()
        knee=root+direction*(l1*cosA)+bend*(l1*math.sqrt(max(0,1-cosA*cosA)))
        qa=(upper.tail_local-upper.head_local).rotation_difference(knee-root)
        qb=(lower.tail_local-lower.head_local).rotation_difference(ankle-knee)
        for name,q,pq in [('Thigh',qa,parentQ),('Calf',qb,qa),('Foot',Quaternion(),qb)]:
            p=rig.pose.bones[name+'.'+suffix];rest=p.bone.matrix_local.to_quaternion()
            p.rotation_quaternion=rest.inverted() @ pq.inverted() @ q @ rest

def set_arm(suffix, elbow, wrist, hand_dir):
    sh,el,wr,pa=REST[suffix]
    # Solve the requested wrist position with the actual bone lengths. Direction-
    # only posing overshoots the elbow and leaves the fingertips away from the face.
    direction=Vector(wrist)-sh;distance=min(direction.length,(el-sh).length+(wr-el).length-.001);direction.normalize()
    l1=(el-sh).length;l2=(wr-el).length
    along=(l1*l1+distance*distance-l2*l2)/(2*distance)
    pole=Vector(elbow)-sh;pole=(pole-direction*pole.dot(direction)).normalized()
    elbow=sh+direction*along+pole*math.sqrt(max(0,l1*l1-along*along))
    wrist=sh+direction*distance
    bpy.context.view_layer.update()
    parent=rig.pose.bones['Chest'].matrix @ arm_data.bones['Chest'].matrix_local.inverted()
    qa=(el-sh).rotation_difference(parent.to_3x3() @ (Vector(elbow)-sh))
    qb=(wr-el).rotation_difference(parent.to_3x3() @ (Vector(wrist)-Vector(elbow)))
    qc=(pa-wr).rotation_difference(parent.to_3x3() @ Vector(hand_dir))
    for name,q,parentQ in [('UpperArm',qa,parent.to_quaternion()),('Forearm',qb,qa),('Hand',qc,qb)]:
        p=rig.pose.bones[name+'.'+suffix]
        rest=p.bone.matrix_local.to_quaternion()
        p.rotation_quaternion=rest.inverted() @ parentQ.inverted() @ q @ rest

def gesture(suffix,kind):
    curls={'open':[.06,.08,.16,.24,.28], 'point':[.015,.92,1.04,1.10,.65], 'seal':[.06,.07,.89,1.06,.65], 'pinch':[.28,.38,.70,.85,.55], 'relax':[.13,.19,.25,.31,.25]}[kind]
    for name,curl in zip(['Index','Middle','Ring','Pinky','Thumb'],curls):
        for j in ([1,2] if name=='Thumb' else [1,2,3]):
            factor=[.72,.88,.55][j-1]
            rig.pose.bones[name+str(j)+'.'+suffix].rotation_quaternion=Quaternion((1,0,0),curl*factor)

def pose(kind,phase):
    neutral();gesture('L','relax');gesture('R','relax')
    rig.pose.bones['Hips'].location=(.008,-.003,0)
    rotate_world('Spine',(0,0,1),-.025)
    rotate_world('Head',(0,1,0),.018)
    if phase=='rest':planted_legs();return
    twist=.08 if kind=='Blue' else .14 if kind=='Red' else -.10
    if phase=='release':twist=-twist*.65
    rig.pose.bones['Hips'].location=(.016 if phase!='release' else -.012,-.008,0)
    rotate_world('Spine',(0,0,1),twist)
    rotate_world('Chest',(0,0,1),twist*.42)
    rotate_world('Neck',(0,0,1),-twist*.48)
    rotate_world('Head',(1,0,0),.035 if phase=='release' else -.025)
    if kind in ['RevealEyes','CoverEyes']:
        rotate_world('Spine',(0,0,1),-.025);rotate_world('Head',(0,1,0),-.09)
        if phase=='touch':set_arm('R',(-.31,-.07,1.47),(-.09,-.10,1.725),(.3,-.1,.8));gesture('R','pinch')
        if phase=='lift':set_arm('R',(-.30,-.08,1.48),(-.12,-.18,1.76),(.35,-.2,.65));gesture('R','pinch')
        if phase=='away':set_arm('R',(-.34,-.02,1.38),(-.29,-.20,1.42),(.4,-.3,.2));gesture('R','relax')
        planted_legs();return
    if kind=='Blue':
        set_arm('R',(-.34,-.14,1.42),(-.30,-.36,1.52),(0,-.75,.55))
        gesture('R','open')
        rig.pose.bones['Head'].rotation_quaternion=Quaternion((0,1,0),-.06)
        if phase=='release':
            set_arm('R',(-.33,-.17,1.41),(-.34,-.39,1.48),(0,-1,.15))
    if kind=='Red':
        set_arm('R',(-.31,-.10,1.36),(-.18,-.29,1.55),(0,-.9,.3))
        gesture('R','point')
        if phase=='release':set_arm('R',(-.27,-.20,1.43),(-.16,-.42,1.48),(0,-1,0))
    if kind=='Purple':
        set_arm('R',(-.32,-.02,1.34),(-.12,-.20,1.43),(.4,-.65,.7))
        set_arm('L',(.32,-.02,1.34),(.12,-.20,1.43),(-.4,-.65,.7))
        gesture('L','seal');gesture('R','seal')
        if phase=='merge':
            set_arm('R',(-.31,-.07,1.34),(-.04,-.23,1.45),(.1,-.8,.45))
            set_arm('L',(.31,-.07,1.34),(.04,-.23,1.45),(-.1,-.8,.45))
        if phase=='release':
            set_arm('R',(-.26,-.17,1.44),(-.08,-.40,1.45),(0,-1,.1));gesture('R','point')
            set_arm('L',(.34,-.06,1.34),(.33,-.17,1.16),(0,-.2,-1));gesture('L','relax')
    planted_legs()

def key_all(frame):
    for p in rig.pose.bones:
        p.keyframe_insert(data_path='rotation_quaternion',frame=frame,group=p.name)
        p.keyframe_insert(data_path='location',frame=frame,group=p.name)
        p.keyframe_insert(data_path='scale',frame=frame,group=p.name)

rig.animation_data_create()
clips={
    'Idle': [(0,'rest'),(30,'rest'),(60,'rest'),(90,'rest'),(120,'rest')],
    'CastBlue':[(0,'rest'),(24,'charge'),(46,'charge'),(54,'release'),(101,'release'),(150,'rest')],
    'CastRed':[(0,'rest'),(22,'charge'),(39,'charge'),(44,'release'),(59,'release'),(82,'charge'),(120,'rest')],
    'CastPurple':[(0,'rest'),(31,'charge'),(73,'charge'),(108,'merge'),(132,'merge'),(144,'release'),(168,'release'),(195,'charge'),(240,'rest')],
    'RevealEyes':[(0,'rest'),(23,'touch'),(33,'lift'),(49,'away'),(72,'rest')],
    'CoverEyes':[(0,'rest'),(18,'away'),(32,'lift'),(46,'touch'),(72,'rest')],
}
for name,frames in clips.items():
    action=bpy.data.actions.new(name);rig.animation_data.action=action
    for frame,phase in frames:
        pose(name.replace('Cast',''),phase)
        if name=='Idle':
            t=math.sin(frame/120*math.pi*2)
            rig.pose.bones['Hips'].location=(.008+t*.006,-.003-t*.001,0)
            rig.pose.bones['Chest'].scale=(1+t*.006,1+t*.004,1+t*.01)
            rotate_world('Chest',(0,0,1),t*.012)
            rotate_world('Head',(1,0,0),t*.012)
            rotate_world('UpperArm.L',(0,1,0),t*.010)
            rotate_world('UpperArm.R',(0,1,0),-t*.007)
            planted_legs()
        key_all(frame)
    action.use_fake_user=True
    track=rig.animation_data.nla_tracks.new();track.name=name
    strip=track.strips.new(name,0,action);strip.name=name
    track.mute=True
rig.animation_data.action=bpy.data.actions['Idle']
scene.frame_start=0;scene.frame_end=120;scene.frame_set(0)

rig['authoring']='Original procedural Blender mesh, hand authored shapes, rig and animation.'
rig['forward']='Blender -Y / glTF +Z'
rig['skills']='Idle, CastBlue (5s), CastRed (4s), CastPurple (8s), RevealEyes (2.4s), CoverEyes (2.4s)'
scene['project']='LIMITLESS / 五条悟 / Satoru Gojo'

# Export only the character. Keep the source rig, actions and preview lighting in .blend.
bpy.ops.object.select_all(action='DESELECT')
for ob in scene.objects:
    if ob.type in ['MESH','ARMATURE','EMPTY']:ob.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'gojo.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_frame_range=False,export_extras=True,export_yup=True,export_skins=True,export_morph=True,export_materials='EXPORT')
blink_shape.value=0

# A clean studio scene for further editing and preview renders.
def aim(obj,point):obj.rotation_euler=(Vector(point)-obj.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(2.6,-5.7,2.35))
camera=bpy.context.object;camera.name='PreviewCamera';camera.data.type='ORTHO';camera.data.ortho_scale=2.32;aim(camera,(0,0,1.0));scene.camera=camera
for name,loc,power,color,size in [('Key',(-3,-4,5),450,(.83,.9,1),4),('Fill',(3,-2,2),180,(.60,.76,1),3),('Rim',(1,3,3.5),650,(.48,.66,1),3)]:
    bpy.ops.object.light_add(type='AREA',location=loc)
    ob=bpy.context.object;ob.name=name;ob.data.energy=power;ob.data.color=color;ob.data.shape='DISK';ob.data.size=size;aim(ob,(0,0,1))
scene.world.color=(.16,.16,.16)
scene.render.engine='CYCLES';scene.cycles.samples=24
scene.render.resolution_x=768;scene.render.resolution_y=960;scene.render.resolution_percentage=100
scene.render.film_transparent=True
scene.view_settings.view_transform='AgX'
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(SOURCE,'gojo.blend'))
scene.render.filepath=os.path.join(PREVIEW,'character.png')
bpy.ops.render.render(write_still=True)
# Also render the eyes without changing the saved default cover state.
blindroot.hide_render=True
for ob in blindroot.children:ob.hide_render=True
camera.location=(.32,-2.5,1.88);camera.data.ortho_scale=.57;aim(camera,(0,0,1.745))
scene.render.resolution_x=800;scene.render.resolution_y=800
scene.render.filepath=os.path.join(PREVIEW,'face.png')
bpy.ops.render.render(write_still=True)
print('CHARACTER_BUILD_COMPLETE',os.path.join(OUT,'gojo.glb'))
