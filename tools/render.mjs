// Render a scene to MP4.
//   node tools/render.mjs videos/x            the final render: drawn at 3840 x 2160, 1920 x 1080 at 60 fps. It refuses to
//                                             start unless every file it reads is committed, and writes the commit into the
//                                             MP4, so the video can be matched to what was reviewed (check_render.py)
//   node tools/render.mjs videos/x --draft    a quick look, 1920 x 1080 at 30 fps, allowed at any time -> out/x_draft.mp4
//   --from 10 --to 20      only these seconds (writes out/x_from10_to20.mp4)
//   --fps 60  --scale 2    override                --png   lossless frames (slower)
// Writes out/<name>.mp4, out/<name>_poster.png and out/<name>_render.json.
import fs from 'fs';
import path from 'path';
import { ROOT, ffmpegWriter, launchChrome, outDir, sceneArg, sceneUrl, startServer } from './harness.mjs';
import { sourceState, wrongPackages } from './lib/source.mjs';

const args = process.argv.slice(2), scene = sceneArg(args[0]), has = k => args.includes(k), opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? +args[i + 1] : d; };
if (!scene || scene.startsWith('--')) { console.error('usage: node tools/render.mjs videos/<folder> [--draft] [--from t --to t] [--fps n] [--scale n] [--png]'); process.exit(2); }
const draft = has('--draft'), fps = opt('--fps', draft ? 30 : 60), scale = opt('--scale', draft ? 1 : 2);
if (!has('--png')) process.env.CAPTURE = 'jpeg';                          // quality-100 JPEG, drawn at twice the size and reduced

const src = sourceState(scene);
if (!draft && !src.clean) {
  console.error(`Not rendering. The final video must come from committed files, and ${src.changed.length === 1 ? 'one is' : `${src.changed.length} are`} not:`);
  for (const f of src.changed.slice(0, 20)) console.error('  ' + f);
  console.error('Commit first (when Ryan says so), or use --draft for a look.');
  process.exit(3);
}
const wrong = wrongPackages();
if (!draft && wrong.length) { console.error('Not rendering. Installed packages differ from package.json: ' + wrong.join(', ') + '. Run npm ci'); process.exit(3); }
const id = scene.split('/')[1], dir = outDir(scene), from = opt('--from', 0), toArg = opt('--to', null), part = has('--from') || has('--to');
const name = id + (draft ? '_draft' : '') + (part ? `_from${from}_to${toArg ?? 'end'}` : '');
const out = path.join(dir, `${name}.mp4`), partial = path.join(dir, `${name}.part.mp4`);
const tlFile = path.join(ROOT, scene, 'timeline.json'), tl = fs.existsSync(tlFile) ? JSON.parse(fs.readFileSync(tlFile, 'utf8')) : null;

const { srv, port } = await startServer();
const c = await launchChrome({ scale });
let code = 0;
try {
  await c.goto(sceneUrl(port, scene));
  const dur = await c.evaluate('window.__duration', false), to = Math.min(toArg ?? dur, dur), n = Math.round((to - from) * fps);
  if (tl && Math.abs(tl.duration - dur) > 0.01) throw new Error(`the clip is ${dur} s long and timeline.json says ${tl.duration} s`);
  // keyframes at the chapter starts, so a chapter can be cut out later without encoding again
  const chapters = tl ? tl.scenes.filter(s => s.chapter && s.start > from && s.start < to).map(s => s.start - from) : [];
  const metadata = { title: tl ? tl.title : id, comment: src.commit ? `studio commit ${src.commit}${src.clean ? '' : ' with changes'}` : 'studio, not committed',
    description: `${scene}, ${draft ? 'draft, ' : ''}${fps} fps, scale ${scale}, from ${from} to ${to}${part ? '' : ', whole'}` };
  const ff = ffmpegWriter(partial, { fps, metadata, keyframes: chapters, crf: draft ? 20 : 16, preset: draft ? 'veryfast' : 'slow' });
  const poster = tl && tl.poster !== undefined ? tl.poster : (from + to) / 2;
  console.log(`${scene}: ${(to - from).toFixed(2)} s, ${n} frames at ${fps} fps, ${src.commit ? src.commit.slice(0, 10) : 'no commit'}${src.clean ? '' : ' with changes'}`);
  const t0 = Date.now();
  for (let i = 0; i < n; i++) {
    const t = from + i / fps;
    await c.evaluate(`window.renderFrame(${t.toFixed(6)})`);
    const shot = await c.shot();
    await ff.write(shot);
    if (Math.abs(t - poster) <= 0.5 / fps) fs.writeFileSync(path.join(dir, `${name}_poster.${process.env.CAPTURE === 'jpeg' ? 'jpg' : 'png'}`), shot);
    if (i && i % Math.round(fps * 5) === 0) { const s = (Date.now() - t0) / 1000; console.log(`${(100 * i / n).toFixed(0).padStart(3)} percent, ${(s / i).toFixed(3)} s per frame, ${(s / i * (n - i) / 60).toFixed(1)} min left`); }
  }
  await ff.end();
  fs.renameSync(partial, out);
  const info = await c.evaluate('window.__clip && window.__clip.info ? JSON.stringify(window.__clip.info()) : null', false);
  const minutes = (Date.now() - t0) / 60000, again = sourceState(scene);
  fs.writeFileSync(path.join(dir, `${name}_render.json`), JSON.stringify({ scene, draft, fps, scale, from, to, frames: n, duration: dur, commit: src.commit, clean: src.clean, changed: src.changed, minutes: +minutes.toFixed(2),
    seconds_per_frame: +(minutes * 60 / n).toFixed(3), info: info ? JSON.parse(info) : null, log: c.logs.slice(-20) }, null, 1) + '\n');
  if (!draft && (!again.clean || again.commit !== src.commit)) throw new Error('files changed while rendering, so this video does not match one commit. Render again');
  if (c.logs.length) console.log('--- page log ---\n' + c.logs.slice(-10).join('\n'));
  console.log(`done in ${minutes.toFixed(1)} min: ${out}`);
} catch (e) { code = 1; console.error(e.message); if (fs.existsSync(partial)) fs.rmSync(partial, { force: true }); }
await c.close(); srv.close();
process.exit(code);
