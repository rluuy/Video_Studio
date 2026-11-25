"""Place every narration line and every caption in time, from script.json and the real speech.

  python tools/timeline.py plan videos/x     from word counts, before there is a voice
  python tools/timeline.py fit videos/x      from the voice files, after narrate.py gen
  python tools/timeline.py show videos/x     print what timeline.json holds

Writes videos/x/timeline.json. The clip asks it when a line starts (engine/core/timeline.js), so nothing in the clip
holds a second of its own and a longer line moves the picture with it.

How a line is placed. A line starts when the one before it has ended, plus a short silence ("gap"). "at" keeps it from
starting earlier than that many seconds into its scene, and "wait" makes the silence before it longer. "hold" keeps
quiet after it. A scene lasts until its last line has ended plus "tail", or "min" if that is longer. So two lines can
never overlap, and no line can run into the next scene.

Beats. A beat is a moment with a name: "magnify" (a line's start), "magnify:end", or "magnify.P" (the mark <P> inside
the line). Captions take beats too: "from": "magnify+0.3". A number is seconds from the scene's start.
"""
import re, sys
import studio as S

BEAT = re.compile(r'^([A-Za-z][\w-]*)(?:\.([A-Za-z][\w-]*))?(:end)?\s*([+-]\s*\d+(?:\.\d+)?)?$')


def measure(vd, script, estimated):
    """speech length, trim and mark times of every line"""
    out, missing = {}, []
    for _, ln, name in S.lines_of(script):
        text = ln['text']
        if estimated:
            length = max(0.4, len(S.plain(text).split()) / script['rate'])
            out[name] = {'length': length, 'trim': 0.0, 'audio': None, 'marks': S.mark_times(text, script, None, length)}
            continue
        f = S.voice_file(vd, text, script)
        if not f.exists(): missing.append(name); continue
        x = S.decode(f); a, b = S.voiced(x)
        out[name] = {'length': (b - a) / S.SR, 'trim': a / S.SR, 'audio': f'voice/{f.name}', 'marks': S.mark_times(text, script, x)}
    if missing: S.fail(f'no voice file for {", ".join(missing)}. Run narrate.py gen first, or use plan')
    return out


def resolve(ref, scene, where):
    """a beat or a number -> seconds from the scene's start"""
    if isinstance(ref, (int, float)): return float(ref)
    m = BEAT.match(str(ref).strip())
    if not m: S.fail(f'{where}: cannot read the beat "{ref}"')
    line, mark, end, off = m.groups()
    key = f'{line}.{mark}' if mark else f'{line}:end' if end else line
    if line == 'scene': base = scene['length'] if end else 0.0
    elif key in scene['beats']: base = scene['beats'][key]
    else: S.fail(f'{where}: no beat "{key}" in scene {scene["id"]}. It has: ' + ', '.join(scene['beats']))
    return base + (float(off.replace(' ', '')) if off else 0.0)


def build(vd, script, estimated):
    speech = measure(vd, script, estimated)
    scenes, lines, notes, t = [], [], [], 0.0
    last = len(script['scenes']) - 1
    for si, sc in enumerate(script['scenes']):
        beats, prev_end, here = {}, None, []
        for ln in sc.get('lines', []):
            sp = speech[f"{sc['id']}.{ln['id']}"]
            soonest = script['lead'] if prev_end is None else prev_end + max(script['gap'], ln.get('gap', 0), ln.get('wait', 0))
            start = max(soonest, ln.get('at', 0))
            if 'at' in ln and start > ln['at'] + 0.005: notes.append(f"{sc['id']}.{ln['id']} starts {start - ln['at']:.2f} s after its planned {ln['at']:.2f} s, the line before it runs that long")
            end = start + sp['length']
            beats[ln['id']] = round(start, 3); beats[ln['id'] + ':end'] = round(end, 3)
            for k, v in sp['marks'].items(): beats[f"{ln['id']}.{k}"] = round(start + v, 3)
            here.append({'name': f"{sc['id']}.{ln['id']}", 'start': start, 'end': end, 'text': S.plain(ln['text']), 'cue': ln.get('cue', ''), 'audio': sp['audio'], 'trim': round(sp['trim'], 4)})
            prev_end = end + ln.get('hold', 0)
        need = (prev_end or 0.0) + (sc.get('tail', script['end'] if si == last else script['tail']) if prev_end is not None else 0.0)
        length = max(need, sc.get('min', 0.0))
        if length <= 0: S.fail(f"scene {sc['id']} has no lines and no \"min\"")
        if 'min' in sc and length > sc['min'] + 0.005: notes.append(f"scene {sc['id']} is {length:.2f} s, longer than its minimum {sc['min']:.2f} s, to fit the speech")
        length = round(length, 3)
        scene = {'id': sc['id'], 'start': round(t, 3), 'length': length, 'chapter': sc.get('chapter'), 'cut': sc.get('cut', 'dip'), 'beats': beats, 'captions': []}
        for ln in here:
            ln['start'] = round(ln['start'] + t, 3); ln['end'] = round(ln['end'] + t, 3); lines.append(ln)
        # captions: explicit times, or from one to the next of the same kind
        caps = sc.get('captions', [])
        for ci, c in enumerate(caps):
            where = f"scene {sc['id']}, caption {ci + 1}"
            t0 = resolve(c['from'], scene, where) if 'from' in c else 0.3
            nxt = next((d for d in caps[ci + 1:] if d.get('kind', 'title') == c.get('kind', 'title')), None)
            if 'to' in c: t1 = resolve(c['to'], scene, where)
            elif nxt is not None and 'from' in nxt: t1 = resolve(nxt['from'], scene, where) - 0.4
            else: t1 = length - 0.3
            if t1 - t0 < 0.5: S.fail(f'{where} would show for {t1 - t0:.2f} s')
            if t0 < -0.001 or t1 > length + 0.001: S.fail(f'{where} runs from {t0:.2f} to {t1:.2f} s, outside its scene of {length:.2f} s')
            words = len(re.sub(r'<[^>]+>|\{[^}]+\}', ' x ', c['text']).split())
            if t1 - t0 < 0.8 + words / 4: notes.append(f'{where} shows for {t1 - t0:.1f} s, short for {words} words')
            scene['captions'].append({'kind': c.get('kind', 'title'), 'text': c['text'], 't0': round(t0, 3), 't1': round(t1, 3)})
        scenes.append(scene); t = round(t + length, 3)
    tl = {'title': script.get('title', ''), 'estimated': estimated, 'voice': None if estimated else script['voice'], 'model': None if estimated else script['model'],
          'narration': S.narration_digest(script), 'timing': timing_digest(script), 'ending': script.get('ending', 'fade'),
          'duration': t, 'scenes': scenes, 'lines': lines}
    if script.get('poster'):
        sid, _, ref = script['poster'].partition('.')
        sc = next((x for x in scenes if x['id'] == sid), None)
        if sc is None: S.fail(f'the poster names scene {sid}, which does not exist')
        tl['poster'] = round(sc['start'] + resolve(ref or 'scene', sc, 'poster'), 3)
    return tl, notes


