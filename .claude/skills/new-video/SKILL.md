---
name: new-video
description: Start a new explainer video from a topic. Makes the video's folder and writes its brief (audience, the one idea, every scene with its picture, what is measured and what is drawn, open decisions with defaults), then stops for the first approval. Use when someone wants a video, an animation or an explainer on some topic, or names a topic to make a video of.
argument-hint: topic
---

# Start a video

The first of seven steps. It ends with the brief in front of Ryan and nothing else done. Read `docs/style.md` and
`docs/honesty.md` first. Commands are in `docs/pipeline.md`.

## 1. Is there one already?

Look in `videos/`. If a folder for this topic exists, read its files and say where it stands. Do not start a second one.

## 2. Ask, once

Ask only what changes the video and cannot be guessed, in one go, at most four questions, each with a default first:
who watches and what they know already, how long, where it is shown, and whether any measured or unpublished data is
meant. If the request already says it, do not ask it. If Ryan is not there to answer, use the defaults and list them as
decisions in the brief.

## 3. Make the folder

```
python tools/new_video.py short_name "The title as a viewer reads it"        (add --silent if there is no voice)
```

## 4. Find out enough to be honest

Read enough about the topic to know that the story is true, what is commonly misunderstood, and which numbers will be
needed. This is not the fact step. Do not fill `facts.json`. Note where the numbers should come from. If the topic is
Ryan's own research, ask which papers or notes to read. Never use unpublished data on your own.

## 5. Write `brief.md`

Fill every part of the template. What makes a brief good:

- **The one idea** is a sentence a viewer could repeat.
- **Every scene has one sentence and one picture.** The picture is described so that Ryan can see it: what is on screen,
  what moves, what the eye follows, what changes at the end. Ryan sees no stills before the finished video, so this is the
  place where a wrong picture is caught.
- **Order.** Something to see, then words, then symbols. Each scene needs only what came before it. The hardest idea gets
  the most time.
- **Real or drawn** for each scene, and how the frame will say so.
- **Reuse.** Name the engine modules the scenes can use (`docs/engine.md`) and the ones that must be made. A scene that
  needs a large new module should be worth it.
- **Words fit the length.** About 2.5 words per second, spoken for 60 to 85 percent of the time.
- **Decisions** each have a default and say what changes otherwise. The ones that are expensive to change later come first
  (what data is real, which parts are in).
- **Nothing is claimed** that you could not point to a source for later.

Check it against `docs/writing.md`. Read it once as someone who does not know the topic.

## 6. Stop for the first approval

Give Ryan, in plain words:

1. The story in three or four sentences.
2. The scene table, with the pictures.
3. The decisions with their defaults.
4. Length, effort, credits for the voice.
5. A link to `brief.md`.

Then ask whether to go on, and **stop**. Do not research facts, write the script, or draw. Do not run `approve.py`.

## When Ryan answers

Change the brief until Ryan says yes. Write the answers and the date under "Answers". Then record it and go on with
`video-facts`:

```
python tools/approve.py videos/x brief
```

Silence, a question back, or "looks interesting" is not a yes.
