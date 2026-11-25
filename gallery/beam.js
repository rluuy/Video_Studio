// kits/ccos/beam.js: the schematic ion source and its beam, standing still and then moving fast enough to blur.
import { Beam } from '../engine/kits/ccos/beam.js';
import { HeightSlab } from '../engine/kits/optics/slab.js';
import { Floor } from '../engine/core/floor.js';
import { setGlow } from '../engine/core/glow.js';
import { filteredTexture, seg, smooth } from '../engine/core/core.js';
import { gaussian, stage } from './_stage.js';

export const stills = [1, 3];
export async function create({ renderer }) {
  const s = stage('Ion beam', 'A pass within one frame is drawn as many short steps, so it blurs', { target: [0, 0, 8], az: -70, el: 22, dist: 260 });
  const glow = { tex: filteredTexture(Float32Array.from(gaussian(64, 18)), 64, 64), ext: [-10, 10, -10, 10] };
  const slab = new HeightSlab({ nx: 201, ny: 81, dx: 0.4, base: -5, glow }); slab.upload(); s.scene.add(slab.group);
  const floor = new Floor({ scene: s.scene, z: -5.03, glow, r0: 60, r1: 260 }); floor.setRects([[-40, 40, -16, 16]]);
  const beam = new Beam({ scene: s.scene, renderer, halfWidth: 3.6 });
  return {
    ...s, duration: 4,
    update(t) {
      const on = seg(t, 0.2, 0.7, smooth), x = t < 2 ? -18 : 10, n = t < 2 ? 1 : 24, len = t < 2 ? 0 : 22;
      const steps = Array.from({ length: n }, (_, k) => [x + (n > 1 ? len * k / (n - 1) : 0), 0, 1 / n]);
      beam.update({ steps, on, zTop: 22, zBottom: 0 });
      setGlow(slab.topU, steps, 1.2 * on); setGlow(floor.u, steps, 0);
    },
  };
}
