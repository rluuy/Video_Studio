// kits/ccos/atoms.js: how atoms leave the surface under three tools, schematic.
import { atomInset } from '../engine/kits/ccos/atoms.js';
import { layer, text } from '../engine/core/draw.js';
import { stage } from './_stage.js';

export const stills = [0.8, 2.9];
export async function create() {
  const s = stage('Atoms', 'Three ways a tool takes atoms away');
  const g = layer(document.getElementById('ui'));
  const all = ['eem', 'ibf', 'plasma'].map((kind, k) => { text(g, 96 + 580 * k, 380, `'${kind}'`, { size: 26 }); return atomInset(g, kind, { x: 96 + 580 * k, y: 410 }); });
  return { ...s, duration: 4.2, update(t) { all.forEach(a => a.update(t)); } };
}
