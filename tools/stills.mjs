// Draw single moments of a scene for review:
//   node tools/stills.mjs videos/2026-12_interferometry 2.5 7 12.4
//   node tools/stills.mjs gallery/slab 1.5
//   node tools/stills.mjs videos/2026-12_interferometry --dir round1 2.5 7 12.4     into out/round1, to compare rounds later
// Writes <name>_t<time>.png at 3840 x 2160 and a 1920 x 1080 copy (_1080.png) to the scene's out folder.
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { FFMPEG, launchChrome, outDir, sceneArg, sceneUrl, startServer } from './harness.mjs';

const args = process.argv.slice(2), at = args.indexOf('--dir'), sub = at >= 0 ? args.splice(at, 2)[1] : 'stills';
const [typed, ...times] = args, scene = sceneArg(typed);
if (!scene || !times.length) { console.error('usage: node tools/stills.mjs gallery/<name>|videos/<folder> [--dir name] <time> [<time> ...]'); process.exit(2); }
const dir = outDir(scene, sub), id = scene.split('/')[1];
const { srv, port } = await startServer();
const c = await launchChrome();
let failed = false;
try {
  await c.goto(sceneUrl(port, scene));
  console.log('duration', await c.evaluate('window.__duration', false), 's');
  for (const ts of times) {
    const t = +ts;
    await c.evaluate(`window.renderFrame(${t})`);
    const f = path.join(dir, `${id}_t${t.toFixed(2).padStart(6, '0')}.png`);
    fs.writeFileSync(f, await c.shot());
    execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-i', f, '-vf', 'scale=1920:1080:flags=lanczos', f.replace('.png', '_1080.png')]);
    console.log('t =', t, '->', f);
  }
  const info = await c.evaluate('window.__clip && window.__clip.info ? JSON.stringify(window.__clip.info()) : null', false);
  if (info) console.log('info', info);
} catch (e) { failed = true; console.error(e.message); }
if (c.logs.length) console.log('--- page log ---\n' + c.logs.slice(-30).join('\n'));
await c.close(); srv.close();
process.exit(failed ? 1 : 0);
