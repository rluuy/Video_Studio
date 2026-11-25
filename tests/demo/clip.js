// The test video: three short scenes in two chapters, timed by beats. tests/run.py renders it and checks every tool on it.
// FAULT (from fault.json, written by the tests) plants one mistake at a time.
import * as THREE from 'three';
import { H, W, placeCamera, seg, smooth, smoother } from '../../engine/core/core.js';
import { loadFacts } from '../../engine/core/facts.js';
import { drawn } from '../../engine/core/facts.js';
import { makeFilm } from '../../engine/core/film.js';
import { Floor } from '../../engine/core/floor.js';
import { layer, op, text } from '../../engine/core/draw.js';
import { loadTimeline } from '../../engine/core/timeline.js';
import { el, setHTML, show, svg } from '../../engine/core/ui.js';
import { HeightSlab } from '../../engine/kits/optics/slab.js';
import { tiltDiagram } from '../../engine/kits/optics/tilt.js';
import { bumps } from '../../gallery/_stage.js';

export async function create({ base }) {
  const [tl, facts] = await Promise.all([loadTimeline(base), loadFacts(base)]);
  const fr = await fetch(base + 'out/fault.json'), FAULT = fr.ok ? (await fr.json()).fault : '';
  const S1 = tl.scene('S1'), S2 = tl.scene('S2'), S3 = tl.scene('S3');
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(22, W / H, 2, 20000);

  // S1, a surface scaled to the RMS height the facts give
  const NX = 201, NY = 101, slab = new HeightSlab({ nx: NX, ny: NY, dx: 0.5, base: -8 }), h = bumps(NX, NY);
  let v = 0; for (const x of h) v += x * x; const k = facts.value('F1') / Math.sqrt(v / h.length);
  slab.h.set(h.map(x => x * k)); slab.upload(); slab.u.uClim.value = 120; scene.add(slab.group);
  const floor = new Floor({ scene, z: -8.03, r0: 60, r1: 260 }); floor.setRects([[-50, 50, -25, 25]]);

  // S2 and S3, the tilt diagram, its beats taken from the narration
  const ui = document.getElementById('ui'), flat = layer(ui);
  const d = tiltDiagram(flat, { beats: { ray: 0.2, normal: S2.at('turn') - 0.3, tilt: S2.at('turn') + 0.4, clear: S2.length - 0.7, wavy: S2.length } });
  const hud = el('div', { cls: 'hud', style: { right: '96px', top: '70px' } });
  const film = makeFilm(tl, facts);

  const extra = FAULT === 'overlap' ? el('div', { cls: 'cap title', style: { top: '78px', left: '180px' }, html: 'Words on top of words' })
    : FAULT === 'outside' ? el('div', { cls: 'pin', style: { left: '1800px', top: '500px' }, html: 'this label runs off the frame' })
      : FAULT === 'number' ? el('div', { cls: 'pin', style: { left: '300px', top: '700px' }, html: 'a 12 mm mirror' })
        : FAULT === 'small' ? el('div', { cls: 'pin', style: { left: '300px', top: '700px', fontSize: '12px' }, html: 'too small to read' })
          : FAULT === 'dash' ? el('div', { cls: 'pin', style: { left: '300px', top: '700px' }, html: 'a label; with a semicolon' })
            : FAULT === 'term' ? el('div', { cls: 'pin', style: { left: '300px', top: '700px' }, html: 'made by PVD' })
          : FAULT === 'fact' ? el('div', { cls: 'pin', style: { left: '300px', top: '700px' }, html: '<span data-fact="F1">41 nm</span>' })
            : FAULT === 'jump' ? el('div', { cls: 'pin', style: { left: '300px', top: '700px', fontSize: '60px' }, html: 'a label that pops' }) : null;
  let ball = null;
  if (FAULT === 'crossed') { const g = layer(ui); text(g, 300, 700, 'a word with a ball over it', { size: 30 }); ball = svg('circle', { r: 14, fill: '#dfe4ea', cy: 690 }, g); }

  return {
    scene, camera, duration: tl.duration,
    update(t) {
      const { id, tau } = tl.now(t);
      placeCamera(camera, { target: [0, 0, -2], az: -72 + 1.2 * t, el: 28, dist: 270, fov: 22 });
      slab.group.visible = id === 'S1'; floor.mesh.visible = id === 'S1';
      const grow = seg(tau, 0.4, S1.at('bumps:end'), smoother);
      slab.u.uK.value = 1e-6 + 0.04 * (id === 'S1' ? grow : 0); slab.topU.uColorMix.value = id === 'S1' ? grow : 0;
      op(flat, id === 'S1' ? 0 : 1);
      d.update(id === 'S3' ? S2.length + tau : tau);
      setHTML(hud, `<span class="k">heights</span> <b>${drawn('× ' + Math.round(40000 * grow).toLocaleString('en-US'), 'exaggeration')}</b>`);
      show(hud, id === 'S1' ? seg(tau, S1.at('rms.N') - 0.3, S1.at('rms.N'), smooth) : 0);
      if (extra) { const on = FAULT === 'jump' ? (t > S2.start + 2.0 && t < S2.start + 3.0) : true; extra.style.visibility = on ? 'visible' : 'hidden'; }
      if (ball) ball.setAttribute('cx', 320 + 12 * t);
      film.footer(id === 'S1' ? 'schematic surface' : 'schematic, slopes drawn large');
      film.update(t);
      if (FAULT === 'dark' && t > S2.start + 1.6 && t < S2.start + 2.3) { slab.group.visible = false; op(flat, 0); for (const e of ui.children) if (!e.style.zIndex) e.style.visibility = 'hidden'; } else for (const e of ui.children) if (e.tagName === 'svg') e.style.visibility = '';
    },
    info: () => ({ fault: FAULT, rms_nm: Math.sqrt(slab.h.reduce((a, x) => a + x * x, 0) / slab.h.length) }),
  };
}
