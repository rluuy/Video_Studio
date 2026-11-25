"""A zip for rendering on a computer that cannot reach GitHub. Where it can, pull the commit instead and skip this.

  python tools/make_kit.py videos/x

Packs the committed files a render of this video needs, the three.js and font files it loads, and kit.json with the commit
and a fingerprint of every file. render.mjs on the other computer checks them all before it starts and writes the commit
into the MP4, so check_render.py treats the video like any other. Refuses when something is not committed.
"""
import hashlib, json, re, subprocess, sys, zipfile
import studio as S


def git(*a, binary=False):
    r = subprocess.run(['git', '-C', str(S.ROOT), *a], capture_output=True)
    if r.returncode: S.fail('git ' + ' '.join(a) + '. ' + r.stderr.decode(errors='replace')[:300])
    return r.stdout if binary else r.stdout.decode('utf-8')


README = """Render kit for {name}, commit {sha}

1. Needs Node 22 or newer, Google Chrome and ffmpeg. Check with:   node tools/doctor.mjs
2. Render (PowerShell):                                            node tools/render.mjs {name}
   It checks every file first, takes about 0.2 s per frame ({frames} frames), and prints its progress.
3. Copy back {name}/out/{vid}.mp4 and {name}/out/{vid}_render.json.

Do not edit any file here. If something fails, report it. Nothing here needs an API key or an internet connection.
"""


def main():
    if len(sys.argv) < 2: sys.exit(__doc__)
    vd = S.video_dir(sys.argv[1]); name = S.scene_name(vd)
    need = ['engine', 'tools', 'package.json', 'package-lock.json', 'gallery/theme.js', 'gallery/_stage.js', name]
    dirty = git('status', '--porcelain', '--untracked-files=all', '--', *need).strip()
    if dirty: S.fail('not everything is committed:\n' + dirty)
    sha = git('rev-parse', 'HEAD').strip()
    files = {}
    for f in git('ls-files', '-z', '--', *need).split('\0'):
        if f and not re.search(r'/(voice|sources)/', f): files[f] = git('cat-file', 'blob', f'HEAD:{f}', binary=True)
    nm = S.ROOT / 'node_modules'
    extra = ['three/build/three.module.js', 'three/package.json', 'three/LICENSE', 'd3/package.json'] + [f'@fontsource/{p}/package.json' for p in ('source-sans-3', 'source-code-pro', 'stix-two-text')]
    extra += ['@fontsource/' + m for m in sorted(set(re.findall(r'url\(/fonts/([^)]+)\)', (S.ROOT / 'engine' / 'index.html').read_text(encoding='utf-8'))))]
    for js in (S.ROOT / 'engine').rglob('*.js'): extra += re.findall(r"from '/vendor/(three/[^']+)'", js.read_text(encoding='utf-8'))
    for e in dict.fromkeys(extra):
        p = nm / e
        if not p.exists(): S.fail(f'{p} is not installed. Run npm ci')
        files['node_modules/' + e] = p.read_bytes()
    tl = S.read_json(vd / 'timeline.json')
    kit = {'commit': sha, 'video': name, 'files': {k: hashlib.sha256(v).hexdigest() for k, v in sorted(files.items())}}
    out = vd / 'out' / f'kit_{vd.name}_{sha[:10]}.zip'; out.parent.mkdir(exist_ok=True)
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
        for k, v in files.items(): z.writestr(k, v)
        z.writestr('kit.json', json.dumps(kit, indent=1))
        z.writestr('README.txt', README.format(name=name, sha=sha, vid=vd.name, frames=round(tl['duration'] * 60)))
    print(f'{out}\n{len(files)} files, {out.stat().st_size / 1e6:.1f} MB, commit {sha[:10]}')


if __name__ == '__main__':
    main()
