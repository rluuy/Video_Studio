// Run the probe over many moments and join what it finds: the same problem in neighboring frames is one finding.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const PROBE = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'probe.js'), 'utf8');

export async function readProbe(c, times, options, facts, picture = async () => null) {
  const found = new Map(), onScreen = new Map(), texts = new Map();
  for (const t of times) {
    await c.evaluate(`window.renderFrame(${t})`);
    const r = await c.evaluate(`(${PROBE})(${JSON.stringify(options)})`, false);
    const here = [...r.problems];
    for (const s of r.texts) {
      if (!texts.has(s)) texts.set(s, t);
      if (/[—;]/.test(s) || /(?<![0-9]\s?)–|–(?!\s?[0-9])/.test(s)) here.push({ kind: 'dash', what: `"${s.slice(0, 80)}" has a dash or a semicolon`, opacity: 1, key: 'd|' + s });
    }
    for (const n of r.numbers) {
      if (n.fact) {
        const f = facts.get(n.fact);
        if (!f) here.push({ kind: 'fact', what: `"${n.text}" points to ${n.fact}, which facts.json does not have`, opacity: 1, key: `f|${n.fact}` });
        else if (n.whole !== f.shown) here.push({ kind: 'fact', what: `${n.fact} is printed as "${n.whole}", facts.json says "${f.shown}"`, opacity: 1, key: `f|${n.fact}|${n.whole}` });
        else onScreen.set(n.fact, t);
      } else if (n.drawn === undefined) here.push({ kind: 'number', what: `"${n.text}" holds a number with no fact and no "drawn" mark`, opacity: 1, key: 'n|' + n.text.replace(/[\d.,−-]+/g, '#') });
    }
    for (const p of here) {
      const k = p.kind + '|' + p.key, old = found.get(k);
      if (old) { old.last = t; old.moments++; if (p.opacity > old.opacity) { old.opacity = p.opacity; old.what = p.what; } }
      else found.set(k, { kind: p.kind, what: p.what, opacity: p.opacity, first: t, last: t, moments: 1 });
    }
    for (const p of here) { const f = found.get(p.kind + '|' + p.key); if (f.moments === 1 && !f.picture) f.picture = await picture([...found.values()].indexOf(f) + 1, t); }
  }
  return { found: [...found.values()].sort((a, b) => a.first - b.first), facts: [...onScreen.keys()].sort(), texts: [...texts].map(([text, first]) => ({ text, first })) };
}

/** findings a person has looked at and accepted, from accepted.json: [{ "check": "text", "match": "part of the finding", "why": "..." }] */
export function splitAccepted(found, accepted, check) {
  const rules = accepted.filter(a => a.check === check && a.match && a.why);
  const why = f => rules.find(a => `${f.kind} ${f.what}`.includes(a.match));
  return { open: found.filter(f => !why(f)), accepted: found.filter(why).map(f => ({ ...f, why: why(f).why })) };
}

const clock = t => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;
const when = f => `${clock(f.first)}${f.last > f.first ? ` to ${clock(f.last)}` : ''}${f.moments === 1 ? ' (one moment)' : ''}`;
export function summarize(found, accepted = []) {
  for (const f of found) console.log(`${f.kind.padEnd(8)} ${when(f)}  ${f.what}${f.picture ? `  [${path.basename(f.picture)}]` : ''}`);
  for (const f of accepted) console.log(`accepted ${when(f)}  ${f.kind}: ${f.what}. ${f.why}`);
}
