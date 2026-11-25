# Commands, step by step

`x` stands for the video's folder name, such as `2026-12_interferometry`. Commands run from the repo's root, in
PowerShell or Git Bash. The first lines of each tool say more.

## Files of a video

| File | What it is | Written by |
| --- | --- | --- |
| `brief.md` | the first approval | `new-video` |
| `facts.json`, `sources/` | every number and where it comes from | `video-facts` |
| `script.json` | scenes, narration, captions, terms | `video-script` |
| `script_packet.md` | the script as a person reads it, made by `tools/packet.py` | a program |
| `approvals.json` | what Ryan approved and when | `tools/approve.py` |
| `voice/` | one MP3 per line and `index.json`. Kept in git, never deleted | `tools/narrate.py` |
| `timeline.json` | when everything happens | `tools/timeline.py` |
| `export.py`, `data/` | computed arrays and numbers, with their checks, under 10 MB | `video-build` |
| `clip.js` | the pictures | `video-build` |
| `accepted.json` | findings that are right as they are, with reasons | `video-review` |
| `review.md` | the review log | `video-review` |
| `out/` | everything rendered. Not in git | programs |

## The steps

```powershell
# 1. new-video
python tools/new_video.py interferometry "How light measures a surface"     # add --silent for no voice
python tools/approve.py videos/x brief                                       # only after Ryan has said yes

# 2. video-facts
python tools/check_facts.py videos/x

# 3. video-script
python tools/check_script.py videos/x
python tools/timeline.py plan videos/x                                       # length from word counts
python tools/narrate.py cost videos/x
python tools/packet.py videos/x                                              # what Ryan reads
python tools/approve.py videos/x script                                      # only after Ryan has said yes

# 4. video-build
python tools/narrate.py gen videos/x                                         # costs credits, refuses without the approval
python tools/timeline.py fit videos/x                                        # again after every change of script.json
python videos/x/export.py
node tools/serve.mjs                                                         # watch it live
node tools/stills.mjs videos/x 3.5 12                                        # single moments (--dir round1 for a folder of their own)
node tools/check_text.mjs videos/x --from 0 --to 30
node tools/sheet.mjs videos/x

# 5. video-review
node tools/render.mjs videos/x --draft                                       # 1080p, 30 fps
python tools/check.py videos/x --frames

# 6. video-finish (files committed, when Ryan says so)
node tools/render.mjs videos/x                                               # 4K drawn, 1080p60 written
python tools/check_render.py videos/x --frames 12.5,40
python tools/scan_frames.py videos/x
python tools/narrate.py mix videos/x

# 7. video-deliver
python tools/deliver.py videos/x --to "C:\path\to\talk\folder"
```

## Render times

About 0.26 s per frame at 4K on the laptop and 0.18 s on the lab computer, measured on clip P. Five minutes are 18,000
frames, so about 80 and 55 minutes. A 1080p draft took 0.05 s per frame on the laptop for the small test video and 0.09 s
on the lab computer for clip P. Full renders run in the background with their output in a file.

## On the lab computer

Set up once (Ryan does this there): Node 22 or newer, Chrome, ffmpeg and git. A read-only deploy key for this repository,
made there with `ssh-keygen`, its public half added under the repository's settings. No GitHub login and no ElevenLabs key.

```powershell
git clone git@github.com:OWNER/Video_Studio.git     # once
git pull
npm ci
npm run doctor
node tools/render.mjs videos/x
```

Copy `videos/x/out/x.mp4` and `x_render.json` back to the same folder on the laptop, then run `check_render.py`. Nothing is
edited on the lab computer. If something fails there, its message comes back to the laptop.

Without GitHub: `python tools/make_kit.py videos/x` packs a zip. The other computer unpacks it and runs the same render
command.

## The deck

Only when Ryan asks, with the deck closed. The video must already be on a slide, under a name in the Selection Pane.

```powershell
powershell -ExecutionPolicy Bypass -File tools\swap_deck_media.ps1 -Deck deck.pptx -Shape "name" -Video videos\x\out\deliver\x.mp4 -Check
```

Without `-Check` it copies the deck to a backup folder and swaps the video in place.

## Tests

`npm run gallery` after a change of the engine, `npm test` after a change of a tool, `npm run doctor` on a new machine.
