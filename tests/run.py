"""Test every tool, on the small video in tests/demo. Each check has to pass on it and catch a fault planted in it.

  python tests/run.py            everything, about two minutes
  python tests/run.py script     only the tests whose name holds this word

No credits are spent. The voice is a stand-in that this file makes, and the ElevenLabs address is pointed at a small
server on this machine.
"""
import copy, http.server, json, os, shutil, subprocess, sys, tempfile, threading
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'tools'))
import approve, check_facts, check_script, spoken_numbers, studio as S, timeline  # noqa: E402

DEMO = ROOT / 'tests' / 'demo'
PY = [sys.executable, '-X', 'utf8']
results = []


def run(*a, **k):
    r = subprocess.run([str(x) for x in a], capture_output=True, text=True, encoding='utf-8', cwd=ROOT, **k)
    return r.returncode, r.stdout + r.stderr


def expect(name, ok, detail=''):
    results.append((name, bool(ok))); print(f'{"pass" if ok else "FAIL"}  {name}' + ('' if ok else f'\n      {str(detail)[-1500:]}'))


def word_time(w):
    """how long the stand-in voice says a word, and how long it is silent after it (s)"""
    return 0.10 + 0.05 * len(w.strip('.,?!')), 0.45 if w[-1] in '.?!' else 0.3 if w[-1] == ',' else 0.06


def tone(words):
    """a stand-in for speech: one hum per word, with a longer silence after commas and sentences. Returns samples at 44.1 kHz"""
    sr, out = 44100, [np.zeros(int(0.08 * 44100))]
    for w in words:
        say, quiet = word_time(w); n = int(say * sr); t = np.arange(n) / sr
        out += [0.25 * np.sin(2 * np.pi * 180 * t) * np.minimum(1, np.minimum(t, t[::-1]) / 0.015), np.zeros(int(quiet * sr))]
    return np.concatenate(out + [np.zeros(int(0.15 * sr))])


def mp3(text):
    r = subprocess.run([S.FFMPEG, '-v', 'error', '-f', 'f32le', '-ar', '44100', '-ac', '1', '-i', '-', '-f', 'mp3', '-b:a', '128k', '-'], input=tone(text.split()).astype(np.float32).tobytes(), capture_output=True, check=True)
    return r.stdout


class Voice(http.server.BaseHTTPRequestHandler):
    """stands in for ElevenLabs"""
    calls = []

    def log_message(self, *a): pass

    def do_GET(self):
        b = json.dumps({'character_count': 100, 'character_limit': 30000, 'tier': 'test'}).encode()
        self.send_response(200); self.end_headers(); self.wfile.write(b)

    def do_POST(self):
        body = json.loads(self.rfile.read(int(self.headers['content-length']))); Voice.calls.append((self.path, body, self.headers['xi-api-key']))
        b = mp3(body['text'])
        self.send_response(200); self.send_header('x-character-count', str(len(body['text']))); self.end_headers(); self.wfile.write(b)


def fresh(script=None, facts=None):
    """a copy of the demo in a scratch folder, with changes"""
    d = Path(tempfile.mkdtemp(prefix='studio_test_'))
    s = json.loads((DEMO / 'script.json').read_text(encoding='utf-8')); f = json.loads((DEMO / 'facts.json').read_text(encoding='utf-8'))
    if script: script(s)
    if facts: facts(f)
    S.write_json(d / 'script.json', s); S.write_json(d / 'facts.json', f); (d / 'brief.md').write_text('# Demo\n', encoding='utf-8')
    return d


def line(s, name):
    sc, ln = name.split('.')
    return next(l for x in s['scenes'] if x['id'] == sc for l in x['lines'] if l['id'] == ln)


# ---------------------------------------------------------------------------------------------------------------- tests
def test_numbers():
    for text, v in [('a hundred and nineteen nanometers', 119), ('nineteen twenty-seven', 1927), ('a tenth of one', 0.1), ('a million', 1e6), ('two point eight', 2.8), ('six hundred thirty-three', 633),
                    ('twenty-seven', 27), ('two thousand four hundred', 2400), ('three quarters', 0.75), ('twelve point five', 12.5), ('three hundred million', 3e8)]:
        expect(f'numbers: {text}', abs(spoken_numbers.value(text) - v) < 1e-9, spoken_numbers.value(text))
    for text, n in [('CCOS is one step in a longer process', 0), ('one nanometer across', 1), ('Press twice as hard', 1), ('no numbers here at all', 0), ('a third of the light', 1), ('the first and the last', 0), ('hundreds of small steps', 0)]:
        expect(f'numbers: {n} in "{text}"', len(spoken_numbers.find(text)) == n, spoken_numbers.find(text))


