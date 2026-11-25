# Video studio plan

Written 2026-11-24 for Ryan, and for the Claude sessions that will build and use the studio.
Status: approved by Ryan on 2026-11-24. Phases 0 and 1 are built, and what each one showed is under the table in section 7.
Phases 2 to 5 have not started.

---

## 1. The idea in plain words

You pick a topic. Claude Code, opened in this folder, takes it through the same seven steps every time and stops twice
for your approval. A finished narrated video comes out, ready for a slide.

The folder holds three things.

- **Technology.** One engine that draws, one set of tools that time, check, render and narrate.
- **Skills.** Seven short instruction sets, one per step, that tell Claude how to do that step the way that worked for
  clips M and P.
- **Markdown.** The rules (look, writing, honesty, facts) and the templates that each new video starts from.

The main lesson from the last two clips shapes the plan. Clip P needed seven review rounds and five full renders,
because most problems were found late and by eye. Many of them repeat from clip to clip. The studio turns the repeated
ones into automatic checks, and moves the narration ahead of the animation so the timing is right the first time.

---

## 2. What you decided (2026-11-24)

| Question | Your answer | What it means here |
| --- | --- | --- |
| How it is used | One studio repo | Claude Code is opened in this folder. Each video is a subfolder. |
| Topics | CCOS, optics and physics, math and algorithms, anything | A small general core, plus topic kits that grow only when a video needs them. A strong fact step. |
| Where it is shown | Talks and group meetings | 1920 x 1080 MP4 for PowerPoint, chapters that cut cleanly, cue sheets. No YouTube or vertical format for now. |
| Repo | Private GitHub | Backup, and the lab computer can pull it. |
| Your approvals | Brief and decisions. Script and facts. | Two gates. Everything after the second runs without you until the finished video. |
| Narration | George, ElevenLabs | Same voice as the first five clips. |
| Look | Keep the current look | Dark field, Source Sans, the paper's palette, in one theme file. |
| Machines | Laptop builds, lab renders | The lab computer pulls a commit and renders it. No more zip handoffs. |
| Pilot topic | Interferometry | First video made with the studio. |
| Old clips | Tools only | No existing clip moves. The paper folder is left as it is. |
| Length | Mix | The brief sets it. Short is 1 to 3 minutes, long is 5 to 8. |
| Research | In the studio repo | Each video folder holds its brief, facts and sources. |

Two consequences to know about.

- **You will not see pictures until the video is finished**, because storyboard and draft were not among your gates. To
  keep that safe, the brief (your first gate) describes the picture of every scene, and the review step has to pass
  before anything reaches you. If you would rather see a contact sheet of stills in between, it costs a few minutes of
  your time and nothing else.
- **Approving the script also approves the narration cost.** The script packet states the credits before you say yes.

---

## 3. Folder layout

```
Video_Studio/
  CLAUDE.md                 short rules, always loaded
  README.md                 for people. How to start a video
  package.json              pinned versions (three 0.169.0, d3 7.9.0, fonts, math)
  requirements.txt          numpy, scipy
  .gitignore  .gitattributes
  .claude/
    skills/                 the seven steps (section 5)
    agents/                 clarity reviewer, fact checker
  docs/                     the rules and guides (section 6)
  engine/
    core/                   renderer, time, text, plots, equations
    kits/optics/            mirrors, rays, height maps, waves, fringes
    kits/ccos/              ion beam, pads, footprints, dwell maps
    kits/math/              tiles, matrices, graphs (grows when needed)
    theme.json  index.html  app.js
  gallery/                  one small scene per engine module, with its reference still
  tools/                    render, stills, timeline, narrate, checks, deliver
  templates/video/          what a new video starts from
  videos/
    2026-12_interferometry/
      brief.md  facts.json  script.json  timeline.json
      export.py  clip.js  data/  voice/  sources/  review.md
      out/                  rendered video (not in git)
```

**In git:** text, code, data under about 10 MB per video, the generated voice files (about 1 MB per minute, and they
cost credits to make again), reference stills.
**Not in git:** `out/`, `node_modules/`, source PDFs (copyright), full-size stills, anything secret. The ElevenLabs key
stays in the Windows user environment.

