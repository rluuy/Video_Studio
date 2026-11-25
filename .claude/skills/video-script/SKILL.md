---
name: video-script
description: Write the script of a video whose facts are done. Scenes, narration, captions and terms in script.json, checked and timed, then the readable script packet for Ryan, and a stop for the second approval, which also approves the cost of the voice. Use after video-facts, or when the words of a video have to change.
argument-hint: video folder
---

# Script of a video

The third step. It needs an approved brief and a clean `check_facts.py`. Read `docs/writing.md` and `docs/style.md`.

## 1. Write `script.json`

Scene by scene from the brief. For each:

- `picture`: what is seen, in one or two sentences, so the packet can be read without the brief.
- Lines: what is said while that picture moves. Each has an `id` that reads well as a beat, and a `cue` that says what is
  on screen.
- Marks (`<P>`) where the picture acts on a word.
- Captions: one title, one subtitle, rarely more. Numbers as `{F1}`.
- `facts` on every line that says a number or a claim, `plain` for number words that are ordinary language.
- `wait` where the picture needs a moment before the next words. `min` only where the picture needs a fixed time.
- `chapter` where a part begins that can stand alone.

`terms` lists every technical word and abbreviation with the line that explains it.

Read the narration aloud in your head, start to end, without the pictures. Then read the captions alone, without the
narration. Each has to make sense. Cut what both say.

## 2. Check and time

```
python tools/check_script.py videos/x
python tools/check_facts.py videos/x
python tools/timeline.py plan videos/x
python tools/narrate.py cost videos/x
```

Fix errors. Look at each warning. A wording that is right as it is goes into `accepted.json` with its reason. Bring the
length near the brief's, by cutting words, not by speaking faster.

## 3. A reader who does not know

Start a fresh `clarity-reviewer` agent on the script alone (tell it there are no stills yet). Give it `script.json` and the
audience from the brief. It looks for words used before they are explained, jumps in the argument, and sentences that
claim more than their fact. Check its findings by hand. Once is enough. It is better to hear about words now than after
they are approved, so ask it above all for sentences it had to read twice.

## 4. Stop for the second approval

```
python tools/packet.py videos/x
```

Give Ryan, in plain words:

1. Length, number of lines, words, credits.
2. What differs from the approved brief.
3. The facts that rest on weak sources, by number, and what was not found.
4. Words the voice may get wrong.
5. A link to `script_packet.md`.

Say that a yes approves the words, the facts and the cost. Then **stop**. Do not run `approve.py`, do not make the voice,
do not draw. A silent video stops here too.

## When Ryan answers

Change `script.json`, run the checks and the packet again, until Ryan says yes. Then record it and go on with
`video-build`:

```
python tools/approve.py videos/x script
```

If words change after that, the approval no longer holds for them, and Ryan is asked again about those lines.
