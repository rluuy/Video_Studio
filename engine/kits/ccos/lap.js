// A full-size lap on a sphere and on an asphere, in side view. The blank is concave. As a sphere (a circle in section) it fits the lap everywhere: the lap is an arc of the
// same circle and slides by turning about the circle's centre. The asphere's curvature changes across the part
// (1/R x (1 + 0.7 u + 0.35 u^2), u from -1 to 1), so the same rigid arc, rocked until it rests on two points, leaves gaps. The
// glowing gaps are the computed vertical distance between the two curves (shown larger than real, as everything here).
// The times inside are those of the CCOS explainer. Give them beats, as tilt.js has, when another video needs it.
import { svg } from '../../core/ui.js';
import { C, DEG, f1, op, text } from '../../core/draw.js';
import { lerp, seg, smooth, smoother } from '../../core/core.js';
import { PITCH } from './colors.js';

export function lapDiagram(parent) {
  const g = svg('g', {}, parent);
  const CX = 960, BASE = 800, HW = 440, RS = 1300, SURF0 = BASE - 120, CY0 = SURF0 - RS;
  const sph = X => SURF0 - (RS - Math.sqrt(RS * RS - (X - CX) ** 2));   // screen y of the sphere (y down; the edges are higher)
  const asph = X => { const x = X - CX, u = x / HW; return SURF0 - (x * x / (2 * RS)) * (1 + 0.7 * u / 3 + 0.35 * u * u / 6); };
  const blank = svg('path', { fill: '#7d8b98', stroke: '#a9b6c2', 'stroke-width': 2 }, g);
  const lapBody = svg('path', { fill: PITCH, stroke: '#8a7058', 'stroke-width': 2 }, g);
  const grooves = svg('path', { stroke: '#2b211a', 'stroke-width': 3, fill: 'none' }, g);
  const handle = svg('rect', { fill: '#4a525b', stroke: '#6b7480', 'stroke-width': 1.5, width: 80, height: 130 }, g);
  const glow = svg('path', { fill: 'none', stroke: '#fff1d6', 'stroke-width': 5, 'stroke-linecap': 'round' }, g);
  const gaps = svg('path', { fill: '#fff1d6' }, g);
  const labLap = text(g, 0, 0, 'lap', { size: 28, fill: C.title, weight: 600, anchor: 'end' });
  const labLap2 = text(g, 0, 0, 'pitch (a slow-flowing resin), about as wide as the part', { size: 22, fill: C.dim, anchor: 'end' });
  const labBlank = text(g, CX + HW + 36, BASE - 40, 'blank (glass)', { size: 26, fill: C.text });
  const labFit = text(g, CX, BASE + 74, 'Even contact everywhere (glow)', { size: 27, fill: '#fff1d6', anchor: 'middle' });
  const labGap = text(g, CX, BASE + 74, 'Gaps where the rigid lap cannot touch (light, exaggerated)', { size: 27, fill: '#fff1d6', anchor: 'middle' });
  const labShape = text(g, CX + HW + 36, BASE - 80, '', { size: 24, fill: C.dim });
  const LW = 360, LH = 74;
  return {
    g,
    update(tau) {
      const m = seg(tau, 12.0, 13.6, smoother);                          // sphere -> asphere
      const surf = X => lerp(sph(X), asph(X), m);
      const top = []; for (let X = CX - HW; X <= CX + HW + 0.1; X += 8) top.push(`${f1(X)},${f1(surf(X))}`);
      blank.setAttribute('d', `M${CX - HW},${BASE}L${top.join('L')}L${CX + HW},${BASE}Z`);
      // the lap: an arc of the sphere, turned about the sphere's centre by phi, then seated on the surface
      const phi0 = (100 / RS) * Math.sin(2 * Math.PI * (tau - 0.8) / 3.4) * seg(tau, 0.6, 1.4, smooth);
      // seat the rigid arc. A lap at angle ph is dropped until it touches (off), and scored by its mean gap. On the full
      // asphere, each small rocking angle is scored and a soft minimum taken, so the seat moves smoothly as the lap slides.
      // The lap rocks toward that seat as the surface morphs (m), so nothing jumps when the morph starts.
      const gapAt = (ph, sf) => {
        let o2 = Infinity, sum = 0, n = 0;
        const XY = [];
        for (let s1 = -LW; s1 <= LW; s1 += 6) { const a2 = ph + s1 / RS, X = CX + RS * Math.sin(a2), Y = CY0 + RS * Math.cos(a2); if (X < CX - HW || X > CX + HW) continue; XY.push([X, Y]); o2 = Math.min(o2, sf(X) - Y); }
        for (const [X, Y] of XY) { sum += sf(X) - (Y + o2); n++; }
        return { off: o2, sc: sum / Math.max(n, 1) };
      };
      let dev = 0;
      if (m > 0) {
        const sc = []; for (let j = -15; j <= 15; j++) sc.push(gapAt(phi0 + j * 0.003, asph).sc);   // a small rock, so the lap stays on the blank
        const lo = Math.min(...sc); let sw = 0, sj = 0;
        sc.forEach((s, i) => { const w = Math.exp(-(s - lo) / 0.1); sw += w; sj += w * (i - 15) * 0.003; });
        dev = sj / sw;
      }
      const phi = phi0 + m * dev, off0 = gapAt(phi, surf).off, off = isFinite(off0) ? off0 : 0;
      const arc = s => { const a = phi + s / RS; return [CX + RS * Math.sin(a), CY0 + RS * Math.cos(a), Math.sin(a), Math.cos(a)]; };
      const bot = [], tp = [];
      for (let s = -LW; s <= LW + 0.1; s += 8) { const [X, Y, sx, cy] = arc(s); bot.push(`${f1(X)},${f1(Y + off)}`); tp.push(`${f1(X - LH * sx)},${f1(Y + off - LH * cy)}`); }
      lapBody.setAttribute('d', `M${bot.join('L')}L${tp.reverse().join('L')}Z`);
      let gd = ''; for (let k = -4; k <= 4; k++) { const [X, Y, sx, cy] = arc(k * 76); gd += `M${f1(X - 4 * sx)},${f1(Y + off - 4 * cy)}L${f1(X - 28 * sx)},${f1(Y + off - 28 * cy)}`; }
      grooves.setAttribute('d', gd);
      const [HX, HY, hs, hc] = arc(0);
      handle.setAttribute('x', f1(HX - LH * hs - 40)); handle.setAttribute('y', f1(HY + off - LH * hc - 128));
      handle.setAttribute('transform', `rotate(${(-phi / DEG).toFixed(2)},${f1(HX - LH * hs)},${f1(HY + off - LH * hc)})`);
      // contact line and gaps: the vertical distance between the lap's face and the surface
      let gl = '', gp = '';
      for (let s = -LW; s <= LW; s += 4) {
        const [X, Y] = arc(s); if (X < CX - HW || X > CX + HW) continue;
        const gap = surf(X) - (Y + off);
        gl += `${gl ? 'L' : 'M'}${f1(X)},${f1(Y + off)}`;
        if (gap > 0.6) gp += `M${f1(X - 2.2)},${f1(Y + off)}h4.4V${f1(Y + off + gap * 2)}h-4.4Z`;
      }
      glow.setAttribute('d', gl); op(glow, seg(tau, 2.0, 2.8, smooth) * (1 - m) * 0.9);
      gaps.setAttribute('d', gp); op(gaps, seg(tau, 13.4, 14.2, smooth) * 0.9);
      const [LX, LY] = arc(-LW);
      labLap.setAttribute('x', '96'); labLap.setAttribute('y', f1(LY + off - 112)); labLap.setAttribute('text-anchor', 'start');
      labLap2.setAttribute('x', '96'); labLap2.setAttribute('y', f1(LY + off - 82)); labLap2.setAttribute('text-anchor', 'start');
      op(labFit, seg(tau, 2.4, 3.0, smooth) * (1 - seg(tau, 11.6, 12.2, smooth)));
      op(labGap, seg(tau, 13.8, 14.4, smooth));
      labShape.innerHTML = m < 0.5 ? 'a sphere, one curvature everywhere' : 'an asphere, its curvature changes';
      op(labShape, seg(tau, 6.4, 7.0, smooth) * (1 - seg(tau, 11.6, 12.0, smooth)) + seg(tau, 13.0, 13.6, smooth));
      op(labBlank, 1);
    },
  };
}