Finished MP4s are about 50 MB each. They stay on disk, and can be attached to a private GitHub release as a backup.

---

## 4. Technology

### 4.1 What comes over from the paper folder

`figures/animation` has about 9,000 lines. About 3,000 of them, a third, are reusable. (I told you about half before
counting. The rest is the clips themselves, their data exports and the deck scripts.)

| From `figures/animation` | Lines | Goes to | Change needed |
| --- | --- | --- | --- |
| `web/engine/core.js`, `ui.js` | 201 | `engine/core` | Move the ion-beam color and glow shader out to the CCOS kit |
| `particles.js`, `columns.js`, `cards.js` | 160 | `engine/core` | Rename to what they draw (soft discs, 3D bars, map card) |
| `matrix.js` | 151 | `engine/kits/math` | None |
| `slab.js`, `rays.js` | 494 | `engine/kits/optics` | None to `slab.js`. `rays.js` takes its colors from the theme |
| `beam.js`, `carve.js`, `tools.js`, `atoms.js` | 565 | `engine/kits/ccos` | `Floor` in `beam.js` moves to core |
| `diagrams.js` | 460 | split | Text helpers to core, tilt diagram to optics, Preston and lap to CCOS, shelf and scale comparisons to core |
| `harness.mjs`, `render.mjs`, `stills.mjs`, `profile_frames.mjs`, `kit_verify.mjs` | 249 | `tools` | Read this repo's own `node_modules`, find clips by folder |
| `clipP_timeline.py`, `narrate.py` | 392 | `tools` | One timeline tool for every video (4.2). No clip names or lengths in the code |
| `make_render_kit.py`, `check_render.py` | 200 | `tools` | Fingerprint becomes the git commit (4.4). The zip kit stays as a fallback |
| `swap_deck_media.ps1` | 79 | `tools` | Deck path and clip as arguments, speaker notes from the video's own file |

