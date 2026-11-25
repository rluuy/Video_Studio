// The engine's regression test. Every module has a small scene in gallery/, and its still is kept in gallery/stills/.
//   node tools/gallery.mjs                 draw every scene and compare it with its saved still
//   node tools/gallery.mjs slab rays       only these
//   node tools/gallery.mjs --accept slab   save the new stills as the reference (look at them first)
// A still counts as unchanged when no pixel of the 960 x 540 reduction moves by more than 2 of 255 levels. Chrome now and
// then antialiases an edge or a letter differently from one run to the next (seen on 2026-11-24, with the same code on
// both sides), so a scene that differs is drawn again, up to twice, and counts as unchanged if one try matches.
// Another GPU can differ more, so the stills belong to the machine that made them.
// Full-size frames go to out/gallery/ for looking at. Exit code 0 means nothing changed.
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { FFMPEG, ROOT, launchChrome, outDir, sceneUrl, startServer } from './harness.mjs';

const LIMIT = 2, SW = 960, SH = 540, TRIES = 3;
const args = process.argv.slice(2), accept = args.includes('--accept'), only = args.filter(a => !a.startsWith('--'));
const dir = path.join(ROOT, 'gallery'), refDir = path.join(dir, 'stills'), out = outDir('gallery/x');
fs.mkdirSync(refDir, { recursive: true });
const names = fs.readdirSync(dir).filter(f => f.endsWith('.js') && !f.startsWith('_')).map(f => f.slice(0, -3)).sort();
const wrong = only.filter(n => !names.includes(n));
if (wrong.length) { console.error(`no such gallery scene: ${wrong.join(', ')}`); process.exit(2); }
const todo = only.length ? only : names;

const raw = png => execFileSync(FFMPEG, ['-v', 'error', '-i', png, '-vf', `scale=${SW}:${SH}:flags=area+accurate_rnd`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 1 << 28 });
const rawRef = png => execFileSync(FFMPEG, ['-v', 'error', '-i', png, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 1 << 28 });

const diff = (a, b) => { let max = 0, over = 0; for (let i = 0; i < a.length; i++) { const d = Math.abs(a[i] - b[i]); if (d > max) max = d; if (d > LIMIT) over++; } return { max, over }; };

const { srv, port } = await startServer();
const c = await launchChrome({ scale: 1 });
let bad = 0, count = 0;
for (const n of todo) {
  c.logs.length = 0;
  try {
    await c.goto(sceneUrl(port, `gallery/${n}`));
    const stills = await c.evaluate('window.__stills', false);
    if (!stills.length) throw new Error('the scene exports no "stills" times');
    for (const t of stills) {
      const id = `${n}_t${t.toFixed(2)}`, full = path.join(out, id + '.png'), ref = path.join(refDir, id + '.png');
      await c.evaluate(`window.renderFrame(${t})`);
      fs.writeFileSync(full, await c.shot());
      count++;
      const now = raw(full);
      if (accept) {
        execFileSync(FFMPEG, ['-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', `${SW}x${SH}`, '-i', '-', ref], { input: now });
        console.log(`saved    ${id}`); continue;
      }
      if (!fs.existsSync(ref)) { bad++; console.log(`NO STILL ${id}. Look at ${full}, then run with --accept`); continue; }
      const old = rawRef(ref);
      if (old.length !== now.length) { bad++; console.log(`CHANGED  ${id}. The saved still has another size`); continue; }
      let d = diff(now, old), tries = 1;
      for (; d.max > LIMIT && tries < TRIES; tries++) {
        await c.goto(sceneUrl(port, `gallery/${n}`) + `&try=${tries}`);
        await c.evaluate(`window.renderFrame(${t})`);
        const again = await c.shot(); fs.writeFileSync(full, again);
        d = diff(raw(full), old);
      }
      if (d.max > LIMIT) { bad++; console.log(`CHANGED  ${id}. Up to ${d.max} levels, ${d.over} values over ${LIMIT}. New frame: ${full}`); }
      else console.log(`same     ${id} (largest change ${d.max}${tries > 1 ? `, on try ${tries}` : ''})`);
    }
  } catch (e) { bad++; console.log(`FAILED   ${n}: ${e.message.slice(0, 1200)}`); }
  if (c.logs.length) { bad++; console.log(`  page log of ${n}:\n    ` + c.logs.slice(-6).join('\n    ')); }
}
// stills whose scene is gone
if (!only.length) for (const f of fs.readdirSync(refDir)) { const n = f.replace(/_t[0-9.]+\.png$/, ''); if (!names.includes(n)) { bad++; console.log(`LEFTOVER ${f} has no scene`); } }
await c.close(); srv.close();
console.log(`${count} stills of ${todo.length} scenes, ${bad} problem${bad === 1 ? '' : 's'}`);
process.exit(bad ? 1 : 0);
