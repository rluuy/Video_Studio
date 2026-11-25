// core/discs.js: solid grains on the left, soft additive glows on the right.
import { Discs } from '../engine/core/discs.js';
import { rgb01, rnd, theme } from '../engine/core/core.js';
import { el } from '../engine/core/ui.js';
import { stage } from './_stage.js';

export const stills = [2];
export async function create() {
  const s = stage('Discs', 'Dots that always face the camera, placed by a formula', { el: 24, dist: 320 });
  const N = 220, solid = new Discs({ scene: s.scene, n: N, hard: 1 }), soft = new Discs({ scene: s.scene, n: N, hard: 0, additive: true });
  el('div', { cls: 'pin', style: { left: '520px', top: '900px' }, html: 'hard: 1, grains' });
  el('div', { cls: 'pin', style: { left: '1230px', top: '900px' }, html: 'hard: 0, additive, light' });
  return {
    ...s, duration: 4,
    update(t) {
      for (const [d, x0, col, size] of [[solid, -42, [0.86, 0.80, 0.66], 3.2], [soft, 42, rgb01(theme.light.ray), 6]]) {
        d.begin();
        for (let k = 0; k < N; k++) {
          const ph = (0.25 * t + rnd(k, 1)) % 1, a = 2 * Math.PI * rnd(k, 2) + 0.4 * t, r = 4 + 26 * rnd(k, 3);
          d.add(x0 + r * Math.cos(a), r * Math.sin(a), -18 + 40 * ph, size * (0.6 + 0.6 * rnd(k, 4)), col, 0.85 * Math.sin(Math.PI * ph));
        }
        d.end();
      }
    },
  };
}
