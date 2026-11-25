---
name: video-review
description: Review a built video before its final render. Draft render, all automatic checks, a fresh clarity reviewer who is told nothing of earlier findings, every finding checked by hand and logged in review.md. Use after video-build, or when a video should be reviewed again.
argument-hint: video folder
---

# Review a video

The fifth step. Read `docs/review.md`. It holds the order and the list.

## 1. Draft and programs

```
node tools/render.mjs videos/x --draft
python tools/check.py videos/x --frames
```

Run the render in the background if it is long. Fix every error. A finding that is right as it is goes into
`accepted.json` with its reason, one at a time, after you looked at it. Never accept a whole class to make the check pass.

Look at the pictures the scan saved (`out/checks/jump_*.png`, `text_*.png`).

## 2. A fresh reviewer

Make stills of every reveal and scene end into a folder of this round, and the contact sheet:

```
node tools/stills.mjs videos/x --dir round1 0.8 3.2 5.9
node tools/sheet.mjs videos/x
```

Start the `clarity-reviewer` agent and give it:

- the paths of the stills in order, with their times and scene names,
- the audience and the one idea from the brief,
- the narration of each scene, as what is heard meanwhile.

Do not tell it what you think, what was found before, or what was hard. One agent for up to about 60 stills. For more,
one per chapter.

## 3. Every finding, by hand

Write each into `review.md` first. Then look for yourself: the still, the frames around it, the code, the source. It holds,
it holds in part, or it does not, and the log says how you know. Then fix it, accept it with a reason, or answer it.

Some findings change words. Words that were approved need Ryan again. Collect them and ask once. A label that only says
more clearly what it said is a fix, and the log mentions it.

## 4. After the fixes

The same stills again into `--dir round2`, and `check.py --frames` on a new draft. Compare with the round before:

```
node tools/sheet.mjs compare videos/x/out/round1 videos/x/out/round2
```

Only what was meant to change may have changed. Then a second fresh reviewer, on everything.

What the second round changed is looked at by a fresh reviewer too: only the stills that changed and their neighbors, asked
for must-fix problems only. That is a confirmation, not a third round.

## Done when

The checks pass, and the last fresh reviewer who looked has no must-fix finding that holds. Two rounds are normal. If the
confirmation finds a must-fix that holds, stop and tell Ryan what keeps coming up and what in the brief or the script you
think causes it.

Go on with `video-finish`.
