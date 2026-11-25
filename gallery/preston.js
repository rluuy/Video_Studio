// kits/ccos/preston.js: removed depth = k x P x V x T, with the three doublings.
import { prestonDiagram } from '../engine/kits/ccos/preston.js';
import { layer } from '../engine/core/draw.js';
import { stage } from './_stage.js';

export const stills = [12, 18.5, 25];
export async function create() {
  const s = stage('Preston’s rule', 'Pressure, speed and time');
  const d = prestonDiagram(layer(document.getElementById('ui')));
  return { ...s, duration: 28, update(t) { d.update(t); } };
}
