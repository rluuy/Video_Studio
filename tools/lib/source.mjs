// Which saved version of the files is this? A final render is only made from files that are all committed, so the video
// can be matched to them later. On a machine without git the same is done with the list of fingerprints in a render kit.
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { ROOT } from '../harness.mjs';

const git = (...a) => spawnSync('git', ['-C', ROOT, ...a], { encoding: 'utf8' });

/** everything a render of this scene can read */
export const inputsOf = scene => ['engine', 'package.json', 'package-lock.json', 'tools/harness.mjs', 'tools/render.mjs', 'tools/lib', scene.startsWith('gallery/') ? 'gallery' : scene];

/** { commit, clean, changed: [files], from: 'git' | 'kit' } for the files this scene is drawn from */
export function sourceState(scene) {
  const inside = git('rev-parse', '--show-toplevel');
  if (inside.status === 0 && path.resolve(inside.stdout.trim()) === path.resolve(ROOT)) {
    const head = git('rev-parse', 'HEAD');
    if (head.status !== 0) return { commit: null, clean: false, changed: ['nothing is committed yet'], from: 'git' };
    const st = git('status', '--porcelain', '--untracked-files=all', '--', ...inputsOf(scene));
    const changed = st.stdout.split('\n').filter(Boolean).map(l => l.slice(3));
    // a data or timeline file that git ignores would be missing from the commit without showing up above
    const dir = path.join(ROOT, scene);
    if (!scene.startsWith('gallery/') && fs.existsSync(dir)) {
      const ig = git('status', '--porcelain', '--ignored=matching', '--untracked-files=all', '--', scene);
      for (const l of ig.stdout.split('\n')) if (l.startsWith('!!')) { const f = l.slice(3); if (!/\/(out|sources|__pycache__)\//.test('/' + f) && !/\/(out|sources|__pycache__)\/?$/.test('/' + f)) changed.push(f + ' (ignored by git)'); }
    }
    return { commit: head.stdout.trim(), clean: changed.length === 0, changed, from: 'git' };
  }
  const kitFile = path.join(ROOT, 'kit.json');
  if (fs.existsSync(kitFile)) {
    const kit = JSON.parse(fs.readFileSync(kitFile, 'utf8')), changed = [];
    for (const [f, h] of Object.entries(kit.files)) {
      const p = path.join(ROOT, f);
      if (!fs.existsSync(p)) changed.push(f + ' (missing)');
      else if (crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex') !== h) changed.push(f);
    }
    return { commit: kit.commit, clean: changed.length === 0, changed, from: 'kit' };
  }
  return { commit: null, clean: false, changed: ['this folder is neither a git repository nor a render kit'], from: 'none' };
}

/** installed packages that differ from what package.json pins */
export function wrongPackages() {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')), out = [];
  for (const [name, want] of Object.entries(pkg.dependencies)) {
    const f = path.join(ROOT, 'node_modules', ...name.split('/'), 'package.json');
    const have = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')).version : 'missing';
    if (have !== want) out.push(`${name} is ${have}, not ${want}`);
  }
  return out;
}
