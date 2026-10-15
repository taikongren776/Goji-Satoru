"""Small geometric regressions for the contact detector, executed by Blender Python."""
import sys
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
sys.path.insert(0,str(Path(__file__).resolve().parent))
from audit_contacts import crossing,segment_hit
def sample(vertices,faces):
    v=list(map(Vector,vertices));data={'ids':list(range(len(faces))),'triangles':faces,'dominant':['Palm']*len(faces),'weights':[{'Hand.R':1} for _ in v]}
    return {'v':v,'data':data,'tree':BVHTree.FromPolygons(v,faces,all_triangles=True)}
a=sample([(-1,-1,0),(1,-1,0),(0,1,0)],[(0,1,2)])
b=sample([(0,0,-1),(0,0,1),(.5,0,1)],[(0,1,2)])
assert crossing(a,b)['crossing_pairs']==1,'Proper surface crossing must be found'
far=sample([(5,0,-1),(5,0,1),(5.5,0,1)],[(0,1,2)])
assert crossing(a,far)['crossing_pairs']==0
adjacent=sample([(0,0,0),(1,0,0),(0,1,0),(0,0,1)],[(0,1,2),(0,1,3)])
assert crossing(adjacent,adjacent)['crossing_pairs']==0,'Shared topological edge is not penetration'
coplanar=sample([(-.2,-.2,0),(.2,-.2,0),(0,.2,0)],[(0,1,2)])
assert crossing(a,coplanar)['crossing_pairs']==0,'Coplanar case is explicitly outside this detector'
assert segment_hit(Vector((0,0,-1)),Vector((0,0,1)),a['v']) is not None
assert segment_hit(Vector((0,0,0)),Vector((0,0,1)),a['v']) is None,'Endpoint-only touch is not crossing'
print('PASS: 6 contact-kernel regressions; coplanar overlap remains unsupported')
