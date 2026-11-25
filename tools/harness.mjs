// What every tool shares: a static file server for this repo, headless Chrome driven over the DevTools protocol (Node 22's
// own WebSocket, no extra packages), and the ffmpeg writer. The page draws one frame per call of window.renderFrame(t),
// and the screenshot holds the WebGL canvas and the HTML and SVG on top of it.
// Environment: CHROME_PATH, FFMPEG, FFPROBE, ANGLE (the GPU backend, d3d11 on Windows), CAPTURE=jpeg (faster frames).
import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MODULES = path.join(ROOT, 'node_modules');
const CHROME_CANDIDATES = [process.env.CHROME_PATH, 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe'),
  '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'];
export const CHROME = CHROME_CANDIDATES.find(c => c && fs.existsSync(c)) || CHROME_CANDIDATES[1];
export const FFMPEG = process.env.FFMPEG || 'ffmpeg';
export const FFPROBE = process.env.FFPROBE || 'ffprobe';

const MOUNTS = [
  ['/vendor/three/', path.join(MODULES, 'three')],
  ['/vendor/d3/', path.join(MODULES, 'd3', 'dist')],
  ['/fonts/', path.join(MODULES, '@fontsource')],
  ['/engine/', path.join(ROOT, 'engine')],
  ['/gallery/', path.join(ROOT, 'gallery')],
  ['/videos/', path.join(ROOT, 'videos')],
  ['/', path.join(ROOT, 'engine')],
];
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json',
  '.bin': 'application/octet-stream', '.woff2': 'font/woff2', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' };

export function startServer(port = 0) {
  const srv = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    for (const [pre, dir] of MOUNTS) {
      if (!url.startsWith(pre)) continue;
      const f = path.join(dir, url.slice(pre.length) || 'index.html');
      if (!f.startsWith(dir + path.sep) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) break;
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      fs.createReadStream(f).pipe(res);
      return;
    }
    res.writeHead(404); res.end('not found ' + url);
  });
  return new Promise(r => srv.listen(port, '127.0.0.1', () => r({ srv, port: srv.address().port })));
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function launchChrome({ gpu = true, width = 1920, height = 1080, scale = 2 } = {}) {
  const udd = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-chrome-'));
  const args = ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${udd}`, '--hide-scrollbars', '--mute-audio',
    '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', `--window-size=${width},${height}`,
    '--force-color-profile=srgb'];
  const angle = process.env.ANGLE || (process.platform === 'win32' ? 'd3d11' : '');
  if (gpu) args.push(...(angle ? [`--use-angle=${angle}`] : []), '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu');
  else args.push('--use-angle=swiftshader', '--enable-unsafe-swiftshader');
  args.push('about:blank');
  const proc = spawn(CHROME, args, { stdio: 'ignore' });
  const portFile = path.join(udd, 'DevToolsActivePort');
  for (let i = 0; i < 200 && !fs.existsSync(portFile); i++) await sleep(50);
  if (!fs.existsSync(portFile)) { proc.kill(); throw new Error(`Chrome did not start (${CHROME})`); }
  await sleep(100);
  const port = +fs.readFileSync(portFile, 'utf8').split('\n')[0];
  let list = [];
  for (let i = 0; i < 50; i++) {
    list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    if (list.find(t => t.type === 'page')) break;
    await sleep(100);
  }
  const page = list.find(t => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pending = new Map(); const logs = [];
  ws.onmessage = ev => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id); m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result); }
    else if (m.method === 'Runtime.consoleAPICalled') logs.push(m.params.args.map(a => a.value ?? a.description).join(' '));
    else if (m.method === 'Runtime.exceptionThrown') logs.push('EXCEPTION ' + JSON.stringify(m.params.exceptionDetails).slice(0, 2000));
  };
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile: false });
  const evaluate = async (expr, awaitPromise = true) => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise, returnByValue: true });
    if (r.exceptionDetails) throw new Error('page error: ' + JSON.stringify(r.exceptionDetails).slice(0, 3000));
    return r.result.value;
  };
  // lossless PNG by default. JPEG at quality 100 is faster when the shaders dither every pixel of a 4K frame
  const fmt = process.env.CAPTURE === 'jpeg' ? { format: 'jpeg', quality: 100 } : { format: 'png' };
  const shot = async () => Buffer.from((await send('Page.captureScreenshot', { ...fmt, fromSurface: true, captureBeyondViewport: false, optimizeForSpeed: true })).data, 'base64');
  const goto = async (url, timeoutMs = 120000) => {
    await send('Page.navigate', { url });
    const t0 = Date.now();
    while (Date.now() - t0 < timeoutMs) {
      let state = null;
      try { state = await evaluate('({ href: location.href, ready: window.__ready === true, error: window.__error || null })', false); } catch (e) { /* page still loading */ }
      if (state && state.href !== url) { await sleep(50); continue; }                   // still the page before this one
      if (state && state.error) throw new Error(`the page failed to start: ${state.error}`);
      if (state && state.ready) return;
      await sleep(100);
    }
    throw new Error('page not ready: ' + url + '\n' + logs.slice(-20).join('\n'));
  };
  const close = async () => { try { await send('Browser.close'); } catch (e) { /* already gone */ } ws.close(); proc.kill(); await sleep(300); try { fs.rmSync(udd, { recursive: true, force: true }); } catch (e) { /* locked for a moment, the system clears it */ } };
  return { send, evaluate, shot, goto, close, logs };
}

/** the page URL of a scene such as gallery/slab or videos/2026-12_interferometry */
export const sceneUrl = (port, scene) => `http://127.0.0.1:${port}/index.html?scene=${encodeURIComponent(scene)}`;

/** where a scene's output goes: videos/<name>/out, or out/gallery */
export function outDir(scene, sub = '') {
  const [kind, id] = scene.split('/');
  const d = kind === 'videos' ? path.join(ROOT, 'videos', id, 'out', sub) : path.join(ROOT, 'out', 'gallery', sub);
  fs.mkdirSync(d, { recursive: true });
  return d;
}

export function ffmpegWriter(outPath, { fps = 60, crf = 16, width = 1920, height = 1080, metadata = {} } = {}) {
  const args = ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', process.env.CAPTURE === 'jpeg' ? 'mjpeg' : 'png', '-i', '-',
    '-vf', `scale=${width}:${height}:flags=lanczos+accurate_rnd+full_chroma_int:out_color_matrix=bt709:out_range=tv,format=yuv420p`, '-c:v', 'libx264', '-preset', 'slow', '-crf', String(crf),
    '-profile:v', 'high', '-level', '4.2', '-x264-params', 'colorprim=bt709:transfer=bt709:colormatrix=bt709', '-g', String(fps * 2), '-bf', '2', '-movflags', '+faststart', '-color_primaries', 'bt709',
    '-color_trc', 'bt709', '-colorspace', 'bt709', ...Object.entries(metadata).flatMap(([k, v]) => ['-metadata', `${k}=${v}`]), outPath];
  const p = spawn(FFMPEG, args, { stdio: ['pipe', 'inherit', 'inherit'] });
  const write = buf => new Promise(r => { if (!p.stdin.write(buf)) p.stdin.once('drain', r); else r(); });
  const end = () => new Promise(r => { p.on('close', r); p.stdin.end(); });
  return { write, end };
}
