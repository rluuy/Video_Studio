"""What a video's export.py needs: write arrays the clip can load, and tie computed numbers to facts.json.

  import sys; sys.path.insert(0, '../../tools')
  from export_lib import Export
  ex = Export(__file__)
  ex.f32('surface', z, nx=301, ny=301, dx_mm=1.0, unit='nm')     -> data/surface.bin (float32, row by row), described in data/meta.json
  ex.fact('F7', rms(z))                                          stops if facts.json says something else
  ex.check('the plan removes more than it fixes', removed > fixed)
  ex.write()

In clip.js: const meta = await getJSON(base + 'data/meta.json'), z = await getF32(base + 'data/' + meta.arrays.surface.file)
Rows of facts.json with "kind": "computed" must be asserted here. check_facts.py compares the two.
"""
import datetime, hashlib, json, sys
from pathlib import Path
import numpy as np


class Export:
    def __init__(self, file):
        self.vd = Path(file).resolve().parent
        self.data = self.vd / 'data'; self.data.mkdir(exist_ok=True)
        self.rows = {f['id']: f for f in json.loads((self.vd / 'facts.json').read_text(encoding='utf-8'))['facts']}
        self.meta = {'made': datetime.date.today().isoformat(), 'by': Path(file).name, 'arrays': {}, 'facts': {}, 'checks': [], 'inputs': {}}

    def input(self, path):
        """remember the fingerprint of a data file this rests on"""
        p = Path(path); self.meta['inputs'][p.name] = hashlib.sha256(p.read_bytes()).hexdigest()
        return p

    def f32(self, name, array, **about):
        a = np.ascontiguousarray(array, dtype='<f4')
        if not np.isfinite(a).all(): sys.exit(f'FAIL: {name} holds values that are not numbers')
        (self.data / f'{name}.bin').write_bytes(a.tobytes())
        self.meta['arrays'][name] = {'file': f'{name}.bin', 'shape': list(a.shape), 'min': float(a.min()), 'max': float(a.max()), **about}

    def fact(self, fid, value, tol=0.01):
        if fid not in self.rows: sys.exit(f'FAIL: facts.json has no {fid}')
        want = self.rows[fid].get('value'); got = float(value)
        if not isinstance(want, (int, float)): sys.exit(f'FAIL: {fid} has no number as its value')
        if abs(got - want) > tol * max(abs(want), 1e-12): sys.exit(f'FAIL: {fid} is computed as {got:g}, facts.json says {want:g}')
        self.meta['facts'][fid] = got; print(f'  {fid} = {got:g}, facts.json {want:g}')

    def check(self, what, ok):
        if not ok: sys.exit(f'FAIL: {what}')
        self.meta['checks'].append(what); print(f'  holds: {what}')

    def write(self):
        missing = [i for i, f in self.rows.items() if f.get('kind') == 'computed' and i not in self.meta['facts'] and str(f.get('how', '')).startswith('export.py')]
        if missing: sys.exit('FAIL: facts.json says these come from here, and they are not asserted: ' + ', '.join(missing))
        (self.data / 'meta.json').write_text(json.dumps(self.meta, indent=1) + '\n', encoding='utf-8', newline='\n')
        size = sum(f.stat().st_size for f in self.data.iterdir())
        print(f"{len(self.meta['arrays'])} arrays, {len(self.meta['facts'])} facts, {len(self.meta['checks'])} checks, {size / 1e6:.1f} MB" + (' (over 10 MB, make it smaller)' if size > 10e6 else ''))
