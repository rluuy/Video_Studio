"""What goes with a finished video.

  python tools/deliver.py videos/x               from out/x_narrated.mp4 (a silent video from out/x.mp4)
  python tools/deliver.py videos/x --to FOLDER   also copy the video, poster, cue sheet and notes there

Writes to out/deliver/:
  <name>.mp4            the narrated video, with its chapters as marks a player can jump to
  <name>_1_<title>.mp4  one file per chapter, cut without encoding again (render.mjs puts a keyframe at each chapter)
  <name>_poster.png     the picture a slide shows before it plays
  cues.md               every line with its time and what is on screen, for whoever speaks over the silent version
  notes.txt             speaker notes: length, chapters, what is measured and what is drawn, sources
"""
import re, shutil, subprocess, sys
from pathlib import Path
import studio as S


def slug(s):
    return re.sub(r'[^a-z0-9]+', '_', s.lower()).strip('_')[:40] or 'chapter'


def run(*a):
    subprocess.run([S.FFMPEG, '-y', '-v', 'error', *a], check=True)


def chapters_of(tl):
    starts = [(s['start'], s['chapter']) for s in tl['scenes'] if s.get('chapter')]
    if not starts or starts[0][0] > 0.01: starts.insert(0, (0.0, tl['title'] or 'Start'))
    ends = [s for s, _ in starts[1:]] + [tl['duration']]
    return [(a, b, t if isinstance(t, str) else f'Part {i + 1}') for i, ((a, t), b) in enumerate(zip(starts, ends))]


def main():
    a = sys.argv[1:]
    if not a: sys.exit(__doc__)
    vd = S.video_dir(a[0]); tl = S.read_json(vd / 'timeline.json'); script = S.load_script(vd)
    import timeline
    if tl['timing'] != timeline.timing_digest(script): S.fail('timeline.json is older than script.json')
    silent = bool(script.get('silent')); sound = [] if silent else ['-map', '0:a:0']
    src = vd / 'out' / (f'{vd.name}.mp4' if silent else f'{vd.name}_narrated.mp4')
    if not src.exists(): S.fail(f'no {src}. Render' + ('' if silent else ', then narrate.py mix'))
    info = S.probe(src); v, fps = S.video_stream(info)
    if abs(float(v['duration']) - tl['duration']) > 0.1: S.fail(f"{src.name} is {float(v['duration']):.2f} s, the timeline {tl['duration']:.2f} s")
    out = vd / 'out' / 'deliver'
    if out.exists(): shutil.rmtree(out)
    out.mkdir(parents=True)
    ch = chapters_of(tl)
    # ---- the whole video with chapter marks
    meta = out / 'chapters.txt'
    meta.write_text(';FFMETADATA1\n' + ''.join(f'[CHAPTER]\nTIMEBASE=1/1000\nSTART={round(x * 1000)}\nEND={round(y * 1000)}\ntitle={t}\n' for x, y, t in ch), encoding='utf-8', newline='\n')
    full = out / f'{vd.name}.mp4'
    run('-i', str(src), '-i', str(meta), '-map', '0:v:0', *sound, '-map_metadata', '0', '-map_chapters', '1', '-c', 'copy', '-movflags', '+faststart', str(full)); meta.unlink()
    # ---- one file per chapter. It is copied from keyframe to keyframe by counting frames, so it is exact and nothing is encoded again
    files = []
    if len(ch) > 1:
        keys = subprocess.run([S.FFPROBE, '-v', 'error', '-select_streams', 'v:0', '-skip_frame', 'nokey', '-show_entries', 'frame=pts_time', '-of', 'csv=p=0', str(src)], capture_output=True, text=True, check=True).stdout
        keys = [float(x.strip(',')) for x in keys.split() if x.strip(',')]
        total = int(v['nb_frames']); first = []
        for i, (x, _, _) in enumerate(ch, 1):
            k = min(keys, key=lambda q: abs(q - x))
            if abs(k - x) > 1.1 / fps: S.fail(f'no keyframe at the start of chapter {i} ({x:.2f} s). Render again with the present timeline')
            first.append(round(k * fps))
        for i, (x, y, t) in enumerate(ch, 1):
            a0, n = first[i - 1], (first[i] if i < len(ch) else total) - first[i - 1]
            f = out / f'{vd.name}_{i}_{slug(t)}.mp4'
            run('-ss', f'{max(0, (a0 - 0.2) / fps):.4f}', '-i', str(src), '-frames:v', str(n), '-t', f'{n / fps + 0.004:.4f}', '-map', '0:v:0', *sound, '-c:v', 'copy', *([] if silent else ['-c:a', 'aac', '-b:a', '160k']), '-movflags', '+faststart', '-metadata', f'title={t}', str(f))
            got = int(S.video_stream(S.probe(f))[0]['nb_frames'])
            if got != n: S.fail(f'chapter {i} came out with {got} frames instead of {n}')
            files.append(f)
    # ---- poster
    p = tl.get('poster', tl['duration'] / 2)
    run('-ss', f'{p:.3f}', '-i', str(src), '-frames:v', '1', str(out / f'{vd.name}_poster.png'))
    # ---- cue sheet
    cue = [f"# {tl['title']}, cue sheet\n", f"{S.clock(tl['duration'])} long. Times are minutes and seconds from the start of the whole video.\n"]
    for s in tl['scenes']:
        cue.append(f"\n## {s['id']}" + (f", {s['chapter']}" if isinstance(s['chapter'], str) else '') + f" ({S.clock(s['start'])})\n\n| Starts | Ends | Said | On screen |\n| --- | --- | --- | --- |")
        for l in tl['lines']:
            if l['name'].split('.')[0] == s['id']: cue.append(f"| {S.clock(l['start'])} | {S.clock(l['end'])} | {l['text']} | {l['cue']} |")
    (out / 'cues.md').write_text('\n'.join(cue) + '\n', encoding='utf-8', newline='\n')
    # ---- notes
    rows = S.read_json(vd / 'facts.json', {'facts': []}).get('facts', [])
    n = [f"{tl['title']}. {S.clock(tl['duration'])}, narrated" + (f" by the {script['voice'].title()} voice from elevenlabs.io." if not tl['estimated'] else '.')]
    if silent: n = [f"{tl['title']}. {S.clock(tl['duration'])}, silent."]
    if len(ch) > 1: n.append('Chapters: ' + ', '.join(f'{t} ({S.clock(x)})' for x, _, t in ch) + '.')
    for kind, head in (('source', 'From sources'), ('computed', 'Computed for this video'), ('schematic', 'Drawn, not measured')):
        got = [f for f in rows if f.get('kind') == kind]
        if got: n.append(head + '. ' + ' '.join(f"{f['claim'].rstrip('.')} ({f['shown']}" + (f", {f['source']}, {f['where']}" if kind == 'source' else '') + ').' for f in got))
    (out / 'notes.txt').write_text('\n\n'.join(n) + '\n', encoding='utf-8', newline='\n')
    for f in sorted(out.iterdir()): print(f'  {f.name}  {f.stat().st_size / 1e6:.1f} MB' if f.suffix == '.mp4' else f'  {f.name}')
    if '--to' in a:
        dst = Path(a[a.index('--to') + 1])
        if not dst.is_dir(): S.fail(f'{dst} is not a folder')
        for f in out.iterdir(): shutil.copy2(f, dst / (f.name if f.name.startswith(vd.name) else f'{vd.name}_{f.name}'))
        print(f'copied to {dst}')


if __name__ == '__main__':
    main()
