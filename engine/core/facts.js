// Where the numbers come from. Every number on screen is one of these, and check_text.mjs looks for any that is not.
//   a fact      facts.html('F9') in HTML, facts.tspan('F9') in SVG. Both print what facts.json says under "shown"
//   a drawing   drawn('× 40,000', 'exaggeration'): a number that comes from the picture itself, such as a scale, a counter
//               or an axis. The reason is kept, so a reader of the page can see why it needs no source
// In a caption of script.json, {F9} stands for the fact.
import { getJSON } from './core.js';

export class Facts {
  constructor(d) { this.rows = new Map(d.facts.map(f => [f.id, f])); }
  get(id) {
    const f = this.rows.get(id);
    if (!f) throw new Error(`no fact "${id}" in facts.json`);
    return f;
  }
  value(id) { return this.get(id).value; }
  shown(id) { return this.get(id).shown; }
  html(id) { return `<span data-fact="${id}">${this.shown(id)}</span>`; }
  tspan(id) { return `<tspan data-fact="${id}">${this.shown(id)}</tspan>`; }
  /** put facts into a text at each {id} */
  fill(text, svg = false) { return text.replace(/\{([A-Za-z][\w-]*)\}/g, (_, id) => (svg ? this.tspan(id) : this.html(id))); }
}
export const loadFacts = async base => new Facts(await getJSON(base + 'facts.json'));

const esc = s => String(s).replace(/"/g, '&quot;');
export const drawn = (html, why) => `<span data-drawn="${esc(why)}">${html}</span>`;
export const drawnSvg = (text, why) => `<tspan data-drawn="${esc(why)}">${text}</tspan>`;
