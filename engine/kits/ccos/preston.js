// Preston's rule: removed depth = k x P x V x T, shown with arrows (P amber, V blue), a clock (T) and a depth gauge
// The times inside are those of the CCOS explainer. Give them beats, as tilt.js has, when another video needs it.
import { svg } from '../../core/ui.js';
import { C, arrowHead, f1, math, op, placeHead, text } from '../../core/draw.js';
import { clamp01, lerp, seg, smooth, theme } from '../../core/core.js';
import { PITCH } from './colors.js';

export function prestonDiagram(parent) {
  const g = svg('g', {}, parent);
  const GX = 520, GY = 760, GW = 760;                                   // glass block (top-left x, top y, width)
  svg('rect', { x: GX, y: GY, width: GW, height: 150, fill: '#7d8b98', stroke: '#a9b6c2', 'stroke-width': 2 }, g);
  text(g, GX + GW - 16, GY + 128, 'glass', { size: 24, fill: '#1c242e', anchor: 'end', weight: 600 });
  const removed = svg('rect', { x: GX + 120, width: 520, fill: '#0b0f14', opacity: 0.0 }, g);   // the layer removed so far (drawn thick)
  const remLab = text(g, GX + GW + 16, GY + 14, 'removed layer, drawn thick', { size: 20, fill: C.dim });
  const pad = svg('g', {}, g);
  svg('rect', { x: -230, y: -64, width: 460, height: 48, rx: 6, fill: PITCH, stroke: '#8a7058', 'stroke-width': 2 }, pad);
  svg('rect', { x: -60, y: -150, width: 120, height: 86, fill: '#4a525b', stroke: '#6b7480', 'stroke-width': 1.5 }, pad);
  text(pad, 0, -30, 'pad', { size: 22, fill: '#eadbc8', anchor: 'middle', weight: 600 });
  const slurry = svg('g', {}, g);
  const SL = Array.from({ length: 38 }, (_, k) => svg('circle', { r: 4 + (k * 7) % 4, fill: '#d8c7a4', opacity: 0.9 }, slurry));
  text(g, GX, GY + 190, 'beige grains under the pad, the slurry (abrasive grains in water)', { size: 22, fill: '#d8c7a4' });
  const pArrows = Array.from({ length: 6 }, () => ({ l: svg('line', { stroke: C.amber, 'stroke-width': 7 }, g), h: arrowHead(g, C.amber, 22) }));
  const vArrow = { l: svg('line', { stroke: C.blue, 'stroke-width': 9 }, g), h: arrowHead(g, C.blue, 26) };
  const labP = math(g, 0, 0, 'P', { fill: C.amber, size: 44, italic: true });
  const labV = math(g, 0, 0, 'V', { fill: C.blueText, size: 44, italic: true });
  // clock (T)
  const CKX = 1560, CKY = 640, CKR = 70;
  svg('circle', { cx: CKX, cy: CKY, r: CKR, fill: '#10161d', stroke: C.title, 'stroke-width': 3 }, g);
  for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; svg('line', { x1: CKX + 58 * Math.cos(a), y1: CKY + 58 * Math.sin(a), x2: CKX + 66 * Math.cos(a), y2: CKY + 66 * Math.sin(a), stroke: C.dim, 'stroke-width': 2 }, g); }
  const sweep = svg('path', { fill: 'rgba(238,241,245,0.16)' }, g);
  const hand = svg('line', { stroke: C.title, 'stroke-width': 4, 'stroke-linecap': 'round' }, g);
  const labT = math(g, CKX - 12, CKY + CKR + 52, 'T', { fill: C.title, size: 44 });
  text(g, CKX + 26, CKY + CKR + 50, 'time', { size: 22, fill: C.dim });
  // depth gauge
  const DGX = 340, DGY = 420, DGH = 380;
  svg('rect', { x: DGX, y: DGY, width: 44, height: DGH, fill: '#10161d', stroke: '#3a434d', 'stroke-width': 1.5 }, g);
  const gauge = svg('rect', { x: DGX + 4, width: 36, fill: '#dfe4ea' }, g);
  const gaugeRef = svg('line', { x1: DGX - 10, x2: DGX + 54, stroke: C.dim, 'stroke-width': 2, 'stroke-dasharray': '5 5' }, g);
  text(g, DGX + 22, DGY - 44, 'removed', { size: 22, fill: C.dim, anchor: 'middle' });
  text(g, DGX + 22, DGY - 18, 'depth', { size: 22, fill: C.dim, anchor: 'middle' });
  const gaugeLab = text(g, DGX + 66, 0, '', { size: 26, fill: C.title });
  // the formula, assembled term by term
  const F = svg('g', {}, g);
  const fTerms = [['removed depth', C.title, theme.font.sans, false], ['=', C.title, theme.font.math, false], ['k', '#a9b3be', theme.font.math, true],
    ['×', C.title, theme.font.math, false], ['P', C.amber, theme.font.math, true], ['×', C.title, theme.font.math, false],
    ['V', C.blueText, theme.font.math, true], ['×', C.title, theme.font.math, false], ['T', C.title, theme.font.math, true]];
  const fx = [480, 800, 862, 920, 978, 1040, 1098, 1162, 1218];
  const fEls = fTerms.map(([s, col, fam, it], k) => text(F, fx[k], 330, s, { size: k === 0 ? 46 : 54, fill: col, family: fam, italic: it, weight: k === 0 ? 600 : 400 }));
  const beatLab = text(g, 960, 410, '', { size: 30, fill: C.title, anchor: 'middle' });
  const kNote = text(g, 960, 410, 'k depends on the pad, the slurry and the glass', { size: 28, fill: '#a9b3be', anchor: 'middle' });
  // beats: [t0, t1, P, V, label]
  const BEATS = [[13.4, 16.2, 2, 1, 'Press twice as hard, and the depth grows twice as fast'], [16.6, 19.4, 1, 2, 'Slide twice as fast, and it grows twice as fast'],
    [19.8, 22.9, 1, 1, 'Run twice as long, and it goes twice as deep']];
  return {
    g,
    update(tau) {
      // which beat, and the depth: d = P V (t - t0), normalized so one unit run (P = V = 1 for 2.5 s) fills a quarter of the
      // gauge. Each beat first drains the gauge and rewinds the clock (DR s), then runs, so nothing jumps between beats.
      const base = [10.4, 12.9], U = base[1] - base[0], DR = 0.25;       // a reference run before the beats
      let P = 1, V = 1, run = 0, lab = '', labO = 0, done = 1e9, prev = 0, prevT = 0, prevLab = '', r = 1;
      if (tau >= base[0] && tau < BEATS[0][0]) { run = clamp01((tau - base[0]) / U); done = base[1]; }
      BEATS.forEach(([a, b, p, v, s], k) => {
        const next = k === 2 ? 23.4 : BEATS[k + 1][0];
        if (tau >= a && (k === 2 || tau < next)) {
          const a2 = a + DR, dur = (k === 2 ? 2 : 1) * U;
          P = p; V = v; lab = s;
          run = clamp01((tau - a2) / dur) * (k === 2 ? 2 : 1); done = a2 + dur;
          prev = k === 0 ? 1 : BEATS[k - 1][2] * BEATS[k - 1][3]; prevT = 1; prevLab = k === 0 ? 'one run' : 'twice as deep';
          r = seg(tau, a, a2, smooth);
          labO = seg(tau, a, a + 0.3, smooth) * (1 - seg(tau, next - 0.3, next, smooth));
        }
      });
      const depth = P * V * run + prev * (1 - r);                        // in units of the reference run, the new run plus what drains
      const tRun = run + prevT * (1 - r);
      const unit = DGH / 4.4;
      gauge.setAttribute('y', f1(DGY + DGH - depth * unit)); gauge.setAttribute('height', f1(Math.max(0, depth * unit)));
      gaugeRef.setAttribute('y1', f1(DGY + DGH - unit)); gaugeRef.setAttribute('y2', f1(DGY + DGH - unit)); op(gaugeRef, seg(tau, BEATS[0][0], BEATS[0][0] + 0.4, smooth) * 0.9);
      gaugeLab.setAttribute('y', f1(DGY + DGH - depth * unit + 8));
      gaugeLab.innerHTML = r < 1 ? prevLab : tau < BEATS[0][0] ? 'one run' : 'twice as deep';
      op(gaugeLab, r < 1 ? 1 - r : seg(tau, done, done + 0.25, smooth));
      // pad position: slides right and left. Its speed doubles in the second beat, with short ramps, and the phase is the
      // integral of the speed, so the pad never jumps.
      const wv = t => seg(t, BEATS[1][0], BEATS[1][0] + 0.3, smooth) * (1 - seg(t, BEATS[2][0], BEATS[2][0] + 0.3, smooth));
      let extra = 0;
      for (let t1 = BEATS[1][0]; t1 < tau; t1 += 0.01) { const dt = Math.min(0.01, tau - t1); extra += wv(t1 + dt / 2) * dt; }
      const ph = (tau - 1 + extra) * 0.9;
      const px = 960 + 120 * Math.sin(ph * 1.7);
      pad.setAttribute('transform', `translate(${f1(px)},${GY - 10})`);
      removed.setAttribute('y', f1(GY)); removed.setAttribute('height', f1(Math.min(18, 4 * depth))); op(removed, depth > 0 ? 0.85 : 0); op(remLab, clamp01((depth - 0.15) / 0.3));
      SL.forEach((c, k) => { const u = ((k * 0.618 + ph * 0.07 * (1 + (k % 3))) % 1); c.setAttribute('cx', f1(px - 220 + 440 * u)); c.setAttribute('cy', f1(GY - 8 - (k % 3) * 3)); });
      // P arrows: three, or six in the first beat. The first three slide to the new spacing while the other three fade.
      const w6 = seg(tau, BEATS[0][0], BEATS[0][0] + 0.35, smooth) * (1 - seg(tau, BEATS[1][0], BEATS[1][0] + 0.35, smooth)), pO = seg(tau, 6.4, 7.0, smooth);
      pArrows.forEach((a, k) => {
        const on = k < 3 ? 1 : w6, x = px - 150 + k * (k < 3 ? lerp(150, 60, w6) : 60);
        a.l.setAttribute('x1', f1(x)); a.l.setAttribute('y1', f1(GY - 260)); a.l.setAttribute('x2', f1(x)); a.l.setAttribute('y2', f1(GY - 96));
        placeHead(a.h, x, GY - 84, Math.PI / 2); op(a.l, pO * on); op(a.h, pO * on);
      });
      labP.setAttribute('x', f1(px - 240)); labP.setAttribute('y', f1(GY - 190)); op(labP, pO);
      const vO = seg(tau, 8.4, 9.0, smooth), vl = 150 + 150 * wv(tau);
      vArrow.l.setAttribute('x1', f1(px + 250)); vArrow.l.setAttribute('y1', f1(GY - 40)); vArrow.l.setAttribute('x2', f1(px + 250 + vl)); vArrow.l.setAttribute('y2', f1(GY - 40));
      placeHead(vArrow.h, px + 262 + vl, GY - 40, 0); op(vArrow.l, vO); op(vArrow.h, vO);
      labV.setAttribute('x', f1(px + 270 + vl / 2 - 14)); labV.setAttribute('y', f1(GY - 64)); op(labV, vO);
      // clock: the hand sweeps while the run lasts
      const tO = seg(tau, 10.4, 11.0, smooth), a0 = -Math.PI / 2, a1 = a0 + Math.PI * tRun;
      hand.setAttribute('x1', CKX); hand.setAttribute('y1', CKY); hand.setAttribute('x2', f1(CKX + 56 * Math.cos(a1))); hand.setAttribute('y2', f1(CKY + 56 * Math.sin(a1)));
      sweep.setAttribute('d', tRun > 0.01 ? `M${CKX},${CKY}L${f1(CKX + 60 * Math.cos(a0))},${f1(CKY + 60 * Math.sin(a0))}A60,60 0 ${tRun > 1 ? 1 : 0} 1 ${f1(CKX + 60 * Math.cos(a1))},${f1(CKY + 60 * Math.sin(a1))}Z` : '');
      op(hand, tO); op(sweep, tO); op(labT, tO);
      // formula terms light up with their pictures
      const lit = [seg(tau, 1.0, 1.6, smooth), seg(tau, 1.0, 1.6, smooth), seg(tau, 23.4, 24.0, smooth), seg(tau, 6.6, 7.2, smooth), seg(tau, 6.6, 7.2, smooth),
        seg(tau, 8.6, 9.2, smooth), seg(tau, 8.6, 9.2, smooth), seg(tau, 10.6, 11.2, smooth), seg(tau, 10.6, 11.2, smooth)];
      fEls.forEach((e, k) => op(e, k === 2 ? lit[1] * (0.5 + 0.5 * lit[k]) : lit[k]));
      beatLab.innerHTML = lab; op(beatLab, labO);
      op(kNote, seg(tau, 23.6, 24.2, smooth));
    },
  };
}
