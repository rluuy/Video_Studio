// Footprint sizes on a log ruler, then one plan for every tool.
// rows: [{ tool, mm: [lo, hi] or null, label, src }], sourced sizes only. thumbs: [{ name, canvas }] footprints.
// The times inside are those of the CCOS explainer. Give them beats, as tilt.js has, when another video needs it.
import { svg } from '../../core/ui.js';
import { C, f1, op, text } from '../../core/draw.js';
import { lerp, seg, smooth, smoother, theme } from '../../core/core.js';

export function rulerDiagram(parent, { rows, thumbs, generic, footer = '', ruleFor = 'ion beam' }) {
  const g = svg('g', {}, parent);
  const AX0 = 470, AX1 = 1640, AY = 900, RY0 = 300, RDY = 64;
  const LMIN = Math.log10(0.1), LMAX = Math.log10(2000);
  const X = v => AX0 + (Math.log10(v) - LMIN) / (LMAX - LMIN) * (AX1 - AX0);
  const ruler = svg('g', {}, g);
  svg('line', { x1: AX0, y1: AY, x2: AX1, y2: AY, stroke: '#8a94a0', 'stroke-width': 2 }, ruler);
  [[0.1, '0.1 mm'], [1, '1 mm'], [10, '1 cm'], [100, '10 cm'], [1000, '1 m']].forEach(([v, s]) => {
    svg('line', { x1: X(v), y1: AY, x2: X(v), y2: AY + 10, stroke: '#8a94a0', 'stroke-width': 2 }, ruler);
    svg('line', { x1: X(v), y1: RY0 - 30, x2: X(v), y2: AY, stroke: '#1f2731', 'stroke-width': 1 }, ruler);
    text(ruler, X(v), AY + 38, s, { size: 21, fill: C.dim, anchor: 'middle', family: theme.font.mono });
  });
  text(ruler, AX1 + 20, AY - 10, 'size of the footprint', { size: 21, fill: C.dim });
  text(ruler, AX1 + 20, AY + 16, '(or of the tool)', { size: 21, fill: C.dim });
  text(ruler, AX0 - 10, AY + 146, footer, { size: 17, fill: C.dim });
  const rowEls = rows.map((r, k) => {
    const y = RY0 + k * RDY, e = svg('g', {}, ruler);
    text(e, AX0 - 24, y + 7, r.tool, { size: 26, fill: C.title, anchor: 'end', weight: 600 });
    if (r.mm) {
      const x0 = X(r.mm[0]), x1 = Math.max(X(r.mm[1]), x0 + 1);
      if (r.mm[0] === r.mm[1]) svg('circle', { cx: x0, cy: y, r: 10, fill: '#dfe4ea' }, e);
      else svg('rect', { x: x0 - 9, y: y - 9, width: x1 - x0 + 18, height: 18, rx: 9, fill: '#dfe4ea' }, e);
      const right = x1 + 26 < AX1 - 230;
      text(e, right ? x1 + 26 : x0 - 26, y + 7, r.label, { size: 21, fill: C.text, anchor: right ? 'start' : 'end' });
    } else text(e, AX0 + 10, y + 7, r.label, { size: 21, fill: C.dim, italic: true });
    return e;
  });
  const rule = svg('g', {}, ruler);
  const ib = rows.findIndex(r => r.tool === ruleFor && r.mm);              // the row that shows the 2d rule
  if (ib >= 0) {
    const d = rows[ib].mm[1], yb = RY0 + ib * RDY + 30;
    // a tick at 2d and an arrow toward larger ripples: everything from about 2d up can be corrected
    svg('path', { d: `M${X(2 * d)},${yb - 8}v16M${X(2 * d)},${yb}h64`, stroke: '#ffffff', 'stroke-width': 2, fill: 'none' }, rule);
    svg('path', { d: `M${X(2 * d) + 76},${yb}l-13,-6v12z`, fill: '#ffffff' }, rule);
    text(rule, X(2 * d) + 88, yb + 7, `a ${d} mm footprint fixes ripples down to about ${Math.round(2 * d)} mm (2d)`, { size: 20, fill: '#ffffff' });
  }
  const fineArrow = svg('g', {}, ruler), broadArrow = svg('g', {}, ruler);
  text(fineArrow, AX0 - 10, AY + 92, '←  small tools finish the details', { size: 24, fill: C.title });
  text(broadArrow, AX1 + 10, AY + 92, 'large tools take out the broad shape  →', { size: 24, fill: C.title, anchor: 'end' });
  // one plan for every tool: the footprints merge into one, then footprint, path and dwell time
  const same = svg('g', {}, g);
  const TW = 150, TG = 46, TX0 = (1920 - (thumbs.length * TW + (thumbs.length - 1) * TG)) / 2, TY = 420;
  const tEls = thumbs.map((t, k) => {
    const e = svg('g', {}, same);
    const fo = svg('foreignObject', { x: 0, y: 0, width: TW, height: TW }, e); fo.appendChild(t.canvas);
    Object.assign(t.canvas.style, { width: TW + 'px', height: TW + 'px', display: 'block', borderRadius: '8px' });
    text(e, TW / 2, TW + 32, t.name, { size: 21, fill: C.text, anchor: 'middle' });
    return e;
  });
  const gen = svg('g', {}, same);
  const gfo = svg('foreignObject', { x: 0, y: 0, width: 200, height: 200 }, gen); gfo.appendChild(generic);
  Object.assign(generic.style, { width: '200px', height: '200px', display: 'block', borderRadius: '10px' });
  const trio = svg('g', {}, same);
  const icon = (x, lab, draw) => { const e = svg('g', { transform: `translate(${x},640)` }, trio); draw(e); text(e, 0, 120, lab, { size: 26, fill: C.title, anchor: 'middle' }); return e; };
  const items = [
    icon(560, 'a footprint', e => { const p = []; for (let i = -60; i <= 60; i += 4) p.push(`${i},${(60 - 70 * Math.exp(-i * i / 700)).toFixed(1)}`); svg('polyline', { points: p.join(' '), fill: 'none', stroke: '#fde725', 'stroke-width': 4 }, e); }),
    icon(960, 'a path', e => svg('path', { d: 'M-70,0H70V22H-70V44H70V66H-70', fill: 'none', stroke: '#dfe4ea', 'stroke-width': 4, 'stroke-linejoin': 'round' }, e)),
    icon(1360, 'a time at each point', e => { [18, 46, 30, 64, 40, 22, 52].forEach((h, k) => svg('rect', { x: -70 + k * 20, y: 70 - h, width: 14, height: h, fill: ['#3b528b', '#21918c', '#5ec962', '#fde725', '#21918c', '#3b528b', '#5ec962'][k] }, e)); }),
  ];
  return {
    g,
    update(tau) {
      const rO = 1 - seg(tau, 10.2, 10.8, smooth);
      op(ruler, seg(tau, 0.2, 0.8, smooth) * rO);
      rowEls.forEach((e, k) => op(e, seg(tau, 0.6 + 0.25 * k, 1.1 + 0.25 * k, smooth)));
      op(fineArrow, seg(tau, 5.0, 5.6, smooth)); op(broadArrow, seg(tau, 5.6, 6.2, smooth)); op(rule, seg(tau, 2.8, 3.4, smooth));
      const sO = seg(tau, 10.6, 11.2, smooth);
      op(same, sO);
      const merge = seg(tau, 12.4, 14.0, smoother);
      tEls.forEach((e, k) => {
        const x = lerp(TX0 + k * (TW + TG), 960 - TW / 2, merge), y = lerp(TY, 300, merge);
        e.setAttribute('transform', `translate(${f1(x)},${f1(y)})`); op(e, seg(tau, 10.6 + 0.12 * k, 11.1 + 0.12 * k, smooth) * (1 - seg(tau, 13.4, 14.2, smooth)));
      });
      gen.setAttribute('transform', 'translate(860,250)'); op(gen, seg(tau, 13.6, 14.4, smooth) * (1 - seg(tau, 15.0, 15.6, smooth)));
      items.forEach((e, k) => op(e, seg(tau, 15.2 + 0.7 * k, 15.8 + 0.7 * k, smooth)));
    },
  };
}
