# Professional character integration

## Frozen scope and responsibility

Milestone A is **BLOCKED BY ART ASSET QUALITY**. A4 prepares engineering interfaces; it does not complete the uniform or start B–E. See `character-art-spec.md` for the mandatory art deliverable and acceptance views.

Pipeline: artist asset → editable Blender source → self-contained GLB → JSON mapping → `CharacterAdapter` → existing animation / eye transition / socket consumers → Three.js → LIMITLESS.

## Files and stable API

- `src/character-contract.ts`: six logical animations/durations, three socket roles, manifest validation and hash-bound human review gate.
- `src/character-adapter.ts`: unique-name resolution, cloned/optionally retimed clips, mixer/actions, current animation/skill/progress, eye state, cover visibility, optional blink mapping and bone/helper socket transforms.
- `src/character-assets.ts`: loads active mapping or explicit development preview. Production assets require a matching GLB SHA-256, named human APPROVED record and all mandatory scores ≥5 before parsing/rendering.
- `src/legacy-character-materials.ts`: isolated old appearance profile. Professional `authored` assets retain original materials and textures.
- `src/experience.ts`: still owns the one skill clock, camera, sound and existing VFX timing. It consumes logical action names and `socket(role)` world coordinates; it does not discover internal bones/mesh names.
- `public/models/character-production/active.json`: current selection. It deliberately continues selecting the old `../gojo.glb` as `legacy-reference`; this is not art approval.

Public roles: `Idle`, `CastBlue`, `CastRed`, `CastPurple`, `RevealEyes`, `CoverEyes`; `Blindfold`, `FX_Hand_L`, `FX_Hand_R`, `FX_Center`. `adapter.root` is the character root; `adapter.state` supplies current logical animation, skill, progress, eyesVisible and blindfold state. `adapter.actions` contains logical keys only. `begin`, `evaluate`, `setCover`, `blink` and `socket` are the integration operations; the scene owns mesh/material/texture disposal, the adapter owns its mixer and generated socket helpers.

The adapter is not an automatic retargeter. It does not synthesize missing clips, change bad geometry, invent sockets or assess beauty. Missing/ambiguous mappings fail loading; no fixed mesh/bone count is assumed.

## Artist delivery and mapping

Place new material under `public/models/character-production/incoming/<asset-id>/`. Keep editable sources under `blender/artist-assets/<asset-id>/`. Do not overwrite `public/models/gojo.glb`.

Create a manifest based on the example below (these names are examples, not required internal names):

```json
{
  "version": 1,
  "id": "artist-delivery-v1",
  "asset": "gojo-final.glb",
  "usage": "production",
  "presentation": "authored",
  "review": "review.json",
  "animations": {
    "Idle": {"clip": "RestBreathing", "timing": "exact"},
    "CastBlue": {"clip": "Take_Attract", "timing": "exact"},
    "CastRed": {"clip": "Take_Repel", "timing": "exact"},
    "CastPurple": {"clip": "Take_Fusion", "timing": "exact"},
    "RevealEyes": {"clip": "RemoveCover", "timing": "exact"},
    "CoverEyes": {"clip": "ReplaceCover", "timing": "exact"}
  },
  "nodes": {
    "Blindfold": {"node": "EyeCover_RenderGroup", "mode": "authored"},
    "FX_Hand_L": {"node": "Rig_LeftWrist", "offset": [0, 0.05, 0]},
    "FX_Hand_R": {"node": "RightHand_FX_Helper"},
    "FX_Center": {"node": "Chest_FX_Helper"}
  },
  "coordinates": {
    "unit": "meter", "up": "Y", "forward": "+Z",
    "heightRange": [1.8, 2.1], "groundTolerance": 0.02,
    "landmarks": {"feet": ["QA_LeftSole", "QA_RightSole"], "front": "QA_Front", "back": "QA_Back"}
  }
}
```

Names must be unique within the loaded root. Socket offsets are in the selected node's local coordinates (meters when scale is applied); optional `rotation` is XYZ Euler radians. No vertex indices are used. Existing animated helpers can be bound directly. Bone binding adds a child helper that follows the evaluated pose and character world transform.

Omit `blink` to preserve authored eye animation, or specify `{"target":"MyBlinkShape","nodes":["EyeMeshA","EyeMeshB"]}` for procedural blink. `nodes` can be omitted to search all morph-bearing meshes for that declared target. A declared but missing target is an error.

