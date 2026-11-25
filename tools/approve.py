"""Record what Ryan approved. Run it only after Ryan has said yes, in words, to the thing itself.

  python tools/approve.py videos/x brief      the brief and its decisions (first approval)
  python tools/approve.py videos/x script     the script, its facts and its voice cost (second approval)
  python tools/approve.py videos/x            show what is approved and whether it has changed since

Writes videos/x/approvals.json with the date and a fingerprint of what was approved. narrate.py gen reads it and refuses
to spend credits on narration that was not approved. Changing timing (at, gap, min, beats) does not undo an approval.
Changing a spoken word does.
"""
import datetime, hashlib, sys
import studio as S


def brief_digest(vd):
    p = vd / 'brief.md'
    if not p.exists(): S.fail(f'no {p}')
    return hashlib.sha256(p.read_bytes().replace(b'\r\n', b'\n')).hexdigest()


def state(vd):
    """what is approved now: {'brief': 'approved' | 'changed' | 'no', 'narration': ..., 'screen': ..., 'facts': ...}"""
    ap = S.read_json(vd / 'approvals.json', {}) if (vd / 'approvals.json').exists() else {}
    out = {}
    out['brief'] = 'no' if 'brief' not in ap else 'approved' if (vd / 'brief.md').exists() and ap['brief']['digest'] == brief_digest(vd) else 'changed'
    script = S.load_script(vd)
    now = {'narration': S.narration_digest(script), 'screen': S.screen_digest(script), 'facts': S.facts_digest(vd)}
    for k, v in now.items(): out[k] = 'no' if 'script' not in ap else 'approved' if ap['script'][k] == v else 'changed'
    return out


def changed_lines(vd):
    ap = S.read_json(vd / 'approvals.json', {}) if (vd / 'approvals.json').exists() else {}
    if 'script' not in ap: return None
    old = ap['script']['lines']; new = {n: S.plain(ln['text']) for _, ln, n in S.lines_of(S.load_script(vd))}
    return [n for n in new if old.get(n) != new[n]] + [n for n in old if n not in new]


def main():
    if len(sys.argv) < 2: sys.exit(__doc__)
    vd = S.video_dir(sys.argv[1])
    what = sys.argv[2] if len(sys.argv) > 2 else None
    f = vd / 'approvals.json'
    ap = S.read_json(f) if f.exists() else {}
    today = datetime.date.today().isoformat()
    if what == 'brief':
        ap['brief'] = {'date': today, 'digest': brief_digest(vd)}; S.write_json(f, ap)
    elif what == 'script':
        if 'brief' not in ap: S.fail('the brief is not approved yet')
        script = S.load_script(vd)
        lines = {n: S.plain(ln['text']) for _, ln, n in S.lines_of(script)}
        chars = sum(len(S.spoken(ln['text'], script)) for _, ln, _ in S.lines_of(script))
        ap['script'] = {'date': today, 'narration': S.narration_digest(script), 'screen': S.screen_digest(script), 'facts': S.facts_digest(vd), 'voice': script['voice'], 'model': script['model'],
                        'words': sum(len(t.split()) for t in lines.values()), 'characters': chars, 'credits_estimated': 0 if script.get('silent') else round(chars * S.CREDITS_PER_CHAR), 'lines': lines}
        S.write_json(f, ap)
    elif what is not None: sys.exit(__doc__)
    st = state(vd)
    for k, v in st.items():
        d = ap.get('brief' if k == 'brief' else 'script', {}).get('date')
        print(f'{k:10s} {v}' + (f' on {d}' if v == 'approved' else f' since the approval on {d}' if v == 'changed' else 't approved' if v == 'no' else ''))
    ch = changed_lines(vd)
    if ch: print('lines changed since the approval: ' + ', '.join(ch))


if __name__ == '__main__':
    main()
