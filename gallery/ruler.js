// kits/ccos/ruler.js: sizes on a log ruler, then one plan for every tool. The rows are placeholders, not facts.
import { rulerDiagram } from '../engine/kits/ccos/ruler.js';
import { LUT, lutColor } from '../engine/core/core.js';
import { layer } from '../engine/core/draw.js';
import { gaussian, stage } from './_stage.js';

export const stills = [7, 12.2, 17.5];
const spot = w => {
  const n = 80, k = gaussian(n, w), cv = document.createElement('canvas'); cv.width = cv.height = n;
  const g = cv.getContext('2d'); for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { g.fillStyle = lutColor(LUT.positive, k[i * n + j]); g.fillRect(j, i, 1, 1); }
  return cv;
};
export async function create() {
  const s = stage('Sizes on a ruler', 'Placeholder rows, then the three things every tool needs');
  const rows = [{ tool: 'example A', mm: [300, 1200], label: 'a range' }, { tool: 'example B', mm: [20, 60], label: 'a range' }, { tool: 'ion beam', mm: [5, 5], label: 'one size' }, { tool: 'example D', mm: null, label: 'no size found' }];
  const d = rulerDiagram(layer(document.getElementById('ui')), { rows, thumbs: [10, 20, 30, 40].map((w, k) => ({ name: `tool ${k + 1}`, canvas: spot(w) })), generic: spot(26), footer: 'Placeholder values' });
  return { ...s, duration: 18, update(t) { d.update(t); } };
}
