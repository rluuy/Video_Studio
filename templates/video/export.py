"""Data of TITLE_HERE: every array the clip loads and every computed number, each with its check.

  python export.py      (from this folder, or from anywhere)

Says where each input comes from. Seeds are fixed, so a second run writes the same bytes.
"""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'tools'))
from export_lib import Export  # noqa: E402

ex = Export(__file__)
# z = ...
# ex.f32('surface', z, nx=z.shape[1], ny=z.shape[0], dx_mm=1.0, unit='nm')
# ex.fact('F1', z.std())
# ex.check('the surface has no tilt', abs(tilt) < 1e-9)
ex.write()
