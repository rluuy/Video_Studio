// core/draw.js: flat drawing in SVG, with text, math, arrows and arcs.
import { lerp, seg, smoother } from '../engine/core/core.js';
import { C, DEG, arcPath, arrowHead, f1, layer, math, op, placeHead, set, text } from '../engine/core/draw.js';
import { svg } from '../engine/core/ui.js';
import { stage } from './_stage.js';

export const stills = [1.2, 3];
export async function create() {
  const s = stage('Flat diagrams', 'An arrow turns about a point and its angle is drawn');
  const g = layer(document.getElementById('ui')), X = 820, Y = 820, L = 420;
  svg('line', { x1: X, y1: Y, x2: X + L, y2: Y, stroke: C.dim, 'stroke-width': 2, 'stroke-dasharray': '9 8' }, g);
  const line = svg('line', { stroke: C.ray, 'stroke-width': 4 }, g), head = arrowHead(g, C.ray, 20);
  const arc = svg('path', { fill: 'none', stroke: C.title, 'stroke-width': 3 }, g);
  const lab = math(g, 0, 0, 'φ', { size: 42 }), num = text(g, X, Y + 70, '', { size: 28, anchor: 'middle' });
  return {
    ...s, duration: 4,
    update(t) {
      const a = -seg(t, 0.4, 2.6, smoother) * 70 * DEG, x = X + L * Math.cos(a), y = Y + L * Math.sin(a);
      set(line, { x1: X, y1: Y, x2: lerp(X, x, 0.97), y2: lerp(Y, y, 0.97) }); placeHead(head, x, y, a);
      arc.setAttribute('d', arcPath(X, Y, 150, a, 0)); op(arc, a < -0.02 ? 1 : 0);
      set(lab, { x: X + 185 * Math.cos(a / 2), y: Y + 185 * Math.sin(a / 2) + 12 }); op(lab, seg(t, 1, 1.4));
      num.textContent = `${f1(-a / DEG)}°`;
    },
  };
}
