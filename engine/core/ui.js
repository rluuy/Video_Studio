// HTML and SVG overlay: captions, counters, color bars, labels pinned to 3D points.
// Every element is set from the clip time on every frame, so the overlay is deterministic.
import { INK, W, H, LUT, clamp01, smooth } from './core.js';

export const root = document.getElementById('ui');
export function el(tag, { cls = '', parent = root, style = {}, html = null, text = null } = {}) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  Object.assign(e.style, style);
  if (html !== null) e.innerHTML = html;
  if (text !== null) e.textContent = text;
  parent.appendChild(e);
  return e;
}
export const SVGNS = 'http://www.w3.org/2000/svg';
export function svg(tag, attrs = {}, parent = null) {
  const e = document.createElementNS(SVGNS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
const cache = new WeakMap();
/** set innerHTML only when it changes (keeps layout work per frame small) */
export function setHTML(e, html) { if (cache.get(e) !== html) { e.innerHTML = html; cache.set(e, html); } }
export function show(e, o, dy = 0) {
  o = clamp01(o);
  e.style.opacity = o.toFixed(4);
  e.style.visibility = o < 0.002 ? 'hidden' : 'visible';
  e.style.transform = dy ? `translateY(${((1 - o) * dy).toFixed(2)}px)` : '';
}

/** caption track: items [{t0, t1, html}] in one slot, shown one at a time with fades and a small rise */
export function captionTrack(slotStyle, items, { fade = 0.5, rise = 10, cls = 'cap' } = {}) {
  const els = items.map(it => el('div', { cls, style: Object.assign({}, slotStyle), html: it.html }));
  return t => items.forEach((it, i) => {
    const o = Math.min(smooth((t - it.t0) / fade), smooth((it.t1 - t) / fade));
    show(els[i], o, rise);
  });
}

export const fmtInt = n => Math.round(n).toLocaleString('en-US');
export function fmtClock(s) {
  s = Math.max(0, s);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = Math.floor(s % 60);
  return `${h}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}`;
}

/** horizontal color bar: LUT hex list, value range [lo, hi] mapped from the LUT positions [s0, s1] */
export function colorBar({ x, y, w = 330, h = 14, lut = LUT.signed, s0 = 0, s1 = 1, ticks = [], lo, hi, title = '', parent = root, unit = '' }) {
  const box = el('div', { cls: 'cbar', parent, style: { left: x + 'px', top: y + 'px', width: w + 'px' } });
  const ttl = el('div', { cls: 'cbar-title', parent: box, html: title });
  const cv = el('canvas', { parent: box, style: { width: w + 'px', height: h + 'px', display: 'block' } });
  const dpr = window.devicePixelRatio || 1; cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  const g = cv.getContext('2d');
  for (let i = 0; i < cv.width; i++) { const s = s0 + (s1 - s0) * i / (cv.width - 1); g.fillStyle = lut[Math.round(Math.max(0, Math.min(1, s)) * 255)]; g.fillRect(i, 0, 1, cv.height); }
  const tk = el('div', { cls: 'cbar-ticks', parent: box, style: { width: w + 'px' } }); tk.dataset.drawn = 'scale';
  ticks.forEach(v => {
    const f = (v - lo) / (hi - lo);
    el('span', { parent: tk, style: { left: (f * w) + 'px' }, html: v.toLocaleString('en-US') + (unit && v === ticks[ticks.length - 1] ? '&#8202;' + unit : '') });
  });
  return { box, title: ttl };
}

/** a label pinned to a 3D point; offset in px; align: 'l' | 'c' | 'r' */
export function pin(html, { cls = 'pin', align = 'l', dx = 0, dy = 0 } = {}) {
  const e = el('div', { cls, html });
  return (p, o) => {
    show(e, o);
    if (o <= 0.002) return;
    const tx = align === 'c' ? '-50%' : align === 'r' ? '-100%' : '0';
    e.style.left = (p[0] + dx).toFixed(1) + 'px'; e.style.top = (p[1] + dy).toFixed(1) + 'px';
    e.style.transform = `translate(${tx}, -50%)`;
  };
}

export { INK, W, H };
