"""Authored-asset export entry. Original generator is preserved in baseline 3e6e5ab.
No character geometry is generated. Explicit --source and --output are required.
"""
import runpy
from pathlib import Path
runpy.run_path(str(Path(__file__).with_name('export_character.py')), run_name='__main__')
