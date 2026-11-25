// When things happen. A clip asks for moments by name, so it holds no seconds of its own and the picture follows the
// voice. The moments come from timeline.json, which tools/timeline.py makes from the script and the real speech.
//   const tl = await loadTimeline(base);
//   const s = tl.scene('S0');
//   s.start, s.length                      the scene, in seconds of the video
//   s.at('magnify')                        when the line "magnify" starts, in seconds from the scene's start
//   s.at('magnify:end'), s.at('magnify.P') when it ends, and when its mark <P> is said
//   tl.now(t)                              { id, tau, start, length, index } of the scene playing at t
// A name that does not exist stops the clip, with the names that do.
import { getJSON } from './core.js';

export class Timeline {
  constructor(d) {
    Object.assign(this, { data: d, duration: d.duration, scenes: d.scenes, lines: d.lines });
    this.byId = new Map(d.scenes.map(s => [s.id, {
      id: s.id, start: s.start, length: s.length, end: s.start + s.length, chapter: s.chapter, captions: s.captions,
      at: (name, offset = 0) => {
        if (!(name in s.beats)) throw new Error(`scene ${s.id} has no beat "${name}". It has: ${Object.keys(s.beats).join(', ')}`);
        return s.beats[name] + offset;
      },
    }]));
  }
  scene(id) {
    const s = this.byId.get(id);
    if (!s) throw new Error(`no scene "${id}". The scenes are: ${[...this.byId.keys()].join(', ')}`);
    return s;
  }
  now(t) {
    let i = 0;
    while (i + 1 < this.scenes.length && t >= this.scenes[i + 1].start) i++;
    const s = this.scenes[i];
    return { id: s.id, index: i, tau: t - s.start, start: s.start, length: s.length };
  }
}
export const loadTimeline = async base => new Timeline(await getJSON(base + 'timeline.json'));
