// kits/optics/slab.js: a height map as a slab. uK (mm per nm) is the exaggeration, and it must be printed on screen.
import { HeightSlab } from '../engine/kits/optics/slab.js';
import { Floor } from '../engine/core/floor.js';
import { fmtInt, el, setHTML, colorBar, show } from '../engine/core/ui.js';
import { seg, smooth, smoother } from '../engine/core/core.js';
import { bumps, stage } from './_stage.js';

export const stills = [0.3, 3.5];
export async function create() {
  const s = stage('A surface', 'Its heights are magnified, and the color shows the same heights', { target: [0, 0, -2], az: -72, el: 28, dist: 300 });
  const NX = 281, NY = 141, DX = 0.4, slab = new HeightSlab({ nx: NX, ny: NY, dx: DX, base: -8 });
  slab.h.set(bumps(NX, NY)); slab.upload(); slab.u.uClim.value = 120; s.scene.add(slab.group);
  const floor = new Floor({ scene: s.scene, z: -8.03, r0: 60, r1: 260 }); floor.setRects([[-56, 56, -28, 28]]);
  const tag = el('div', { cls: 'hud', style: { left: '96px', top: '1002px' } });
  const bar = colorBar({ x: 1494, y: 900, lo: -120, hi: 120, ticks: [-120, 0, 120], title: 'height error (nm)' });
  return {
    ...s, duration: 4,
    update(t) {
      const K = 1e-6 * Math.pow(40000, seg(t, 0.5, 2.5, smoother));
      slab.u.uK.value = K; slab.topU.uColorMix.value = seg(t, 1.5, 2.5, smooth);
      setHTML(tag, `schematic surface&emsp;heights <b>× ${fmtInt(Number((K * 1e6).toPrecision(2)))}</b>`); show(bar.box, seg(t, 1.5, 2.5, smooth));
    },
  };
}
