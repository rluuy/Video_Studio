// core/compare.js: the shelf of examples, then a small part scaled up to the Earth. The cards hold placeholder text.
import { earthDiagram, shelfDiagram } from '../engine/core/compare.js';
import { seg, smooth } from '../engine/core/core.js';
import { layer, op } from '../engine/core/draw.js';
import { svg } from '../engine/core/ui.js';
import { stage } from './_stage.js';

export const stills = [4, 13];
export async function create() {
  const s = stage('Comparisons', 'A shelf of five examples, then one length stretched until it spans the Earth');
  const ui = document.getElementById('ui'), a = layer(ui), b = layer(ui);
  const item = (k, draw) => ({ name: [`Example ${k + 1}`], size: ['its size'], req: ['what it needs,', 'on two lines'], src: ['where that is from'], draw });
  const pics = [g => svg('circle', { r: 110, fill: '#2b3440', stroke: '#c9d0d8', 'stroke-width': 3 }, g), g => svg('rect', { x: -110, y: -60, width: 220, height: 120, fill: '#3a3f46', stroke: '#c9d0d8', 'stroke-width': 3 }, g),
    g => svg('path', { d: 'M0,-110L100,80H-100Z', fill: '#2b2f3a', stroke: '#c9d0d8', 'stroke-width': 3 }, g), g => svg('ellipse', { rx: 120, ry: 60, fill: '#1e3442', stroke: '#9fc6dc', 'stroke-width': 3 }, g), g => svg('circle', { r: 60, fill: '#56636f', stroke: '#c9d0d8', 'stroke-width': 3 }, g)];
  const shelf = shelfDiagram(a, pics.map((d, k) => item(k, d)));
  const factor = 12742e3 / 0.14;                                         // the Earth's mean diameter over a 14 cm part
  const earth = earthDiagram(b, { factorText: `every length grows ${Math.round(factor / 1e6)} million times`, bumpText: `a ${Math.round(factor * 1e-9 * 100)} cm bump`, mirrorText: 'a 14 cm part',
    earthText: 'the Earth, 12,742 km', lineA: '14 cm  →  12,742 km', lineB: `1 nm  →  ${Math.round(factor * 1e-9 * 100)} cm` });
  return {
    ...s, duration: 14,
    update(t) {
      op(a, 1 - seg(t, 5.4, 6, smooth)); op(b, seg(t, 6, 6.6, smooth));
      shelf.update(t, { focus: t > 2.6 ? 1 : -1 }); earth.update(t - 6);
    },
  };
}
