# Review

What to look for, grown from three rounds on clip M and seven on clip P. The programs go first, because they are cheap
and do not tire. People and fresh agents then look for what programs cannot see.

## Order

1. `python tools/check.py videos/x --frames` on a draft. Fix or accept (with a reason) everything.
2. Look at the contact sheet yourself, then at single stills of every reveal and every scene end.
3. A fresh clarity reviewer, who gets the stills, the audience and the one idea, and nothing else. Never our conclusions,
   never the findings of an earlier round.
4. Every finding is written into `review.md`, checked by hand, and only then fixed, accepted or answered. Some are
   wrong, often because a still caught the middle of a motion.
5. After the fixes, stills of everything again, in a folder per round. What changed must be what was meant to change.
6. A second fresh reviewer, on everything. What that round changes is confirmed by a fresh look at those stills only.
7. It is done when the checks pass and the last reviewer who looked has no must-fix.

Two rounds are normal. More means the brief or the script has a problem, and Ryan is asked. Fixes cause new problems:
a moved label landed on a tick, a longer line pushed a counter into a subtitle. So the stills are retaken each time.

## What a clarity reviewer is asked

- What does this frame say? Where do the eyes go first?
- Which word, symbol, color or shape is not explained by this frame or an earlier one?
- What would a newcomer read wrongly? What looks like data and is not, or the other way round?
- Is the exaggeration, the unit, the "schematic" there when it is needed?
- What do two frames say that cannot both be true?

## The list

**Claims**
- [ ] A prediction or an ideal run is not shown as an outcome.
- [ ] The footer says what kind of picture it is, for as long as the picture lasts, in every chapter.
- [ ] Numbers belong to the thing next to them. A specification does not sit under someone else's mirror.
- [ ] The same quantity has one name, one unit, one rounding.
- [ ] What one scene says does not contradict another.
- [ ] Geometry that carries a claim was looked at: angles, normals, which way a tilt goes, which way light turns.

**Reading**
- [ ] Every color has a key on the frame. No accent means two things.
- [ ] Every line, dash, dot and band has a name.
- [ ] Axes have a name, a unit and a zero where one is needed.
- [ ] Arrows show their direction.
- [ ] Labels are beside their thing and away from lines, ticks, tools and the paths of rays.
- [ ] Text is readable at the size of a slide from the back of a room, for long enough.
- [ ] A title does not promise what the picture has not done yet, and does not stay after it.

**Motion**
- [ ] Nothing switches, pops, jumps or resets in one frame.
- [ ] Everything belonging together enters and leaves together, text, picture, map and key.
- [ ] The eye knows where to look next. Not two things start at once.
- [ ] Something important is not over in less than 2 s.
- [ ] The fades cover the whole frame.

**Sound**
- [ ] Every line starts where its picture is. No line names a thing before it is there.
- [ ] No long silence without motion and no motion that nobody explains.
- [ ] Ryan listens for names, abbreviations and odd stress.

**File**
- [ ] The final render comes from one commit, and `check_render.py` says so.
- [ ] Frames pulled from the MP4, one per scene at least, match the reviewed stills.
- [ ] It plays in PowerPoint on the computer that will show it.
