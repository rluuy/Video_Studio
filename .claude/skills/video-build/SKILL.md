---
name: video-build
description: Build a video whose script is approved. Makes the voice, fits the timeline to it, computes the data, and draws the scenes in clip.js, checking stills along the way. Use after the second approval of a video, or when scenes of a video have to be drawn or changed.
argument-hint: video folder
---

# Build a video

The fourth step. It needs both approvals: `python tools/approve.py videos/x` must say so for the brief, the narration, the
screen and the facts. Read `docs/engine.md`, `docs/style.md` and `docs/lessons.md`.

## 1. Voice, then time

```
python tools/narrate.py cost videos/x
python tools/narrate.py gen videos/x
python tools/timeline.py fit videos/x
```

`gen` refuses without the approval. Do not work around it. If the cost is clearly above what Ryan approved, ask first. A
silent video skips `gen`.

Read the timeline it prints. If a scene came out much longer or shorter than planned, change `wait`, `hold`, `min` or
`tail` in `script.json` and fit again. Words do not change here.

## 2. Data

Write `export.py`. Every array the clip loads, every computed fact (`ex.fact`), every claim of a picture (`ex.check`).
Fixed seeds. Under 10 MB. Then `python tools/check_facts.py videos/x` has to be clean.

## 3. Scenes

One scene at a time, in order, from `templates/video/clip.js`:

- Times come from beats, `tl.scene('S1').at('line.mark')`. No seconds typed in, except lengths of eases and fades.
- Numbers come from `facts` or carry `drawn(..., 'why')`.
- Geometry that carries a claim is computed.
- A scene's objects are hidden outside it.
- Nothing switches in one frame.
- New things go into the engine only when they will be used again. Then with a gallery scene and a paragraph in
  `docs/engine.md`. After a change of the engine, `npm run gallery`.

After each scene, look at it:

```
node tools/stills.mjs videos/x 3.2 7.5 11.9
node tools/check_text.mjs videos/x --from 0 --to 15
```

Take stills at every reveal, in the middle of every motion, and at the scene's last second. Open them and look. Ask of each
what `docs/review.md` asks. Ryan will not see a still before the end unless Ryan asks, so this looking is the only one
there is.

## 4. The whole

```
node tools/sheet.mjs videos/x
node tools/check_text.mjs videos/x
```

Look at the sheet from start to end, once as the viewer who hears nothing.

## Done when

Every scene of the brief is drawn as the brief describes it, or the difference is written down for Ryan. `check_text.mjs`
is clean. Go on with `video-review`.
