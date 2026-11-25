// kits/ccos/tools.js: the eight schematic tools.
import * as THREE from 'three';
import { BonnetTool, EEMTool, IonTool, JetTool, MRFTool, PadTool, PlasmaTool, StressedLapTool } from '../engine/kits/ccos/tools.js';
import { project } from '../engine/core/core.js';
import { pin } from '../engine/core/ui.js';
import { stage } from './_stage.js';

export const stills = [1.5];
export async function create({ renderer }) {
  const s = stage('Eight tools', 'Schematic, not to scale with each other', { target: [0, 0, -40], az: -90, el: 34, dist: 2150 });
  const X = [-420, -140, 140, 420], place = k => [X[k % 4], k < 4 ? 250 : -220, 0];
  const list = [['pad', PadTool, 1], ['bonnet', BonnetTool, 1], ['fluid jet', JetTool, 1], ['EEM', EEMTool, 1], ['ion beam', IonTool, 1], ['plasma', PlasmaTool, 1], ['stressed lap', StressedLapTool, 0.6], ['MRF wheel', MRFTool, 1]];
  const all = list.map(([name, T, scale], k) => {
    const at = place(k), o = T === IonTool ? new IonTool({ renderer, origin: at }) : new T();
    o.group.position.set(...at); o.group.scale.setScalar(scale); s.scene.add(o.group);
    const plate = new THREE.Mesh(new THREE.BoxGeometry(170, 120, 6), new THREE.MeshStandardMaterial({ color: '#56636f', roughness: 0.5 }));
    plate.position.set(at[0], at[1], -3.2); plate.visible = !['stressed lap', 'MRF wheel'].includes(name); s.scene.add(plate);
    return { o, at, lab: pin(name, { align: 'c', dy: name === 'MRF wheel' ? 96 : 40 }) };
  });
  return {
    ...s, duration: 4,
    update(t) { for (const { o, at, lab } of all) { o.update(t, 1, 0.4); lab(project(s.camera, at[0], at[1] - 60, 0), 1); } },
  };
}
