"""Watch a rendered video frame by frame and report what stills cannot show.

  python tools/scan_frames.py videos/x                 the rendered file, out/x.mp4 (or the draft if that is all there is)
  python tools/scan_frames.py videos/x file.mp4
  python tools/scan_frames.py file.mp4                 any video, without scene names

  jump    something changes in one frame and stands out from the frames around it: a hard cut, a label that pops, a step
          in a motion. The frame is cut into 144 tiles, so a small pop in a corner counts
  dark    the picture is empty for 0.25 s or more where no chapter begins or ends
  still   nothing visible moves for 2 s or more. Listed with what is being said. A picture may rest while it is explained,
          so this is a note. A rest of 5 s or more, or one of 2 s in silence, is an error

Works on frames reduced to 480 x 270, so film grain and compression noise do not count. Writes out/checks/frames.json
and one picture per jump (before, after). A finding that is right goes into accepted.json with its reason, one by one or
for a stretch of time (seconds):
  [{ "check": "frames", "match": "jump 0:41.3", "why": "a camera shutter" },
   { "check": "frames", "kind": "jump", "from": 92, "to": 110, "why": "the raster runs at time-lapse speed" }]
Exit code 0 means no open errors.
"""
import json, re, subprocess, sys
from pathlib import Path
import numpy as np
import studio as S

W, H, GX, GY = 480, 270, 16, 9
JUMP, STAND = 6.0, 4.0          # a tile must change by this many gray levels, and by this many times its neighbors in time
STILL, STILL_MIN = 0.35, 2.0    # a tile that changes less than this (levels per frame, averaged) is at rest
DARK, DARK_MIN = 2.0, 0.25


def frames(path):
    p = subprocess.Popen([S.FFMPEG, '-v', 'error', '-i', str(path), '-vf', f'scale={W}:{H}:flags=area,format=gray', '-f', 'rawvideo', '-'], stdout=subprocess.PIPE)
    n = W * H
    while True:
        b = p.stdout.read(n)
        if len(b) < n: break
        yield np.frombuffer(b, np.uint8).reshape(H, W)
    p.stdout.close(); p.wait()


