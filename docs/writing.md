# Words

For the narration, the words on screen, the briefs, the notes and replies to Ryan. `check_script.py` and `check_text.mjs`
catch the parts a program can see.

## Rules that hold everywhere

- Short plain sentences, one idea each. The simple version first, details after.
- No em dashes. No semicolons. No "X: Y" that sets up a punchline. A plain label such as "dwell time (s)" is fine.
- No "delve", "moreover", "furthermore", "not only ... but also", no hedging by formula, no inflated verbs, no flourish at
  the end, no sentence that ends in "X, not Y".
- A term is explained where it first appears, with a number and a unit where it has one. An abbreviation is spelled out
  once and then used.
- Facts keep the hedge of their source. "About" stays "about". A rule of thumb is called one.
- Nobody "invented" anything unless a source says exactly that. Say what was shown, by whom, when.
- American spelling. They for a person whose pronouns are not stated.

## Narration

- Written to be heard. Read it aloud. If a sentence needs a second breath, split it.
- About 2.5 words per second. A line has 5 to 20 words, at most 30, and no sentence has more than 24.
- Numbers are words: "nineteen twenty-seven", "forty nanometers", "a tenth of one". No digits, no symbols, no Greek
  letters. Say "theta".
- A letter that is read as a letter is written as one ("the pressure P"). An abbreviation read as letters is written plain.
- Names the voice gets wrong are respelled for the voice only, in `"say"` of `script.json`. RUDO is "Ruhdoh" and CUDO
  "Cuhdoh", already built in. UDO is as written.
- Conversational, not chatty. An everyday comparison helps when it is exact.
- The narration explains what is moving now. It does not read the title aloud, and it never says something the picture
  contradicts.
- Do not promise ("as we will see") and do not recap.
- Marks in a line, `<P>`, name the moment a word is said, so the picture can act on it. They are not spoken.

## On screen

- A title is a statement, without a period. A subtitle is a sentence, with a period.
- The title says the idea. The subtitle says what is drawn and how to read it.
- Labels are nouns. Units stand with the number, in roman type. A true minus sign, a thin space before a unit.
- The words for one thing never change. If the first scene says "typical radius", the last one does too.
- A label says what is shown, not what it stands for: "drawn larger", "schematic", "as predicted", "measured".
- Nothing is abbreviated to make it fit. Make it shorter or the box larger.

## The voice

George, ElevenLabs, model `eleven_v4`. The model ignores pause tags, so pauses come from `gap`, `wait` and `hold` in
`script.json`. Claude cannot hear. Names, abbreviations and odd words go on the list of things Ryan should listen for.

## The script file

`script.json` is the only place the words of the narration and the captions live. A short line of each field:

| Field | Where | Means |
| --- | --- | --- |
| `title`, `poster`, `ending`, `silent`, `say` | top | the video's name, the poster's beat, `hold` or `fade`, no voice, respellings |
| `terms` | top | `{ "term": "dwell time", "line": "S2.dwell" }`, or a `why` for leaving it unexplained |
| `gap`, `lead`, `tail`, `end` | top | silence between lines, before the first, after the last, at the very end (s) |
| `id`, `chapter`, `cut`, `min`, `tail`, `picture` | scene | name, chapter it opens, how it is entered (`dip` or `none`), least length, rest, what is seen |
| `id`, `text`, `cue` | line | name, words, what is on screen meanwhile |
| `at`, `gap`, `wait`, `hold` | line | not before this second of the scene, silence before, more silence before, silence after |
| `facts`, `plain` | line | the facts a spoken number rests on, number words that are ordinary language |
| `kind`, `text`, `from`, `to` | caption | `title` or `sub`, words with `{F1}` for facts, beats or seconds |

Beats are `line`, `line:end`, `line.mark`, with `+0.3` or `-0.2` if needed.
