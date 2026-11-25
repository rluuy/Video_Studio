"""The script as a person reads it, for the second approval.

  python tools/packet.py videos/x      -> videos/x/script_packet.md

It is made from script.json and facts.json and holds nothing of its own: every scene with its picture, its words on
screen, its narration and the facts each line rests on, then the facts with their sources, the terms, the length and the
cost. Edit script.json, never the packet.
"""
import re, sys
import check_facts, check_script, timeline
import studio as S


def main():
    if len(sys.argv) < 2: sys.exit(__doc__)
    vd = S.video_dir(sys.argv[1]); script = S.load_script(vd)
    facts = {f['id']: f for f in S.read_json(vd / 'facts.json', {'facts': []}).get('facts', [])}
    e1, w1, _ = check_script.check(vd); e2, w2 = check_facts.check(vd)
    # the length from the voice where every line has one, from word counts before that
    real = not script.get('silent') and all(S.voice_file(vd, ln['text'], script).exists() for _, ln, _ in S.lines_of(script))
    tl, notes = timeline.build(vd, script, not real)
    words = sum(len(S.plain(l['text']).split()) for _, l, _ in S.lines_of(script)); n = sum(1 for _ in S.lines_of(script))
    chars = sum(len(S.spoken(l['text'], script)) for _, l, _ in S.lines_of(script) if not S.voice_file(vd, l['text'], script).exists())
    out = [f"# {script.get('title', vd.name)}, script for approval", '']
    out.append(f"- Length {S.clock(tl['duration'])}, {'measured on the voice' if real else 'estimated from word counts'}. {len(tl['scenes'])} scenes, {n} lines, {words} words.")
    out.append('- Silent, so nothing is spent on a voice.' if script.get('silent') else
               f"- Voice {script['voice'].title()}. Making it costs about {chars * S.CREDITS_PER_CHAR:,.0f} credits ({chars:,} characters).")
    out.append(f'- Automatic checks: {len(e1) + len(e2)} errors, {len(w1) + len(w2)} warnings.')
    for m in e1 + e2: out.append(f'  - ERROR {m}')
    for m in w1 + w2: out.append(f'  - {m}')
    out += ['', 'Approving this approves the words, the facts and the cost above. Timing can still change.', '']
    show = lambda t: re.sub(r'\{([A-Za-z][\w-]*)\}', lambda m: f"**{facts[m.group(1)]['shown']}** [{m.group(1)}]" if m.group(1) in facts else m.group(0), re.sub(r'<[^>]+>', '', t))
    for sc, s in zip(script['scenes'], tl['scenes']):
        out += [f"## {sc['id']}" + (f", {sc['chapter']}" if isinstance(sc.get('chapter'), str) else '') + f" ({s['length']:.0f} s from {S.clock(s['start'])})", '']
        if sc.get('picture'): out += [f"**Picture.** {sc['picture']}", '']
        if sc.get('captions'): out += ['**On screen.** ' + ' / '.join(show(c['text']) for c in sc['captions']), '']
        for ln in sc.get('lines', []):
            ids = ln.get('facts', [])
            out.append(f"- {S.plain(ln['text'])}" + (f" [{', '.join(ids)}]" if ids else '') + (f"  \n  *{ln['cue']}*" if ln.get('cue') else ''))
        out.append('')
    if script.get('terms'):
        out += ['## Terms', ''] + [f"- **{t['term']}** " + (f"explained in {t['line']}" if t.get('line') else f"left unexplained, {t.get('why', 'no reason given')}") for t in script['terms']] + ['']
    out += ['## Facts', '', '| | Claim | Shown | Rests on | Quote or how |', '| --- | --- | --- | --- | --- |']
    cell = lambda x: str(x or '').replace('|', '/').replace('\n', ' ')
    for f in facts.values():
        rests = f"{f.get('source', '')}, {f.get('where', '')} (reread {f.get('checked', 'no')})" if f.get('kind') == 'source' else f.get('kind')
        out.append(f"| {f['id']} | {cell(f.get('claim'))} | {cell(f.get('shown'))} | {cell(rests)} | {cell(f.get('quote') or f.get('how'))} |")
    (vd / 'script_packet.md').write_text('\n'.join(out) + '\n', encoding='utf-8', newline='\n')
    print(vd / 'script_packet.md'); print('\n'.join(out[2:5]))
    for m in notes: print('note  ' + m)
    if e1 or e2: print(f'{len(e1) + len(e2)} errors, so it is not ready to show'); sys.exit(1)


if __name__ == '__main__':
    main()
