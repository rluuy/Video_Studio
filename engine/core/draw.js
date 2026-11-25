// Flat drawing in SVG over the dark field: a full-frame layer, text and math labels, arrow heads, arcs, opacity.
import { svg } from './ui.js';
import { C, clamp01, theme } from './core.js';

export { C };
export const DEG = Math.PI / 180;
export const f1 = v => v.toFixed(1);

/** a full-frame SVG layer. Draw in frame pixels (1920 x 1080) */
export function layer(parent) { return svg('svg', { width: 1920, height: 1080, style: 'position:absolute;left:0;top:0;overflow:visible' }, parent); }

/** one line of text. s may hold tspans. anchor: start, middle or end */
export function text(g, x, y, s, { size = 24, fill = C.text, anchor = 'start', weight = 400, family = theme.font.sans, italic = false } = {}) {
  const e = svg('text', { x, y, 'font-size': size, fill, 'text-anchor': anchor, 'font-weight': weight, 'font-family': family, 'font-style': italic ? 'italic' : 'normal' }, g);
  e.innerHTML = s; return e;
}
/** a math symbol or short formula in the math font, italic unless told otherwise */
export const math = (g, x, y, s, o = {}) => { const e = text(g, x, y, s, Object.assign({ family: theme.font.math, italic: true, size: 34, fill: C.title }, o)); e.setAttribute('class', 'formula'); return e; };

/** an arrow head drawn at the origin, pointing along +x. Put it in place with placeHead */
export function arrowHead(g, color, size = 14) {
  return svg('path', { d: `M0,0L${-size},${-size * 0.45}L${-size},${size * 0.45}Z`, fill: color }, g);
}
export function placeHead(h, x, y, ang) { h.setAttribute('transform', `translate(${f1(x)},${f1(y)}) rotate(${(ang / DEG).toFixed(2)})`); }

/** opacity of an SVG element */
export const op = (e, o) => { e.style.opacity = clamp01(o).toFixed(3); };

/** a circular arc from angle a0 to a1 (radians, screen y down) */
export const arcPath = (cx, cy, r, a0, a1) => {
  const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0), x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
  return `M${f1(x0)},${f1(y0)}A${r},${r} 0 ${Math.abs(a1 - a0) > Math.PI ? 1 : 0} ${a1 > a0 ? 1 : 0} ${f1(x1)},${f1(y1)}`;
};

/** set several attributes, numbers rounded to a tenth of a pixel */
export const set = (e, attrs) => { for (const k in attrs) e.setAttribute(k, typeof attrs[k] === 'number' ? f1(attrs[k]) : attrs[k]); };
