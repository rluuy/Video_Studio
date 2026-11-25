// core/ui.js: captions that swap, a counter, color bars, and a label pinned to a 3D point.
import * as THREE from 'three';
import { LUT, project, seg, smooth } from '../engine/core/core.js';
import { captionTrack, colorBar, el, fmtClock, fmtInt, pin, setHTML, show } from '../engine/core/ui.js';
import { stage } from './_stage.js';

export const stills = [1.5, 4.5];
export async function create() {
  const s = stage('Words on the screen', 'Captions fade and rise, counters stay put, labels follow a point');
  const caps = captionTrack({ top: '250px' }, [
    { t0: 0, t1: 2.8, html: '<span class="sub" style="position:static">The first caption</span>' },
    { t0: 3.2, t1: 6, html: '<span class="sub" style="position:static">The second, with a formula <span class="formula"><i>z</i> = <i>λφ</i> / 4π</span></span>' },
  ]);
  const hud = el('div', { cls: 'hud', style: { right: '96px', top: '250px', textAlign: 'right' } });
  const signed = colorBar({ x: 96, y: 880, lo: -100, hi: 100, ticks: [-100, 0, 100], title: 'height error (nm)' });
  const positive = colorBar({ x: 560, y: 880, lut: LUT.positive, lo: 0, hi: 4, ticks: [0, 2, 4], title: 'time at each point (s)', unit: 's' });
  const ball = new THREE.Mesh(new THREE.SphereGeometry(9, 48, 32), new THREE.MeshStandardMaterial({ color: '#8a949f', roughness: 0.5 }));
  s.scene.add(ball);
  const label = pin('a label on a 3D point', { dx: 26 });
  return {
    ...s, duration: 6,
    update(t) {
      caps(t);
      ball.position.set(-20 + 12 * t, 0, 4 * Math.sin(2 * t));
      label(project(s.camera, ball.position.x + 9, 0, ball.position.z), 1);
      setHTML(hud, `<span class="k">clock</span> <b>${fmtClock(3600 * t)}</b><br><span class="k">points</span> <b>${fmtInt(12345.6 * t)}</b>`);
      show(positive.box, seg(t, 3, 3.6, smooth)); show(signed.box, 1);
    },
  };
}
