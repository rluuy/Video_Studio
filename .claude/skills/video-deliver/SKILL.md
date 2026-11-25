---
name: video-deliver
description: Hand over a finished video. Chapters, poster, cue sheet and speaker notes, a copy to the talk folder, the list of things Ryan should listen for, a deck swap only when asked, and the lessons of this video. Use when a final video exists and should be delivered, copied to a talk, or put into a slide deck.
argument-hint: video folder
---

# Deliver a video

The seventh step. It needs a final video that `check_render.py` accepts.

## 1. Make the package

```
python tools/deliver.py videos/x
```

Add `--to FOLDER` only when Ryan has named the folder. Read `notes.txt` and `cues.md`. They are generated, so a mistake in
them is a mistake in `facts.json` or `script.json`.

## 2. Tell Ryan

Plainly and short:

1. Where the file is, how long it is, its chapters.
2. **Please listen**, because Claude cannot: the names, abbreviations and odd words, each with its time, and the lines with
   the least silence around them.
3. What is measured, computed and drawn, in one line each.
4. What differs from the brief, and the small review points that were left.
5. What it cost in credits.

Do not call it finished before Ryan has watched it. If a line is wrong by ear, only that line is made again: change its
respelling in `"say"`, ask, then `gen`, `fit`, and render if the timing moved.

## 3. The deck, only when asked

With the deck closed and the video already on a slide under a name. First with `-Check`:

```
powershell -ExecutionPolicy Bypass -File tools\swap_deck_media.ps1 -Deck deck.pptx -Shape "name" -Video videos\x\out\deliver\x.mp4 -Poster videos\x\out\deliver\x_poster.png -Check
```

Never rebuild a deck, never move or edit slides. Speaker notes are replaced only when Ryan asks for it. Ryan rewrites them
by hand and the deck is where they live.

## 4. What this video taught

Go through `review.md`. Each problem that came up becomes one of these, and the first that fits is the one:

- a check, with a test that plants the fault (`tests/run.py`),
- a rule in `docs/`,
- a line in `docs/lessons.md`.

Show Ryan what changed and ask for a yes to commit.
