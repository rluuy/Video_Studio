// Watch scenes live in an ordinary browser:   node tools/serve.mjs [port]
// Then open the printed address. It serves this machine only.
import fs from 'fs';
import path from 'path';
import { ROOT, startServer } from './harness.mjs';

const { port } = await startServer(+(process.argv[2] || 8123));
const url = s => `http://127.0.0.1:${port}/index.html?scene=${s}&play=1`;
const gallery = fs.readdirSync(path.join(ROOT, 'gallery')).filter(f => f.endsWith('.js') && !f.startsWith('_')).map(f => `gallery/${f.slice(0, -3)}`);
const videos = fs.existsSync(path.join(ROOT, 'videos')) ? fs.readdirSync(path.join(ROOT, 'videos')).filter(d => fs.existsSync(path.join(ROOT, 'videos', d, 'clip.js'))).map(d => `videos/${d}`) : [];
for (const s of [...videos, ...gallery]) console.log(url(s));
console.log('\nAdd &t=12 to start at 12 s. Ctrl+C stops the server.');
