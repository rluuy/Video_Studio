"""The voice of a video: ElevenLabs text to speech, one file per line, mixed into the rendered picture.

  python tools/narrate.py cost videos/x             what gen would make and roughly what it costs. No API calls
  python tools/narrate.py gen videos/x              make the missing lines. Refuses unless the script is approved
  python tools/narrate.py mix videos/x [file.mp4]   put the voice on a rendered video  -> out/<name>_narrated.mp4
  python tools/narrate.py check videos/x file.mp4   measure where each line starts in a finished video
  python tools/narrate.py audition NAME "text"      one test line in one voice, to out/auditions/. Costs credits
  python tools/narrate.py credits                   what is left on the account this month

Each line is kept in videos/x/voice/ under a hash of its text, voice and model, so only new or changed lines ever cost
credits. voice/index.json says which file is which line and when it was made. The key comes from ELEVENLABS_API_KEY (the
process environment or the Windows user environment). It is never printed and never written.
"""
import datetime, json, os, subprocess, sys, urllib.error, urllib.request
import numpy as np
import studio as S
import approve

API = os.environ.get('STUDIO_TTS_URL', 'https://api.elevenlabs.io')     # the test points this at a stand-in on this machine
LOUD = 'I=-16:TP=-1.5:LRA=11'


def api_key():
    k = os.environ.get('ELEVENLABS_API_KEY')
    if not k and os.name == 'nt':
        import winreg
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, 'Environment') as h:
            try: k = winreg.QueryValueEx(h, 'ELEVENLABS_API_KEY')[0]
            except FileNotFoundError: k = None
    if not k: S.fail('ELEVENLABS_API_KEY is not set on this machine')
    return k.strip()


def api(path, body=None, accept='application/json'):
    req = urllib.request.Request(API + path, method='POST' if body is not None else 'GET', data=None if body is None else json.dumps(body).encode(),
                                 headers={'xi-api-key': api_key(), 'content-type': 'application/json', 'accept': accept})
    try:
        with urllib.request.urlopen(req, timeout=180) as r: return r.read(), r.headers
    except urllib.error.HTTPError as e:
        S.fail(f'ElevenLabs answered {e.code} on {path.split("?")[0]}. ' + e.read().decode(errors='replace')[:400])


def subscription():
    s = json.loads(api('/v1/user/subscription')[0])
    return s['character_limit'] - s['character_count'], f"{s['character_count']:,} of {s['character_limit']:,} credits used this month ({s['tier']} plan)"


def todo(vd, script):
    """the lines without a voice file. The same sentence twice is one file"""
    seen, out = set(), []
    for _, ln, name in S.lines_of(script):
        f = S.voice_file(vd, ln['text'], script)
        if f.exists() or f.name in seen: continue
        seen.add(f.name); out.append((name, ln['text'], f))
    return out


def say(text, vid, model, path):
    audio, hdr = api(f'/v1/text-to-speech/{vid}?output_format={S.FMT}', {'text': text, 'model_id': model}, 'audio/mpeg')
    path.parent.mkdir(parents=True, exist_ok=True)
    part = path.with_suffix('.part'); part.write_bytes(audio); os.replace(part, path)
    return hdr.get('x-character-count', '?')


def cmd_cost(vd, script):
    need = todo(vd, script); chars = sum(len(S.spoken(t, script)) for _, t, _ in need)
    total = sum(1 for _ in S.lines_of(script))
    print(f'{total} lines, {total - len(need)} already have a voice, {len(need)} to make')
    print(f'{chars:,} characters, about {chars * S.CREDITS_PER_CHAR:,.0f} credits ({S.CREDITS_PER_CHAR} per character, measured once on the CCOS explainer)')
    for name, text, _ in need[:200]: print(f'  {name:18s} {len(S.spoken(text, script)):4d}  {S.plain(text)[:80]}')


def cmd_gen(vd, script):
    st = approve.state(vd)
    if st['narration'] == 'no': S.fail('the script is not approved. Show Ryan the script, its facts and the cost first, then run approve.py')
    if st['narration'] == 'changed': S.fail('these lines changed after the script was approved: ' + ', '.join(approve.changed_lines(vd)) + '. Ask Ryan, then run approve.py again')
    need = todo(vd, script)
    if not need: print('every line already has its voice, nothing to pay for'); return
    chars = sum(len(S.spoken(t, script)) for _, t, _ in need); left, text = subscription()
    print(f'{len(need)} lines, {chars:,} characters, about {chars * S.CREDITS_PER_CHAR:,.0f} credits. {text}')
    if chars * S.CREDITS_PER_CHAR > left: S.fail(f'only {left:,} credits are left')
    idx_f = vd / 'voice' / 'index.json'; idx = S.read_json(idx_f) if idx_f.exists() else {}
    vid = S.voice_id(script['voice'])
    for name, t, f in need:
        billed = say(S.spoken(t, script), vid, script['model'], f)
        idx[f.name] = {'line': name, 'text': S.plain(t), 'said': S.spoken(t, script), 'voice': script['voice'], 'model': script['model'], 'made': datetime.date.today().isoformat(), 'billed': billed}
        S.write_json(idx_f, idx)
        print(f'  {name}: {billed} billed')
    print(subscription()[1])


def track(vd, tl):
    buf = np.zeros(int(round(tl['duration'] * S.SR)), np.float32)
    for ln in tl['lines']:
        x = S.decode(vd / ln['audio']); s = int(round((ln['start'] - ln['trim']) * S.SR))
        if s < 0: x, s = x[-s:], 0
        x = x[:len(buf) - s]; buf[s:s + len(x)] += x
    return buf


