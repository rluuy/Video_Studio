// kits/optics/rays.js: a round concave mirror and parallel rays traced from the same surface that is drawn. The size of
// the focus is computed from a dense grid of rays.
import { DishMirror, RayBundle } from '../engine/kits/optics/rays.js';
import { el, setHTML } from '../engine/core/ui.js';
import { seg, smooth, smoother } from '../engine/core/core.js';
import { bumps, stage } from './_stage.js';

export const stills = [2, 5.5];
export async function create() {
  const s = stage('Rays and a mirror', 'Parallel light comes to a focus, until the surface is bumpy', { target: [-260, 0, 270], az: -90, el: 10, dist: 2500 });
  const N = 151, DX = 2, R = 140, F = 500, dish = new DishMirror({ n: N, dx: DX, R, f: F });
  dish.h.set(bumps(N, N, { seed: 5, amp: 14 })); dish.upload(); dish.topU.uClim.value = 12; s.scene.add(dish.group);
  const xs = Array.from({ length: 13 }, (_, k) => -0.9 * R + 1.8 * R * k / 12), rays = new RayBundle({ scene: s.scene, dish, xs, zTop: F + 150 });
  const tag = el('div', { cls: 'hud', style: { left: '96px', top: '1002px' } });
  return {
    ...s, duration: 6,
    update(t) {
      dish.u.uK.value = 1e-9 + 0.6 * seg(t, 2.6, 4.6, smoother);          // mm per nm
      dish.topU.uColorMix.value = seg(t, 2.6, 3.6, smooth);
      const spread = rays.update({ inT: seg(t, 0, 0.8, x => x), outT: seg(t, 0.8, 1.8, x => x) });
      setHTML(tag, `focus, typical radius <b>${spread.toFixed(1)} mm</b> on the drawing`);
    },
  };
}
