// A contact sheet: many moments of a scene on one picture, with their times.
//   node tools/sheet.mjs videos/x                    one picture per narration line (its middle), and the start of each scene
//   node tools/sheet.mjs videos/x 3 8.5 20           these moments
//   node tools/sheet.mjs videos/x --every 5          one every 5 s
//   node tools/sheet.mjs compare <dirA> <dirB>       files of the same name side by side, with their difference times 8
// Writes out/sheets/sheet_<n>.jpg (20 pictures each) to the video's out folder, or <dirB>/compare_<n>.jpg.
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { FFMPEG, ROOT, launchChrome, outDir, sceneArg, sceneUrl, startServer } from './harness.mjs';

const args = process.argv.slice(2);
if (!args.length) { console.error('usage: node tools/sheet.mjs videos/<folder> [times] [--every s]  |  compare <dirA> <dirB>'); process.exit(2); }
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const clock = t => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;

/** cells: [{ img: Buffer, type, label }] -> one JPEG */
async function page(c, cells, cols, w, file) {
  const rows = Math.ceil(cells.length / cols), h = Math.round(w * 9 / 16) + 34, W = cols * (w + 12) + 12, H = rows * (h + 12) + 12;
  const html = `<body style="margin:0;background:#1b2129;font:500 18px 'Segoe UI',sans-serif;color:#dfe4ea"><div style="display:grid;grid-template-columns:repeat(${cols},${w}px);gap:12px;padding:12px">`
    + cells.map(x => `<div><div style="height:30px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${esc(x.label)}</div><img src="data:image/${x.type};base64,${x.img.toString('base64')}" style="width:${w}px;height:${h - 34}px;object-fit:contain;background:#000;display:block"></div>`).join('') + '</div></body>';
  await c.send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  const { frameTree } = await c.send('Page.getFrameTree');
  await c.send('Page.setDocumentContent', { frameId: frameTree.frame.id, html });
  await c.evaluate('Promise.all([...document.images].map(i => i.decode().catch(() => 0)))');
  const shot = await c.send('Page.captureScreenshot', { format: 'jpeg', quality: 88, captureBeyondViewport: true });
  fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
  console.log(file);
}

if (args[0] === 'compare') {
  const [, a, b] = args, names = fs.readdirSync(a).filter(f => /\.(png|jpg)$/.test(f) && fs.existsSync(path.join(b, f)));
  const tmp = fs.mkdtempSync(path.join(b, 'tmp_')), cells = [];
  for (const f of names) {
    const d = path.join(tmp, f.replace(/\.\w+$/, '.png'));
    execFileSync(FFMPEG, ['-y', '-v', 'error', '-i', path.join(a, f), '-i', path.join(b, f), '-filter_complex', '[0]scale=960:540,format=gbrp[x];[1]scale=960:540,format=gbrp[y];[x][y]blend=all_mode=difference,lutrgb=r=val*8:g=val*8:b=val*8', '-frames:v', '1', d]);
    const type = f.endsWith('png') ? 'png' : 'jpeg';
    cells.push({ img: fs.readFileSync(path.join(a, f)), type, label: `${f}, before` }, { img: fs.readFileSync(path.join(b, f)), type, label: 'after' }, { img: fs.readFileSync(d), type: 'png', label: 'difference × 8' });
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  if (!cells.length) { console.error('no files of the same name'); process.exit(1); }
  const c = await launchChrome({ scale: 1 });
  for (let i = 0, n = 1; i < cells.length; i += 15, n++) await page(c, cells.slice(i, i + 15), 3, 620, path.join(b, `compare_${n}.jpg`));
  await c.close(); process.exit(0);
}

const scene = sceneArg(args[0]), every = args.includes('--every') ? +args[args.indexOf('--every') + 1] : 0;
const tlFile = path.join(ROOT, scene, 'timeline.json'), tl = fs.existsSync(tlFile) ? JSON.parse(fs.readFileSync(tlFile, 'utf8')) : null;
const dir = outDir(scene, 'sheets');
for (const f of fs.readdirSync(dir)) if (/^sheet_\d+\.jpg$/.test(f)) fs.unlinkSync(path.join(dir, f));
const { srv, port } = await startServer();
const c = await launchChrome({ scale: 0.5 });
let code = 0;
try {
  await c.goto(sceneUrl(port, scene));
  const dur = await c.evaluate('window.__duration', false);
  let list = args.slice(1).filter((x, i, a) => x !== '--every' && a[i - 1] !== '--every').map(Number).filter(x => !Number.isNaN(x)).map(t => ({ t, label: '' }));
  if (every) { list = []; for (let t = every / 2; t < dur; t += every) list.push({ t, label: '' }); }
  if (!list.length && tl) {
    list = tl.lines.map(l => ({ t: (l.start + l.end) / 2, label: l.name }));
    for (const s of tl.scenes) list.push({ t: s.start + Math.min(1.2, s.length / 3), label: `${s.id} start` });
  }
  if (!list.length) list = Array.from({ length: 12 }, (_, i) => ({ t: (i + 0.5) / 12 * dur, label: '' }));
  list.sort((x, y) => x.t - y.t);
  const cells = [];
  for (const { t, label } of list) { await c.evaluate(`window.renderFrame(${t})`); cells.push({ img: await c.shot(), type: process.env.CAPTURE === 'jpeg' ? 'jpeg' : 'png', label: `${clock(t)}  ${label}` }); }
  for (let i = 0, n = 1; i < cells.length; i += 20, n++) await page(c, cells.slice(i, i + 20), 4, 620, path.join(dir, `sheet_${n}.jpg`));
} catch (e) { code = 1; console.error(e.message); }
await c.close(); srv.close();
process.exit(code);
