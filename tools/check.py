"""Run every automatic check on a video and say what is still open.

  python tools/check.py videos/x             script, facts, timeline, approvals, words on screen
  python tools/check.py videos/x --frames    also scan the rendered video (final, or draft)

Exit code 0 means every check passed. What the checks cannot see: whether a scene is clear, whether a picture is right,
whether a claim follows from its source, and 3D objects in front of text. That is what the reviewers are for.
"""
import subprocess, sys
import approve, check_facts, check_script, timeline
import studio as S


def main():
    a = sys.argv[1:]
    if not a: sys.exit(__doc__)
    vd = S.video_dir(a[0]); script = S.load_script(vd); rows = []
    err, warn, acc = check_script.check(vd)
    rows.append(('script', not err, f'{len(err)} errors, {len(warn)} warnings, {len(acc)} accepted', err + ['warning ' + w for w in warn]))
    err, warn = check_facts.check(vd)
    rows.append(('facts', not err, f'{len(err)} errors, {len(warn)} warnings', err + ['warning ' + w for w in warn]))
    if not (vd / 'timeline.json').exists(): rows.append(('timeline', False, 'timeline.json is missing. Run timeline.py', []))
    else:
        tl = S.read_json(vd / 'timeline.json'); bad = timeline.check(tl)
        if tl['timing'] != timeline.timing_digest(script): bad.append('script.json has changed since timeline.json was made')
        if tl['estimated']: bad.append('it is only an estimate from word counts, there is no voice yet')
        rows.append(('timeline', not bad, f"{S.clock(tl['duration'])}, {len(tl['lines'])} lines", bad))
    st = approve.state(vd); bad = [f'{k}: {v}' for k, v in st.items() if v != 'approved']
    rows.append(('approvals', not bad, 'brief and script approved' if not bad else 'open', bad))
    if (vd / 'clip.js').exists():
        r = subprocess.run(['node', str(S.ROOT / 'tools' / 'check_text.mjs'), S.scene_name(vd)], capture_output=True, text=True, encoding='utf-8')
        out = (r.stdout + r.stderr).strip().splitlines()
        terms = check_script.screen_terms(vd, S.read_json(vd / 'out' / 'checks' / 'text.json', {}).get('texts', []))
        rows.append(('screen', r.returncode == 0 and not terms, out[0] if out else 'no output', out[1:] + terms))
    else: rows.append(('screen', False, 'there is no clip.js yet', []))
    if '--frames' in a:
        r = subprocess.run([sys.executable, '-X', 'utf8', str(S.ROOT / 'tools' / 'scan_frames.py'), str(vd)], capture_output=True, text=True, encoding='utf-8')
        out = (r.stdout + r.stderr).strip().splitlines()
        rows.append(('frames', r.returncode == 0, out[-1] if out else 'no output', out[:-1]))
    for name, ok, text, more in rows:
        print(f'{"pass" if ok else "OPEN"}  {name:10s} {text}')
        for m in more[:40]: print('          ' + m)
        if len(more) > 40: print(f'          and {len(more) - 40} more')
    sys.exit(0 if all(ok for _, ok, _, _ in rows) else 1)


if __name__ == '__main__':
    main()
