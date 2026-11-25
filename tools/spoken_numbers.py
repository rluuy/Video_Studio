"""Numbers as they are spoken. Finds number words in a sentence and turns a spoken number into its value."""
import re

UNITS = {w: i for i, w in enumerate('zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen'.split())}
TENS = {w: 10 * (i + 2) for i, w in enumerate('twenty thirty forty fifty sixty seventy eighty ninety'.split())}
SCALE = {'hundred': 100, 'thousand': 1e3, 'million': 1e6, 'billion': 1e9, 'trillion': 1e12}
PARTS = {'half': 2, 'halves': 2, 'third': 3, 'thirds': 3, 'quarter': 4, 'quarters': 4, 'fifth': 5, 'fifths': 5, 'sixth': 6, 'eighth': 8, 'tenth': 10, 'tenths': 10,
         'hundredth': 100, 'hundredths': 100, 'thousandth': 1000, 'thousandths': 1000, 'millionth': 1e6, 'millionths': 1e6}
TIMES = {'twice': 2, 'double': 2, 'doubles': 2, 'doubled': 2, 'triple': 3, 'triples': 3, 'dozen': 12}
MEASURES = set('''nanometer nanometers micrometer micrometers micron microns millimeter millimeters centimeter centimeters meter meters kilometer kilometers
  picometer picometers angstrom angstroms second seconds minute minutes hour hours day days year years percent degree degrees radian radians milliradian
  milliradians microradian microradians watt watts volt volts kilovolt hertz gram grams kilogram kilograms gigabyte gigabytes megabyte megabytes wavelength
  wavelengths times fringe fringes point points part parts pass passes pixel pixels'''.split())
WORD = re.compile(r"[A-Za-z]+(?:'[a-z]+)?")


def words(text):
    return [(m.group(0).lower(), m.start(), m.end()) for m in WORD.finditer(text)]


def is_number(w):
    return w in UNITS or w in TENS or w in SCALE or w in TIMES


def find(text):
    """
    The words of a sentence that state a number, as (word, start, end). "one" counts only before a measure or a scale
    ("one nanometer", not "one step in a longer process"), and a fraction only as a fraction ("a third of", "half the").
    """
    ws = words(text.replace('-', ' ')); out = []
    for i, (w, a, b) in enumerate(ws):
        nxt = ws[i + 1][0] if i + 1 < len(ws) else ''
        prev = ws[i - 1][0] if i else ''
        if w == 'one':
            if nxt in MEASURES or nxt in SCALE or prev in ('point', 'hundred', 'thousand') or prev in TENS or prev in UNITS: out.append((w, a, b))
        elif w in SCALE:
            if w == 'hundred' or prev in ('a', 'an', 'one', 'few', 'several') or is_number(prev) or prev == 'hundred': out.append((w, a, b))
        elif w in UNITS or w in TENS or w in TIMES: out.append((w, a, b))
        elif w in PARTS:
            if (nxt in ('of', 'the', 'a', 'an', 'as') and w in ('half', 'third', 'quarter')) or w.endswith('s') or prev in UNITS or prev in ('a', 'one') and nxt in ('of', 'the'):
                out.append((w, a, b))
    return out


def value(phrase):
    """'a hundred and nineteen nanometers' -> 119, 'nineteen twenty-seven' -> 1927, 'a tenth of one' -> 0.1. None if unclear"""
    ws = [w for w, _, _ in words(phrase.replace('-', ' '))]
    keep = [w for w in ws if is_number(w) or w in PARTS or w == 'point' or w in ('a', 'an', 'and')]
    while keep and keep[-1] in ('a', 'an', 'and'): keep.pop()
    if not keep: return None
    # a fraction: "a tenth", "three quarters", "half"
    fr = [i for i, w in enumerate(keep) if w in PARTS]
    if fr:
        i = fr[0]; top = [w for w in keep[:i] if w not in ('a', 'an', 'and')]
        n = value(' '.join(top)) if top else 1
        return None if n is None else n / PARTS[keep[i]]
    if keep[0] in TIMES and len(keep) == 1: return float(TIMES[keep[0]])
    # a year: "nineteen twenty-seven", "twenty twenty-six"
    plain = [w for w in keep if w not in ('a', 'an', 'and')]
    if not any(w in SCALE or w == 'point' for w in plain) and 2 <= len(plain) <= 3:
        first = UNITS.get(plain[0], TENS.get(plain[0]))
        rest = sum(UNITS.get(w, TENS.get(w, 0)) for w in plain[1:])
        if first is not None and 10 <= first <= 20 and 10 <= rest < 100 and (plain[1] in TENS or UNITS.get(plain[1], 0) >= 10): return float(100 * first + rest)
    total, cur, dec = 0.0, 0.0, None
    for w in keep:
        if w == 'point': dec = ''; continue
        if dec is not None and w in UNITS: dec += str(UNITS[w]); continue
        if w in UNITS: cur += UNITS[w]
        elif w in TENS: cur += TENS[w]
        elif w == 'hundred': cur = (cur or 1) * 100
        elif w in SCALE:
            if dec: cur += float('0.' + dec); dec = None
            total += (cur or 1) * SCALE[w]; cur = 0.0
        elif w in TIMES and w == 'dozen': cur = (cur or 1) * 12
    if dec: cur += float('0.' + dec)
    return total + cur


if __name__ == '__main__':
    import sys
    for t in sys.argv[1:]: print(repr(t), '->', value(t), [w for w, _, _ in find(t)])
