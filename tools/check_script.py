"""Read a video's script for the mistakes that come back in every video.

  python tools/check_script.py videos/x

Errors (exit code 1)
  punctuation   em dash, semicolon, or a colon in the middle of a sentence, spoken or on screen
  digits        a digit in the narration. The voice reads words, so numbers are spelled out
  wording       a word or phrase on the banned list below
  term          a term or an abbreviation used before the line that explains it, or not listed in "terms" at all
  structure     a repeated name, an empty line, a line with no cue, a beat that does not exist
Warnings
  long          a line of more than 30 words, or a sentence of more than 24
  slow or fast  a scene with under 25 or over 95 percent of its time spoken (needs timeline.json)

A warning or a "wording" error that is right as it is goes into accepted.json with its reason:
  [{ "check": "script", "match": "part of the message", "why": "..." }]
"""
import re, sys
import studio as S

BANNED = ['delve', 'moreover', 'furthermore', 'not only', 'in conclusion', 'it is important to note', "it's important to note", 'it is worth noting', 'crucial', 'pivotal', 'leverage',
          'seamless', 'robust', 'cutting-edge', 'groundbreaking', 'game-changing', 'game changer', 'unlock', 'harness', 'showcase', 'testament', 'tapestry', 'realm', 'landscape of',
          'in the world of', 'at its core', 'simply put', 'in essence', 'dive in', 'dive into', "let's explore", 'let us explore', 'ever-evolving', 'when it comes to', 'plays a vital role',
          'plays a key role', 'the power of', 'but here is the thing', "here's the thing", 'underscore', 'boasts', 'elevate', 'fascinating']
# letters that are read as letters or are units, so they need no explanation
KNOWN = {'AM', 'PM', 'USA', 'US', 'UK', 'ID', 'OK', 'TV', '3D', '2D', '1D'}
ACRONYM = re.compile(r'\b(?=[A-Z0-9-]*[A-Z][A-Z0-9-]*[A-Z0-9])[A-Z][A-Z0-9]+(?:-[A-Z0-9]+)*s?\b')


def visible(text):
    """caption text as it reads: no tags, no fact places"""
    return re.sub(r'\s+', ' ', re.sub(r'\{[A-Za-z][\w-]*\}', 'N', re.sub(r'<[^>]+>', '', text))).strip()


def term_re(term):
    return re.compile(r'(?<![A-Za-z])' + re.escape(term) + r'(?:s|es)?(?![A-Za-z])', 0 if term.isupper() else re.I)