def tiles(d):
    return d.reshape(GY, H // GY, GX, W // GX).mean((1, 3))


def measure(path):
    """per frame: each tile's mean change, the most changed tile at rest level, and how far the frame is from empty"""
    change, spread, prev = [], [], None
    for f in frames(path):
        x = f.astype(np.int16)
        if prev is not None: change.append(tiles(np.abs(x - prev)).astype(np.float32))
        spread.append(float(np.percentile(x, 99.8)) - float(np.median(x)))
        prev = x
    return np.array(change, np.float32).reshape(-1, GY * GX), np.array(spread)


def find_jumps(ch, fps):
    """frames whose change in some tile stands out from that tile's own change just before and just after"""
    n, out = len(ch), []
    half = max(3, int(round(0.1 * fps)))
    for i in range(n):
        strong = np.nonzero(ch[i] > JUMP)[0]
        if not len(strong): continue
        a, b = ch[max(0, i - half):i], ch[i + 1:i + 1 + half]
        for k in strong:
            near = max(float(a[:, k].max()) if len(a) else 0.0, float(b[:, k].max()) if len(b) else 0.0)
            if ch[i, k] > STAND * max(near, 0.6):
                out.append((i + 1, int(k), float(ch[i, k]))); break
    # neighboring frames are one finding
    joined = []
    for f, k, v in out:
        if joined and f - joined[-1][0] <= 2:
            if v > joined[-1][2]: joined[-1] = (f, k, v)
        else: joined.append((f, k, v))
    return joined


def find_runs(flag, fps, least):
    out, i, n = [], 0, len(flag)
    while i < n:
        if flag[i]:
            j = i
            while j < n and flag[j]: j += 1
            if (j - i) / fps >= least: out.append((i / fps, j / fps))
            i = j
        else: i += 1
    return out


def find_still(ch, fps):
    """no tile moves. A keyframe of the encoder can nudge the picture for one frame, so single frames are forgiven"""
    quiet = ch.max(1) < STILL
    for i in range(1, len(quiet) - 1):
        if not quiet[i] and quiet[i - 1] and quiet[i + 1] and ch[i].max() < 1.5: quiet[i] = True
    return find_runs(quiet, fps, STILL_MIN)


def picture(path, f, fps, out):
    a, b = max(0, (f - 1.5) / fps), max(0, (f - 0.5) / fps)
    subprocess.run([S.FFMPEG, '-y', '-v', 'error', '-ss', f'{a:.4f}', '-i', str(path), '-ss', f'{b:.4f}', '-i', str(path), '-filter_complex',
                    '[0:v]scale=960:-1,trim=end_frame=1[a];[1:v]scale=960:-1,trim=end_frame=1[b];[a][b]hstack', '-frames:v', '1', str(out)], check=False)


def scan(path, tl=None):
    info = S.probe(path); v, fps = S.video_stream(info)
    ch, spread = measure(path)
    dur = len(spread) / fps
    edges = [0.0, dur]
    scene = lambda t: ''
    said = lambda a, b: None
    if tl:
        edges += [s['start'] for s in tl['scenes'] if s.get('chapter')] + [tl['duration']]
        dips = [s['start'] for s in tl['scenes']]
        scene = lambda t: next((s['id'] for s in reversed(tl['scenes']) if t >= s['start'] - 1e-6), '')
        said = lambda a, b: sum(max(0.0, min(b, l['end']) - max(a, l['start'])) for l in tl['lines'])
    else: dips = []
    found = []
    for f, k, val in find_jumps(ch, fps):
        t = f / fps; row, col = divmod(k, GX)
        found.append({'kind': 'jump', 'error': True, 'start': t, 'end': t, 'frame': f, 'scene': scene(t), 'what': f'{val:.0f} gray levels in one frame around x {col * 120}, y {row * 120}'})
    for a, b in find_runs(spread < DARK, fps, DARK_MIN):
        at_edge = any(a - 0.8 <= e <= b + 0.8 for e in edges) or (b - a < 0.6 and any(a - 0.3 <= d <= b + 0.3 for d in dips))
        found.append({'kind': 'dark', 'error': not at_edge or b - a > 2.5, 'start': a, 'end': b, 'scene': scene(a), 'what': f'empty for {b - a:.2f} s' + (' at a chapter edge' if at_edge else '')})
    for a, b in find_still(ch, fps):
        s = said(a, b); silent = s is not None and s < 0.25 * (b - a)
        found.append({'kind': 'still', 'error': b - a >= 5.0 or silent, 'start': a, 'end': b, 'scene': scene(a),
                      'what': f'no motion for {b - a:.1f} s' + ('' if s is None else f', spoken for {s:.1f} s of it')})
    found.sort(key=lambda x: x['start'])
    still = sum(x['end'] - x['start'] for x in found if x['kind'] == 'still')
    return {'file': str(path), 'duration': dur, 'fps': fps, 'frames': len(spread), 'still_seconds': round(still, 1), 'still_percent': round(100 * still / dur, 1), 'found': found}


def main():
    a = sys.argv[1:]
    if not a: sys.exit(__doc__)
    if a[0].lower().endswith('.mp4'): vd, path = None, Path(a[0])
    else:
        vd = S.video_dir(a[0])
        path = Path(a[1]) if len(a) > 1 else next((p for p in (vd / 'out' / f'{vd.name}.mp4', vd / 'out' / f'{vd.name}_draft.mp4') if p.exists()), None)
        if path is None: S.fail(f'no rendered video in {vd / "out"}')
    tl = S.read_json(vd / 'timeline.json', {}) if vd and (vd / 'timeline.json').exists() else None
    r = scan(path, tl)
    if tl and abs(r['duration'] - tl['duration']) > 0.2: print(f"note  the file is {r['duration']:.1f} s and timeline.json {tl['duration']:.1f} s, so scene names may be off")
    rules = [x for x in (S.read_json(vd / 'accepted.json', []) if vd and (vd / 'accepted.json').exists() else []) if x.get('check') == 'frames' and x.get('why')]
    out = (vd / 'out' / 'checks') if vd else path.parent / 'checks'; out.mkdir(parents=True, exist_ok=True)
    for old in out.glob('jump_*.png'): old.unlink()
    errors, jumps = 0, 0
    for x in r['found']:
        span = S.clock(x['start']) + ('' if x['kind'] == 'jump' else f' to {S.clock(x["end"])}')
        line = f"{x['kind']:6s}{span}  {x['scene']:6s} {x['what']}"
        x['line'] = re.sub(r'\s+', ' ', line)
        why = next((q['why'] for q in rules if ('match' in q and q['match'] in x['line']) or ('from' in q and q.get('kind') == x['kind'] and q['from'] <= x['start'] and x['end'] <= q['to'])), None)
        if why: x['accepted'] = why; print(f'accepted {line}. {why}'); continue
        if x['kind'] == 'jump' and jumps < 24: jumps += 1; x['picture'] = f'jump_{jumps:02d}.png'; picture(path, x['frame'], r['fps'], out / x['picture'])
        errors += x['error']; print(('ERROR   ' if x['error'] else 'note    ') + line + (f"  [{x['picture']}]" if 'picture' in x else ''))
    r['errors'] = errors; S.write_json(out / 'frames.json', r)
    n = {k: sum(x['kind'] == k for x in r['found']) for k in ('jump', 'dark', 'still')}
    print(f"{r['frames']} frames, {r['duration']:.1f} s: {n['jump']} jumps, {n['dark']} dark gaps, {n['still']} still stretches ({r['still_seconds']} s, {r['still_percent']} percent), {errors} errors")
    sys.exit(1 if errors else 0)


if __name__ == '__main__':
    main()
