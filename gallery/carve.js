// kits/ccos/carve.js: removal as a sum of footprint copies, one per dwell point, each scaled by its time.
import { Carver, PointSet } from '../engine/kits/ccos/carve.js';
import { HeightSlab } from '../engine/kits/optics/slab.js';
import { el, setHTML } from '../engine/core/ui.js';
import { clamp01 } from '../engine/core/core.js';
import { gaussian, stage } from './_stage.js';

export const stills = [1, 3.8];
export async function create() {
  const s = stage('Carving', 'Every stop leaves a copy of the footprint, scaled by its time', { target: [0, 0, -2], az: -72, el: 28, dist: 300 });
  const NX = 281, NY = 141, DX = 0.4, KN = 61, slab = new HeightSlab({ nx: NX, ny: NY, dx: DX, base: -9 });
  slab.u.uK.value = 0.04; slab.u.uClim.value = 120; slab.topU.uColorMix.value = 1; s.scene.add(slab.group);
  const carver = new Carver({ nx: NX, ny: NY, K: gaussian(KN, 22), kRows: KN, kCols: KN, i0: -30, j0: -30 });
  const r = [], c = [], time = [];
  for (let k = 0; k < 9; k++) { r.push(70); c.push(44 + 24 * k); time.push(30 + 25 * Math.sin(1.3 * k + 0.5)); }
  const pts = new PointSet(carver, r, c, time), total = time.reduce((a, b) => a + b, 0);
  const tag = el('div', { cls: 'hud', style: { left: '96px', top: '1002px' } });
  return {
    ...s, duration: 4,
    update(t) {
      let left = total * clamp01((t - 0.2) / 3.2);
      for (let k = 0; k < time.length; k++) { pts.set(k, Math.min(time[k], Math.max(0, left))); left -= time[k]; }
      for (let i = 0; i < slab.h.length; i++) slab.h[i] = -carver.buf[i];
      slab.upload();
      setHTML(tag, `schematic numbers&emsp;deepest point <b>${Math.max(...carver.buf).toFixed(0)} nm</b>&emsp;heights <b>× 40,000</b>`);
    },
  };
}