def test_script():
    def errs(change): return check_script.check(fresh(change))[0]
    expect('script: the demo is clean', errs(None) == [], errs(None))
    for what, change in {
        'punctuation: em dash': lambda s: line(s, 'S1.bumps').update(text='This surface — it has hills.'),
        'punctuation: semicolon': lambda s: line(s, 'S1.bumps').update(text='This surface has hills; it has valleys.'),
        'punctuation: colon': lambda s: line(s, 'S1.bumps').update(text='One thing matters: the hills.'),
        'digits': lambda s: line(s, 'S1.rms').update(text='Their typical height, the RMS, is 40 nanometers.'),
        'wording': lambda s: line(s, 'S1.bumps').update(text='Let us delve into this surface.'),
        'used in S1, title on screen': lambda s: (s['scenes'][0]['captions'][0].update(text='The RMS of a surface'), s['terms'][0].update(line='S2.turn'), line(s, 'S2.turn').update(text='Turn the RMS mirror.')),
        '"PSD"': lambda s: line(s, 'S2.turn').update(text='Turn the PSD by a small angle.'),
        'no cue': lambda s: line(s, 'S2.turn').pop('cue'),
        'two lines are called': lambda s: line(s, 'S2.twice').update(id='turn'),
    }.items():
        e = errs(change); expect(f'script: catches {what}', any(what in x for x in e), e)
    w = check_script.check(fresh(lambda s: line(s, 'S1.bumps').update(text='word ' * 33)))[1]; expect('script: warns of a long line', any(x.startswith('long') for x in w), w)
    d = fresh(lambda s: line(s, 'S1.bumps').update(text='This robust surface has hills.')); S.write_json(d / 'accepted.json', [{'check': 'script', 'match': '"robust"', 'why': 'a term of statistics here'}])
    e, _, acc = check_script.check(d); expect('script: an accepted wording is not an error', not e and len(acc) == 1, (e, acc))


def test_facts():
    def errs(script=None, facts=None): return check_facts.check(fresh(script, facts))[0]
    expect('facts: the demo is clean', errs() == [], errs())
    for what, s, f in [
        ('with no fact', lambda s: line(s, 'S1.bumps').update(text='This surface has twelve hills.'), None),
        ('whose value is 40', lambda s: line(s, 'S1.rms').update(text='Their typical height, the RMS, is fifty nanometers.'), lambda f: f['facts'][0].update(spoken=['fifty nanometers'])),
        ('says none of', lambda s: line(s, 'S1.rms').update(text='Their typical height is the RMS.'), None),
        ('does not have', lambda s: line(s, 'S1.rms').update(facts=['F9']), None),
        ('has no "quote"', None, lambda f: f['facts'][1].pop('quote')),
        ('has no "checked"', None, lambda f: f['facts'][1].update(checked='')),
        ('but shows "41 nm"', None, lambda f: f['facts'][0].update(shown='41 nm')),
        ('typed-in number', lambda s: s['scenes'][0]['captions'][0].update(text='A 40 nm surface'), None),
        ('prints {F7}', lambda s: s['scenes'][0]['captions'][0].update(text='A surface of {F7}'), None),
        ('needs a kind', None, lambda f: f['facts'][0].update(kind='guess')),
    ]:
        e = errs(s, f); expect(f'facts: catches {what}', any(what in x for x in e), e)
    e = errs(lambda s: line(s, 'S1.bumps').update(text='It has two sides.', plain=['two'])); expect('facts: a plain number is allowed when listed', e == [], e)


def voiced_demo(d):
    script = S.load_script(d)
    for _, ln, _ in S.lines_of(script):
        f = S.voice_file(d, ln['text'], script); f.parent.mkdir(exist_ok=True); f.write_bytes(mp3(S.spoken(ln['text'], script)))
    return script


