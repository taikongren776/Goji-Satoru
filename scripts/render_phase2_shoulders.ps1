param([string]$Asset='blender/candidates/gojo-a2-purple-spacing.blend')
$ErrorActionPreference='Stop'
$blenderExe='C:\Users\48749\AppData\Local\Programs\Blender Foundation\Blender 5.2\blender.exe'
$cases=foreach($motion in @('natural','front-45','front-90','front-120','side-45','side-90','side-120','rotation')) { foreach($view in @('frontview','sideview','threequarter','close')) { "shoulder-$motion-$view" } }
& $blenderExe --background --python-exit-code 2 --python scripts/render_character_audit.py -- --asset $Asset --out output/milestone-a2/shoulder-views --cases ($cases -join ',') --size 720 --samples 24 --no-geometry
if($LASTEXITCODE -ne 0){throw 'Shoulder render failed'}
& $blenderExe --background --python-exit-code 2 --python scripts/render_character_audit.py -- --asset $Asset --out output/milestone-a2/shoulder-wire --cases shoulder-natural-close,shoulder-front-90-close,shoulder-side-120-close --size 900 --samples 24 --no-geometry --wire
if($LASTEXITCODE -ne 0){throw 'Wire render failed'}
& $blenderExe --background --python-exit-code 2 --python scripts/render_character_audit.py -- --asset $Asset --out output/milestone-a2/shoulder-weights --cases shoulder-natural-close,shoulder-front-90-close,shoulder-side-120-close --size 900 --samples 24 --no-geometry --weights UpperArm.R
if($LASTEXITCODE -ne 0){throw 'Weight render failed'}
