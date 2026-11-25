"""Shared by the Python tools: where a video's files are, how its script is read, and how its voice files are measured."""
import hashlib, json, os, re, subprocess, sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
FFMPEG = os.environ.get('FFMPEG', 'ffmpeg')
FFPROBE = os.environ.get('FFPROBE', 'ffprobe')

# ---- speech
MODEL, FMT, SR = 'eleven_v4', 'mp3_44100_128', 48000
VOICES = {   # ElevenLabs premade voices. No cloned voices
    'george': 'JBFqnCBsd6RMkjVDRZzb', 'daniel': 'onwK4e9ZLuTAKqWW03F9', 'brian': 'nPczCjzI2devNBz1zQrb',
    'eric': 'cjVigY5qzO86Huf0OWal', 'bill': 'pqHfZKP75CvOlQylNhV4', 'chris': 'iP95p4xoKVk53GoZ742B',
    'matilda': 'XrExE9yKIg1WjnnlVkGX', 'alice': 'Xb7hH8MSUJpSbSDYk0k2', 'bella': 'hpp4J3VqNfWAUOO0d1Us',
    'lily': 'pFZP5JQG7iQjIQuC4Bku', 'river': 'SAz9YHcvj6GT2YYXdXww', 'sarah': 'EXAVITQu4vr4xnSDxMaL',
}
SAY = {'RUDO': 'Ruhdoh', 'CUDO': 'Cuhdoh'}      # how names are said (Ryan, 2026-11-15). A script can add its own in "say"
CREDITS_PER_CHAR = 0.40                         # measured on the CCOS explainer, 1,997 credits for its 4,997 characters
RATE = 2.55                                     # words per second of the George voice on that clip

# ---- timing defaults (s). A script can set its own under the same names
DEFAULTS = {'gap': 0.35, 'lead': 0.4, 'tail': 0.8, 'end': 1.5}

MARK = re.compile(r'<([A-Za-z][\w-]*)>')


def fail(msg):
    sys.exit('FAIL: ' + msg)


def video_dir(arg):
    """'videos/2026-12_x', '2026-12_x', 'tests/demo' or a full path -> the folder, which must hold script.json"""
    for p in (Path(arg), ROOT / arg, ROOT / 'videos' / arg):
        if (p / 'script.json').exists(): return p.resolve()
    fail(f'no video folder "{arg}" with a script.json')


def scene_name(vd):
    """the name the JavaScript tools use, such as videos/2026-12_x"""
    return vd.relative_to(ROOT).as_posix()


def read_json(p, default=None):
    p = Path(p)
    if not p.exists():
        if default is not None: return default
        fail(f'missing {p}')
    try: return json.loads(p.read_text(encoding='utf-8'))
    except json.JSONDecodeError as e: fail(f'{p} is not valid JSON. {e}')


def write_json(p, d):
    Path(p).parent.mkdir(parents=True, exist_ok=True)
    Path(p).write_text(json.dumps(d, ensure_ascii=False, indent=1) + '\n', encoding='utf-8', newline='\n')


def load_script(vd):
    s = read_json(vd / 'script.json')
    for k, v in DEFAULTS.items(): s.setdefault(k, v)
    s.setdefault('voice', 'george'); s.setdefault('model', MODEL); s.setdefault('rate', RATE)
    return s


def lines_of(script):
    """every narration line with its full name, 'scene.line'"""
    for sc in script['scenes']:
        for ln in sc.get('lines', []): yield sc, ln, f"{sc['id']}.{ln['id']}"


# ---- what the voice is given
def plain(text):
    """the line without its marks: 'the <P>pressure P' -> 'the pressure P'"""
    return MARK.sub('', text)


def spoken(text, script):
    """the text sent to the voice: marks removed, names respelled for the ear"""
    out = plain(text)
    for word, say in {**SAY, **script.get('say', {})}.items(): out = re.sub(rf'\b{re.escape(word)}\b', say, out)
    return out


def voice_id(name):
    if name not in VOICES: fail(f'unknown voice {name}. Known: ' + ', '.join(VOICES))
    return VOICES[name]


def voice_file(vd, text, script):
    """the MP3 of one line. The name is a hash of what was asked for, so a changed line is a new file"""
    vid = voice_id(script['voice'])
    h = hashlib.sha1(json.dumps([script['model'], FMT, vid, spoken(text, script)]).encode()).hexdigest()[:16]
    return vd / 'voice' / f'{h}.mp3'