def test_timeline():
    d = fresh(); script = voiced_demo(d)
    tl, notes = timeline.build(d, script, False)
    expect('timeline: nothing overlaps', timeline.check(tl) == [], timeline.check(tl))
    # a mark in the middle of a line, against where the stand-in voice really says it
    ln = next(l for l in tl['lines'] if l['name'] == 'S1.rms'); b = tl['scenes'][0]['beats']
    before = 'Their typical height, the RMS, is'.split(); true = sum(sum(word_time(w)) for w in before)
    expect('timeline: a mark lands within 0.15 s of the word', abs((b['rms.N'] - b['rms']) - true) < 0.15, (b['rms.N'] - b['rms'], true))
    # a long line pushes the next one, and the scene grows
    d2 = fresh(lambda s: (line(s, 'S1.bumps').update(text='word ' * 24), line(s, 'S1.rms').update(at=3.0), s['scenes'][0].update(min=5.0))); tl2, notes2 = timeline.build(d2, voiced_demo(d2), False)
    expect('timeline: a long line moves the next one and the scene grows', timeline.check(tl2) == [] and tl2['scenes'][0]['length'] > 8 and len(notes2) >= 2, notes2)
    broken = copy.deepcopy(tl); broken['lines'][1]['start'] = broken['lines'][0]['end'] - 0.4
    expect('timeline: check() catches an overlap', any('before' in x for x in timeline.check(broken)), timeline.check(broken))
    for what, change in {'no beat "nowhere"': lambda s: s['scenes'][0]['captions'][1].update({'from': 'nowhere'}), 'outside its scene': lambda s: s['scenes'][0]['captions'][1].update({'to': 'rms:end+9'})}.items():
        d3 = fresh(change); voiced_demo(d3); c, out = run(*PY, 'tools/timeline.py', 'fit', d3); expect(f'timeline: stops at {what}', c != 0 and what in out, out)
    d4 = fresh(); c, out = run(*PY, 'tools/timeline.py', 'fit', d4); expect('timeline: fit refuses without a voice', c != 0 and 'no voice file' in out, out)
    c, out = run(*PY, 'tools/timeline.py', 'plan', d4); expect('timeline: plan works without a voice', c == 0 and 'estimated' in out, out)


def test_narrate():
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), Voice); threading.Thread(target=srv.serve_forever, daemon=True).start()
    env = {**os.environ, 'STUDIO_TTS_URL': f'http://127.0.0.1:{srv.server_address[1]}', 'ELEVENLABS_API_KEY': 'test-key-not-real'}
    d = fresh(); Voice.calls.clear()
    c, out = run(*PY, 'tools/narrate.py', 'gen', d, env=env); expect('narrate: refuses before the script is approved', c != 0 and 'not approved' in out and not Voice.calls, out)
    c, out = run(*PY, 'tools/approve.py', d, 'script'); expect('approve: the script cannot be approved before the brief', c != 0, out)
    run(*PY, 'tools/approve.py', d, 'brief'); run(*PY, 'tools/approve.py', d, 'script')
    c, out = run(*PY, 'tools/narrate.py', 'cost', d, env=env); expect('narrate: cost lists every line and calls nothing', c == 0 and '5 to make' in out and not Voice.calls, out)
    c, out = run(*PY, 'tools/narrate.py', 'gen', d, env=env); expect('narrate: makes 5 lines once approved', c == 0 and len(Voice.calls) == 5, out)
    expect('narrate: marks are not sent to the voice', all('<' not in b['text'] for _, b, _ in Voice.calls), Voice.calls)
    expect('narrate: the key is in no file and no output', 'test-key-not-real' not in out and not any('test-key-not-real' in f.read_text(encoding='utf-8', errors='ignore') for f in d.rglob('*') if f.is_file()))
    c, out = run(*PY, 'tools/narrate.py', 'gen', d, env=env); expect('narrate: a second run makes and pays for nothing', c == 0 and len(Voice.calls) == 5, out)
    s = S.read_json(d / 'script.json'); line(s, 'S1.bumps')['text'] = 'This surface has many hills and valleys.'; S.write_json(d / 'script.json', s)
    c, out = run(*PY, 'tools/narrate.py', 'gen', d, env=env); expect('narrate: refuses when a word changed after approval, and names the line', c != 0 and 'S1.bumps' in out and len(Voice.calls) == 5, out)
    s = S.read_json(d / 'script.json'); line(s, 'S1.bumps')['text'] = 'This surface has hills and valleys.'; line(s, 'S1.bumps')['at'] = 0.9; S.write_json(d / 'script.json', s)
    expect('approve: moving a line in time keeps the approval', approve.state(d)['narration'] == 'approved', approve.state(d))
    srv.shutdown()


