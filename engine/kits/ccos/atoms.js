// Atom-scale insets (SVG): how atoms leave the surface under three tools. Schematic, not to scale.
//   'eem'     a powder grain touches a surface atom, bonds to it, and carries it away (Mori et al. 2003's description)
//   'ibf'     an argon ion strikes, and a surface atom is knocked off (sputtering)
//   'plasma'  fluorine radicals attach to a silicon atom, and the SiF4 molecule drifts away as a gas
// update(tau) loops the event every PERIOD seconds; everything is a function of tau.
import { svg } from '../../core/ui.js';
import { C, f1, op, text as txt } from '../../core/draw.js';
import { clamp01, lerp, seg, smooth, smoother, theme } from '../../core/core.js';
import { BEAM } from './colors.js';

const PERIOD = 4.2;

export function atomInset(parent, kind, { x = 1344, y = 200, w = 480, h = 330 } = {}) {
  const g = svg('g', { transform: `translate(${x},${y})` }, parent);
  svg('rect', { x: 0, y: 0, width: w, height: h, rx: 12, fill: theme.panel.deep, stroke: C.rule, 'stroke-width': 1.5 }, g);
  txt(g, 18, 32, 'how atoms leave, schematic', { size: 19, fill: '#8a94a0' });
  const R = 13, NX = 13, X0 = 30, YS = h - 66;                           // atom radius, columns, first column, surface row y
  const lattice = svg('g', {}, g);
  const atoms = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < NX; c++) {
    const ax = X0 + c * 2.05 * R + (r % 2) * R, ay = YS + r * 1.8 * R;
    atoms.push({ c, r, e: svg('circle', { cx: ax, cy: ay, r: R, fill: r === 0 ? '#a7b2bd' : '#7d8894', stroke: '#2f3944', 'stroke-width': 1.5 }, lattice), ax, ay });
  }
  const target = atoms.find(a => a.r === 0 && a.c === 6);
  const tAtom = svg('circle', { r: R, fill: '#dfe4ea', stroke: '#2f3944', 'stroke-width': 1.5 }, g);
  target.e.style.opacity = '0';
  const surfLab = txt(g, w - 18, YS - R - 10, 'surface atoms', { size: 18, fill: '#8a94a0', anchor: 'end' });
  const cap = txt(g, 18, 62, '', { size: 21, fill: '#eef1f5' });
  const parts = {};
  if (kind === 'eem') {
    parts.grain = svg('circle', { r: 24, fill: '#e8e4da', stroke: '#8a94a0', 'stroke-width': 1.5 }, g);
    parts.bond = svg('line', { stroke: '#ffffff', 'stroke-width': 4, 'stroke-linecap': 'round' }, g);
    parts.water = svg('path', { d: `M14,${YS - 70}C${w * 0.3},${YS - 82} ${w * 0.6},${YS - 58} ${w - 14},${YS - 70}`, fill: 'none', stroke: theme.ccos.water, 'stroke-width': 2, 'stroke-dasharray': '8 8', opacity: 0.6 }, g);
    parts.gLab = txt(g, 0, 0, 'powder grain', { size: 19, fill: '#e8e4da', anchor: 'end' });
    txt(g, w - 18, YS - 80, 'water flow', { size: 18, fill: theme.ccos.water, anchor: 'end' });
    cap.innerHTML = 'The grain bonds to a surface atom and carries it off';
  } else if (kind === 'ibf') {
    parts.ion = svg('circle', { r: 9, fill: BEAM }, g);
    parts.trail = svg('line', { stroke: BEAM, 'stroke-width': 3, opacity: 0.5 }, g);
    parts.iLab = txt(g, 0, 0, 'Ar<tspan dy="-8" font-size="13">+</tspan>', { size: 19, fill: BEAM, anchor: 'start' });
    cap.innerHTML = 'An argon ion knocks a surface atom off';
  } else {
    parts.rad = [0, 1, 2, 3].map(() => svg('circle', { r: 9, fill: '#a9a0ff', stroke: '#e0dcff', 'stroke-width': 1 }, g));
    parts.bonds = [0, 1, 2, 3].map(() => svg('line', { stroke: '#a9a0ff', 'stroke-width': 3 }, g));
    parts.fLab = txt(g, 0, 0, 'F radicals', { size: 19, fill: '#a9a0ff', anchor: 'middle' });
    parts.mLab = txt(g, 0, 0, 'SiF<tspan dy="6" font-size="14">4</tspan><tspan dy="-6"> gas</tspan>', { size: 21, fill: '#eef1f5', anchor: 'start' });
    cap.innerHTML = 'Fluorine radicals turn a silicon atom into SiF<tspan dy="6" font-size="15">4</tspan><tspan dy="-6"> gas</tspan>';
  }
  const tx0 = target.ax, ty0 = target.ay;
  return {
    g,
    update(tau) {
      const k = Math.floor(tau / PERIOD), u = tau - k * PERIOD;
      let ax = tx0, ay = ty0, aO = 1;
      if (kind === 'eem') {
        // the grain drifts in with the water, touches (bond), then lifts off with the atom
        const inn = seg(u, 0.0, 1.4, smoother), lift = seg(u, 2.2, 3.6, smoother);
        const gx = lerp(40, tx0, inn) + lerp(0, 110, lift), gy = lerp(YS - 90, ty0 - R - 24 + 2, inn) - lerp(0, 70, lift);
        parts.grain.setAttribute('cx', f1(gx)); parts.grain.setAttribute('cy', f1(gy));
        const bondO = seg(u, 1.4, 1.9, smooth) * (1 - seg(u, 3.2, 3.6, smooth));
        ax = tx0 + lerp(0, 110, lift); ay = ty0 - lerp(0, 70, lift);
        parts.bond.setAttribute('x1', f1(gx)); parts.bond.setAttribute('y1', f1(gy + 22)); parts.bond.setAttribute('x2', f1(ax)); parts.bond.setAttribute('y2', f1(ay - R + 2));
        op(parts.bond, bondO);
        op(parts.grain, seg(u, 0, 0.3, smooth) * (1 - seg(u, 3.7, 4.1, smooth)));
        aO = 1 - seg(u, 3.7, 4.1, smooth);
        parts.gLab.setAttribute('x', f1(gx - 34)); parts.gLab.setAttribute('y', f1(gy + 6)); op(parts.gLab, seg(u, 0.9, 1.2, smooth) * (1 - seg(u, 3.5, 3.9, smooth)));
      } else if (kind === 'ibf') {
        const fly = seg(u, 0.3, 1.0, x => clamp01(x)), out = seg(u, 1.0, 2.6, x => 1 - Math.pow(1 - clamp01(x), 2));
        const ix = lerp(60, tx0 - 4, fly), iy = lerp(60, ty0 - R, fly);
        parts.ion.setAttribute('cx', f1(ix)); parts.ion.setAttribute('cy', f1(iy));
        parts.trail.setAttribute('x1', f1(lerp(60, ix, 0.4))); parts.trail.setAttribute('y1', f1(lerp(60, iy, 0.4))); parts.trail.setAttribute('x2', f1(ix)); parts.trail.setAttribute('y2', f1(iy));
        op(parts.ion, seg(u, 0.2, 0.4, smooth) * (1 - seg(u, 1.0, 1.3, smooth))); op(parts.trail, (u > 0.3 && u < 1.05) ? 0.5 : 0);
        parts.iLab.setAttribute('x', f1(ix + 18)); parts.iLab.setAttribute('y', f1(iy - 4)); op(parts.iLab, seg(u, 0.2, 0.4, smooth) * (1 - seg(u, 0.9, 1.1, smooth)));
        ax = tx0 + 150 * out; ay = ty0 - 160 * out;
        aO = 1 - seg(u, 2.6, 3.4, smooth);
        // a small jolt in the lattice where the ion hit
        const jolt = Math.exp(-6 * Math.max(0, u - 1.0)) * (u > 1.0 ? 1 : 0);
        atoms.forEach(a => { if (a === target) return; const d = Math.hypot(a.ax - tx0, a.ay - ty0); a.e.setAttribute('cx', f1(a.ax + jolt * 3 * Math.sin(u * 40 + a.c) * Math.exp(-d / 60))); });
      } else {
        // four radicals arrive and bond to the silicon atom; the molecule lifts off
        const lift = seg(u, 2.4, 3.8, smoother);
        ax = tx0 + 60 * lift; ay = ty0 - 105 * lift;
        parts.rad.forEach((c, j) => {
          const a0 = -Math.PI / 2 + (j - 1.5) * 0.75, arrive = seg(u, 0.2 + 0.35 * j, 0.9 + 0.35 * j, smoother);
          const bx = ax + (R + 9) * Math.cos(a0), by = ay + (R + 9) * Math.sin(a0);
          const sx = tx0 + 170 * Math.cos(a0 + 0.3 * j), sy = ty0 - 170 + 40 * j;
          const cx = lerp(sx, bx, arrive), cy = lerp(sy, by, arrive);
          c.setAttribute('cx', f1(cx)); c.setAttribute('cy', f1(cy)); op(c, seg(u, 0.1 + 0.35 * j, 0.4 + 0.35 * j, smooth) * (1 - seg(u, 3.7, 4.1, smooth)));
          const b = parts.bonds[j]; b.setAttribute('x1', f1(ax)); b.setAttribute('y1', f1(ay)); b.setAttribute('x2', f1(cx)); b.setAttribute('y2', f1(cy));
          op(b, (arrive > 0.97 ? 1 : 0) * (1 - seg(u, 3.7, 4.1, smooth)));
        });
        parts.fLab.setAttribute('x', f1(tx0 + 120)); parts.fLab.setAttribute('y', f1(ty0 - 150)); op(parts.fLab, seg(u, 0.2, 0.6, smooth) * (1 - seg(u, 1.8, 2.2, smooth)));
        parts.mLab.setAttribute('x', f1(ax + 34)); parts.mLab.setAttribute('y', f1(ay + 6)); op(parts.mLab, seg(u, 2.6, 3.0, smooth) * (1 - seg(u, 3.7, 4.1, smooth)));
        aO = 1 - seg(u, 3.7, 4.1, smooth);
      }
      tAtom.setAttribute('cx', f1(ax)); tAtom.setAttribute('cy', f1(ay));
      // a fresh atom takes the empty place when the loop restarts
      op(tAtom, Math.max(aO, seg(u, 4.0, 4.2, smooth)));
      if (u > 4.0) { tAtom.setAttribute('cx', f1(tx0)); tAtom.setAttribute('cy', f1(ty0)); }
    },
  };
}
