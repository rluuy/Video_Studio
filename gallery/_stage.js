// What the gallery scenes share: a scene with a camera, lights and a title, and a repeatable bumpy surface.
import * as THREE from 'three';
import { W, H, placeCamera, rnd } from '../engine/core/core.js';
import { addLights } from '../engine/core/light.js';
import { el } from '../engine/core/ui.js';

export function stage(title, sub, view = {}) {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(22, W / H, 2, 20000);
  addLights(scene);
  placeCamera(camera, Object.assign({ target: [0, 0, 0], az: -90, el: 30, dist: 300, fov: 22 }, view));
  el('div', { cls: 'cap title', html: title });
  el('div', { cls: 'cap sub', html: sub });
  return { scene, camera };
}

/** a schematic surface error: nx x ny heights (nm), row 0 at the largest y, a few hills and valleys from a seed */
export function bumps(nx, ny, { seed = 3, amp = 100, n = 9, size = 0.16 } = {}) {
  const h = new Float32Array(nx * ny);
  for (let k = 0; k < n; k++) {
    const cx = rnd(k, seed) * nx, cy = rnd(k, seed + 1) * ny, s = size * nx * (0.5 + rnd(k, seed + 2)), a = amp * (2 * rnd(k, seed + 3) - 1);
    for (let r = 0; r < ny; r++) for (let c = 0; c < nx; c++) h[r * nx + c] += a * Math.exp(-((c - cx) ** 2 + (r - cy) ** 2) / (2 * s * s));
  }
  let m = 0; for (const v of h) m += v; m /= h.length;
  for (let i = 0; i < h.length; i++) h[i] -= m;
  return h;
}

/** a round Gaussian footprint, n x n, full width at half maximum w (in cells), peak 1 */
export function gaussian(n, w) {
  const k = new Float64Array(n * n), c = (n - 1) / 2, s = w / 2.3548;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) k[i * n + j] = Math.exp(-((i - c) ** 2 + (j - c) ** 2) / (2 * s * s));
  return k;
}
