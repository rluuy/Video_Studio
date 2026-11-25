// Schematic CCOS tools, built from primitives in the palette's greys (no logos, no makers' shapes).
// Each class has .group (placed by the clip) and update(tau, o): tau = seconds since the tool appeared, o = opacity.
// The working surface is the plane z = 0 of the group (the stage's glass patch), except where a class says otherwise.
import * as THREE from 'three';
import { Discs } from '../../core/discs.js';
import { lerp, rnd, theme } from '../../core/core.js';
import { Beam } from './beam.js';
import { BEAM } from './colors.js';

const STEEL = theme.ccos.steel, DARK = theme.ccos.dark, PITCH = theme.ccos.pitch, SLURRY = [0.86, 0.80, 0.66], WATER = theme.ccos.water;
const mat = (color, { metal = 0.15, rough = 0.55, emissive = null } = {}) => {   // no environment map here, so low metalness keeps parts lit
  const m = new THREE.MeshStandardMaterial({ color, metalness: metal, roughness: rough, transparent: true });
  if (emissive) { m.emissive = new THREE.Color(emissive); m.emissiveIntensity = 1; }
  return m;
};
const cylZ = (r0, r1, h, m, seg_ = 48) => { const g = new THREE.CylinderGeometry(r0, r1, h, seg_); g.rotateX(Math.PI / 2); const o = new THREE.Mesh(g, m); o.frustumCulled = false; return o; };
const boxM = (w, d, h, m) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, d, h), m); o.frustumCulled = false; return o; };
function fade(group, o) {
  group.visible = o > 0.004;
  group.traverse(c => { if (c.material && c.material.isMeshStandardMaterial) { c.material.opacity = o; c.material.depthWrite = o > 0.6; } });
}
const glowMat = (color, a = 0.6) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: a, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });

// ---------------------------------------------------------------- 1. pad with slurry: spins and orbits
export class PadTool {
  constructor() {
    this.group = new THREE.Group();
    this.head = new THREE.Group(); this.group.add(this.head);
    this.pad = cylZ(30, 30, 7, mat(PITCH, { metal: 0, rough: 0.85 })); this.pad.position.z = 3.6;
    this.holder = cylZ(25, 27, 12, mat(DARK)); this.holder.position.z = 13.2;
    this.mark = boxM(22, 4, 1.5, mat('#dfe4ea', { metal: 0.2 })); this.mark.position.set(12, 0, 19.6);
    this.spindle = cylZ(6, 6, 80, mat(STEEL)); this.spindle.position.z = 59;
    this.head.add(this.pad, this.holder, this.mark); this.group.add(this.spindle);
    this.grains = new Discs({ scene: this.group, n: 160, hard: 1 });
  }
  update(tau, o) {
    fade(this.group, o);
    const ph = tau * 1.2, ox = 8 * Math.cos(ph), oy = 8 * Math.sin(ph);
    this.head.position.set(ox, oy, 0); this.head.rotation.z = tau * 2.6; this.spindle.position.x = ox; this.spindle.position.y = oy;
    this.grains.begin();
    for (let k = 0; k < 160; k++) {
      const a = rnd(k, 1) * 2 * Math.PI + 0.15 * tau * (0.5 + rnd(k, 2)), r = 14 + 52 * rnd(k, 3) + 3 * Math.sin(tau * 0.9 + k);
      const x = r * Math.cos(a), y = r * Math.sin(a);
      if (Math.hypot(x - ox, y - oy) < 31) continue;                    // under the pad, hidden anyway
      this.grains.add(x, y, 1.2, 2.2 + 1.4 * rnd(k, 4), SLURRY, 0.95 * o);
    }
    this.grains.end();
  }
}

