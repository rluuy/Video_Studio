---
name: video-facts
description: Research the facts of a video whose brief is approved. Finds a readable source for every number and claim, rereads each by hand, and fills facts.json and sources/README.md, with a fresh fact checker at the end. Use after the first approval of a video, or when a fact of a video has to be added or checked again.
argument-hint: video folder
---

# Facts of a video

The second step. It needs an approved brief: `python tools/approve.py videos/x` must say "brief approved". If it does not,
go back to `new-video`. Read `docs/facts.md` and `docs/honesty.md`.

## 1. List what has to be true

From the brief, write down every number that will be shown or spoken, every mechanism that is drawn, every "because", and
every date or name. That is the list. Nothing gets into the script that is not on it.

## 2. Find and read

For each entry, in the order of `docs/facts.md`:

- Find the source itself, save it in `videos/x/sources/`, and list it in `sources/README.md`.
- Open it at the place. Copy the sentence into `quote`, with page or table in `where`.
- Write the row in `facts.json` with its conditions. Set `checked` to the day you read it.

Agents may search, several questions at once when they are independent. What an agent reports is a lead. You open the
source and read it before the row counts. An agent's "confirmed" is not a reading.

Computed facts get `kind` "computed" and a `how` that begins with "export.py". They are computed in `video-build`.
Until then `value` is what a quick calculation gives.

## 3. What cannot be found

Drop it, soften it until it is true, or turn it into a question on screen. Put it on the "looked for and not found" list.
If a scene of the brief depends on it, tell Ryan now, with a proposal.

## 4. Checks

```
python tools/check_facts.py videos/x
```

It will complain that facts are used nowhere, because there is no script yet. Everything else must be clean.

Then start the `fact-checker` agent. Give it the folder and nothing about what you believe. It rereads every row in its
source. Look at each thing it reports yourself. Correct the row, or write down why it stands. Run it a second time only
when the first led to new rows or new sources.

## Done when

- Every row in use has a source you opened, or a calculation, or is called schematic.
- The fact checker has nothing open.
- `sources/README.md` says which sources are primary and which are not, and what was not found.

Go on with `video-script`. Tell Ryan in two or three lines what changed against the brief, if anything did.