def test_screen():
    script = S.load_script(DEMO); shutil.rmtree(DEMO / 'voice', ignore_errors=True); voiced_demo(DEMO)
    c, out = run(*PY, 'tools/timeline.py', 'fit', 'tests/demo'); expect('demo: timeline fits', c == 0, out)
    fault = DEMO / 'out' / 'fault.json'; fault.parent.mkdir(exist_ok=True); fault.unlink(missing_ok=True)
    c, out = run('node', 'tools/check_text.mjs', 'tests/demo'); expect('screen: the demo is clean', c == 0, out)
    for f in ('overlap', 'crossed', 'outside', 'small', 'number', 'fact', 'dash'):
        fault.write_text(json.dumps({'fault': f}))
        c, out = run('node', 'tools/check_text.mjs', 'tests/demo', '--step', '1'); kinds = {l.split()[0] for l in out.splitlines()[1:] if l.strip()}
        expect(f'screen: catches {f}', c == 1 and f in kinds, out)
    fault.write_text(json.dumps({'fault': 'crossed'})); S.write_json(DEMO / 'accepted.json', [{'check': 'text', 'match': 'a circle crosses "a word with a ball', 'why': 'test'}])
    c, out = run('node', 'tools/check_text.mjs', 'tests/demo', '--step', '1'); expect('screen: an accepted finding passes, with its reason', c == 0 and 'accepted' in out, out)
    (DEMO / 'accepted.json').unlink(); fault.write_text(json.dumps({'fault': 'term'}))
    c, out = run(*PY, 'tools/check.py', 'tests/demo'); expect('check: an unexplained abbreviation on screen is named', '"PVD" is on screen' in out, out); fault.unlink()
    # a beat that does not exist stops the clip with a clear message
    clip = DEMO / 'clip.js'; keep = clip.read_text(encoding='utf-8')
    try:
        clip.write_text(keep.replace("S1.at('bumps:end')", "S1.at('bump:end')"), encoding='utf-8', newline='\n')
        c, out = run('node', 'tools/check_text.mjs', 'tests/demo'); expect('clip: an unknown beat is named', c == 1 and 'no beat "bump:end"' in out and '{"exceptionId' not in out, out)
    finally: clip.write_text(keep, encoding='utf-8', newline='\n')