// ---------------------------------------------------------------- 2. bonnet: an inflated dome, tilted (precessed), pressed in
export class BonnetTool {
  constructor() {
    this.R = 40;
    this.group = new THREE.Group();
    this.head = new THREE.Group(); this.group.add(this.head);
    // the lower 70 percent of a sphere (an inflated membrane with cloth), closed by a holder at its neck
    const th0 = 0.3 * Math.PI, neckR = this.R * Math.sin(th0), neckZ = this.R * Math.cos(th0);
    const dg = new THREE.SphereGeometry(this.R, 64, 32, 0, Math.PI * 2, th0, Math.PI - th0); dg.rotateX(Math.PI / 2);
    const dome = new THREE.Mesh(dg, mat('#a39780', { metal: 0, rough: 0.9 })); dome.frustumCulled = false; this.head.add(dome);
    const ring = cylZ(neckR + 1.5, neckR + 1.5, 7, mat(DARK)); ring.position.z = neckZ + 3.5; this.head.add(ring);
    const sp = cylZ(7, 7, 50, mat(STEEL)); sp.position.z = neckZ + 32; this.head.add(sp);   // short, so it stays below the captions
    this.spot = new THREE.Mesh(new THREE.CircleGeometry(1, 64), glowMat('#ffe2a8', 0.55)); this.spot.position.z = 0.3; this.spot.frustumCulled = false;
    this.group.add(this.spot);
    this.depth = 1.5;
  }
  /** press: 0..1, how far the bonnet is pressed in */
  update(tau, o, press = 0) {
    fade(this.group, o);
    const tilt = 20 * Math.PI / 180, prec = tau * 1.4;
    this.depth = lerp(1.2, 11, press);
    // the dome's centre sits R - depth above the surface; tilting about that centre keeps the contact below it
    this.head.position.set(0, 0, this.R - this.depth);
    this.head.rotation.set(0, 0, 0);
    this.head.rotateZ(prec); this.head.rotateX(tilt);
    const a = Math.sqrt(Math.max(0, 2 * this.R * this.depth - this.depth * this.depth));
    this.spot.scale.set(a, a, 1); this.spot.material.opacity = 0.55 * o; this.spot.visible = o > 0.004;
    return a;
  }
}

// ---------------------------------------------------------------- 3. stressed lap: a stiff plate bent by edge actuators over a large mirror
export class StressedLapTool {
  constructor() {
    this.group = new THREE.Group();
    // a large concave mirror section below (schematic)
    const n = 60, R = 150, pos = [], idx = [];
    for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) { const x = -R + 2 * R * i / n, y = -R * 0.7 + 1.4 * R * j / n; pos.push(x, y, (x * x + y * y) / (2 * 900)); }
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const a = i * (n + 1) + j, b = a + 1, c = a + n + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
    const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); mg.setIndex(idx); mg.computeVertexNormals();
    this.mirror = new THREE.Mesh(mg, mat('#7d8b98', { metal: 0.15, rough: 0.35 })); this.mirror.frustumCulled = false; this.group.add(this.mirror);
    // the lap: a plate whose shape is set per frame, pitch pads below it, 18 actuators on its rim
    this.lap = new THREE.Group(); this.group.add(this.lap);
    this.RL = 64;
    const pg = new THREE.CylinderGeometry(this.RL, this.RL, 4, 72, 6); pg.rotateX(Math.PI / 2);
    this.plate0 = Float32Array.from(pg.attributes.position.array);
    this.plate = new THREE.Mesh(pg, mat('#e3d2a8', { metal: 0.2, rough: 0.45 })); this.plate.frustumCulled = false; this.lap.add(this.plate);
    this.posts = [];
    for (let k = 0; k < 18; k++) { const a = 2 * Math.PI * k / 18, p = boxM(5, 5, 22, mat(DARK)); p.position.set((this.RL - 3) * Math.cos(a), (this.RL - 3) * Math.sin(a), 13); this.lap.add(p); this.posts.push([p, a]); }
    const hub = cylZ(10, 10, 60, mat(STEEL)); hub.position.z = 34; this.lap.add(hub);
  }
  update(tau, o) {
    fade(this.group, o);
    const xc = 55 * Math.sin(tau * 0.45), yc = 10 * Math.sin(tau * 0.31);
    const rot = tau * 0.25;
    this.lap.position.set(xc, yc, 0); this.lap.rotation.z = rot;
    // bend the plate to the local mirror shape: the mirror's sag around (xc, yc) seen from the lap, exaggerated x 3
    const p = this.plate.geometry.attributes.position, c = Math.cos(rot), s = Math.sin(rot);
    for (let i = 0; i < p.count; i++) {
      const lx = this.plate0[3 * i], ly = this.plate0[3 * i + 1], lz = this.plate0[3 * i + 2];
      const wx = xc + c * lx - s * ly, wy = yc + s * lx + c * ly;
      const sag = (wx * wx + wy * wy) / (2 * 900) - (xc * xc + yc * yc) / (2 * 900);
      p.setXYZ(i, lx, ly, lz + 2 + sag + (xc * xc + yc * yc) / (2 * 900));
    }
    p.needsUpdate = true; this.plate.geometry.computeVertexNormals();
    for (const [post, a] of this.posts) {
      const lx = (this.RL - 3) * Math.cos(a), ly = (this.RL - 3) * Math.sin(a), wx = xc + c * lx - s * ly, wy = yc + s * lx + c * ly;
      post.position.z = 15 + (wx * wx + wy * wy) / (2 * 900);
    }
  }
}

