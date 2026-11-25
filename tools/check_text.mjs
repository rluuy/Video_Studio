// Read the words on the screen, frame by frame, and report what is wrong with them.
//   node tools/check_text.mjs videos/x                 every 0.5 s, plus just after each line starts
//   node tools/check_text.mjs videos/x --step 0.25 --from 10 --to 30
// It reports:
//   overlap   two texts on top of each other
//   crossed   a drawn line or shape running through a text (SVG shapes. 3D objects are not seen)
//   outside   text that leaves the frame
//   small     text under the smallest size in theme.json
//   number    a number that is neither a fact nor marked as drawn (engine/core/facts.js)
//   fact      a fact printed differently from facts.json, or one that does not exist
//   dash      an em dash, a semicolon, or an en dash that is not a range
// Fades count only while a text is at least 35 percent visible. Writes out/checks/text.json, and text_<n>.png for the first
// few problems. A finding that is meant to be there goes into the video's accepted.json with its reason:
//   [{ "check": "text", "match": "part of the finding as printed", "why": "the labels merge into one" }]
// Exit code 0 means nothing open was found.
import fs from 'fs';
import path from 'path';
import { ROOT, launchChrome, outDir, sceneArg, sceneUrl, startServer } from './harness.mjs';
import { readProbe, splitAccepted, summarize } from './lib/text_report.mjs';

const args = process.argv.slice(2), scene = sceneArg(args[0]), opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? +args[i + 1] : d; };
if (!scene || scene.startsWith('--')) { console.error('usage: node tools/check_text.mjs videos/<folder> [--step 0.5] [--from t] [--to t]'); process.exit(2); }
const [kind, id] = scene.split('/'), vd = path.join(ROOT, kind, id);
const load = (f, d) => (fs.existsSync(path.join(vd, f)) ? JSON.parse(fs.readFileSync(path.join(vd, f), 'utf8')) : d);
const theme = JSON.parse(fs.readFileSync(path.join(ROOT, 'engine', 'theme.json'), 'utf8'));
const facts = new Map(load('facts.json', { facts: [] }).facts.map(f => [f.id, f])), tl = load('timeline.json', null);
const dir = outDir(scene, 'checks');
for (const f of fs.readdirSync(dir)) if (/^text_\d+\.png$/.test(f)) fs.unlinkSync(path.join(dir, f));

const { srv, port } = await startServer();
const c = await launchChrome({ scale: 1 });
let result;
try {
  await c.goto(sceneUrl(port, scene));
  const dur = await c.evaluate('window.__duration', false), from = opt('--from', 0), to = Math.min(opt('--to', dur), dur), step = opt('--step', 0.5);
  const times = new Set();
  for (let t = from; t < to; t += step) times.add(+t.toFixed(3));
  if (tl) for (const l of tl.lines) for (const t of [l.start + 0.7, l.end]) if (t >= from && t < to) times.add(+t.toFixed(3));
  const list = [...times].sort((a, b) => a - b);
  result = await readProbe(c, list, { smallest: theme.type.smallest }, facts, async (n, t) => {
    if (n > 8) return null;
    const f = path.join(dir, `text_${n}.png`); fs.writeFileSync(f, await c.shot()); return f;
  });
  result.frames = list.length;
  console.log(`${list.length} moments read, ${result.found.length} thing${result.found.length === 1 ? '' : 's'} found, ${result.facts.length} fact${result.facts.length === 1 ? '' : 's'} on screen`);
} catch (e) { console.error(e.message); result = { found: [{ kind: 'failed', what: e.message, first: 0, last: 0, moments: 0 }], facts: [] }; }
if (c.logs.length) console.log('--- page log ---\n' + c.logs.slice(-10).join('\n'));
await c.close(); srv.close();
const { open, accepted } = splitAccepted(result.found, load('accepted.json', []), 'text');
fs.writeFileSync(path.join(dir, 'text.json'), JSON.stringify({ ...result, found: open, accepted }, null, 1) + '\n');
summarize(open, accepted);
process.exit(open.length ? 1 : 0);
