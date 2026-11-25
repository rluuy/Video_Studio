// core/mapcard.js: a grid of values as a framed panel in 3D, with cells that can be marked.
import { MapCard } from '../engine/core/mapcard.js';
import { project, seg, smooth } from '../engine/core/core.js';
import { pin } from '../engine/core/ui.js';
import { stage } from './_stage.js';

export const stills = [2.5];
export async function create() {
  const s = stage('Map card', 'One square per value, with the largest ones marked', { target: [0, 0, 0], az: -90, el: 14, dist: 300 });
  const NI = 12, NJ = 28, map = new Float64Array(NI * NJ);
  for (let i = 0; i < NI; i++) for (let j = 0; j < NJ; j++) map[i * NJ + j] = 1 + Math.sin(j / 3) * Math.cos(i / 2.5) + 1.2 * Math.exp(-((i - 6) ** 2 + (j - 18) ** 2) / 8);
  const vmax = Math.max(...map), mark = Array.from(map, v => v > 0.85 * vmax);
  const card = new MapCard({ scene: s.scene, nI: NI, nJ: NJ, w: 112, h: 48, px: 14 });
  card.draw(map, vmax, mark); card.place(0, 0, 0);
  const lab = pin('row 6', { dx: 22 });
  return {
    ...s, duration: 4,
    update(t) { card.opacity = seg(t, 0, 0.8, smooth); const y = card.cellWorld(6, 0).y, p = card.pointWorld(0.5, y / 48); lab(project(s.camera, p.x, p.y, p.z), seg(t, 1, 1.5, smooth)); },
  };
}
