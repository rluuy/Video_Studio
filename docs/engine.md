# The engine, module by module

Paths are under `engine/`. Each module has a gallery scene that shows it and how it is called. `npm run gallery` draws
them all and compares them with the saved stills in `gallery/stills/`. Read the gallery scene before using a module.
Units are millimeters in the scene, nanometers for heights, pixels of the 1920 x 1080 frame for flat drawing. z is up.

## How a scene is built

`create({ renderer, base })` makes everything once and returns `{ scene, camera, duration, update(t), info?() }`.
`update(t)` sets everything from `t`. No state is carried from frame to frame, except sums that are exact whatever the
order (as in `kits/ccos/carve.js`). `templates/video/clip.js` is a working start.

## Core

**`core/theme.js`** (gallery `theme`). `theme` (theme.json), `W`, `H`, `BG`, `INK`, `C` (colors for diagrams), `LUT.signed`,
`LUT.positive` (256 hex colors each), `applyCss()`.

**`core/core.js`** (used everywhere). Passes on all of the above, and:

- Time: `clamp`, `clamp01`, `lerp`, `smooth`, `smoother`, `easeIn`, `easeOut`, `seg(t, t0, t1, ease)` (progress through an
  interval), `window01(t, t0, t1, f)` (opacity with fades), `keys(t, [[t, v], ...])` (keyframes, numbers or lists),
  `rnd(k, s)` (repeatable random number).
- Color: `hexToRgb`, `rgb01`, `srgbToLinear`, `vec3srgb`, `lutTexture(list)`, `lutColor(list, s)`.
- Data: `getJSON(url)`, `getF32(url)`, `heightTexture(nx, ny)`, `filteredTexture(f32, nx, ny)`.
- Camera: `placeCamera(cam, { target, az, el, dist, fov })`, `project(cam, x, y, z)` (screen position of a point).
- `makeRenderer` (app.js calls it), `GLSL_COMMON` (shader helpers).

**`core/timeline.js`** (gallery `film`). `loadTimeline(base)` gives a `Timeline`. `tl.scene('S1').at('line')`, `.start`,
`.length`, `tl.now(t)`.

**`core/facts.js`** (gallery `film`). `loadFacts(base)` gives `Facts` with `.html('F1')`, `.tspan('F1')`, `.value('F1')`,
`.fill(text)`. `drawn(html, why)` and `drawnSvg(text, why)` mark a number that comes from the picture itself.

**`core/film.js`** (gallery `film`). `makeFilm(tl, facts)` draws the captions of `script.json`, the footer
(`film.footer(html)`) and the veil. Make it last, and call `film.update(t)` last.

**`core/ui.js`** (gallery `ui`). `el(tag, {...})` and `svg(tag, attrs, parent)` make elements under `root`, `SVGNS`.
`setHTML(e, html)` (only when it changes), `show(e, opacity, rise)`. `captionTrack` (captions without a script),
`colorBar({ x, y, w, lut, lo, hi, ticks, title, unit })`, `pin(html, { align, dx, dy })` (a label for a 3D point, called
with a screen position and an opacity), `fmtInt`, `fmtClock`.

**`core/draw.js`** (gallery `draw`). Flat drawing: `layer(parent)`, `text(g, x, y, s, {...})`, `math(g, x, y, s)`,
`arrowHead`, `placeHead(h, x, y, angle)`, `arcPath`, `op(e, opacity)`, `set(e, attrs)`, `f1`, `DEG`, `C`.

**`core/discs.js`** (gallery `discs`). `Discs({ scene, n, hard, additive })`: many dots that face the camera. `begin()`,
`add(x, y, z, size, rgb, alpha)`, `end()`, every frame.

**`core/bars.js`** (gallery `bars`). `Bars({ scene, n, size })`: 3D bars, `set(i, x, y, z0, h, color)`, `commit()`.
`LevelPlane({ scene, w, d })`: a see-through plane at a limit, `place(x, y, z)`, `opacity`.

