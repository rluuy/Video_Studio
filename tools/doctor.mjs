// Can this machine draw and render?   npm run doctor
// Checks Node, the installed packages against package.json, Chrome, ffmpeg, and that a frame really comes out of the GPU.
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { CHROME, FFMPEG, FFPROBE, ROOT, launchChrome, sceneUrl, startServer } from './harness.mjs';

let bad = 0;
const ok = m => console.log('ok    ' + m);
const fail = m => { bad++; console.log('FAIL  ' + m); };
const note = m => console.log('note  ' + m);

const major = +process.versions.node.split('.')[0];
major >= 22 ? ok(`Node ${process.versions.node}`) : fail(`Node ${process.versions.node}. Node 22 or newer is needed`);

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
for (const [name, want] of Object.entries(pkg.dependencies)) {
  const f = path.join(ROOT, 'node_modules', ...name.split('/'), 'package.json');
  if (!fs.existsSync(f)) { fail(`${name} is not installed. Run npm ci`); continue; }
  const have = JSON.parse(fs.readFileSync(f, 'utf8')).version;
  have === want ? ok(`${name} ${have}`) : fail(`${name} is ${have}, package.json pins ${want}. Run npm ci`);
}

fs.existsSync(CHROME) ? ok(`Chrome at ${CHROME}`) : fail(`no Chrome at ${CHROME}. Set CHROME_PATH`);
for (const [n, exe] of [['ffmpeg', FFMPEG], ['ffprobe', FFPROBE]]) {
  const r = spawnSync(exe, ['-version'], { encoding: 'utf8' });
  r.status === 0 ? ok(r.stdout.split(/\r?\n/)[0].slice(0, 60)) : fail(`${n} does not run as "${exe}". Put it on PATH or set ${n.toUpperCase()}`);
}
const py = spawnSync('python', ['-c', 'import sys, numpy, scipy; print(sys.version.split()[0], numpy.__version__, scipy.__version__)'], { encoding: 'utf8' });
py.status === 0 ? ok('Python, numpy, scipy ' + py.stdout.trim()) : note('Python with numpy and scipy was not found. Rendering does not need it, building a video does (pip install -r requirements.txt)');

if (!bad) {
  const { srv, port } = await startServer();
  let c = null;
  try {
    c = await launchChrome({ scale: 1 });
    const ver = (await c.send('Browser.getVersion')).product;
    +ver.replace(/^.*\/(\d+).*$/, '$1') >= 123 ? ok(ver) : fail(`${ver}. Chrome 123 or newer is needed`);
    await c.goto(sceneUrl(port, 'gallery/theme'));
    const gpu = await c.evaluate(`(() => { const g = document.createElement('canvas').getContext('webgl2'); if (!g) return null; const e = g.getExtension('WEBGL_debug_renderer_info'); return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'unknown'; })()`, false);
    if (!gpu) fail('WebGL 2 did not start. Try ANGLE=gl or ANGLE=vulkan');
    else if (/swiftshader|basic render/i.test(gpu)) fail(`WebGL runs on the CPU (${gpu}). Check the graphics driver, or try ANGLE=gl`);
    else ok(`GPU ${gpu}`);
    const t0 = Date.now();
    await c.evaluate('window.renderFrame(1)');
    const png = await c.shot();
    png.length > 20000 ? ok(`one frame drawn and captured in ${Date.now() - t0} ms (${Math.round(png.length / 1024)} kB)`) : fail(`the frame looks empty (${png.length} bytes)`);
    if (c.logs.length) fail('the page reported: ' + c.logs.slice(-3).join(' | '));
  } catch (e) { fail(e.message.slice(0, 800)); }
  if (c) await c.close();
  srv.close();
}
console.log(bad ? `\n${bad} problem${bad === 1 ? '' : 's'} to fix before rendering here` : '\nThis machine can render');
process.exit(bad ? 1 : 0);
