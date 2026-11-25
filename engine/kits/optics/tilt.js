// Tilt a flat mirror by theta and the reflected light turns by 2 theta, then a wavy surface sends each ray its own way.
// The reflected rays follow the law of reflection, d' = d - 2 (d . n) n. Returns { g, update(tau) }.
import { svg } from '../../core/ui.js';
import { C, DEG, arcPath, arrowHead, f1, math, op, placeHead, text } from '../../core/draw.js';
import { lerp, seg, smooth, smoother, theme } from '../../core/core.js';

/**
 * tilt: the mirror's tilt (deg)
 * beats: ray = the light comes in, normal = the normal appears, tilt = the mirror starts to turn, clear = the first
 * picture fades, wavy = the wavy surface and its fan of rays
 */
export function tiltDiagram(parent, { tilt = 9, beats = {} } = {}) {
  const B = { ray: 0.2, normal: 0.6, tilt: 1.6, clear: 6.3, wavy: 6.9, ...beats }, t0 = B.tilt, w0 = B.wavy;
  const g = svg('g', {}, parent);
  const HX = 960, HY = 700, L = 330, IN = 34 * DEG;                     // hit point, half length of the mirror, angle of incidence
  const hatch = svg('g', {}, g);
  const mirror = svg('line', { stroke: theme.object.mirror, 'stroke-width': 7, 'stroke-linecap': 'round' }, g);
  const normal = svg('line', { stroke: C.dim, 'stroke-width': 2, 'stroke-dasharray': '9 8' }, g);
  const normal0 = svg('line', { stroke: C.faint, 'stroke-width': 1.5, 'stroke-dasharray': '6 8' }, g);
  const inRay = svg('line', { stroke: C.ray, 'stroke-width': 4 }, g), inHead = arrowHead(g, C.ray, 18);
  const ghost = svg('line', { stroke: C.ray, 'stroke-width': 3, 'stroke-dasharray': '10 9', opacity: 0.45 }, g);
  const outRay = svg('line', { stroke: C.ray, 'stroke-width': 4 }, g), outHead = arrowHead(g, C.ray, 18);
  const arcT = svg('path', { fill: 'none', stroke: C.title, 'stroke-width': 3 }, g), arc2T = svg('path', { fill: 'none', stroke: C.title, 'stroke-width': 3 }, g);
  const labT = math(g, 0, 0, 'θ', { fill: C.title, size: 40 }), lab2T = math(g, 0, 0, '2θ', { fill: C.title, size: 40 });
  const labBefore = text(g, 0, 0, 'before the tilt (dashed)', { size: 22, fill: C.dim }), labAfter = text(g, 0, 0, 'after the tilt', { size: 22, fill: C.text });
  const labN = text(g, HX + 12, HY - 300, 'normal, at right angles to the mirror', { size: 22, fill: C.dim });
  const labM = text(g, HX + L + 30, HY + 8, 'mirror', { size: 24, fill: C.text });
  // the second beat: a wavy surface and a fan of rays, each reflected by its local slope
  const wavy = svg('path', { fill: 'none', stroke: theme.object.mirror, 'stroke-width': 7, 'stroke-linecap': 'round' }, g);
  const fan = Array.from({ length: 9 }, () => ({ i: svg('line', { stroke: C.ray, 'stroke-width': 3 }, g), o: svg('line', { stroke: C.ray, 'stroke-width': 3 }, g), h: arrowHead(g, C.ray, 14) }));
  const SURF = x => 26 * Math.sin((x - HX) / 95) + 14 * Math.sin((x - HX) / 41 + 1.3);   // px of height, schematic
  const SLOPE = x => 26 / 95 * Math.cos((x - HX) / 95) + 14 / 41 * Math.cos((x - HX) / 41 + 1.3);
  for (let k = -9; k <= 9; k++) svg('line', { x1: 0, y1: 0, x2: -14, y2: 16, stroke: C.faint, 'stroke-width': 2, 'data-k': k }, hatch);
  return {
    g,
    update(tau) {
      const a = seg(tau, t0, t0 + 2.8, smoother) * tilt * DEG;              // the mirror's tilt (clockwise on screen)
      const beat2 = seg(tau, w0, w0 + 0.8, smooth);
      const one = 1 - seg(tau, B.clear, B.clear + 0.6, smooth);
      // mirror line, rotated about the hit point (screen y is down, so a clockwise tilt lowers the right end)
      const ux = Math.cos(a), uy = Math.sin(a);
      mirror.setAttribute('x1', f1(HX - L * ux)); mirror.setAttribute('y1', f1(HY - L * uy)); mirror.setAttribute('x2', f1(HX + L * ux)); mirror.setAttribute('y2', f1(HY + L * uy));
      op(mirror, one);
      [...hatch.children].forEach(e => {
        const k = +e.getAttribute('data-k'), s = k * L / 9.5, x = HX + s * ux, y = HY + s * uy;
        e.setAttribute('x1', f1(x)); e.setAttribute('y1', f1(y)); e.setAttribute('x2', f1(x - 14 * ux + 16 * Math.sin(a) * 0)); e.setAttribute('y2', f1(y + 18));
      });
      op(hatch, one);
      // normal of the tilted mirror
      const nx = uy, ny = -ux;                                           // perpendicular (u . n = 0), pointing up the screen
      normal.setAttribute('x1', f1(HX)); normal.setAttribute('y1', f1(HY)); normal.setAttribute('x2', f1(HX + 380 * nx)); normal.setAttribute('y2', f1(HY + 380 * ny));
      normal0.setAttribute('x1', f1(HX)); normal0.setAttribute('y1', f1(HY)); normal0.setAttribute('x2', f1(HX)); normal0.setAttribute('y2', f1(HY - 300));
      op(normal, one * seg(tau, B.normal, B.normal + 0.6, smooth)); op(normal0, one * seg(tau, t0, t0 + 0.6, smooth));
      // the label sits left of the normal's tip, above where the incoming ray starts, so no ray crosses it
      labN.setAttribute('x', f1(HX + 380 * nx - 16)); labN.setAttribute('y', f1(HY + 380 * ny + 8)); labN.setAttribute('text-anchor', 'end');
      op(labN, one * seg(tau, B.normal, B.normal + 0.6, smooth));
      labM.setAttribute('x', f1(HX + L * ux + 30)); labM.setAttribute('y', f1(HY + L * uy + 8)); op(labM, one);
      // incoming ray from the upper left at angle IN from the vertical
      const sx = HX - 420 * Math.sin(IN), sy = HY - 420 * Math.cos(IN);
      const inP = seg(tau, B.ray, B.ray + 0.7, smooth);
      inRay.setAttribute('x1', f1(sx)); inRay.setAttribute('y1', f1(sy)); inRay.setAttribute('x2', f1(lerp(sx, HX, inP))); inRay.setAttribute('y2', f1(lerp(sy, HY, inP)));
      placeHead(inHead, lerp(sx, HX, inP * 0.62), lerp(sy, HY, inP * 0.62), Math.atan2(HY - sy, HX - sx));
      op(inRay, one); op(inHead, one * (inP > 0.05 ? 1 : 0));
      // reflected ray: d' = d - 2 (d . n) n
      const dx = (HX - sx) / 420, dy = (HY - sy) / 420, dn = dx * nx + dy * ny;
      const rx = dx - 2 * dn * nx, ry = dy - 2 * dn * ny;
      const outP = seg(tau, B.ray + 0.7, B.ray + 1.3, smooth);
      outRay.setAttribute('x1', f1(HX)); outRay.setAttribute('y1', f1(HY)); outRay.setAttribute('x2', f1(HX + 420 * rx * outP)); outRay.setAttribute('y2', f1(HY + 420 * ry * outP));
      placeHead(outHead, HX + 300 * rx * outP, HY + 300 * ry * outP, Math.atan2(ry, rx));
      op(outRay, one); op(outHead, one * (outP > 0.05 ? 1 : 0));
      // the untilted reflection, left as a ghost
      const r0x = Math.sin(IN), r0y = -Math.cos(IN);
      ghost.setAttribute('x1', f1(HX)); ghost.setAttribute('y1', f1(HY)); ghost.setAttribute('x2', f1(HX + 420 * r0x)); ghost.setAttribute('y2', f1(HY + 420 * r0y));
      op(ghost, one * seg(tau, t0, t0 + 0.4, smooth));
      // arcs: theta between the two normals, 2 theta between the two reflected rays
      // the labels wait until the angles are wide enough to hold them
      const ao = seg(tau, t0 + 0.6, t0 + 1.2, smooth) * one, lo = seg(tau, t0 + 1.9, t0 + 2.5, smooth) * one;
      const an0 = -Math.PI / 2, an1 = Math.atan2(ny, nx);
      arcT.setAttribute('d', arcPath(HX, HY, 150, Math.min(an0, an1), Math.max(an0, an1)));
      const ar0 = Math.atan2(r0y, r0x), ar1 = Math.atan2(ry, rx);
      arc2T.setAttribute('d', arcPath(HX, HY, 250, Math.min(ar0, ar1), Math.max(ar0, ar1)));
      op(arcT, ao * (a > 0.5 * DEG ? 1 : 0)); op(arc2T, ao * (a > 0.5 * DEG ? 1 : 0));
      const am = (an0 + an1) / 2, a2m = (ar0 + ar1) / 2;
      labT.setAttribute('x', f1(HX + 182 * Math.cos(am) - 10)); labT.setAttribute('y', f1(HY + 182 * Math.sin(am) + 4));
      lab2T.setAttribute('x', f1(HX + 290 * Math.cos(a2m) + 4)); lab2T.setAttribute('y', f1(HY + 290 * Math.sin(a2m) + 4));
      op(labT, lo); op(lab2T, lo);
      labBefore.setAttribute('x', f1(HX + 430 * r0x + 14)); labBefore.setAttribute('y', f1(HY + 430 * r0y + 6)); op(labBefore, lo);
      labAfter.setAttribute('x', f1(HX + 430 * rx + 14)); labAfter.setAttribute('y', f1(HY + 430 * ry + 6)); op(labAfter, lo);
      // second beat
      const pts = []; for (let x = HX - L; x <= HX + L; x += 6) pts.push(`${x === HX - L ? 'M' : 'L'}${f1(x)},${f1(HY - SURF(x) * beat2)}`);
      wavy.setAttribute('d', pts.join('')); op(wavy, beat2);
      fan.forEach((f, k) => {
        const x = HX - L * 0.82 + k * (2 * L * 0.82) / (fan.length - 1), y = HY - SURF(x) * beat2;
        const s = -SLOPE(x) * beat2;                                     // screen slope dy/dx of the surface
        let mnx = s, mny = -1; const mL = Math.hypot(mnx, mny); mnx /= mL; mny /= mL;   // normal, pointing up the screen
        const ddn = 0 * mnx + 1 * mny;                                   // incoming straight down: d = (0, 1)
        const ox = 0 - 2 * ddn * mnx, oy = 1 - 2 * ddn * mny;
        const p = seg(tau, w0 + 0.1 + 0.05 * k, w0 + 1.0 + 0.05 * k, smooth);
        f.i.setAttribute('x1', f1(x)); f.i.setAttribute('y1', f1(y - 340)); f.i.setAttribute('x2', f1(x)); f.i.setAttribute('y2', f1(y));
        f.o.setAttribute('x1', f1(x)); f.o.setAttribute('y1', f1(y)); f.o.setAttribute('x2', f1(x + 330 * ox * p)); f.o.setAttribute('y2', f1(y + 330 * oy * p));
        placeHead(f.h, x + 330 * ox * p, y + 330 * oy * p, Math.atan2(oy, ox));
        op(f.i, beat2); op(f.o, beat2 * (p > 0.02 ? 1 : 0)); op(f.h, beat2 * (p > 0.05 ? 1 : 0));
      });
    },
  };
}
