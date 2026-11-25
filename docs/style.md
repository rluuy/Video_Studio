# Look and pacing

How the videos look and move. Colors, fonts and sizes are numbers in `engine/theme.json`. This file says when to use
which. Ryan chose to keep the look of the first five clips, so it changes only when Ryan asks.

## What makes a scene work

1. **One idea per scene,** said in one sentence on screen. The picture proves it.
2. **Things stay and change.** A camera moves, a surface grows, a label follows. The viewer never has to find the object
   again. A cut is for a new subject.
3. **Build by repetition.** One wave, then two, then many. Each step adds one thing.
4. **Scale changes are motion.** When heights are stretched, the viewer sees them grow while a counter reads the factor,
   and the factor stays on screen.
5. **Counters are proof.** A number changes while the picture changes.
6. **Mathematics comes last.** First the picture, then the words, then the symbols, each symbol under the thing it names.
7. **Restraint.** Two or three hues, one typeface, no music, nothing that moves for decoration.
8. **Everything can be read without the sound.** A viewer who only watches follows the logic. The narration adds, it does
   not carry.

## Frame

- 1920 x 1080, 60 frames per second, dark field, margins of 96 px. Drawn at twice the size and reduced.
- Title at the top left, one sentence, about 46 px. Subtitle below it, one sentence, about 29 px. Nothing else up there
  but a counter at the top right.
- Footer at the bottom left says what kind of picture this is ("schematic surface, heights × 40,000"). It stays as long
  as the picture does, because a chapter may be cut out and shown alone.
- Color bar at the bottom, with its unit in its title. Labels sit next to what they name, on a thin leader if they cannot.
- At most two texts plus the footer and one counter. A dense diagram needs a reason.
- Smallest text 17 px. Anything the audience must read is 21 px or larger.

## Color has a meaning

| Color | Means |
| --- | --- |
| Signed map (RdBu_r) | heights and errors. White is zero, red is high, limits are symmetric and printed |
| Positive map (viridis) | amounts that cannot be negative: time, rate, removal, intensity |
| Blue, amber, pink | identities in a diagram, the same one for the whole video, always named |
| Warm white | light rays |
| Violet | the ion beam |
| Greys | tools, stages, glass |

Red and green are never used for good and bad. Every color that carries meaning has a key on the same frame. An accent
used for one thing is not used for another in the same video (clip P used amber for eight things at first).

## 3D or flat

- 3D for things that are surfaces, beams, tools, or stacks of amounts.
- Flat (SVG) for geometry, waves, graphs, processes and formulas.
- Not both at full strength at once. When a flat panel comes in, the 3D picture steps back.
- A dark part of a 3D object must not pass behind text. The text check cannot see 3D.
- Footprints and dents are drawn upward or downward, and the frame says which.

## Camera and motion

- Slow moves with a reason, orbits of at most about 20 degrees. The camera rests while something must be read.
- Ease in and out (`smoother`). No motion starts or stops in one frame.
- Nothing switches in one frame. Highlights crossfade (about 0.3 s), labels fade, values drain before they restart. The
  frame scan reports what does.
- Fades of 0.5 s at the start and end of a chapter, a dip of 0.22 s between scenes. The veil of `engine/core/film.js` does
  both for the whole frame, so it is made last.
- Titles leave with the picture they belong to, and the next title comes with the next picture.
- After a reveal, rest about 2 s. A result holds at least 2 s, a title at least a second longer than it takes to read.
- A picture may rest while it is explained, up to about 5 s. Then something should move, even a little.

## Pacing

- Narration runs at about 2.5 words per second, and a scene is spoken for 60 to 85 percent of its time. Leave silence for
  looking.
- A new term, a new object and a new color do not arrive in the same second.
- A title shows for `0.8 s + words / 4` at least. `timeline.py` says when one is too short.
- Short videos are 1 to 3 minutes, long ones 5 to 8, in chapters of 45 to 90 s that stand alone.

## Files for slides

H.264, 60 frames per second, BT.709, a poster frame that shows the result, chapters that cut without encoding again.
Clips that end on a result use `"ending": "hold"` so the slide rests on the picture.
