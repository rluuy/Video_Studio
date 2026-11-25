// core/floor.js, core/glow.js, core/light.js: a floor with a soft shadow, a spot of light blurred along its path, and a lit box.
import * as THREE from 'three';
import { filteredTexture } from '../engine/core/core.js';
import { Floor } from '../engine/core/floor.js';
import { setGlow } from '../engine/core/glow.js';
import { gaussian, stage } from './_stage.js';

export const stills = [1];
export async function create() {
  const s = stage('Floor, shadow and glow', 'The spot is blurred along the path it covers in one frame', { target: [0, 0, 0], az: -70, el: 32, dist: 330 });
  const glow = { tex: filteredTexture(Float32Array.from(gaussian(64, 20)), 64, 64), ext: [-14, 14, -14, 14] };
  const floor = new Floor({ scene: s.scene, z: 0, glow, r0: 60, r1: 260 });
  floor.setRects([[-50, -10, -15, 15]]);
  const box = new THREE.Mesh(new THREE.BoxGeometry(40, 30, 14), new THREE.MeshStandardMaterial({ color: '#8a949f', roughness: 0.55 }));
  box.position.set(-30, 0, 7); s.scene.add(box);
  return {
    ...s, duration: 4,
    update(t) {
      const n = 24, steps = Array.from({ length: n }, (_, k) => { const a = 1.2 * t + 0.5 * k / (n - 1); return [42 + 26 * Math.cos(a), 26 * Math.sin(a), 1 / n]; });
      setGlow(floor.u, steps, 4);
    },
  };
}
