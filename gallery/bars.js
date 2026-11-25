// core/bars.js: one 3D bar per value, and a plane that marks a level.
import { Bars, LevelPlane } from '../engine/core/bars.js';
import { LUT, lutColor, project, seg, smooth, theme } from '../engine/core/core.js';
import { pin } from '../engine/core/ui.js';
import { stage } from './_stage.js';

export const stills = [0.9, 3];
export async function create() {
  const s = stage('Bars', 'Their heights grow to the values, and a plane marks the limit', { target: [0, 0, 10], az: -62, el: 26, dist: 330 });
  const NX = 21, NY = 11, P = 6, LIMIT = 24, bars = new Bars({ scene: s.scene, n: NX * NY, size: 4.4 });
  const val = (i, j) => 30 * Math.exp(-((i - 10) ** 2 / 30 + (j - 5) ** 2 / 10)) + 4;
  const plane = new LevelPlane({ scene: s.scene, w: NX * P, d: NY * P }); plane.place(0, 0, LIMIT);
  const lab = pin('the limit');
  return {
    ...s, duration: 4,
    update(t) {
      for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
        const v = val(i, j), h = v * seg(t, 0.2 + 0.02 * i, 1.4 + 0.02 * i, smooth);
        bars.set(j * NX + i, (i - (NX - 1) / 2) * P, (j - (NY - 1) / 2) * P, 0, h, h > LIMIT ? theme.accent.mark : lutColor(LUT.positive, h / 34));
      }
      bars.commit();
      const o = seg(t, 1.6, 2.2, smooth); plane.opacity = o; lab(project(s.camera, NX * P / 2 + 2, -NY * P / 2, LIMIT), o);
    },
  };
}
