---
name: video-finish
description: Make the final video after its review. Commit when Ryan says so, full render on the laptop or the lab computer, proof that it came from the reviewed files, frame scan, narration mix, and a last look at frames from the MP4. Use when a reviewed video is ready for its final render, or when a rendered file came back from the lab computer.
argument-hint: video folder
---

# Finish a video

The sixth step. It needs a review log whose last round has nothing open, and `python tools/check.py videos/x --frames`
passing.

## 1. Commit

A final render is made only from committed files, so that the video can be matched to them. Show Ryan what would be
committed (`git status --short`) and ask for a yes to commit, and to push if the lab computer will render. **Never commit
or push without it.** If Ryan says no, the draft is the result for now. Say so and stop.

## 2. Render

On the laptop, in the background, with its output in a file:

```
node tools/render.mjs videos/x
```

Say how long it will take (about 0.26 s per frame). Or on the lab computer, as `docs/pipeline.md` describes: give Ryan the
commands to run there. Do not edit any file while it renders.

## 3. Is it the reviewed one?

```
python tools/check_render.py videos/x --frames 12.5,40,81
python tools/scan_frames.py videos/x
```

Choose a frame in every scene. Compare them with the reviewed stills. Text and numbers must be the same. Shading may
differ by a few gray levels between GPUs. New jumps or dark gaps mean something differs from the draft. Find out what.

## 4. Voice

```
python tools/narrate.py mix videos/x
```

It measures where each line starts. Anything over 40 ms is an error. A silent video skips this.

## 5. One last reader

A fresh `clarity-reviewer` on frames taken from the MP4 itself, asked for must-fix problems only. If it finds one that
holds, go back to `video-review`. Otherwise write its small points into `review.md` and leave them.

## Done when

`check_render.py` says OK, the scan has no open error, the voice is in place. Go on with `video-deliver`.
