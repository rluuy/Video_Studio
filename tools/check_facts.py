"""Does every number have a source?

  python tools/check_facts.py videos/x

facts.json holds one row per fact:
  { "id": "F1", "claim": "what is claimed, in a sentence", "value": 632.8, "unit": "nm", "shown": "633 nm", "spoken": ["six hundred thirty-three nanometers"],
    "kind": "source",     "source": "citation", "where": "page, table or equation", "quote": "the words it rests on", "checked": "2026-12-02" }
    "kind": "computed",   "how": "export.py, which function and which assert" }
    "kind": "schematic",  "how": "why it is only drawn" }
A source row counts only when it was reread ("checked") and quotes its source.

In script.json a line that says a number names the facts it rests on: "facts": ["F1"]. A number word that is ordinary
language goes into "plain": ["two"]. Captions print a fact with {F1}.

It reports: a row that is incomplete, a spoken number with no fact, a fact that is named and not said, a spoken number whose
value differs from the row, a caption with a typed-in number, and a fact nobody uses. Numbers in the drawings themselves
are checked on the real page by check_text.mjs.
"""
import re, sys
import studio as S
import spoken_numbers as N

NEED = {'source': ('source', 'where', 'quote', 'checked'), 'computed': ('how',), 'schematic': ('how',)}
ABOUT = re.compile(r'\b(about|nearly|almost|roughly|around|under|over|close to|less than|more than|up to|at most|at least|below|above)\b', re.I)


def check(vd):
    err, warn = [], []
    script = S.load_script(vd)
    if not (vd / 'facts.json').exists(): return ['facts.json is missing'], []
    rows = S.read_json(vd / 'facts.json').get('facts', [])
    facts = {}
    for f in rows:
        fid = f.get('id', '?')
        if fid in facts: err.append(f'row: two facts are called {fid}')
        facts[fid] = f
        if f.get('kind') not in NEED: err.append(f'row: {fid} needs a kind, one of {", ".join(NEED)}'); continue
        for k in ('claim', 'shown') + NEED[f['kind']]:
            if not f.get(k): err.append(f'row: {fid} has no "{k}"')
        if f['kind'] == 'source' and f.get('quote') and len(str(f['quote']).split()) < 3 and not re.search(r'\d', str(f['quote'])): err.append(f'row: the quote of {fid} is too short to check anything')
        # what is printed has to agree with the value
        v = f.get('value')
        if isinstance(v, (int, float)) and not isinstance(v, bool):
            nums = [float(x.replace(',', '').replace('−', '-')) for x in re.findall(r'[−-]?\d[\d,]*(?:\.\d+)?', str(f.get('shown', '')))]
            if nums and not any(abs(n - v) <= max(0.02 * abs(v), 1e-12) for n in nums) and not f.get('rounded'):
                err.append(f'row: {fid} is {v} but shows "{f["shown"]}". If the rounding or the unit is meant, say so in "rounded"')
    used = set()
    for sc, ln, name in S.lines_of(script):
        text = S.plain(ln['text']); flat = text.replace('-', ' ')
        covered = []
        for fid in ln.get('facts', []):
            f = facts.get(fid)
            if f is None: err.append(f'line: {name} rests on {fid}, which facts.json does not have'); continue
            used.add(fid); said = False
            for phrase in f.get('spoken', []):
                for m in re.finditer(re.escape(phrase.replace('-', ' ')), flat, re.I):
                    covered.append((m.start(), m.end())); said = True
                    got, v = N.value(phrase), f.get('value')
                    vals = [x for x in (v if isinstance(v, list) else [v]) if isinstance(x, (int, float)) and not isinstance(x, bool)]
                    if got is not None and vals:
                        near = flat[max(0, m.start() - 14):m.start()] + phrase
                        tol = 0.12 if ABOUT.search(near) else 0.005
                        if not any(abs(got - x) <= tol * max(abs(x), 1e-12) for x in vals) and not f.get('rounded'): err.append(f'line: {name} says "{phrase}" ({got:g}) for {fid}, whose value is {v}')
            if f.get('spoken') and not said: err.append(f'line: {name} names {fid} but says none of {f["spoken"]}')
        plain = [w.lower() for w in ln.get('plain', [])]
        loose = [w for w, a, b in N.find(text) if not any(x <= a and b <= y for x, y in covered) and w not in plain]
        if loose: err.append(f'line: {name} says {", ".join(repr(w) for w in loose)} with no fact: "{text}"')
        for w in plain:
            if w not in flat.lower().split() and not re.search(rf'\b{re.escape(w)}\b', flat.lower()): warn.append(f'line: {name} lists "{w}" as plain but does not say it')
    for sc in script['scenes']:
        for c in sc.get('captions', []):
            for fid in re.findall(r'\{([A-Za-z][\w-]*)\}', c['text']):
                if fid not in facts: err.append(f"caption: scene {sc['id']} prints {{{fid}}}, which facts.json does not have")
                used.add(fid)
            bare = re.sub(r'\{[^}]*\}', '', re.sub(r'<span data-drawn=.*?</span>', '', re.sub(r'<span class="formula">.*?</span>', '', c['text'])))
            if re.search(r'\d', re.sub(r'<[^>]+>', '', bare)): err.append(f"caption: scene {sc['id']} has a typed-in number: \"{re.sub(r'<[^>]+>', '', c['text'])}\"")
    clip = (vd / 'clip.js').read_text(encoding='utf-8') if (vd / 'clip.js').exists() else ''
    for fid in facts:
        if fid not in used and not re.search(rf"['\"{{]{re.escape(fid)}['\"}}]", clip): warn.append(f'row: {fid} is used nowhere')
    return err, warn


def main():
    if len(sys.argv) < 2: sys.exit(__doc__)
    vd = S.video_dir(sys.argv[1]); err, warn = check(vd)
    for m in err: print('ERROR   ' + m)
    for m in warn: print('warning ' + m)
    n = len(S.read_json(vd / 'facts.json', {'facts': []}).get('facts', []))
    print(f'{n} facts, {len(err)} errors, {len(warn)} warnings')
    sys.exit(1 if err else 0)


if __name__ == '__main__':
    main()
