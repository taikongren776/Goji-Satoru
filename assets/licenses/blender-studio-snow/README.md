# Blender Studio Snow v4.2 — asset record

Source: https://studio.blender.org/characters/snow/v4/

**Snow Rig (CC) Blender Foundation | studio.blender.org**

The official download page explicitly links **CC BY 4.0** and requests the credit above. This license permits sharing and adaptation, including redistribution of derivative mesh files. Retain attribution, the license link and notice of changes with distributed derivatives. The complete legal text is in `CC-BY-4.0.txt`; download URL, dates, sizes and SHA-256 hashes are in `source.json`.

Original zip and textures reside in ignored `assets/vendor/snow/`. They were downloaded from the official Blender Studio endpoint. The `.blend` was inspected with `--disable-autoexec`; its embedded `cloudrig.py` was not enabled. This record covers Snow, not ownership or licensing of the Jujutsu Kaisen character design.

Local derivatives:

- `blender/candidates/a3-snow-shoulder-study.blend`: original authored shirt and rig, exploratory neckline-band coordinate edits, neutral audit materials, camera and lights. No shoulder surface generated from primitives. Short sleeves remain. **Failed as a finished uniform prototype.**
- `blender/candidates/a3-snow-lbs-probe.blend`: diagnostic duplicate shirt with ten independent deformation bones, retained corrective shape keys, baked held poses, four-weight linear skinning; source rig is retained for comparison. B-bones, dual-quaternion skinning and CorrectiveSmooth are omitted from the export mesh. **Lossy feasibility probe, not production rig.**
- `output/milestone-a3/lbs-web/audit.glb`: same diagnostic export. Copy this attribution and license with any redistribution. Not loaded by the LIMITLESS application.

The source shirt has 1,839 vertices and 1,783 quads. The source body has 5,828 vertices, 5,771 faces (5,767 quads); its editable head has 3,719 vertices, 3,633 faces (3,631 quads). The production CloudRig has 1,494 bones including controls. Mesh quality does not imply compatibility with an unchanged web rig.
