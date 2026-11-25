// The look, read from theme.json and luts.json. Every other module takes its shared colors from here.
import theme from '../theme.json' with { type: 'json' };
import luts from '../luts.json' with { type: 'json' };

export { theme };
export const W = theme.frame.width, H = theme.frame.height;
export const BG = theme.frame.background;
export const INK = theme.ink;

/** colors for flat diagrams, one short object */
export const C = {
  ...theme.ink, ray: theme.light.ray,
  amber: theme.accent.amber, blue: theme.accent.blue, blueText: theme.accent.blueText, pink: theme.accent.pink, mark: theme.accent.mark,
  glass: theme.object.glass, glassDark: theme.object.glassDark,
};

/** color maps as 256 hex strings: LUT.signed (zero is white), LUT.positive (zero is dark) */
export const LUT = { signed: luts[theme.maps.signed], positive: luts[theme.maps.positive] };

/** copy the theme into CSS variables, so index.html holds no color of its own */
export function applyCss(root = document.documentElement) {
  const set = (k, v) => root.style.setProperty(k, v);
  set('--bg', BG);
  for (const [k, v] of Object.entries(theme.ink)) set(`--ink-${k}`, v);
  for (const [k, v] of Object.entries(theme.font)) set(`--font-${k}`, v);
  for (const [k, v] of Object.entries(theme.type)) set(`--type-${k}`, `${v}px`);
  set('--margin', `${theme.frame.margin}px`);
}
