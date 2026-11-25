// What every video has: captions from the script, a footer line, and a veil that fades the whole frame.
//   const film = makeFilm(tl, facts);
//   film.footer('schematic surface')      in update(t), or '' for none
//   film.update(t)                        last in update(t)
// The veil covers the canvas, the diagrams and the text alike. It fades to the background at the start and end of a
// chapter (0.5 s), and dips for a moment between scenes inside one, unless the next scene's "cut" in script.json is "none".
// With "ending": "hold" in script.json the last picture stays instead of fading.
import { BG, H, W, clamp01, smooth } from './core.js';
import { el, setHTML, show } from './ui.js';

const FADE = 0.5, DIP = 0.22;

export function makeFilm(tl, facts = null) {
  const fill = s => (facts ? facts.fill(s) : s);
  const caps = [];
  for (const s of tl.scenes) for (const c of s.captions) {
    if (!['title', 'sub'].includes(c.kind)) throw new Error(`scene ${s.id} has a caption of kind "${c.kind}". It can be title or sub`);
    caps.push({ t0: s.start + c.t0, t1: s.start + c.t1, e: el('div', { cls: `cap ${c.kind}`, html: fill(c.text) }) });
  }
  const foot = el('div', { cls: 'hud', style: { left: 'var(--margin)', top: '1002px' } });
  const veil = el('div', { style: { left: '0', top: '0', width: W + 'px', height: H + 'px', background: BG, zIndex: '1000' } });
  let footText = '';
  const hold = tl.data.ending === 'hold';
  return {
    footer(html) { footText = html; },
    veilAt(t) {
      let v = 0;
      tl.scenes.forEach((s, i) => {
        const next = tl.scenes[i + 1], a = t - s.start, b = s.start + s.length - t;
        const fIn = s.chapter || i === 0 ? FADE : s.cut === 'none' ? 0 : DIP, fOut = !next ? (hold ? 0 : FADE) : next.chapter ? FADE : next.cut === 'none' ? 0 : DIP;
        if (fIn && a >= 0 && a < fIn) v = Math.max(v, 1 - smooth(a / fIn));
        if (fOut && b >= 0 && b < fOut) v = Math.max(v, 1 - smooth(b / fOut));
      });
      return t < 0 || (t >= tl.duration && !hold) ? 1 : v;
    },
    update(t) {
      for (const c of caps) show(c.e, Math.min(smooth((t - c.t0) / 0.5), smooth((c.t1 - t) / 0.4)), 10);
      setHTML(foot, footText); show(foot, footText ? 1 : 0);
      const v = this.veilAt(t);
      veil.style.opacity = clamp01(v).toFixed(4); veil.style.visibility = v > 0.001 ? 'visible' : 'hidden';
    },
  };
}
