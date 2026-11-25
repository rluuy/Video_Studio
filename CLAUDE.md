# Video studio, guide for Claude

Read `docs/studio_plan.md` first. It holds Ryan's decisions, the phases, and what is done. `README.md` has the commands.

**State on 2026-11-24.** Phases 0 (shell) and 1 (engine and gallery) are done. Phases 2 (tools), 3 (skills and docs) and
4 (the interferometry pilot) are not. There are no skills yet, so do not start a video. Build the next phase when Ryan
asks for it.

## Never

- Never print, store or commit the ElevenLabs API key. It stays in the Windows user environment. It is never set on the
  lab computer.
- No git commit and no push unless Ryan asks. Before a commit, show what it holds.
- No narration calls before Ryan has approved a video's script and its cost. Generated voice files are kept, never made
  again for nothing.
- No unpublished or co-author data in a video unless Ryan says so.
- No voice clones of real people.
- Never rebuild Ryan's slide deck. Swap media in place, and only when asked.
- Never invent a number. A number on screen or in the narration has a source or is marked as drawn.
- The paper folder (`RUDO_CCOS_Journal/figures/animation`) is read and copied from, never edited from here.

## The two approvals

Ryan approves the brief with its open decisions, and later the script with its facts. Nothing else waits for approval
until the finished video. A video's work stops at each of the two until Ryan answers.

## How scenes are made

- A scene exports `create({ renderer, base })` and returns `{ scene, camera, duration, update(t) }`. `update(t)` sets
  everything from `t` alone, so any frame can be drawn in any order.
- Colors, fonts and sizes come from `engine/theme.json`. Do not write a shared color into a module.
- What carries a claim is computed (rays reflect, gaps are distances). What is drawn for clarity is labeled so on screen.
- Exaggeration is printed on screen wherever heights are magnified.
- A new module needs a gallery scene. Add one only when a video needs it. Run `npm run gallery` after any engine change.
- Modules with their own timing take named beats, as `kits/optics/tilt.js` does. The lap, Preston and ruler diagrams
  still carry the times of the CCOS explainer.

## Writing, on screen, spoken and in files

- Plain words, short sentences. The simple version first, details after.
- No em dashes, no semicolons, no colon that sets up a punchline, no filler.
- Each term is explained where it first appears. Each picture can be read without the narration.
- Use they for a person whose pronouns are not stated.