# ---- measuring speech
def decode(path):
    raw = subprocess.run([FFMPEG, '-v', 'error', '-i', str(path), '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).copy()


def loudness(x, frame):
    n = int(frame * SR); f = len(x) // n
    return np.sqrt((x[:f * n].reshape(f, n) ** 2).mean(1) + 1e-20), n


def voiced(x, frame=0.02, below=35.0):
    """first and last sample of speech: 20 ms frames within 35 dB of the loudest one"""
    rms, n = loudness(x, frame)
    on = np.nonzero(rms > rms.max() * 10 ** (-below / 20))[0]
    return int(on[0] * n), int((on[-1] + 1) * n)


def pauses(x, frame=0.01, below=32.0, shortest=0.12):
    """silences inside the speech, as (start, end) in seconds from the start of the file"""
    a, b = voiced(x)
    rms, n = loudness(x, frame)
    quiet = rms < rms.max() * 10 ** (-below / 20)
    out, i, lo, hi = [], a // n, a // n, b // n
    while i < hi:
        if quiet[i]:
            j = i
            while j < hi and quiet[j]: j += 1
            if (j - i) * frame >= shortest and i > lo: out.append((i * frame, j * frame))
            i = j
        else: i += 1
    return out


WEIGHT = {' ': 0.5, ',': 4.0, '.': 8.0, '?': 8.0, '!': 8.0}


def mark_times(text, script, x=None, length=None):
    """
    When each <mark> in a line is said, in seconds from the start of the speech. The place in the text gives a first
    estimate, and the pauses after commas and sentences pin it to the real audio. Without audio, the estimate stands.
    """
    marks, flat, pos = [], '', 0
    for m in MARK.finditer(text):
        flat += text[pos:m.start()]; marks.append((m.group(1), len(flat))); pos = m.end()
    flat += text[pos:]
    if not marks: return {}
    w = np.array([WEIGHT.get(c, 1.0) for c in flat])
    w[len(flat.rstrip(' .?!,')):] = 0.0                                  # the silence after the last word is not part of the speech
    cum = np.concatenate([[0], np.cumsum(w)])
    if x is None: total, at0, gaps = length, 0.0, []
    else:
        a, b = voiced(x); total, at0 = (b - a) / SR, a / SR
        gaps = [(p - at0, q - at0) for p, q in pauses(x)]
    frac = lambda i: cum[i] / cum[-1]
    # places where a pause is expected: after a comma or the end of a sentence, before the next word
    punct = [i + 1 for i, c in enumerate(flat[:-1]) if c in ',.?!' and flat[i + 1] == ' ']
    anchors = [(0, 0.0)]
    if gaps and punct:
        # match expected pauses to real ones in order, the closest way overall. A pause after a full stop is nearly always
        # there, one after a comma often is not, so leaving one out costs 1.2 s and 0.4 s
        m, k = len(punct), len(gaps)
        skip = [1.2 if flat[i - 1] in '.?!' else 0.4 for i in punct]
        ends = [q for _, q in gaps]
        D = np.full((m + 1, k + 1), np.inf); B = np.zeros((m + 1, k + 1), int); D[0, :] = 0; D[:, 0] = np.concatenate([[0], np.cumsum(skip)])
        B[1:, 0] = 1
        for i in range(1, m + 1):
            for j in range(1, k + 1):
                c = [D[i, j - 1], D[i - 1, j] + skip[i - 1], D[i - 1, j - 1] + abs(frac(punct[i - 1] + 1) * total - ends[j - 1])]
                B[i, j] = int(np.argmin(c)); D[i, j] = min(c)
        i, j, found = m, k, []
        while i > 0:
            if j > 0 and B[i, j] == 2: found.append((punct[i - 1] + 1, ends[j - 1])); i -= 1; j -= 1
            elif j > 0 and B[i, j] == 0: j -= 1
            else: i -= 1
        anchors += found[::-1]
    anchors.append((len(flat), total))
    idx = [a[0] for a in anchors]; sec = [a[1] for a in anchors]
    out = {}
    for name, i in marks:
        k = max(0, min(len(idx) - 2, int(np.searchsorted(idx, i, 'right')) - 1))
        f0, f1 = frac(idx[k]), frac(idx[k + 1])
        out[name] = round(float(sec[k] + (sec[k + 1] - sec[k]) * ((frac(i) - f0) / max(f1 - f0, 1e-9))), 3)
    return out


# ---- what an approval covers
def digest(obj):
    return hashlib.sha256(json.dumps(obj, ensure_ascii=False, sort_keys=True).encode()).hexdigest()


def narration_digest(script):
    return digest([[name, plain(ln['text'])] for _, ln, name in lines_of(script)] + [script['voice'], script['model']])


def screen_digest(script):
    return digest([[sc['id'], c.get('kind'), c['text']] for sc in script['scenes'] for c in sc.get('captions', [])])


def facts_digest(vd):
    d = read_json(vd / 'facts.json', {'facts': []})
    keep = ('id', 'claim', 'value', 'unit', 'shown', 'spoken', 'kind', 'source', 'where', 'quote', 'how')
    return digest([{k: f.get(k) for k in keep} for f in d['facts']])


def probe(mp4):
    r = subprocess.run([FFPROBE, '-v', 'error', '-show_entries', 'format=duration:format_tags=comment,description,title',
                        '-show_entries', 'stream=codec_type,nb_frames,width,height,avg_frame_rate,duration', '-of', 'json', str(mp4)],
                       capture_output=True, text=True)
    if r.returncode: fail(f'cannot read {mp4}. {r.stderr.strip()[:200]}')
    return json.loads(r.stdout)


def video_stream(info):
    v = [s for s in info['streams'] if s.get('codec_type') == 'video']
    if not v: fail('no video stream')
    n, d = v[0]['avg_frame_rate'].split('/')
    return v[0], float(n) / float(d)


def clock(t):
    return f'{int(t // 60)}:{t % 60:04.1f}'