Left behind: the clips, `profile.js` and `loop.js` (written around clip P's data), the data exports, `build_deck.ps1`
(it replaces your deck copy) and `make_handoff.py` (git replaces it).

Two ties to the paper folder get cut. Three.js and the fonts are installed here with pinned versions, and the colors are
copied once from `palette.json` into `theme.json`.

**A gap that "tools only" creates.** Clips M and P were the worked examples and the test that nothing broke. The
`gallery/` replaces both. Every engine module gets one small scene that shows what it draws and how to call it. Its
still is saved. A change to the engine must leave every gallery still unchanged, to within the one or two gray levels
of GPU noise seen on clip P.

### 4.2 New in the tools

Each of these answers a problem that cost time on clip M or P.

| Tool | What it does | The problem it answers |
| --- | --- | --- |
| `timeline.py` with **beats** | Every narration line has a name. The clip asks "when does line X start" instead of holding its own seconds. `fit` places lines from the real speech and the visuals move with them. | Clip P needed 16 line times moved by hand, because `fit` only stretches the end of a scene |
| `check_text.mjs` | Reads the position of every visible text element in Chrome at each still and lists overlaps and text outside the frame | Text collisions were found by eye in most of the review rounds |
| `check_script.py` | Banned punctuation and phrases, digits in narration, words per minute, terms used before they are defined | Undefined terms and punctuation slips in rounds 1 and 5 |
| `check_facts.py` | Every number on screen or spoken points to a row in `facts.json`, or is marked as drawn | Numbers that had no row in the facts table |
| `scan_frames.py` | Finds one-frame jumps, dark gaps and stretches of 2 s or more with no change | Hard cuts that stills cannot show. 17 percent of clip P stands still. The lab session wrote this scan once and it did not come back with the work |
| `sheet.mjs` | Contact sheet of stills, and before and after differences | Hand-made each time |
| `deliver.py` | Cuts chapters, writes the poster, cue sheet and speaker notes | Done by hand |

### 4.3 New in the engine

Built when the pilot needs them, not before.

- **Equations.** MathJax 4 with its STIX Two font, so equations match the current look. If it does not render the same
  on every run, KaTeX is the fallback. Today formulas are hand-written HTML.
- **Plots.** Axes, curves and bars that draw themselves in, on d3 (already used).
- **Waves and fringes (pilot).** A field of waves, two waves adding, fringes computed from a height map, phase steps,
  and unwrapping.
- **Optical bench (pilot).** A light path with source, splitter, mirrors and camera, where the rays obey reflection.

Manim was considered and not chosen. It would mean a second toolchain and a second look, and the current engine already
draws 3D measured data, which Manim does less well.

### 4.4 Laptop and lab computer

1. The video is finished on the laptop and committed. `git push`.
2. The lab computer pulls that commit and runs one render command. The render refuses to start if any file differs from
   the commit, and writes the commit into the MP4.
3. You copy the MP4 back. `check_render.py` confirms it came from the commit that was reviewed.

The lab computer gets a read-only key for this one repository, so your GitHub login is never stored there. If it cannot
reach GitHub, the zip kit still works.

Measured times: 0.18 s per frame on the lab computer and 0.26 s on the laptop at 4K. A 5 minute video is about 55
minutes on the lab computer or 80 on the laptop. A 1080p draft at 30 frames per second takes about a quarter of that or
less.

---

## 5. Skills

Seven skills in `.claude/skills/`, one per step. Each is short, says what it needs, what it produces and when it is
done, and points to `docs/` for detail. You can run one by name (`/new-video interferometry`), or just say what you
want.

| # | Skill | Takes | Produces | Stops for you |
| --- | --- | --- | --- | --- |
| 1 | `new-video` | A topic | The video folder and `brief.md`: audience, the one idea, length, a scene table with the picture of each scene, what is measured and what is schematic, open decisions with defaults | **Gate 1. Brief and decisions** |
| 2 | `video-facts` | The approved brief | `facts.json` with each claim, value, unit, source, page and quote, all reread by hand. `sources/README.md` | |
| 3 | `video-script` | Brief and facts | `script.json`: scenes, narration, on-screen text, terms defined at first use. Word count, length and credit cost | **Gate 2. Script and facts** |
| 4 | `video-build` | The approved script | The voice, the fitted timeline, data and asserts (`export.py`), the scenes (`clip.js`), new engine modules with gallery scenes | |
| 5 | `video-review` | A draft | Automatic checks, then a fresh reviewer who has not seen earlier findings. Every finding is checked by hand, fixed or answered in `review.md` | |
| 6 | `video-finish` | A clean draft | The full render, the frame scan, the narration mix, the final check of frames from the MP4 | |
| 7 | `video-deliver` | The final MP4 | Poster, chapters, cue sheet, copy to the talk folder. Deck swap only when you ask | You watch it |

Two agents support them, in `.claude/agents/`.

- **Clarity reviewer.** Gets the stills and the brief, not our conclusions. Reports what a newcomer would misread.
- **Fact checker.** Rereads each row of `facts.json` in its source. Its reports are checked by hand too, because past
  agents were sometimes wrong with full confidence.

**The order changes from clip P.** The voice is generated right after Gate 2 and before the animation is built, so the
scenes are built to the real speech. Review happens on 1080p drafts. The 4K render runs once, at the end.

**When a review stops.** The automatic checks pass, and a fresh reviewer finds nothing that must be fixed. Two rounds
are normal. A third means something is wrong with the brief or the script, and Claude comes back to you instead of
polishing.

---

## 6. Markdown

`CLAUDE.md` stays under about 120 lines. It holds the map, the two gates, and the rules that must never be missed. All
else lives in `docs/` and is loaded when a skill needs it.

| File | What it holds | Where the content comes from |
| --- | --- | --- |
| `CLAUDE.md` | Map, gates, never-do list | New. The rules part from `handoff_clipP_CLAUDE.md` |
| `docs/style.md` | Look, type sizes, colors, camera, layout, when to use 3D | 2026-10-31 plan section 5, clip P plan section 5, `index.html` |
| `docs/writing.md` | Your writing rules, narration voice, words per second, spelling for the voice | Manuscript voice rules, handoff brief, narration notes |
| `docs/honesty.md` | Measured against schematic, exaggeration printed, prediction never shown as result, claims wording | Both plans' section 6, clip M's wording rules |
| `docs/facts.md` | How to research, save and check a source | Clip P facts table method and return notes |
| `docs/engine.md` | Every module, its call and its gallery still | Engine headers, checked against the code |
| `docs/pipeline.md` | Commands for each step, on both machines | `figures/animation/README.md` |
| `docs/review.md` | The checklist, grown from every review round so far | Clip M's three rounds and clip P's seven |
| `docs/lessons.md` | Traps, one line each, added to after every video | My memory notes, README, return notes |

Templates in `templates/video/`: `brief.md`, `facts.json`, `script.json`, `clip.js` (a working empty clip with the
full-frame fade and the footer already right), `export.py`, `review.md`.

**Never-do list for `CLAUDE.md`.** Never print or store the API key. No git commits or pushes unless you ask. No
unpublished or co-author data without your say. No voice clones of real people. Never rebuild your deck, swap media in
place. No narration calls before Gate 2. Never invent a number.

---

## 7. Phases

Effort is in working sessions with Claude, roughly half a day each. These are estimates. Only the render times above are
measured.

| Phase | Work | Effort | Done when |
| --- | --- | --- | --- |
| 0. Shell | Folder, git, `package.json`, `.gitignore`, private GitHub repo | half | A fresh clone installs and starts Chrome on the laptop |
| 1. Engine | Extract the modules, cut the ties, build the gallery | 1 to 2 | Gallery stills exist. In a scratch copy, the old clips drawn with the new engine match their stills at A 30, B 106, C 10, M 181 and P 21 s |
| 2. Tools | Timeline with beats, checks, render by commit, deliver | 1 to 2 | Clip P's script and its cached voice, read without spending credits, fit with no overlap and no hand edits. Each check catches a planted fault |
| 3. Skills and docs | Seven skills, two agents, docs, templates | 1 | A fresh Claude session, given only this folder and one sentence, makes a 30 s silent test video and stops at both gates |
| 4. Pilot | Interferometry, start to finish | 3 to 5 | You have watched it. Review log complete |
| 5. Tidy | Update skills, docs and lessons with what the pilot broke | half | Each problem from the pilot is a check, a rule or a line in `lessons.md` |

Phases 1 and 2 use copies. `figures/animation` in the paper folder is not touched at any point.

**Phase 0, done 2026-11-24.** The files that would be committed were exported to another folder and installed there with
`npm ci`. `npm run doctor` passed and the gallery matched. Publishing to GitHub waits for Ryan (section 10, item 2).

**Phase 1, done 2026-11-24.** 18 modules were extracted by a script that stops if any text it expects to change is not
there. Five core files (theme, core, glow, light, floor) were split out by hand. The five old clips were drawn with the
old and the new engine at 74 moments, 3840 x 2160.

- 70 moments are identical to the last pixel, among them A 30, B 106, C 10 and M 181 s.
- P 5, 17, 21 and 420 s differ by at most 3 of 255 levels, in the light rays. Their color was three rounded numbers in the
  code and is now a color in `theme.json`.
- Chrome sometimes antialiases an edge or a letter differently from one run to the next. The old engine does it too, up to
  64 levels in a few hundred values. The gallery check therefore draws a scene again before it calls it changed.
- 19 gallery scenes hold 35 saved stills. A 3.5 percent dimmer key light and a 5-level change of one grey were both caught.

Changes from the plan:

- The glow stays in `engine/core` as a spot of light any surface can show. Only the ion-beam color moved to the CCOS kit.
  The slab, which is in the optics kit, uses the glow.
- The tilt and comparison diagrams take named beats, with clip P's times as their defaults. The lap, Preston and ruler
  diagrams still carry clip P's times, until a video needs them.
- MathJax is installed when the pilot needs its first equation.
- Found while comparing: in the finished clip P, the atom that the ion beam knocks off drifts over the word "off" at about
  241 to 242 s. Clip P was left as it is.

**Cost.** Clip P used 1,997 credits for 7.1 minutes, about 280 per minute. The 28,000 left until 2026-12-20 cover about
100 minutes of finished video. The pilot needs about 1,500 to 2,000 with retakes. Disk has 76 GB free, and each video
uses about 1 to 2 GB while it is being made.

---

## 8. The pilot, interferometry

A sketch, so the plan can be judged. The real brief is Gate 1.

**One idea.** Light measures height because a wave that travels farther arrives later, and two waves together show that
delay as a fringe.

| Scene | Picture |
| --- | --- |
| 1 | A perfect-looking mirror. How do you see a nanometer when light itself is 633 nm long |
| 2 | Two waves meet. In step they add, out of step they cancel |
| 3 | A beam is split, sent to a reference and to the mirror, and brought back together |
| 4 | Surface to fringe. A 3D bumpy mirror, and the stripes it makes on the camera. One fringe is half a wavelength of height |
| 5 | The catch. One picture cannot tell a hill from a valley, and stripes are coarse |
| 6 | Phase stepping. Move the reference a little, take several pictures, and each pixel gives its own height |
| 7 | Unwrapping. The sawtooth map becomes a surface |
| 8 | What is left. Noise, vibration, the reference's own error, and the map that feeds the dwell-time plan |

It ends where the CCOS explainer begins, so the two can be shown in a row. Everything is computed from a seeded
schematic surface. No measured or unpublished data is needed, so nothing has to be cleared.

---

## 9. Risks

| Risk | What is done about it |
| --- | --- |
| You first see pictures at the end, and want a different visual | The scene table in the brief describes every picture. A contact sheet can be sent at any time if you ask |
| Extraction quietly changes how things draw | Old clips are redrawn in a scratch copy and compared before anything new is built |
| Skills grow long and Claude skips parts | Short skills, detail in `docs/`, and checks that run as code, not as advice |
| Topics outside optics bring facts I cannot judge | The fact step saves the source and quote for each number. A claim without a readable source is dropped or shown as a question |
| Kits grow without need | A module is added only when a video needs it, with its gallery scene |
| The lab computer is shared | Read-only key for one repo, no API key, no GitHub login |
| ElevenLabs changes its model or George's voice | Every generated line is kept in git. Model and voice are written in each video's folder |

---

## 10. Still open, with defaults

1. **Name.** `Video_Studio`, confirmed 2026-11-24.
2. **Creating the GitHub repo.** Through GitHub Desktop, as you asked (2026-11-24). Claude makes the folder a git repo,
   shows you what would be committed, makes the first commit when you say so, and opens the folder in GitHub Desktop.
   You press Publish repository with "Keep this code private" ticked. That creates the repo and connects it, and later
   pushes work from here.
3. **Pilot length and audience.** Default: 4 to 5 minutes, for a seminar audience who know optics but not this method.
4. **Stills between the gates.** Default: none, as you chose.
5. **CCOS in George's voice.** My notes say nobody had listened to the narrated clip P by 2026-11-20. If that is still
   true, please listen before the pilot, because the pilot says CCOS at the end (`figures/animation/out/narrated/george/P_ccos_check.mp3`).
6. **Old clips later.** Default: they stay where they are. The paper folder's animation code is still in no git repo,
   so its only full copy is this laptop. Committing it somewhere is worth doing on its own, separate from this plan.

---

## Related

- Paper folder: `research_git/RUDO_CCOS_Journal/figures/animation/README.md`
- Vault: `docs/rudo_ccos_journal/rudo_ibf_animation_plan_2026-10-31.md`,
  `docs/rudo_ccos_journal/rudo_ccos_explainer_animation_plan_2026-11-16.md`,
  `docs/rudo_ccos_journal/research_support/ccos_explainer_2026-11-16/clipP_return_notes_2026-11-17.md`
