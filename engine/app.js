// Entry point.  ?scene=gallery/slab  or  ?scene=videos/2026-12_interferometry
// The tools call window.renderFrame(t) for each frame. ?t=12.5 draws one moment and ?play=1 runs the scene live.
//
// A scene module exports   async function create({ renderer, base })   and returns
//   { scene, camera, duration, update(t), info?() }
// update(t) must set everything from t alone, so frames can be drawn in any order and always come out the same.
// base is the URL of the video's folder, for its own data files.
import { makeRenderer } from './core/core.js';
import { applyCss, theme } from './core/theme.js';

const q = new URLSearchParams(location.search);
window.__ready = false; window.__error = null;

async function start() {
  const name = q.get('scene') || 'gallery/theme';
  const [kind, id] = name.split('/');
  if (!['gallery', 'videos'].includes(kind) || !id) throw new Error(`unknown scene "${name}". Use gallery/<name> or videos/<folder>`);
  applyCss();
  const fonts = theme.font;
  const wanted = [`400 29px ${fonts.sans}`, `600 46px ${fonts.sans}`, `700 20px ${fonts.sans}`, `400 23px ${fonts.mono}`, `500 23px ${fonts.mono}`,
    `italic 400 40px ${fonts.math}`, `700 40px ${fonts.math}`, `italic 700 40px ${fonts.math}`, `400 40px ${fonts.math}`];
  const got = await Promise.all(wanted.map(f => document.fonts.load(f)));
  got.forEach((g, i) => { if (!g.length) throw new Error('font did not load: ' + wanted[i]); });
  await document.fonts.ready;
  const stage = document.getElementById('stage');
  const renderer = makeRenderer(stage);
  stage.insertBefore(renderer.domElement, stage.firstChild);
  const base = kind === 'videos' ? `/videos/${id}/` : '/gallery/';
  const mod = await import(kind === 'videos' ? `${base}clip.js` : `/gallery/${id}.js`);
  const clip = await mod.create({ renderer, base });
  const draw = t => { clip.update(t); renderer.render(clip.scene, clip.camera); };
  const raf2 = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  window.__duration = clip.duration;
  window.__clip = clip;
  window.__stills = mod.stills || [];
  window.renderFrame = async t => { draw(t); await raf2(); return true; };
  if (q.has('t')) await window.renderFrame(+q.get('t'));
  if (q.has('play')) {
    const t0 = performance.now(), from = +(q.get('t') || 0);
    const loop = () => { draw((from + (performance.now() - t0) / 1000) % clip.duration); requestAnimationFrame(loop); };
    loop();
  }
  window.__ready = true;
}
start().catch(e => { window.__error = String(e && e.stack || e); console.error(window.__error); });
