// core/timeline.js, core/facts.js, core/film.js: captions, a fact and a footer, moments found by name, and the veil between
// scenes. A video reads its timeline.json and facts.json from its folder. Here both are written out.
import { W, seg, smooth } from '../engine/core/core.js';
import { C, layer, op, set, text } from '../engine/core/draw.js';
import { Facts, drawnSvg } from '../engine/core/facts.js';
import { makeFilm } from '../engine/core/film.js';
import { Timeline } from '../engine/core/timeline.js';
import { svg } from '../engine/core/ui.js';
import { stage } from './_stage.js';

const DATA = {
  duration: 9, ending: 'hold', lines: [],
  scenes: [
    { id: 'A', start: 0, length: 5, chapter: 'One', cut: 'dip', beats: { first: 0.8, 'first:end': 2.0, second: 2.6, 'second.X': 3.3, 'second:end': 4.2 }, captions: [{ kind: 'sub', text: 'A caption that prints a fact, {F1}', t0: 0.6, t1: 4.6 }] },
    { id: 'B', start: 5, length: 4, chapter: null, cut: 'dip', beats: { last: 0.6, 'last:end': 2.0 }, captions: [{ kind: 'sub', text: 'The next scene, after a short dip', t0: 0.4, t1: 4 }] },
  ],
};
const FACTS = { facts: [{ id: 'F1', claim: 'a placeholder', value: 12, shown: '12 units', kind: 'schematic', how: 'placeholder' }] };

export const stills = [3.6, 4.93, 6];
export async function create() {
  const s = stage('Timeline, facts and film', '');
  const tl = new Timeline(DATA), facts = new Facts(FACTS), g = layer(document.getElementById('ui'));
  const X = t => 260 + t / tl.duration * 1400, Y = 560;
  svg('line', { x1: X(0), y1: Y, x2: X(tl.duration), y2: Y, stroke: C.rule, 'stroke-width': 3 }, g);
  for (const sc of tl.scenes) {
    text(g, X(sc.start) + 8, Y - 150, `scene ${sc.id}`, { size: 24, fill: C.sub });
    svg('line', { x1: X(sc.start), y1: Y - 170, x2: X(sc.start), y2: Y + 14, stroke: C.faint, 'stroke-width': 1.5 }, g);
    Object.entries(sc.beats).forEach(([k, v], i) => {
      svg('circle', { cx: X(sc.start + v), cy: Y, r: 6, fill: k.includes('.') ? C.amber : k.endsWith(':end') ? C.faint : C.title }, g);
      text(g, X(sc.start + v), Y + 46 + 34 * (i % 3), k, { size: 22, anchor: 'middle' });
    });
  }
  const now = svg('line', { y1: Y - 120, y2: Y + 10, stroke: C.ray, 'stroke-width': 3 }, g), word = text(g, W / 2, Y - 240, '', { size: 34, fill: C.title, anchor: 'middle' });
  text(g, W / 2, Y - 290, `this reads tl.scene('A').at('second.X') = ${drawnSvg(tl.scene('A').at('second.X'), 'a placeholder time')} s`, { size: 22, fill: C.dim, anchor: 'middle' });
  const film = makeFilm(tl, facts);
  return {
    ...s, duration: tl.duration,
    update(t) {
      const { id, tau } = tl.now(t), A = tl.scene('A');
      set(now, { x1: X(t), x2: X(t) });
      word.textContent = 'the mark X has been said'; op(word, id === 'A' ? seg(tau, A.at('second.X'), A.at('second.X', 0.2), smooth) : 0);
      film.footer('schematic, a footer that says so'); film.update(t);
    },
  };
}
