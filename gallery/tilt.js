// kits/optics/tilt.js: the mirror turns by theta, the light by 2 theta, then a wavy surface. The times are named beats.
import { tiltDiagram } from '../engine/kits/optics/tilt.js';
import { layer } from '../engine/core/draw.js';
import { stage } from './_stage.js';

export const stills = [5.5, 9.5];
export async function create() {
  const s = stage('Tilt', 'Turn the mirror by an angle, and the light turns by twice that angle');
  const d = tiltDiagram(layer(document.getElementById('ui')), { tilt: 9, beats: { clear: 6.3, wavy: 6.9 } });
  return { ...s, duration: 10, update(t) { d.update(t); } };
}