**`core/mapcard.js`** (gallery `mapcard`). `MapCard({ scene, nI, nJ, w, h, px })`: a grid of values as a framed panel in 3D,
`draw(map, max, marked)`, `place`, `cellWorld(i, j)`, `pointWorld(u, v)`, `opacity`.

**`core/floor.js`** (gallery `floor`). `Floor({ scene, z, glow, r0, r1 })`: dark ground with soft shadows, `setRects`.

**`core/glow.js`** (gallery `floor`, `beam`). A spot of light on a surface, blurred along its path: `setGlow(u, steps, amp)`,
`glowUniforms`, `GLSL_GLOW`, `MAX_STEPS`.

**`core/light.js`** (gallery `floor`). `addLights(scene)` for ordinary meshes, `LIGHT` and `GLSL_LIGHT` for the height-map
shaders.

**`core/compare.js`** (gallery `compare`). `shelfDiagram(parent, items, { beats })`: cards side by side, one lit.
`earthDiagram(parent, {...})`: a small part scaled up to the Earth.

## Optics kit

**`kits/optics/slab.js`** (gallery `slab`). `HeightSlab({ nx, ny, dx, center, base })`: a height map as a slab. Put heights
(nm) into `slab.h` and call `upload()`. `slab.u.uK.value` is mm per nm, the exaggeration. `uHref`, `uZ0`, `uCref`, `uClim`
set levels and color limits, `topU.uColorMix` fades the color in, `topU.uSecOn` draws a section line, `zAt(x, y)`, `zOf(h)`,
`opacity`.

**`kits/optics/rays.js`** (gallery `rays`). `DishMirror({ n, dx, R, f })`: a round concave mirror with a height map,
`heightAt`, `surface(x, y)`. `RayBundle({ scene, dish, xs, zTop })`: parallel rays traced on that same surface,
`update({ o, inT, outT })` returns the spread of the focus, `trace(x, y, zf)`. `Segs`: glowing line segments, `GlowSprite`.

**`kits/optics/tilt.js`** (gallery `tilt`). `tiltDiagram(parent, { tilt, beats })`: a mirror turns by θ, the light by 2θ, then
a wavy surface.

## Math kit

**`kits/math/matrix.js`** (gallery `matrix`). `Tiles` (flat tiles that can fly), `MatrixCard` (a matrix filled column by
column), `Panel`, `Dots`, `outlineRect`, `rgb01`.

## CCOS kit

**`kits/ccos/colors.js`**. `BEAM`, `TOOL_INK`, `PITCH`.

**`kits/ccos/beam.js`** (gallery `beam`). `Beam({ scene, renderer, halfWidth })`: the schematic ion source and its beam,
`update({ steps, on, zTop, zBottom })`, with steps within a frame for motion blur.

**`kits/ccos/carve.js`** (gallery `carve`). `Carver` (a sum of footprint copies), `PointSet` (dwell points with the dwell
already applied), `Schedule` and `hermite` (a recorded motion program).

**`kits/ccos/tools.js`** (gallery `tools`). `PadTool`, `BonnetTool`, `StressedLapTool`, `MRFTool`, `JetTool`, `EEMTool`,
`IonTool`, `PlasmaTool`. Each has `.group` and `update(tau, opacity)`.

**`kits/ccos/atoms.js`** (gallery `atoms`). `atomInset(parent, 'eem' | 'ibf' | 'plasma', { x, y, w, h })`.

**`kits/ccos/lap.js`** (gallery `lap`) `lapDiagram(parent)`, **`kits/ccos/preston.js`** (gallery `preston`)
`prestonDiagram(parent)`, **`kits/ccos/ruler.js`** (gallery `ruler`) `rulerDiagram(parent, { rows, thumbs, generic })`.
Their times are those of the CCOS explainer. Give them beats, as `tilt.js` has, before using them in another video.

## Adding a module

Only when a video needs it, in the kit it belongs to. It takes shared colors from the theme, its times as beats, and gets
a gallery scene, a still that was looked at (`node tools/gallery.mjs --accept name`), and a paragraph here. `npm test`
fails while one of these is missing.
