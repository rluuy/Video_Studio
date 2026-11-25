# Video studio

Short narrated explainer videos on any topic, drawn in the browser frame by frame and rendered to MP4. Claude Code is
opened in this folder and each video is a subfolder of `videos/`.

**State on 2026-11-24.** The engine, its gallery and the drawing tools work. Not built yet: the timeline, narration,
checking and rendering tools, the seven skills, and the first video. `docs/studio_plan.md` has the plan and its phases.

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
| `tools/` | Stills, gallery check, live server, machine check |
| `docs/` | The plan, and later the rules and guides |
| `videos/` | One folder per video |

## Changing the engine

Run `npm run gallery` before and after. If a still changes and the change is wanted, look at the new frame in
`out/gallery/`, then save it with `node tools/gallery.mjs --accept <name>`. The saved stills belong to the laptop's GPU.
Another machine can differ by a few gray levels.

The engine was extracted on 2026-11-24 from the seminar animations (`RUDO_CCOS_Journal/figures/animation`, left as it
was). Drawn with this engine, 70 of 74 frames of the five old clips are identical to the last pixel. The other four
differ by at most 3 of 255 levels in the light rays, whose color now comes from `theme.json`.
