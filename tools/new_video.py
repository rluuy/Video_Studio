"""Start a video: copy templates/video into a new folder.

  python tools/new_video.py interferometry "How light measures a surface"
      -> videos/2026-12_interferometry/  (the month is today's)
  add --silent for a video without a voice

Refuses when a folder for that name exists already.
"""
import datetime, re, shutil, sys
import studio as S


def main():
    a = [x for x in sys.argv[1:] if x != '--silent']
    if len(a) != 2: sys.exit(__doc__)
    slug, title = a
    if not re.fullmatch(r'[a-z0-9]+(?:[_-][a-z0-9]+)*', slug): S.fail('the name is for a folder: small letters, digits, - and _ only')
    old = [p for p in (S.ROOT / 'videos').iterdir() if p.is_dir() and p.name.split('_', 1)[-1] == slug]
    if old: S.fail(f'{old[0].relative_to(S.ROOT)} exists already')
    vd = S.ROOT / 'videos' / f'{datetime.date.today():%Y-%m}_{slug}'
    shutil.copytree(S.ROOT / 'templates' / 'video', vd)
    for f in vd.rglob('*'):
        if f.is_file() and f.suffix in ('.md', '.json', '.js', '.py'):
            t = f.read_text(encoding='utf-8').replace('TITLE_HERE', title).replace('DATE_HERE', datetime.date.today().isoformat())
            f.write_text(t, encoding='utf-8', newline='\n')
    if '--silent' in sys.argv:
        s = S.read_json(vd / 'script.json'); s['silent'] = True; S.write_json(vd / 'script.json', s)
    (vd / 'data').mkdir(exist_ok=True)
    print(vd.relative_to(S.ROOT).as_posix())


if __name__ == '__main__':
    main()