def timing_digest(script):
    """everything in the script that moves something in time"""
    keep = [[sc['id'], sc.get('min'), sc.get('tail'), sc.get('chapter'), sc.get('cut'), [[l['id'], l['text'], l.get('at'), l.get('gap'), l.get('wait'), l.get('hold')] for l in sc.get('lines', [])],
             [[c.get('kind'), c['text'], c.get('from'), c.get('to')] for c in sc.get('captions', [])]] for sc in script['scenes']]
    return S.digest([keep, [script[k] for k in S.DEFAULTS], script.get('poster'), script.get('ending'), script['voice'], script['model'], script.get('say')])


def check(tl):
    """what must hold for any timeline"""
    bad = []
    for a, b in zip(tl['lines'], tl['lines'][1:]):
        if b['start'] < a['end'] + 0.05: bad.append(f"{b['name']} starts {a['end'] - b['start']:.2f} s before {a['name']} has ended")
    ends = {s['id']: s['start'] + s['length'] for s in tl['scenes']}
    for ln in tl['lines']:
        if ln['end'] > ends[ln['name'].split('.')[0]] + 0.001: bad.append(f"{ln['name']} runs past the end of its scene")
    for a, b in zip(tl['scenes'], tl['scenes'][1:]):
        if abs(a['start'] + a['length'] - b['start']) > 0.002: bad.append(f"scene {b['id']} does not start where {a['id']} ends")
    return bad


def show(tl):
    speech = sum(l['end'] - l['start'] for l in tl['lines']); words = sum(len(l['text'].split()) for l in tl['lines'])
    print(f"{tl['title'] or 'untitled'}: {S.clock(tl['duration'])} long, {len(tl['scenes'])} scenes, {len(tl['lines'])} lines, {words} words, "
          f"{speech:.0f} s of speech ({'estimated' if tl['estimated'] else tl['voice'] + ', measured'}), {100 * speech / tl['duration']:.0f} percent spoken")
    for s in tl['scenes']:
        print(f"  {s['id']:8s} {S.clock(s['start']):>7s}  {s['length']:6.2f} s" + (f"   chapter: {s['chapter']}" if s['chapter'] else ''))
        for l in tl['lines']:
            if l['name'].split('.')[0] == s['id']: print(f"     {l['name'].split('.', 1)[1]:14s} {l['start'] - s['start']:6.2f} to {l['end'] - s['start']:6.2f}   {l['text'][:70]}")


def main():
    if len(sys.argv) < 3 or sys.argv[1] not in ('plan', 'fit', 'show'): sys.exit(__doc__)
    cmd, vd = sys.argv[1], S.video_dir(sys.argv[2])
    if cmd == 'show': show(S.read_json(vd / 'timeline.json')); return
    tl, notes = build(vd, S.load_script(vd), cmd == 'plan')
    bad = check(tl)
    if bad: S.fail('\n  '.join(bad))
    S.write_json(vd / 'timeline.json', tl)
    show(tl)
    for n in notes: print('note  ' + n)


if __name__ == '__main__':
    main()