// ---------------------------------------------------------------- 4. MRF: a wheel carries a fluid ribbon; a magnet under the contact stiffens it
// Here the part is above the wheel and dips into the ribbon (the wheel turns about the y axis, seen face-on).
export class MRFTool {
  constructor() {
    this.group = new THREE.Group();
    this.RW = 46; this.ZW = -70;                                         // wheel radius and centre height: its top is at z = -24
    this.wheel = new THREE.Group(); this.wheel.position.z = this.ZW; this.group.add(this.wheel);
    const wg = new THREE.CylinderGeometry(this.RW, this.RW, 16, 72); const w = new THREE.Mesh(wg, mat('#8d97a1', { metal: 0.2, rough: 0.45 })); w.frustumCulled = false; this.wheel.add(w);
    for (let k = 0; k < 6; k++) { const s = boxM(4, 17, this.RW * 1.7, mat(DARK)); s.rotation.y = k * Math.PI / 6; this.wheel.add(s); }
    // the ribbon on the rim, over the top half, and its stiffened part at the top
    // a torus lies in the x-y plane; turned +90 deg about x, angle theta maps to (cos theta, 0, sin theta), so 90 deg is the top
    const rg = new THREE.TorusGeometry(this.RW + 3.2, 3.6, 12, 80, Math.PI * 1.1); rg.rotateZ(Math.PI / 2 - Math.PI * 0.55);
    const rib = new THREE.Mesh(rg, mat('#8a8070', { metal: 0.1, rough: 0.6 }));
    rib.rotation.set(Math.PI / 2, 0, 0); rib.position.z = this.ZW; rib.frustumCulled = false; this.group.add(rib);
    this.rib = rib;
    const sg = new THREE.TorusGeometry(this.RW + 3.4, 4.6, 12, 30, Math.PI * 0.22); sg.rotateZ(Math.PI / 2 - Math.PI * 0.11);
    const stiff = new THREE.Mesh(sg, mat('#b0a690', { metal: 0.1, rough: 0.5 }));
    stiff.rotation.set(Math.PI / 2, 0, 0); stiff.position.z = this.ZW; stiff.frustumCulled = false; this.group.add(stiff);
    // magnet poles inside the wheel, under the contact
    const pole = (x) => { const m = boxM(14, 20, 26, mat('#4a525b', { metal: 0.3, rough: 0.5 })); m.position.set(x, 0, this.ZW + this.RW - 22); return m; };
    this.group.add(pole(-12), pole(12));
    // field lines: arcs from pole to pole through the contact
    this.lines = [];
    for (const r of [10, 16, 22]) {
      const curve = new THREE.EllipseCurve(0, 0, r, r * 1.05, 0, Math.PI, false, 0);
      const pts = curve.getPoints(40).map(p => new THREE.Vector3(p.x, -1, this.ZW + this.RW - 10 + p.y));
      const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: '#b9c6d6', transparent: true, opacity: 0.35, toneMapped: false }));
      l.frustumCulled = false; this.group.add(l); this.lines.push(l);
    }
    // the part, held above, dipping into the ribbon
    this.part = boxM(70, 50, 12, mat('#9fb0c0', { metal: 0.1, rough: 0.3 })); this.part.position.z = this.ZW + this.RW + 6.8 + 6; this.group.add(this.part);
    const holder = cylZ(12, 12, 50, mat(STEEL)); holder.position.z = this.part.position.z + 31; this.group.add(holder);
  }
  update(tau, o) {
    fade(this.group, o);
    this.wheel.rotation.y = -tau * 1.8;
    this.lines.forEach((l, k) => { l.material.opacity = 0.55 * o * (0.6 + 0.4 * Math.sin(tau * 3 + k)); l.visible = o > 0.004; });
  }
  get contactZ() { return this.ZW + this.RW + 6.8; }
}

