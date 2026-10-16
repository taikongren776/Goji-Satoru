# Character production entry

`active.json` currently selects `../gojo.glb` as **legacy-reference**, not approved production art. Do not replace that binary automatically.

- `incoming/<asset-id>/`: future artist GLB + manifest + licenses + human review. No final asset has been supplied yet.
- `fixtures/`: A4 metadata-renamed A3 candidate; **integration test only**, not a final character. The name `gojo-final.glb` deliberately simulates a future delivery and does not signify approval.
- Manifest changes select assets and map clips/nodes; no hardcoded mesh/bone counts are required by the adapter.
- The default app reads `active.json`. Development-only preview: `/?character=/models/character-production/fixtures/gojo-final.json`. Production builds ignore this query parameter.
- Professional assets use `presentation: authored`; `legacy` is solely the old model's appearance compatibility profile.
- A production gate and explicit human approval precede manual changes to `active.json`. Validation never promotes, copies or overwrites GLBs.

Read `docs/character-art-spec.md`, `docs/character-status.md`, and `docs/character-integration.md` before importing anything. All A1–A3 candidates and failure evidence remain preserved.
