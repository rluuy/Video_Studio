# Facts and sources

How a number gets into a video. The aim is that someone can point at any number on screen and be shown the sentence it
rests on.

## The table

`facts.json`, one row per fact.

```json
{ "id": "F1", "claim": "The red helium-neon laser line has a wavelength of 632.8 nm in air", "value": 632.8, "unit": "nm",
  "shown": "633 nm", "spoken": ["six hundred thirty-three nanometers"], "kind": "source",
  "source": "full citation with DOI", "where": "p. 3, Table 1", "quote": "the sentence it rests on, copied", "checked": "2026-12-02" }
```

- `value` is the number in `unit`. `shown` is what the screen prints, `spoken` what the voice may say. When rounding or a
  unit change makes them differ by more than 2 percent, `rounded` says what was done.
- `kind` is `source`, `computed` (with `how`, beginning with "export.py" when that file asserts it) or `schematic` (with
  `how`).
- A fact without a number (a mechanism, a date of a method) is a row too, with the words as `shown`.

## Finding a source

In this order: the paper, standard or data sheet itself, a review or textbook, a thesis, the maker's own page. The kind
is written down. A page that only repeats a number is not a source for it.

1. Save the file in `sources/` (`curl -L -o videos/x/sources/name.pdf ADDRESS`, or copy the file that the fetch tool names)
   and list it in `sources/README.md` (citation, address, read how, which facts). If it cannot be saved, the list says so.
2. Read the place yourself and copy the sentence into `quote`. An abstract is an abstract, and the row says so.
3. Write what it says, not what would be convenient. Conditions and hedges come along.
4. Look at a second source when the number matters. If two disagree, say which is used and why.
5. A claim with no readable source is dropped, softened until it is true, or turned into a question. It goes on the
   "looked for and not found" list.

Traps met so far:

- The text layer of a PDF loses symbols. "100 mm" was "100 µm" on the page. Look at the page when a unit matters.
- A number in one paper came from another paper, or from a web page. Follow it to where it was measured.
- A range from one machine is not the range of the method.
- The size of the thing and its specification came from different sources. Each gets its own.
- A search result's summary is not the source.

## Research agents

They are good at finding and bad at being right. Give one a question and a list of claims, ask for the quote and the place
for each, and tell it to say "not found". Then reread every row that will be used. "The agent found it" is never in
`checked`.

## Computed facts

`export.py` computes the number, `ex.fact('F7', value)` compares it with the row, and stops when they differ. What the
picture claims in words is an `ex.check('...', condition)`. Data files it reads are remembered by fingerprint with
`ex.input(path)`. Seeds are fixed.

## Before the script is shown

- `python tools/check_facts.py videos/x` has no errors.
- The fact checker (an agent that was not told what we concluded) has reread every row. Its findings were checked by
  hand.
- Every row in use has a quote that contains the number or the statement.
