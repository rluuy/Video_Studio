// Where the time of a frame goes:   node tools/profile_frames.mjs videos/x 30 60 150
// Prints, for each moment, the time of the clip's own update, of drawing, and of the screenshot.
import { launchChrome, sceneArg, sceneUrl, startServer } from './harness.mjs';

const scene = sceneArg(process.argv[2]), times = process.argv.slice(3).map(Number);
if (!scene || !times.length) { console.error('usage: node tools/profile_frames.mjs videos/<folder> <time> [<time> ...]'); process.exit(2); }
process.env.CAPTURE ??= 'jpeg';
const { srv, port } = await startServer();
const c = await launchChrome();
await c.goto(sceneUrl(port, scene));
await c.evaluate(`(() => { const r = window.renderFrame; window.__prof = async t => { const a = performance.now(); window.__clip.update(t); const b = performance.now(); await r(t); return [b - a, performance.now() - b]; }; })()`, false);
for (const t of times) {
  let up = 0, draw = 0, shot = 0;
  for (let k = 0; k < 6; k++) {
    const [u, d] = await c.evaluate(`window.__prof(${t + k / 60})`), a = Date.now(); await c.shot(); const s = Date.now() - a;
    if (k > 0) { up += u / 5; draw += d / 5; shot += s / 5; }
  }
  console.log(`t = ${t}: update ${up.toFixed(1)} ms, draw ${draw.toFixed(1)} ms, screenshot ${shot.toFixed(1)} ms`);
}
await c.close(); srv.close();
