// TITLE_HERE
// One comment line per scene: what it shows, what in it is measured, computed or drawn.
//   S1   a ball that starts to move when the narration says so (drawn)
// Moments come from timeline.json by name. Numbers come from facts.json, or are marked with drawn(). update(t) sets
// everything from t alone.
import * as THREE from 'three';
import { H, W, placeCamera, project, seg, smooth, smoother } from '../../engine/core/core.js';
import { loadFacts } from '../../engine/core/facts.js';
import { makeFilm } from '../../engine/core/film.js';
import { Floor } from '../../engine/core/floor.js';
import { addLights } from '../../engine/core/light.js';
import { loadTimeline } from '../../engine/core/timeline.js';
import { pin } from '../../engine/core/ui.js';

export async function create({ base }) {
  const [tl, facts] = await Promise.all([loadTimeline(base), loadFacts(base)]);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(22, W / H, 2, 20000);
  addLights(scene);
  new Floor({ scene, z: -9, r0: 60, r1: 260 });

  // ---- S1
  const S1 = tl.scene('S1');
  const ball = new THREE.Mesh(new THREE.SphereGeometry(9, 64, 48), new THREE.MeshStandardMaterial({ color: '#8a949f', roughness: 0.5 }));
  scene.add(ball);
  const label = pin('a ball', { dx: 24 });
  function updateS1(tau) {
    const go = seg(tau, S1.at('second.go'), S1.at('second:end'), smoother);
    ball.position.set(-30 + 60 * go, 0, 0);
    label(project(camera, ball.position.x + 9, 0, 0), seg(tau, S1.at('first'), S1.at('first', 0.6), smooth));
    film.footer('schematic');                                   // with a number: `schematic, heights ${drawn('× 40,000', 'exaggeration')}`
  }

  // ---- made last, so the veil covers everything
  const film = makeFilm(tl, facts);
  return {
    scene, camera, duration: tl.duration,
    update(t) {
      const { id, tau } = tl.now(t);
      placeCamera(camera, { target: [0, 0, 0], az: -90 + 0.6 * t, el: 16, dist: 300, fov: 22 });
      if (id === 'S1') updateS1(tau);
      film.update(t);
    },
    info: () => ({}),
  };
}
