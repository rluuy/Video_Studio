"""Was this video made from the files that were reviewed?

  python tools/check_render.py videos/x                     the final video in its out folder
  python tools/check_render.py videos/x path/to/file.mp4    a file that came back from the lab computer
  add --frames 12.5,98                                      also save these frames, for comparing with stills

It reads the commit that render.mjs wrote into the MP4, checks that this repo has it, lists what has changed since in the
files the video is drawn from, and checks size, frame rate, length and that nothing but a whole, committed render counts.
"""
import re, subprocess, sys
from pathlib import Path
import json
import studio as S


def git(*a):
    return subprocess.run(['git', '-C', str(S.ROOT), *a], capture_output=True, text=True, encoding='utf-8')


def check(vd, mp4):
    bad, notes = [], []
    info = S.probe(mp4); v, fps = S.video_stream(info); tags = {k.lower(): x for k, x in info['format'].get('tags', {}).items()}
    m = re.match(r'studio commit ([0-9a-f]{40})( with changes)?$', tags.get('comment', ''))
    desc = tags.get('description', '')
    print(f'{mp4}\n  {desc or "no description"}')
    name = S.scene_name(vd)
    if not desc.startswith(name + ','): bad.append(f'the file says it shows "{desc.split(",")[0]}", not {name}')
    if 'draft' in desc: bad.append('it is a draft')
    if not desc.endswith('whole'): bad.append('it is only part of the video')
    tl = S.read_json(vd / 'timeline.json')
    if not m: bad.append(f'it names no commit ({tags.get("comment", "nothing")})')
    else:
        sha = m.group(1)
        if m.group(2): bad.append('it was rendered from files that were not committed')
        if git('cat-file', '-e', sha + '^{commit}').returncode: bad.append(f'this repo does not have commit {sha[:10]}. Pull first')
        else:
            when = git('show', '-s', '--format=%cd, %s', '--date=short', sha).stdout.strip(); print(f'  commit {sha[:10]}, {when}')
            diff = git('diff', '--name-only', sha, '--', 'engine', 'package-lock.json', name).stdout.split()
            diff = [f for f in diff if not re.search(r'/(review\.md|brief\.md|approvals\.json|accepted\.json|cues\.md|notes\.txt)$', f)]
            if diff: notes.append(f'{len(diff)} file(s) have changed since, so it shows an older version: ' + ', '.join(diff[:8]))
            else: print('  nothing it is drawn from has changed since')
            old = git('show', f'{sha}:{name}/timeline.json')
            if old.returncode == 0: tl = json.loads(old.stdout)
    if (v['width'], v['height']) != (1920, 1080): bad.append(f"it is {v['width']} x {v['height']}")
    if abs(fps - 60) > 0.01: notes.append(f'it runs at {fps:g} fps')
    frames, want = int(v.get('nb_frames') or 0), round(tl['duration'] * fps)
    if abs(frames - want) > 1: bad.append(f'it has {frames} frames, the timeline needs {want}')
    print(f"  {v['width']} x {v['height']}, {fps:g} fps, {frames} frames, {frames / fps:.2f} s")
    return bad, notes


def main():
    a = [x for x in sys.argv[1:]]
    if not a: sys.exit(__doc__)
    times = []
    if '--frames' in a: i = a.index('--frames'); times = [t for t in a[i + 1].split(',') if t]; del a[i:i + 2]
    vd = S.video_dir(a[0]); mp4 = Path(a[1]).resolve() if len(a) > 1 else vd / 'out' / f'{vd.name}.mp4'
    if not mp4.exists(): S.fail(f'no {mp4}')
    bad, notes = check(vd, mp4)
    for n in notes: print('note  ' + n)
    for b in bad: print('ERROR ' + b)
    if times:
        d = vd / 'out' / 'checks' / 'frames'; d.mkdir(parents=True, exist_ok=True)
        for t in times: subprocess.run([S.FFMPEG, '-v', 'error', '-y', '-ss', t, '-i', str(mp4), '-frames:v', '1', str(d / f'f_{t}.png')], check=True)
        print(f'frames in {d}')
    print('OK' if not bad else f'{len(bad)} errors')
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