// ---------------------------------------------------------------- 5. fluid jet: a nozzle sprays slurry straight down
export class JetTool {
  constructor() {
    this.group = new THREE.Group();
    const nz = new THREE.Mesh(new THREE.CylinderGeometry(9, 3, 26, 40), mat(STEEL)); nz.rotation.x = Math.PI / 2; nz.position.z = 40; nz.frustumCulled = false; this.group.add(nz);
    const tube = cylZ(6, 6, 70, mat(DARK)); tube.position.z = 88; this.group.add(tube);
    this.drops = new Discs({ scene: this.group, n: 260, hard: 1 });
  }
  update(tau, o) {
    fade(this.group, o);
    this.drops.begin();
    for (let k = 0; k < 260; k++) {
      const ph = (tau * 0.9 + rnd(k, 1)) % 1;                           // each drop loops: fall (0 to 0.45), then spread over the surface
      const a = rnd(k, 2) * 2 * Math.PI;
      if (ph < 0.45) { const u = ph / 0.45; this.drops.add(1.2 * Math.cos(a) * u, 1.2 * Math.sin(a) * u, 27 * (1 - u) + 0.8, 1.6, SLURRY, 0.9 * o); }
      else { const u = (ph - 0.45) / 0.55, r = 4 + 46 * u; this.drops.add(r * Math.cos(a), r * Math.sin(a), 0.9 + 3 * Math.sin(Math.PI * u) * 0.4, 1.7, SLURRY, 0.9 * o * (1 - u)); }
    }
    this.drops.end();
  }
}

// ---------------------------------------------------------------- 6. EEM: a head floods the surface with fine powder in ultrapure water
export class EEMTool {
  constructor() {
    this.group = new THREE.Group();
    const head = boxM(50, 28, 30, mat('#7d8791', { metal: 0.5, rough: 0.4 })); head.position.set(-30, 0, 23); this.group.add(head);
    const slit = boxM(4, 24, 3, mat('#20262d', { metal: 0.2, rough: 0.6 })); slit.position.set(-8, 0, 7); this.group.add(slit);
    const feed = cylZ(6, 6, 60, mat(DARK)); feed.position.set(-38, 0, 68); this.group.add(feed);
    this.sheet = new THREE.Mesh(new THREE.PlaneGeometry(86, 34), new THREE.MeshBasicMaterial({ color: WATER, transparent: true, opacity: 0.22, depthWrite: false, toneMapped: false }));
    this.sheet.position.set(35, 0, 1.6); this.sheet.frustumCulled = false; this.group.add(this.sheet);
    this.grains = new Discs({ scene: this.group, n: 220, hard: 1 });
  }
  update(tau, o) {
    fade(this.group, o);
    this.sheet.material.opacity = 0.22 * o; this.sheet.visible = o > 0.004;
    this.grains.begin();
    for (let k = 0; k < 220; k++) {
      const ph = (tau * 0.55 + rnd(k, 1)) % 1;
      const x = -8 + 84 * ph, y = -15 + 30 * rnd(k, 2) + 1.5 * Math.sin(tau * 2 + k), z = 0.9 + 1.4 * rnd(k, 3);
      this.grains.add(x, y, z, 1.1, [0.95, 0.96, 0.98], 0.85 * o * Math.min(1, ph * 8) * (1 - ph));
    }
    this.grains.end();
  }
}

