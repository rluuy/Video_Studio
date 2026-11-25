// theme.json and luts.json: the inks, the accents, the two color maps and the type sizes.
import { LUT, theme } from '../engine/core/core.js';
import { C, layer, text } from '../engine/core/draw.js';
import { colorBar, svg } from '../engine/core/ui.js';
import { stage } from './_stage.js';

export const stills = [1];
export async function create() {
  const s = stage('The look', 'Colors, fonts and sizes come from engine/theme.json');
  const g = layer(document.getElementById('ui'));
  const swatches = (y, name, obj) => {
    text(g, 96, y + 32, name, { size: 22, fill: C.sub });
    Object.entries(obj).filter(([, v]) => typeof v === 'string' && v.startsWith('#')).forEach(([k, v], i) => {
      svg('rect', { x: 260 + i * 160, y, width: 140, height: 46, rx: 6, fill: v, stroke: C.rule }, g);
      text(g, 260 + i * 160, y + 72, k, { size: 18, fill: C.dim });
    });
  };
  swatches(220, 'ink', theme.ink); swatches(324, 'accent', theme.accent); swatches(428, 'light', theme.light); swatches(532, 'object', theme.object); swatches(636, 'ccos', theme.ccos);
  [['maps.signed', LUT.signed], ['maps.positive', LUT.positive]].forEach(([k, lut], i) => {
    const x = 260 + i * 700;
    colorBar({ x, y: 735, w: 614, h: 40, lut, lo: 0, hi: 1 });
    text(g, x, 808, `${k}, ${theme.maps[k.split('.')[1]]}`, { size: 18, fill: C.dim });
  });
  text(g, 96, 772, 'maps', { size: 22, fill: C.sub });
  let x = 260;
  for (const [k, v] of Object.entries(theme.type)) { text(g, x, 890, `${k} ${v}`, { size: v, fill: C.title }); x += 60 + v * 0.52 * `${k} ${v}`.length; if (x > 1800) break; }
  text(g, 96, 890, 'type', { size: 22, fill: C.sub });
  text(g, 260, 980, 'Source Sans 3, for words', { size: 28, fill: C.text });
  text(g, 760, 980, 'Source Code Pro 0123', { size: 28, fill: C.text, family: theme.font.mono });
  text(g, 1260, 980, 'STIX Two Text, θ = 2πz / λ', { size: 30, fill: C.text, family: theme.font.math, italic: true });
  return { ...s, duration: 2, update() {} };
}