Cover `authored` mode never overwrites animated transforms/morphs. It leaves the cover visible during its clip, hides it after reveal, and uses the stable contact state on cancellation. The animation must actually move the cover convincingly. `fade-lift` preserves the cover's initial position and clones cover materials so shared face materials are not faded; use only for legacy-style assets. A cover node must contain the actual cover geometry, not the whole body.

`timing: exact` requires the logical duration within0.01s; `fit` explicitly retimes cloned tracks without changing the imported source clip. It does not align semantic release/contact events: review those against the art spec. Unsupported animation implementations need an explicit adapter extension and regression before use; changes are confined to the adapter/mapping, not UI or VFX.

## Import validation and refusal

Run from project root:

```powershell
$blender = 'C:/Users/48749/AppData/Local/Programs/Blender Foundation/Blender 5.2/blender.exe'
& $blender -b --disable-autoexec --python-exit-code 2 --python scripts/validate-production-character.py -- --manifest public/models/character-production/incoming/artist-v1/manifest.json --out output/artist-v1-validation.json
```

Default `production` mode checks GLB container/buffer structure, actual Blender import, skeleton/skin/weights/inverse binds, animation mapping/durations, UV/materials/textures, cover/sockets, meter/Y-up/+Z contract, rest height/ground and author-supplied foot/front/back landmarks. It also requires a SHA-bound human review, complete≥5 scores, per-item observations and all evidence files. It checks metadata/evidence presence, not whether screenshots prove beauty. Full deformation/contact/browser parity tests remain separate required checks; scripts do not infer artistic quality.

Self-contained GLB is required. The current validator deliberately rejects sparse accessors and unapproved required extensions/compression instead of skipping them; export uncompressed/expanded data or explicitly implement and test support. Runtime GLTFLoader support does not automatically equal validator support. Unit/forward declarations and markers need visual confirmation because mesh semantics cannot be reliably inferred from numeric axes.

The checker only writes a JSON report under `output/`; it never publishes, copies or replaces GLBs. On failure, leave the file in incoming and fix the source/mapping. **Do not update active.json on failure.**

`--mode integration` is only for existing test fixtures. It can record missing UV/textures/absent orientation markers as `NOT_PRODUCTION_READY` warnings, but still rejects missing clips/bindings/skins, malformed data, wrong explicit units and invalid supplied landmarks. Its result is always `INTEGRATION_ONLY_PASS`, never production approval. Production mode for the current A3 fixture intentionally FAILS.

## Review and promotion

1. Copy `docs/character-review.template.json` to the incoming package, fill it only from actual render/playback inspection, and bind it to the exact GLB SHA-256. Supply named reviewer, date, all scores, observations and evidence paths relative to the review file.
2. Run the strict checker, full deformation/contact tests on the source blend, and Blender/Three.js comparison. Review missing footage, bad poses and old defects honestly. No auto-generated high scores.
3. Preview with Vite: `/?character=/models/character-production/incoming/artist-v1/manifest.json`. Production usage also verifies hash-bound human approval at runtime. For an unapproved engineering preview use an explicit `integration-test` mapping, never label it production-approved.
4. Only after user approval, manually point `active.json` to the approved package (asset/review paths remain relative to active.json, so update those paths appropriately). Keep the old GLB and Git history. There is no automatic promotion command.
5. Production build ignores the development `?character=` parameter. Re-run the full main-app smoke with the new active mapping before release. Rollback restores the previous active mapping, not destructive asset replacement.

When a future skeleton has arbitrary new names or mesh counts, change only the manifest. If its cover, material or motion encoding exceeds the supported policies, extend the adapter with explicit tests. VFX continue reading the same three world-space sockets; `src/effects.ts` and `src/audio.ts` stay unchanged.

## Reproduce A4 integration evidence

```powershell
node scripts/prepare-character-adapter-fixture.mjs
npm run dev
# In another terminal:
node scripts/test-character-adapter.mjs
node scripts/smoke_character_integration.mjs --candidate public/models/candidates/gojo-a3-thumb-distal.glb --out output/milestone-a4/application-smoke
npm test
npm run check
npm run build
```

The fixture renames GLB node/mesh/clip metadata and keeps the entire binary geometry/weights/animation chunk unchanged. It is not a new professionally authored asset, and successful loading does not validate new topology or artistic quality. Original/renamed candidate socket comparison, six logical animation screenshots and real main-app replay evidence go to `output/playwright/milestone-a4/`.
