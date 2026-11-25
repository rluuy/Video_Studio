// Runs inside the page, on the frame that is drawn now. Returns every piece of text that can be seen, with its place, and
// what is wrong with it. The tools read this file and evaluate it, so it must be one expression that returns a function.
//   probe({ smallest, crossings })  ->  { texts, problems, numbers }
(() => function probe({ smallest = 17, crossings = true, seen = 0.35 } = {}) {
  const ui = document.getElementById('ui'), W = 1920, H = 1080;
  const cache = new Map();
  const visible = e => {                                                 // opacity of an element with all its parents
    if (!e || e === document.body) return 1;
    if (cache.has(e)) return cache.get(e);
    const s = getComputedStyle(e);
    const o = s.display === 'none' || s.visibility === 'hidden' ? 0 : +s.opacity * visible(e.parentElement);
    cache.set(e, o); return o;
  };
  const veil = [...ui.children].filter(e => +getComputedStyle(e).zIndex >= 1000).reduce((v, e) => Math.max(v, visible(e)), 0);
  if (veil > 0.6) return { texts: [], problems: [], numbers: [], covered: true };

  // ---- every text node, as tight boxes
  const units = [], walker = document.createTreeWalker(ui, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const s = n.nodeValue.replace(/\s+/g, ' ').trim(), p = n.parentElement;
    if (!s || !p || p.closest('style,script,title')) continue;
    const o = visible(p); if (o < 0.06) continue;
    const cs = getComputedStyle(p), inSvg = p instanceof SVGElement;
    if (inSvg && (cs.fill === 'none' || +cs.fillOpacity < 0.06)) continue;
    const range = document.createRange(); range.selectNodeContents(n);
    const rects = [...range.getClientRects()].filter(r => r.width > 0.5 && r.height > 0.5);
    if (!rects.length) continue;
    const block = inSvg ? p.closest('text') : (() => { let b = p; while (b.parentElement !== ui && getComputedStyle(b).display === 'inline') b = b.parentElement; return b; })();
    const top = (() => { let b = p; while (b.parentElement && b.parentElement !== ui) b = b.parentElement; return b; })();
    const m = inSvg && block.getScreenCTM ? block.getScreenCTM() : null, turned = m && (Math.abs(m.b) > 0.02 || Math.abs(m.c) > 0.02);
    const scale = m ? Math.hypot(m.a, m.b) : 1;
    for (const r of rects) units.push({ n, s, p, o, block, top, turned, size: parseFloat(cs.fontSize) * scale, x0: r.left, x1: r.right, y0: r.top, y1: r.bottom,
      // the ink: without the empty room above capitals and below the line
      iy0: r.top + 0.24 * r.height, iy1: r.bottom - 0.22 * r.height });
  }
  const strong = units.filter(u => u.o >= seen), problems = [];
  const short = s => (s.length > 60 ? s.slice(0, 57) + '...' : s);
  const add = (kind, what, o, key) => problems.push({ kind, what, opacity: +o.toFixed(2), key });

  // ---- off the frame, too small
  for (const u of strong) {
    if (u.x0 < -1 || u.x1 > W + 1 || u.iy0 < -1 || u.iy1 > H + 1) add('outside', `"${short(u.s)}" reaches ${Math.round(u.x0)} to ${Math.round(u.x1)} across, ${Math.round(u.y0)} to ${Math.round(u.y1)} down`, u.o, 'o|' + u.s);
    if (u.size < smallest - 0.1) {
      // a subscript or superscript may be smaller than the text it belongs to
      const host = u.p.closest('text') || u.p.parentElement, hs = host && host !== u.p ? parseFloat(getComputedStyle(host).fontSize) : 0;
      if (hs < smallest) add('small', `"${short(u.s)}" is ${u.size.toFixed(1)} px, the smallest allowed is ${smallest}`, u.o, 's|' + u.s);
    }
  }
  // ---- text on text
  for (let i = 0; i < strong.length; i++) for (let j = i + 1; j < strong.length; j++) {
    const a = strong[i], b = strong[j];
    if (a.block === b.block || a.turned || b.turned) continue;
    const w = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0), h = Math.min(a.iy1, b.iy1) - Math.max(a.iy0, b.iy0);
    if (w > 2 && h > 2) add('overlap', `"${short(a.s)}" and "${short(b.s)}" overlap by ${Math.round(w)} x ${Math.round(h)} px`, Math.min(a.o, b.o), 't|' + [a.s, b.s].sort().join('|').replace(/[\d.,−-]+/g, '#'));
  }
  // ---- drawn shapes that cross text (a line through a word, a ball over a letter). A shape that the whole text sits on is
  // its background and is fine
  if (crossings) {
    // what is painted, with its box and how strongly
    const shapes = [];
    for (const e of ui.querySelectorAll('path,line,rect,circle,ellipse,polyline,polygon')) {
      const o = visible(e); if (o < 0.3) continue;
      const cs = getComputedStyle(e), strength = (paint, op) => { if (paint === 'none') return 0; const m = /rgba\([^)]*,\s*([\d.]+)\)/.exec(paint); return o * +op * (m ? +m[1] : 1); };
      const fill = strength(cs.fill, cs.fillOpacity), stroke = parseFloat(cs.strokeWidth) > 0 ? strength(cs.stroke, cs.strokeOpacity) : 0;
      if (Math.max(fill, stroke) < 0.3) continue;
      const r = e.getBoundingClientRect(), pad = stroke >= 0.3 ? parseFloat(cs.strokeWidth) / 2 + 1 : 0;
      const m = e.getScreenCTM(); if (!m) continue;
      shapes.push({ e, o: Math.max(fill, stroke), fill: fill >= 0.3, stroke: stroke >= 0.3, x0: r.left - pad, x1: r.right + pad, y0: r.top - pad, y1: r.bottom + pad, inv: m.inverse(), svg: e.ownerSVGElement });
    }
    for (const u of strong) {
      if (u.turned) continue;
      const near = shapes.filter(s => s.x0 < u.x1 && s.x1 > u.x0 && s.y0 < u.iy1 && s.y1 > u.iy0);
      if (!near.length) continue;
      const pts = [];
      [0.15, 0.5, 0.85].forEach((f, row) => { const y = u.iy0 + f * (u.iy1 - u.iy0); for (let x = u.x0 + 1 + row; x < u.x1 - 1; x += 3) pts.push([x, y]); });
      for (const s of near) {
        let k = 0;
        for (const [x, y] of pts) {
          if (x < s.x0 || x > s.x1 || y < s.y0 || y > s.y1) continue;
          const q = s.svg.createSVGPoint(); q.x = x; q.y = y; const l = q.matrixTransform(s.inv);
          if ((s.fill && s.e.isPointInFill(l)) || (s.stroke && s.e.isPointInStroke(l))) k++;
        }
        // a single grazing point is nothing, and a shape that all of the text sits on is its background
        if (k < 2 || k >= pts.length * 0.97) continue;
        add('crossed', `a ${s.e.tagName} crosses "${short(u.s)}" (${Math.round(100 * k / pts.length)} percent of it)`, Math.min(s.o, u.o), `c|${s.e.tagName}|${u.s.replace(/[\d.,−-]+/g, '#')}`);
      }
    }
  }
  // ---- numbers, and what they say they are
  const numbers = [];
  for (const u of units) {
    if (u.o < 0.2 || !/\d/.test(u.s)) continue;
    const fact = u.p.closest('[data-fact]'), mark = u.p.closest('[data-drawn]'), formula = u.p.closest('.formula');
    const all = u.s.match(/[−-]?\d[\d,]*(?:\.\d+)?/g) || [];
    if (fact && (!mark || mark.contains(fact))) numbers.push({ text: u.s, fact: fact.dataset.fact, whole: fact.textContent });
    else if (mark) numbers.push({ text: u.s, drawn: mark.dataset.drawn });
    else if (formula && all.every(d => /^[−-]?\d{1,2}$/.test(d))) numbers.push({ text: u.s, drawn: 'formula' });
    else numbers.push({ text: u.s });
  }
  const nodes = new Map();
  for (const u of units) if (u.o >= seen) nodes.set(u.n, u.s);
  return { texts: [...nodes.values()], problems, numbers, covered: false };
})()
