import bpy, os, json
from mathutils import Vector
root=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
bpy.ops.wm.open_mainfile(filepath=os.path.join(root,'blender','gojo.blend'))
eyes=bpy.data.objects['SixEyesMesh']
print('EYES',[(k.name,k.value) for k in eyes.data.shape_keys.key_blocks],list(eyes.data.vertices[0].co),list(eyes.data.shape_keys.key_blocks['Basis'].data[0].co))
rig=bpy.data.objects['GojoRig'];scene=bpy.context.scene;camera=scene.camera
scene.cycles.samples=16;scene.render.resolution_x=640;scene.render.resolution_y=800
def render(name,pos,target,scale=2.2):
    camera.location=pos;camera.data.ortho_scale=scale;camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=os.path.join(root,'output','blender',name+'.png');bpy.ops.render.render(write_still=True)
render('front',(0,-5,1.8),(0,0,1))
render('side',(5,0,1.8),(0,0,1))
render('back',(0,5,1.8),(0,0,1))
for clip,frame in [('CastBlue',46),('CastRed',44),('CastPurple',132),('RevealEyes',23)]:
    rig.animation_data.action=bpy.data.actions[clip];scene.frame_set(frame)
    render(clip,(2,-5,2.2),(0,0,1.13),2.05)
