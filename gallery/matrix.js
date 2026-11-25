// kits/math/matrix.js: a matrix card filled column by column, one column as tiles flying out of it, a panel, dots, outlines.
import * as THREE from 'three';
import { Dots, MatrixCard, Panel, Tiles, outlineRect, rgb01 } from '../engine/kits/math/matrix.js';
import { LUT, lerp, lutColor, seg, smooth, smoother } from '../engine/core/core.js';
import { stage } from './_stage.js';

export const stills = [1, 3.4];
export async function create() {
  const s = stage('Matrices', 'Each column is one shifted copy of the same pattern', { target: [0, 0, 8], az: -90, el: 24, dist: 330 });
  const NR = 60, NC = 60, band = (r, c) => Math.exp(-((r - c) ** 2) / 40), hit = (r, c) => band(r, c) > 0.06;
  const card = new MatrixCard({ scene: s.scene, nRows: NR, nCols: NC, w: 62, px: 8, color: (r, c) => hit(r, c) ? lutColor(LUT.positive, band(r, c)) : null });
  card.place(-38, 0, 10, Math.PI / 2 - 0.25);
  const panel = new Panel({ scene: s.scene, w: 70, h: 50 }); panel.place(44, 0, 0, 0);
  const pts = []; for (let i = -3; i <= 3; i++) for (let j = -2; j <= 2; j++) pts.push([44 + 8 * i, 8 * j]);
  const dots = new Dots({ scene: s.scene, pts, r: 0.6 });
  const box = outlineRect({ scene: s.scene, x0: 44 - 28, x1: 44 + 28, y0: -20, y1: 20, z: 0.2, dash: 2 });
  const tiles = new Tiles({ scene: s.scene, n: 80 }), p = new THREE.Vector3(), q0 = new THREE.Quaternion(), q1 = new THREE.Quaternion(), q = new THREE.Quaternion(), COL = 30;
  return {
    ...s, duration: 4,
    update(t) {
      card.draw({ upto: NC * seg(t, 0.2, 1.8, x => x), hi: t > 1.9 ? COL : -1 });
      card.mesh.getWorldQuaternion(q0); dots.opacity = 1; box.opacity = 1; panel.opacity = 1;
      const fly = seg(t, 2.1, 3.2, smoother);
      tiles.begin();
      if (t > 2) for (let r = 0; r < NR; r++) if (hit(r, COL)) {
        card.cellWorld(r, COL, p);
        q.slerpQuaternions(q0, q1, fly);
        p.set(lerp(p.x, 44 + (r - COL) * 2.6, fly), lerp(p.y, 0, fly), lerp(p.z, 0.4, fly) + 14 * Math.sin(Math.PI * fly));
        tiles.add(p, q, lerp(card.cell, 2.3, fly), lerp(card.cell, 2.3, fly), rgb01(lutColor(LUT.positive, band(r, COL))), smooth((t - 2) / 0.1));
      }
      tiles.end();
    },
  };
}