def check(vd):
    script = S.load_script(vd); err, warn = [], []
    ids = set()
    texts = []                                                # (where, text, spoken?) in the order the audience meets them
    for sc in script['scenes']:
        if sc['id'] in ids: err.append(f"structure: two scenes are called {sc['id']}")
        ids.add(sc['id']); seen = set()
        for c in sc.get('captions', []): texts.append((f"{sc['id']}, {c.get('kind', 'title')} on screen", visible(c['text']), False, sc['id']))
        for ln in sc.get('lines', []):
            name = f"{sc['id']}.{ln['id']}"
            if ln['id'] in seen: err.append(f'structure: two lines are called {name}')
            seen.add(ln['id'])
            if ln['id'] in ('scene',) or not re.fullmatch(r'[A-Za-z][\w-]*', ln['id']): err.append(f'structure: {name} is not a usable name')
            t = S.plain(ln['text']).strip()
            if not t: err.append(f'structure: {name} is empty')
            if not ln.get('cue'): err.append(f'structure: {name} has no cue, so nobody knows what is on screen while it is said')
            texts.append((name, t, True, sc['id']))
    for where, t, said, _ in texts:
        for ch, what in (('—', 'em dash'), (';', 'semicolon')):
            if ch in t: err.append(f'punctuation: {what} in {where}: "{t}"')
        if '–' in t and not re.search(r'\d\s?–\s?\d', t): err.append(f'punctuation: en dash used as a dash in {where}: "{t}"')
        if ':' in t and (said or re.search(r':\s+\S+\s+\S+', t)): err.append(f'punctuation: colon in {where}: "{t}"')
        if said and re.search(r'\d', t): err.append(f'digits: {where} has digits, spell the number out: "{t}"')
        if said and re.search(r'[%°µλθ×=+/&@#]', t): err.append(f'digits: {where} has a symbol the voice may misread: "{t}"')
        low = t.lower()
        for b in BANNED:
            if re.search(r'(?<![a-z])' + re.escape(b) + r'(?![a-z])', low): err.append(f'wording: "{b}" in {where}: "{t}"')
        if said:
            n = len(t.split())
            if n > 30: warn.append(f'long: {where} has {n} words')
            for s in re.split(r'(?<=[.?!])\s+', t):
                if len(s.split()) > 24: warn.append(f'long: a sentence of {len(s.split())} words in {where}: "{s}"')
    # ---- terms
    order = {name: i for i, (name, _, said, _) in enumerate(texts) if said}
    scene_first = {}
    for i, (_, _, _, sid) in enumerate(texts): scene_first.setdefault(sid, i)
    listed = []
    for term in script.get('terms', []):
        if 'term' not in term: err.append('structure: an entry of "terms" has no "term"'); continue
        listed.append(term['term'])
        line = term.get('line')
        if line is None:
            if not term.get('why'): err.append(f'term: "{term["term"]}" needs the line that explains it, or a "why" for leaving it unexplained')
            continue
        if line not in order: err.append(f'term: "{term["term"]}" is explained in {line}, which does not exist'); continue
        rx, here = term_re(term['term']), order[line]
        if not rx.search(texts[here][1]) and not term.get('shown'): err.append(f'term: {line} should explain "{term["term"]}" but does not say it')
        # on-screen text of the same scene appears with the line, so it is not "before"
        for i, (where, t, said, sid) in enumerate(texts):
            if i < here and rx.search(t) and not (not said and sid == line.split('.')[0]): err.append(f'term: "{term["term"]}" is used in {where}, before {line} explains it'); break
    unlisted = {}
    for where, t, _, _ in texts:
        for m in ACRONYM.finditer(t):
            a = m.group(0); base = a[:-1] if a.endswith('s') and a[:-1].isupper() else a
            if base in KNOWN or any(base.lower() == x.lower() or base in x.split() for x in listed): continue
            unlisted.setdefault(base, where)
    for a, where in unlisted.items(): err.append(f'term: "{a}" in {where} is not in "terms"')
    # ---- pace
    tl = S.read_json(vd / 'timeline.json', {}) if (vd / 'timeline.json').exists() else None
    if tl:
        for s in tl['scenes']:
            said = sum(l['end'] - l['start'] for l in tl['lines'] if l['name'].split('.')[0] == s['id'])
            share = said / s['length']
            if share < 0.25: warn.append(f"slow: {s['id']} is spoken for {100 * share:.0f} percent of its {s['length']:.1f} s")
            if share > 0.95: warn.append(f"fast: {s['id']} is spoken for {100 * share:.0f} percent of its {s['length']:.1f} s")
    acc = [a for a in (S.read_json(vd / 'accepted.json', []) if (vd / 'accepted.json').exists() else []) if a.get('check') == 'script' and a.get('why')]
    ok = lambda m: next((a for a in acc if a['match'] in m), None)
    return [m for m in err if not (m.startswith('wording') and ok(m))], [m for m in warn if not ok(m)], [(m, ok(m)['why']) for m in err + warn if ok(m) and (m in warn or m.startswith('wording'))]


def screen_terms(vd, texts):
    """abbreviations among the words really on screen (from check_text.mjs) that the script's "terms" do not explain"""
    script = S.load_script(vd); listed = [t['term'] for t in script.get('terms', []) if 'term' in t]; out = {}
    for x in texts:
        for m in ACRONYM.finditer(x['text']):
            a = m.group(0); base = a[:-1] if a.endswith('s') and a[:-1].isupper() else a
            if base in KNOWN or any(base.lower() == t.lower() or base in t.split() for t in listed): continue
            out.setdefault(base, f'term: "{base}" is on screen at {S.clock(x["first"])} ("{x["text"][:50]}") and not in "terms"')
    return list(out.values())


def main():
    if len(sys.argv) < 2: sys.exit(__doc__)
    vd = S.video_dir(sys.argv[1]); err, warn, acc = check(vd)
    for m in err: print('ERROR   ' + m)
    for m in warn: print('warning ' + m)
    for m, why in acc: print(f'accepted {m}. {why}')
    script = S.load_script(vd); n = sum(len(S.plain(l['text']).split()) for _, l, _ in S.lines_of(script))
    print(f'{n} words, about {S.clock(n / script["rate"])} of speech, {len(err)} errors, {len(warn)} warnings')
    sys.exit(1 if err else 0)


if __name__ == '__main__':
    main()
