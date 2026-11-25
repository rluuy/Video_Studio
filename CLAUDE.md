# Video studio, guide for Claude

Short narrated explainer videos, made in seven steps. Ryan names a topic. Claude takes it through the steps and stops
twice for approval. Claude decides the rest, unless Ryan asks to.

**State on 2026-11-24.** Engine, tools, skills and guides are built, and were tried on a 30 s silent video in a throwaway copy.
The first real video is the pilot, interferometry. `docs/studio_plan.md` has the plan, the decisions and the record.

## The seven steps

| Step | Skill | Ends with |
| --- | --- | --- |
| 1 | `new-video` | the brief. **Stop, first approval** |
| 2 | `video-facts` | every number with a source that was reread |
| 3 | `video-script` | the script packet. **Stop, second approval** (words, facts, cost) |
| 4 | `video-build` | voice, timeline, data, pictures |
| 5 | `video-review` | a draft that passes the checks and a fresh reviewer |
| 6 | `video-finish` | the final render, proven to be the reviewed one, with its voice |
| 7 | `video-deliver` | chapters, poster, cues, notes, lessons |

Use the skill of the step. To see where a video stands, read its files and run `python tools/approve.py videos/x` and
`python tools/check.py videos/x`.

## The two stops

A stop means the turn ends with the question. Nothing of the next step is begun. `approve.py` is run only after Ryan said
yes to the thing itself, in words. An answer to another question, silence, or a nod to the topic is not a yes. A word
that changes after the second approval needs Ryan again. The same holds when no one is there to answer: stop and wait.

## Never

- Never print, store or commit the ElevenLabs API key. It stays in the Windows user environment and is never set on the
  lab computer.
- No git commit and no push unless Ryan asks. Before a commit, show what it holds.
- No narration before the second approval. `narrate.py gen` refuses, and that is not to be worked around. Nothing in
  `voice/` is ever deleted.
- No unpublished or co-author data in a video unless Ryan says so for that video.
- No voice clone or likeness of a real person.
- Never rebuild or rearrange Ryan's slide deck. Swap media in place, and only when asked.
- Never invent a number, a source or a quote. Not found is an answer.
- A check is not silenced. A finding that is right goes into `accepted.json` with its reason.
- The paper folder (`RUDO_CCOS_Journal/figures/animation`) is never edited from here.
- Nothing about Ryan or an unpublished project goes into a web search or to another service.

## Where things are

| Need | Read |
| --- | --- |
| Commands, files of a video, lab computer, deck | `docs/pipeline.md` |
| How it looks and moves | `docs/style.md` |
| Words, narration, the fields of `script.json` | `docs/writing.md` |
| What a picture may claim | `docs/honesty.md` |
| Facts and sources | `docs/facts.md` |
| Engine modules and how to call them | `docs/engine.md`, then the gallery scene |
| What reviewers look for | `docs/review.md` |
| What went wrong before | `docs/lessons.md` |
| A complete small example | `tests/demo` |

## How scenes are made

- `create({ renderer, base })` returns `{ scene, camera, duration, update(t) }`. `update(t)` sets everything from `t`
  alone, so any frame can be drawn in any order.
- A clip holds no seconds of its own. It asks for moments by name, `tl.scene('S1').at('line')`.
- A number on screen is `facts.html('F1')`, or `drawn(...)` with the reason it needs no source.
- What carries a claim is computed. What is drawn for clarity says so on the frame, and exaggeration is printed.
- Shared colors, fonts and sizes come from `engine/theme.json`.
- A new engine module only when a video needs it, with a gallery scene and a paragraph in `docs/engine.md`.

## After changes

Engine: `npm run gallery`. Tools, skills or guides: `npm test` (about five minutes, no credits).

## Talking to Ryan

The plain version first, details after. Short sentences, no em dashes, no semicolons, no colon that sets up a punchline.
Report what was done and what was not. Say it when something was not looked at or cannot be heard. They for a person whose
pronouns are not stated.