def test_video():
    script = voiced_demo(DEMO); run(*PY, 'tools/timeline.py', 'fit', 'tests/demo')
    fault = DEMO / 'out' / 'fault.json'; fault.parent.mkdir(exist_ok=True); fault.unlink(missing_ok=True)
    c, out = run('node', 'tools/render.mjs', 'tests/demo'); expect('render: the final render refuses files that are not committed', c == 3 and 'Not rendering' in out, out)
    c, out = run('node', 'tools/render.mjs', 'tests/demo', '--draft', '--fps', '60'); expect('render: a draft works', c == 0 and (DEMO / 'out' / 'demo_draft.mp4').exists(), out)
    tl = S.read_json(DEMO / 'timeline.json'); v, fps = S.video_stream(S.probe(DEMO / 'out' / 'demo_draft.mp4'))
    expect('render: it has the right number of frames', abs(int(v['nb_frames']) - round(tl['duration'] * 60)) <= 1, (v['nb_frames'], tl['duration'] * 60))
    c, out = run(*PY, 'tools/scan_frames.py', 'tests/demo'); expect('frames: the demo has no errors', c == 0, out)
    for f in ('jump', 'dark'):
        fault.write_text(json.dumps({'fault': f}))
        run('node', 'tools/render.mjs', 'tests/demo', '--draft', '--from', '0'); part = DEMO / 'out' / 'demo_draft_from0_toend.mp4'
        c, out = run(*PY, 'tools/scan_frames.py', 'tests/demo', part); expect(f'frames: catches {f}', c == 1 and any(l.startswith('ERROR') and f in l for l in out.splitlines()), out)
    fault.unlink()
    # a frozen stretch, made with ffmpeg: 6 s of one frame in the middle
    src, froz = DEMO / 'out' / 'demo_draft.mp4', DEMO / 'out' / 'frozen.mp4'
    subprocess.run([S.FFMPEG, '-y', '-v', 'error', '-i', str(src), '-vf', 'loop=loop=360:size=1:start=150', '-r', '60', str(froz)], check=True)
    c, out = run(*PY, 'tools/scan_frames.py', froz); expect('frames: catches 6 s without motion', c == 1 and 'no motion for 6' in out, out)
    c, out = run('node', 'tools/sheet.mjs', 'tests/demo'); expect('sheet: makes a contact sheet', c == 0 and (DEMO / 'out' / 'sheets' / 'sheet_1.jpg').exists(), out)
    c, out = run(*PY, 'tools/narrate.py', 'mix', 'tests/demo', src); expect('mix: every line starts where the timeline says, within 40 ms', c == 0 and 'largest offset' in out, out); print('      ' + out.strip().splitlines()[-1])
    # the same voice, late by 0.3 s: the check has to see it
    late = DEMO / 'out' / 'late.mp4'
    subprocess.run([S.FFMPEG, '-y', '-v', 'error', '-i', str(DEMO / 'out' / 'demo_draft_narrated.mp4'), '-af', 'adelay=180:all=1', '-c:v', 'copy', str(late)], check=True)
    c, out = run(*PY, 'tools/narrate.py', 'check', 'tests/demo', late); expect('mix: catches a voice that is 0.18 s late', c != 0, out)
    c, out = run(*PY, 'tools/check_render.py', 'tests/demo', src); expect('check_render: a draft is not accepted', c == 1 and 'it is a draft' in out, out)
    shutil.copy(DEMO / 'out' / 'demo_draft_narrated.mp4', DEMO / 'out' / 'demo_narrated.mp4')
    c, out = run(*PY, 'tools/deliver.py', 'tests/demo'); made = sorted(f.name for f in (DEMO / 'out' / 'deliver').iterdir()) if (DEMO / 'out' / 'deliver').exists() else []
    expect('deliver: whole video, two chapters, poster, cues and notes', c == 0 and len([m for m in made if m.endswith('.mp4')]) == 3 and 'cues.md' in made and 'notes.txt' in made, out + str(made))
    parts = [f for f in (DEMO / 'out' / 'deliver').glob('demo_?_*.mp4')]; n = [int(S.video_stream(S.probe(f))[0]['nb_frames']) for f in parts]
    expect('deliver: the chapters add up to the whole video, frame for frame', sum(n) == int(v['nb_frames']) and len(n) == 2, (n, v['nb_frames']))
    # the second chapter has to begin with the very frame it begins with in the whole video
    def frame(f, i): return np.frombuffer(subprocess.run([S.FFMPEG, '-v', 'error', '-i', str(f), '-vf', rf'select=eq(n\,{i}),scale=480:270,format=gray', '-frames:v', '1', '-f', 'rawvideo', '-'], capture_output=True).stdout, np.uint8).astype(int)
    two, whole = sorted(parts)[1], DEMO / 'out' / 'demo_narrated.mp4'; a = frame(two, 40)
    first = int(S.video_stream(S.probe(sorted(parts)[0]))[0]['nb_frames']); b = frame(whole, first + 40)
    expect('deliver: chapter 2 is cut at the right frame', len(a) == len(b) and np.abs(a - b).max() <= 1, np.abs(a - b).max() if len(a) == len(b) else (len(a), len(b)))


