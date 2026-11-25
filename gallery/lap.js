// kits/ccos/lap.js: a full-size lap fits a sphere and leaves gaps on an asphere (the gaps are computed).
import { lapDiagram } from '../engine/kits/ccos/lap.js';
import { layer } from '../engine/core/draw.js';
import { stage } from './_stage.js';

export const stills = [4, 16];
export async function create() {
  const s = stage('Full-size lap', 'On a sphere, then on an asphere');
  const d = lapDiagram(layer(document.getElementById('ui')));
  return { ...s, duration: 18, update(t) { d.update(t); } };
}
