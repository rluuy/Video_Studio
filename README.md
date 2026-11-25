# Video studio

Short narrated explainer videos on any topic, drawn in the browser frame by frame and rendered to MP4. Claude Code is
opened in this folder and each video is a subfolder of `videos/`.

**State on 2026-11-24.** The engine, its gallery and the tools work. Not built yet: the seven skills, the guides, and the
first video. `docs/studio_plan.md` has the plan and its phases.

## Set up a machine

Needs Node 22 or newer, Google Chrome 123 or newer, and ffmpeg.

```powershell
npm ci              # installs the exact versions in package-lock.json
npm run doctor      # checks the machine and draws one frame on its GPU
```

Python is only needed to build a video, not to render one.

```powershell
pip install -r requirements.txt
```

## Look around

```powershell
node tools/serve.mjs                       # prints an address for every scene, to watch live in a browser
node tools/stills.mjs gallery/slab 0.3 3.5 # draws single moments, 3840 x 2160 and 1920 x 1080
npm run gallery                            # draws every gallery scene and compares it with its saved still
```

## What is here

| Folder | What it holds |
| --- | --- |
| `engine/core/` | Renderer, time and camera helpers, text and captions, flat diagrams, discs, bars, map cards, floor, light |
| `engine/kits/optics/` | Surfaces with height maps, a round mirror with traced rays, the tilt diagram |
| `engine/kits/ccos/` | Ion beam, carving, tool models, atom insets, lap, Preston's rule, size ruler |
| `engine/kits/math/` | Matrices and tiles |
| `engine/theme.json` | Every shared color, font and type size |
| `gallery/` | One small scene per module, and its saved still in `gallery/stills/` |
| `tools/` | Timing, narration, checks, rendering, delivery (below) |
| `tests/` | A small test video and the tests of every tool |
| `docs/` | The plan, and later the rules and guides |
| `videos/` | One folder per video |

## From a script to a video

Each video folder holds `brief.md`, `script.json` (scenes, narration, captions, terms), `facts.json` (every number and its
source) and `clip.js` (the pictures). `tests/demo` is a complete small example. The first lines of every tool say what it
does and how to call it.

| Step | Command | What it does |
| --- | --- | --- |
| Check the words | `python tools/check_script.py videos/x` | Punctuation, digits, unexplained terms, missing cues |
| Check the numbers | `python tools/check_facts.py videos/x` | Every spoken number and caption has a row with its source |
| Approve | `python tools/approve.py videos/x script` | Records an approval by Ryan. Without it no voice is made |
| Cost and voice | `python tools/narrate.py cost videos/x`, then `gen` | Lists the credits, then makes the missing lines |
| Time it | `python tools/timeline.py fit videos/x` | Places every line and caption from the real speech |
| Check the screen | `node tools/check_text.mjs videos/x` | Overlaps, crossed or cut-off text, numbers without a source |
| Look at it | `node tools/sheet.mjs videos/x` | A contact sheet. `node tools/render.mjs videos/x --draft` makes a draft video |
| Scan it | `python tools/scan_frames.py videos/x` | One-frame jumps, dark gaps, long rests |
| All checks | `python tools/check.py videos/x --frames` | Everything above that can be checked by a program |
| Render | `node tools/render.mjs videos/x` | The final video, only from committed files |
| Add the voice | `python tools/narrate.py mix videos/x` | Mixes it and measures where every line starts |
| Deliver | `python tools/deliver.py videos/x` | Chapters, poster, cue sheet, speaker notes |

On the lab computer: pull, `npm ci`, `npm run doctor`, `node tools/render.mjs videos/x`. Back on the laptop,
`python tools/check_render.py videos/x file.mp4` says whether the video was made from the reviewed files. Without GitHub
access, `python tools/make_kit.py videos/x` packs a zip that does the same.

`npm test` tests all of this in about four minutes and spends no credits.

## Changing the engine

Run `npm run gallery` before and after. If a still changes and the change is wanted, look at the new frame in
`out/gallery/`, then save it with `node tools/gallery.mjs --accept <name>`. The saved stills belong to the laptop's GPU.
Another machine can differ by a few gray levels.

The engine was extracted on 2026-11-24 from the seminar animations (`RUDO_CCOS_Journal/figures/animation`, left as it
was). Drawn with this engine, 70 of 74 frames of the five old clips are identical to the last pixel. The other four
differ by at most 3 of 255 levels in the light rays, whose color now comes from `theme.json`.