def test_commit():
    """the whole path with a real commit, in a throwaway copy of this repo"""
    tmp = Path(tempfile.mkdtemp(prefix='studio_repo_')); repo = tmp / 'r'; repo.mkdir()
    files = run('git', 'ls-files', '--cached', '--others', '--exclude-standard')[1].split('\n')
    for f in files:
        if f and (ROOT / f).is_file() and not f.startswith('gallery/stills/'): (repo / f).parent.mkdir(parents=True, exist_ok=True); shutil.copy2(ROOT / f, repo / f)
    subprocess.run(['cmd', '/c', 'mklink', '/J', str(repo / 'node_modules'), str(ROOT / 'node_modules')] if os.name == 'nt' else ['ln', '-s', str(ROOT / 'node_modules'), str(repo / 'node_modules')], capture_output=True, check=True)
    vid = repo / 'videos' / 'demo'; shutil.copytree(DEMO, vid, ignore=shutil.ignore_patterns('out', 'voice', 'accepted.json', 'approvals.json'))
    for p in (vid / 'clip.js',): p.write_text(p.read_text(encoding='utf-8'), encoding='utf-8', newline='\n')
    voiced_demo(vid)
    def r(*a): x = subprocess.run([str(y) for y in a], cwd=repo, capture_output=True, text=True, encoding='utf-8'); return x.returncode, x.stdout + x.stderr
    g = lambda *a: r('git', '-c', 'user.name=test', '-c', 'user.email=test@example.invalid', *a)
    r(*PY, 'tools/timeline.py', 'fit', 'videos/demo'); g('init', '-q', '-b', 'main'); g('add', '-A'); g('commit', '-q', '-m', 'test')
    try:
        c, out = r('node', 'tools/render.mjs', 'videos/demo', '--fps', '30', '--scale', '1'); expect('commit: a committed video renders', c == 0, out)
        c, out = r(*PY, 'tools/check_render.py', 'videos/demo'); expect('commit: check_render finds the commit and no changes', c == 0 and 'nothing it is drawn from has changed' in out, out)
        f = vid / 'clip.js'; f.write_text(f.read_text(encoding='utf-8') + '// a change\n', encoding='utf-8', newline='\n')
        c, out = r('node', 'tools/render.mjs', 'videos/demo', '--fps', '30', '--scale', '1'); expect('commit: an edited file stops the render', c == 3 and 'clip.js' in out, out)
        c, out = r(*PY, 'tools/make_kit.py', 'videos/demo'); expect('kit: refuses with an uncommitted change', c != 0, out)
        g('commit', '-qam', 'change'); c, out = r(*PY, 'tools/check_render.py', 'videos/demo'); expect('commit: check_render says the video is older than the files', 'shows an older version' in out, out)
        (vid / 'data').mkdir(exist_ok=True); (repo / '.gitignore').write_text((repo / '.gitignore').read_text(encoding='utf-8') + '\n*.bin\n', encoding='utf-8'); g('commit', '-qam', 'ignore'); (vid / 'data' / 'x.bin').write_bytes(b'1')
        c, out = r('node', 'tools/render.mjs', 'videos/demo', '--fps', '30', '--scale', '1'); expect('commit: a data file that git ignores stops the render', c == 3 and 'x.bin' in out, out); (vid / 'data' / 'x.bin').unlink()
        c, out = r(*PY, 'tools/make_kit.py', 'videos/demo'); zips = list((vid / 'out').glob('kit_*.zip')); expect('kit: packed', c == 0 and len(zips) == 1, out)
        kit = tmp / 'kit'; shutil.unpack_archive(zips[0], kit)
        k = subprocess.run(['node', 'tools/render.mjs', 'videos/demo', '--fps', '30', '--scale', '1'], cwd=kit, capture_output=True, text=True, encoding='utf-8'); expect('kit: renders in an unrelated folder without git', k.returncode == 0, k.stdout + k.stderr)
        mp4 = kit / 'videos' / 'demo' / 'out' / 'demo.mp4'; c, out = r(*PY, 'tools/check_render.py', 'videos/demo', mp4); expect('kit: the video that comes back is accepted', c == 0, out)
        # another version of three.js, with the kit's own list of fingerprints not covering it
        tp, kj = kit / 'node_modules' / 'three' / 'package.json', kit / 'kit.json'; keep, kk = tp.read_bytes(), kj.read_bytes()
        kd = json.loads(kk); kd['files'].pop('node_modules/three/package.json'); kj.write_text(json.dumps(kd), encoding='utf-8'); tp.write_bytes(keep.replace(b'0.169.0', b'0.170.0'))
        k = subprocess.run(['node', 'tools/render.mjs', 'videos/demo'], cwd=kit, capture_output=True, text=True, encoding='utf-8'); expect('kit: another version of three.js stops the render', k.returncode == 3 and 'three is 0.170.0' in k.stderr, k.stdout + k.stderr)
        tp.write_bytes(keep); kj.write_bytes(kk)
        p = kit / 'engine' / 'theme.json'; p.write_text(p.read_text(encoding='utf-8') + ' ', encoding='utf-8')
        k = subprocess.run(['node', 'tools/render.mjs', 'videos/demo'], cwd=kit, capture_output=True, text=True, encoding='utf-8'); expect('kit: a changed file stops the render', k.returncode == 3 and 'theme.json' in k.stderr, k.stdout + k.stderr)
    finally:
        os.rmdir(repo / 'node_modules') if os.name == 'nt' else os.unlink(repo / 'node_modules')     # the link, not what it points to
        shutil.rmtree(tmp, ignore_errors=True)


def main():
    want = sys.argv[1:]
    for name, f in list(globals().items()):
        if name.startswith('test_') and (not want or any(w in name for w in want)): f()
    bad = [n for n, ok in results if not ok]
    print(f'\n{len(results)} tests, {len(bad)} failed' + ('' if not bad else ': ' + ', '.join(bad)))
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