def cmd_mix(vd, script, src):
    tl = S.read_json(vd / 'timeline.json')
    if tl['estimated']: S.fail('timeline.json is only an estimate. Run timeline.py fit first')
    import timeline
    if tl['timing'] != timeline.timing_digest(script): S.fail('script.json changed after timeline.json was made. Run timeline.py fit again, and render again')
    name = vd.name
    src = src or vd / 'out' / f'{name}.mp4'
    info = S.probe(src); v, _ = S.video_stream(info)
    dur = float(v.get('duration') or info['format']['duration'])
    if abs(dur - tl['duration']) > 0.1: S.fail(f'the picture is {dur:.2f} s and the timeline {tl["duration"]:.2f} s. Render again')
    raw = vd / 'out' / 'narration.f32'; track(vd, tl).tofile(raw)
    inp = ['-f', 'f32le', '-ar', str(S.SR), '-ac', '1', '-i', str(raw)]
    m = subprocess.run([S.FFMPEG, '-hide_banner', '-nostats', *inp, '-af', f'loudnorm={LOUD}:print_format=json', '-f', 'null', '-'], capture_output=True, text=True).stderr
    j = json.loads(m[m.rfind('{'):m.rfind('}') + 1])
    norm = (f'loudnorm={LOUD}:measured_I={j["input_i"]}:measured_TP={j["input_tp"]}:measured_LRA={j["input_lra"]}:measured_thresh={j["input_thresh"]}'
            f':offset={j["target_offset"]}:linear=true')
    dst = src.with_name(src.stem + '_narrated.mp4')
    voice = script['voice'].title()
    subprocess.run([S.FFMPEG, '-v', 'error', '-y', '-i', str(src), *inp, '-map', '0:v:0', '-map', '1:a:0', '-map_metadata', '0', '-c:v', 'copy', '-af', norm, '-ar', str(S.SR),
                    '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', '-metadata', f'title={tl["title"]}',
                    '-metadata:s:a:0', f'title=Narration, {voice} voice (elevenlabs.io)', str(dst)], check=True)
    raw.unlink()
    print(f'{dst}\nnarration was {j["input_i"]} LUFS, set to -16')
    cmd_check(vd, dst)


def cmd_check(vd, mp4):
    """where each line really starts in the finished file, against the timeline"""
    tl = S.read_json(vd / 'timeline.json'); x = S.decode(mp4)
    want = track(vd, tl)
    # line the whole track up with what should be there, then look at each line on its own
    worst, rows = 0.0, []
    step = int(0.002 * S.SR)
    env = lambda a: np.sqrt(np.convolve(a ** 2, np.ones(step) / step, 'same')[::step] + 1e-20)
    for ln in tl['lines']:
        a, b = int((ln['start'] - 0.15) * S.SR), int(min(ln['end'], ln['start'] + 2.0) * S.SR)
        a = max(a, 0); R = int(0.25 * S.SR)
        e_want = env(want[a:b]); seg = x[max(a - R, 0):b + R]; e_got = env(seg)
        if len(e_got) < len(e_want): S.fail(f'the sound of {mp4} ends before {ln["name"]}')
        e_want = e_want - e_want.mean()
        c = [float((e_want * (e_got[k:k + len(e_want)] - e_got[k:k + len(e_want)].mean())).sum() / (np.linalg.norm(e_got[k:k + len(e_want)] - e_got[k:k + len(e_want)].mean()) + 1e-12)) for k in range(len(e_got) - len(e_want) + 1)]
        off = (int(np.argmax(c)) * step - (a - max(a - R, 0))) / S.SR
        rows.append((ln['name'], off)); worst = max(worst, abs(off))
    late = [f'{n} by {1000 * o:+.0f} ms' for n, o in rows if abs(o) > 0.04]
    m = subprocess.run([S.FFMPEG, '-hide_banner', '-nostats', '-i', str(mp4), '-vn', '-af', 'ebur128=framelog=quiet', '-f', 'null', '-'], capture_output=True, text=True).stderr
    lufs = [l for l in m.splitlines() if l.strip().startswith('I:')]
    print(f'{len(rows)} lines, the largest offset is {1000 * worst:.0f} ms, loudness {lufs[-1].split(":")[1].strip() if lufs else "?"}')
    if late: S.fail('these lines are not where the timeline puts them: ' + ', '.join(late))


def main():
    a = sys.argv[1:]
    if not a: sys.exit(__doc__)
    if a[0] == 'credits': print(subscription()[1]); return
    if a[0] == 'audition':
        if len(a) < 3: sys.exit(__doc__)
        d = S.ROOT / 'out' / 'auditions' / f'{a[1]}_{datetime.datetime.now():%Y%m%d-%H%M%S}.mp3'
        print(f'{say(a[2], S.voice_id(a[1]), S.MODEL, d)} billed, {d}'); return
    if a[0] not in ('cost', 'gen', 'mix', 'check') or len(a) < 2: sys.exit(__doc__)
    vd = S.video_dir(a[1]); script = S.load_script(vd)
    if a[0] == 'cost': cmd_cost(vd, script)
    elif a[0] == 'gen': cmd_gen(vd, script)
    elif a[0] == 'mix': cmd_mix(vd, script, S.Path(a[2]).resolve() if len(a) > 2 else None)
    else:
        if len(a) < 3: sys.exit(__doc__)
        cmd_check(vd, S.Path(a[2]).resolve())


if __name__ == '__main__':
    main()