// ---------------------------------------------------------------- 7. ion beam: the engine's beam column over the patch
export class IonTool {
  constructor({ renderer, origin = [0, 0, 0] }) {
    this.origin = origin;
    this.group = new THREE.Group();
    this.beam = new Beam({ scene: this.group, renderer, halfWidth: 6.0 });
    this.beam.source.scale.setScalar(2.6);
    this.spot = new THREE.Mesh(new THREE.CircleGeometry(14, 64), glowMat(BEAM, 0.45)); this.spot.position.z = 0.3; this.spot.frustumCulled = false; this.group.add(this.spot);
  }
  update(tau, o) {
    this.group.visible = o > 0.004;
    for (const m of this.beam.srcMats) { m.transparent = true; }
    const [ox, oy, oz] = this.origin;
    this.beam.update({ steps: [[ox, oy, 1]], on: o, zTop: oz + 60, zBottom: oz, src: [0, 0], srcZ: 60, srcOpacity: o, topFade: 6, botFade: 1.0, halfWidth: 6.0 });
    this.spot.material.opacity = 0.45 * o; this.spot.visible = o > 0.004;
  }
}

// ---------------------------------------------------------------- 8. plasma torch: a glowing plume of reactive gas
const PLUME_VERT = /* glsl */`varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const PLUME_FRAG = /* glsl */`
uniform float uT; uniform float uO; uniform float uH; varying vec3 vP;
void main(){
  float h = clamp(vP.z / uH, 0.0, 1.0);
  float flick = 0.85 + 0.15 * sin(uT * 23.0 + vP.z * 0.7) * sin(uT * 17.0 - vP.x * 0.9);
  vec3 c = mix(vec3(0.62, 0.55, 1.0), vec3(0.95, 0.92, 1.0), pow(h, 2.0));
  float a = uO * (0.25 + 0.6 * h) * flick;
  gl_FragColor = vec4(c * a, a);
}`;
export class PlasmaTool {
  constructor() {
    this.group = new THREE.Group();
    const body = cylZ(13, 13, 64, mat(DARK)); body.position.z = 56; this.group.add(body);
    const tip = cylZ(9, 11, 10, mat('#c9c2b4', { metal: 0.1, rough: 0.7 })); tip.position.z = 20; this.group.add(tip);
    this.H = 15;
    const pg = new THREE.CylinderGeometry(3.5, 11, this.H, 48, 8, true); pg.rotateX(Math.PI / 2); pg.translate(0, 0, this.H / 2);
    this.pu = { uT: { value: 0 }, uO: { value: 1 }, uH: { value: this.H } };
    this.plume = new THREE.Mesh(pg, new THREE.ShaderMaterial({ vertexShader: PLUME_VERT, fragmentShader: PLUME_FRAG, uniforms: this.pu, transparent: true, depthWrite: false,
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, side: THREE.DoubleSide }));
    this.plume.frustumCulled = false; this.group.add(this.plume);
    this.glow = new THREE.Mesh(new THREE.CircleGeometry(16, 64), glowMat('#a9a0ff', 0.4)); this.glow.position.z = 0.3; this.glow.frustumCulled = false; this.group.add(this.glow);
    this.gas = new Discs({ scene: this.group, n: 120, hard: 0, additive: true });
  }
  update(tau, o) {
    fade(this.group, o);
    this.pu.uT.value = tau; this.pu.uO.value = o; this.plume.visible = o > 0.004;
    this.glow.material.opacity = 0.4 * o; this.glow.visible = o > 0.004;
    this.gas.begin();
    for (let k = 0; k < 120; k++) {                                     // volatile products leave the surface and drift up and away
      const ph = (tau * 0.35 + rnd(k, 1)) % 1, a = rnd(k, 2) * 2 * Math.PI, r = 8 + 40 * ph;
      this.gas.add(r * Math.cos(a), r * Math.sin(a), 1 + 30 * ph * ph, 3.2, [0.75, 0.78, 0.86], 0.5 * o * Math.sin(Math.PI * ph));
    }
    this.gas.end();
  }
}
