// Comparisons a newcomer can hold on to: a shelf of examples, and a small part scaled up to the size of the Earth.
// Each returns { g, update(tau) }, with tau the time since its scene started.
import { svg } from './ui.js';
import { C, DEG, f1, op, text } from './draw.js';
import { lerp, seg, smooth, smoother, theme } from './core.js';

/**
 * A shelf of cards, all in view, the one being said lit.
 * items: { name: [lines], size: [lines], req: [lines], src: [lines], draw(g) } with the picture drawn around (0, 0)
 * beats: in = when the first card comes in, step = delay between cards
 */
export function shelfDiagram(parent, items, { beats = {} } = {}) {
  const B = { in: 0.3, step: 0.35, ...beats };
  const g = svg('g', {}, parent);
  const CW = 326, GAP = 24, Y0 = 250, X0 = 96;
  const cards = items.map((it, k) => {
    const x = X0 + k * (CW + GAP);
    const cg = svg('g', { transform: `translate(${x},${Y0})` }, g);
    svg('rect', { x: 0, y: 0, width: CW, height: 640, rx: 14, fill: theme.panel.fill, stroke: theme.panel.line, 'stroke-width': 1.5 }, cg);
    const pic = svg('g', { transform: `translate(${CW / 2},180) scale(0.92)` }, cg);
    it.draw(pic);
    let y = 362;
    it.name.forEach(s1 => { text(cg, 24, y, s1, { size: 27, fill: C.title, weight: 600 }); y += 34; });
    y += 6;
    if (it.size) it.size.forEach(s1 => { text(cg, 24, y, s1, { size: 22, fill: C.text }); y += 30; });
    y += 14;
    it.req.forEach(r => { text(cg, 24, y, r, { size: 23, fill: '#eef1f5' }); y += 31; });
    it.src.forEach((s1, j) => text(cg, 24, 600 + 23 * j, s1, { size: 18, fill: C.dim }));
    return cg;
  });
  return {
    g, cards,
    // focus: the card in focus (-1, all), or lit: each card's focus from 0 to 1, for crossfades
    update(tau, { focus = -1, lit = null } = {}) {
      cards.forEach((c, k) => {
        const w = lit ? 0.62 + 0.38 * lit[k] : (focus < 0 || focus === k ? 1 : 0.62);
        c.style.opacity = (seg(tau, B.in + B.step * k, B.in + 0.6 + B.step * k, smooth) * w).toFixed(3);
      });
    },
  };
}

/**
 * A small part grows until it is as wide as the Earth, and its error grows with it.
 * beats: grow = the part starts to grow, bump = the grown error appears
 */
export function earthDiagram(parent, { factorText, bumpText, mirrorText, earthText, lineA, lineB, beats = {} }) {
  const B = { grow: 1.0, bump: 4.8, ...beats }, g0 = B.grow, b0 = B.bump;
  const g = svg('g', {}, parent);
  const CX = 1330, CY = 600, RE = 300;
  const earth = svg('circle', { cx: CX, cy: CY, r: RE, fill: '#13283d', stroke: '#4c7fa8', 'stroke-width': 3 }, g);
  const grid = svg('g', { stroke: '#2a4864', 'stroke-width': 1.2, fill: 'none' }, g);
  for (const f of [0.3, 0.65, 0.92]) svg('ellipse', { cx: CX, cy: CY, rx: RE * f, ry: RE }, grid);
  for (const f of [-0.6, -0.3, 0, 0.3, 0.6]) { const y = CY + RE * f, hw = Math.sqrt(RE * RE - (y - CY) ** 2); svg('line', { x1: CX - hw, y1: y, x2: CX + hw, y2: y }, grid); }
  const bar = svg('rect', { fill: '#c9d0d8' }, g);
  const barLab = text(g, 0, 0, mirrorText, { size: 26, fill: C.title, anchor: 'middle' });
  const earthLab = text(g, CX, CY + RE + 52, earthText, { size: 26, fill: C.title, anchor: 'middle' });
  const bump = svg('path', { fill: '#eef1f5', stroke: 'none' }, g);
  const call = svg('path', { fill: 'none', stroke: '#eef1f5', 'stroke-width': 2 }, g);
  const callLab = text(g, CX + RE * 0.64 + 60, CY - RE * 0.77 - 24, bumpText + ' (drawn larger)', { size: 24, fill: '#eef1f5' });
  const colA = text(g, 140, 520, lineA, { size: 40, fill: C.title, weight: 600 });
  const colF = text(g, 140, 580, factorText, { size: 28, fill: C.text });
  const colB = text(g, 140, 680, lineB, { size: 44, fill: '#ffffff', weight: 700 });
  return {
    g,
    update(tau) {
      const s = seg(tau, g0, g0 + 3.4, smoother);                           // the mirror grows into the Earth
      const w = lerp(280, 2 * RE, s), h = lerp(18, 2 * RE, s), rx = lerp(3, RE, s);
      const bx = lerp(CX - 140, CX - RE, s), by = lerp(CY - 9, CY - RE, s);
      bar.setAttribute('x', f1(bx)); bar.setAttribute('y', f1(by)); bar.setAttribute('width', f1(w)); bar.setAttribute('height', f1(h)); bar.setAttribute('rx', f1(rx));
      op(bar, 1 - seg(tau, g0 + 2.6, g0 + 3.6, smooth));
      barLab.setAttribute('x', f1(bx + w / 2)); barLab.setAttribute('y', f1(by - 22)); op(barLab, seg(tau, 0.2, 0.7, smooth) * (1 - seg(tau, g0, g0 + 0.5, smooth)));
      op(earth, seg(tau, g0 + 2.4, g0 + 3.6, smooth)); op(grid, seg(tau, g0 + 2.4, g0 + 3.6, smooth) * 0.8); op(earthLab, seg(tau, g0 + 3.2, g0 + 3.8, smooth));
      const bo = seg(tau, b0, b0 + 0.6, smooth);
      const ang = -50 * DEG, bxp = CX + RE * Math.cos(ang), byp = CY + RE * Math.sin(ang), nx = Math.cos(ang), ny = Math.sin(ang), tx = -ny, ty = nx;
      bump.setAttribute('d', `M${f1(bxp - 16 * tx)},${f1(byp - 16 * ty)}Q${f1(bxp + 24 * nx)},${f1(byp + 24 * ny)} ${f1(bxp + 16 * tx)},${f1(byp + 16 * ty)}Z`);
      call.setAttribute('d', `M${f1(bxp + 20 * nx)},${f1(byp + 20 * ny)}L${f1(CX + RE * 0.64 + 52)},${f1(CY - RE * 0.77 - 32)}`);
      op(bump, bo); op(call, bo); op(callLab, bo);
      op(colA, seg(tau, g0, g0 + 0.6, smooth)); op(colF, seg(tau, g0 + 1.0, g0 + 1.6, smooth)); op(colB, seg(tau, b0, b0 + 0.6, smooth));
    },
  };
}
