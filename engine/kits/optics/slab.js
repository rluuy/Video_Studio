// A slab whose top surface is a height map. Heights (nm) live in a float texture and the
// vertex shader turns them into geometry: z = uZ0 + uK (h - uHref), so uK (mm per nm) is the on-screen
// exaggeration and h = uHref stays at z = uZ0 while the exaggeration changes. Normals come from the same
// texture by central differences, so the shading always matches the displayed (exaggerated) relief.
// Color: the signed map of (h - uCref) / uClim, white at uCref. Walls are neutral glass, optionally colored above a
// level (the "still to remove" band) and marked with a thin line at the target level.
import * as THREE from 'three';
import { GLSL_COMMON, vec3srgb, heightTexture, lutTexture, theme } from '../../core/core.js';
import { GLSL_GLOW, glowUniforms } from '../../core/glow.js';
import { GLSL_LIGHT, LIGHT } from '../../core/light.js';

const VERT_COMMON = /* glsl */`
precision highp float; precision highp sampler2D;
uniform sampler2D uH; uniform int uNx; uniform int uNy; uniform float uDx;
uniform float uK; uniform float uZ0; uniform float uHref; uniform float uFloorZ;
float zOf(float h){ return max(uZ0 + uK * (h - uHref), uFloorZ); }   // never below the drawn bottom of the slab
float hAt(int c, int r){ return texelFetch(uH, ivec2(clamp(c, 0, uNx - 1), clamp(r, 0, uNy - 1)), 0).r; }
`;

const TOP_VERT = VERT_COMMON + /* glsl */`
attribute vec2 aIJ; uniform sampler2D uRec; uniform int uNSpan;
varying float vH; varying vec3 vN; varying vec3 vW; varying float vRec;
void main(){
  int c = int(aIJ.x + 0.5), r = int(aIJ.y + 0.5);
  float h = hAt(c, r);
  int cl = max(c - uNSpan, 0), cr = min(c + uNSpan, uNx - 1), ru = max(r - uNSpan, 0), rd = min(r + uNSpan, uNy - 1);
  float dzdx = (zOf(hAt(cr, r)) - zOf(hAt(cl, r))) / (float(cr - cl) * uDx);
  float dzdy = (zOf(hAt(c, ru)) - zOf(hAt(c, rd))) / (float(rd - ru) * uDx);   // row 0 is the largest y
  vN = normalize(vec3(-dzdx, -dzdy, 1.0));
  vH = h; vRec = texelFetch(uRec, ivec2(c, r), 0).r;
  vec4 w = modelMatrix * vec4(position.xy, zOf(h), 1.0);
  vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const TOP_FRAG = GLSL_COMMON + GLSL_GLOW + GLSL_LIGHT + /* glsl */`
uniform sampler2D uLut; uniform float uCref; uniform float uClim; uniform float uColorMix; uniform vec3 uNeutral;
uniform float uSecOn; uniform float uSecY; uniform float uSecX0; uniform float uSecX1; uniform float uDash; uniform vec3 uSecCol;
uniform float uOpacity; uniform float uRecAmp; uniform float uRecNorm;
varying float vH; varying vec3 vN; varying vec3 vW; varying float vRec;
void main(){
  float s = clamp(0.5 + 0.5 * (vH - uCref) / uClim, 0.0, 1.0);
  vec3 cmap = srgb2lin(texture(uLut, vec2((s * 255.0 + 0.5) / 256.0, 0.5)).rgb);
  vec3 base = mix(srgb2lin(uNeutral), cmap, uColorMix);
  vec3 col = shade(base, normalize(vN), vW);
  float g = uGlowAmp * footprint(vW.xy); vec3 gc = srgb2lin(uGlowCol);
  col = mix(col, gc * 0.85, clamp(0.6 * g, 0.0, 0.62)) + gc * 0.22 * g;
  if (uRecAmp > 0.0) {                      // glass removed during the last seconds of beam time
    float gr = uRecAmp * pow(clamp(vRec / uRecNorm, 0.0, 1.0), 0.8);
    col = mix(col, gc * 0.8, 0.42 * gr) + gc * 0.10 * gr;
  }
  if (uSecOn > 0.0) {                       // dashed section line along x at y = uSecY
    float dy = abs(vW.y - uSecY), w = 0.16, aa = fwidth(vW.y) * 1.2;
    float line = 1.0 - smoothstep(w - aa, w + aa, dy);
    float dash = step(0.5, fract((vW.x - uSecX0) / uDash));
    float inx = step(uSecX0, vW.x) * step(vW.x, uSecX1);
    col = mix(col, srgb2lin(uSecCol), uSecOn * line * dash * inx);
  }
  vec3 o = lin2srgb(col) + (hash12(gl_FragCoord.xy) - 0.5) / 255.0;
  gl_FragColor = vec4(o, uOpacity);
}`;

const WALL_VERT = VERT_COMMON + /* glsl */`
attribute vec2 aIJ; attribute float aTop;
uniform float uBase;
varying vec3 vW; varying vec3 vN2;
void main(){
  int c = int(aIJ.x + 0.5), r = int(aIJ.y + 0.5);
  float z = aTop > 0.5 ? zOf(hAt(c, r)) : uBase;
  vec4 w = modelMatrix * vec4(position.xy, z, 1.0);
  vW = w.xyz; vN2 = normal;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const WALL_FRAG = GLSL_COMMON + GLSL_LIGHT + /* glsl */`
uniform sampler2D uLut; uniform float uCref; uniform float uClim;
uniform float uK; uniform float uZ0; uniform float uHref;
uniform float uWallTint; uniform float uPlaneH; uniform vec3 uWallCol;
uniform float uLineOn; uniform float uLineZ; uniform vec3 uLineCol; uniform float uOpacity; uniform float uZoff;
varying vec3 vW; varying vec3 vN2;
void main(){
  float zl = vW.z - uZoff;
  float h = uHref + (zl - uZ0) / max(uK, 1e-12);           // nm level of this point of the wall
  vec3 base = srgb2lin(uWallCol);
  if (uWallTint > 0.0 && h > uPlaneH) {
    float s = clamp(0.5 + 0.5 * (h - uCref) / uClim, 0.0, 1.0);
    vec3 cmap = srgb2lin(texture(uLut, vec2((s * 255.0 + 0.5) / 256.0, 0.5)).rgb);
    base = mix(base, cmap * 0.92, uWallTint);
  }
  vec3 col = shade(base, normalize(vN2), vW);
  if (uLineOn > 0.0) {
    float aa = fwidth(zl) * 1.2, d = abs(zl - uLineZ);
    col = mix(col, srgb2lin(uLineCol), uLineOn * (1.0 - smoothstep(0.11 - aa, 0.11 + aa, d)));
  }
  vec3 o = lin2srgb(col) + (hash12(gl_FragCoord.xy) - 0.5) / 255.0;
  gl_FragColor = vec4(o, uOpacity);
}`;

export class HeightSlab {
  /**
   * nx, ny: texels; dx: pixel pitch (mm); center: [x, y] world mm; base: z of the slab bottom (mm)
   * glow: {tex, ext}; lut: DataTexture (the signed map if left out)
   */
  constructor({ nx, ny, dx, center = [0, 0], base = -5, glow = null, lut = lutTexture(), neutral = theme.object.neutral, wall = theme.object.wall }) {
    Object.assign(this, { nx, ny, dx, center, base });
    this.tex = heightTexture(nx, ny);
    this.h = this.tex.image.data;
    this.recTex = heightTexture(nx, ny);
    this.rec = this.recTex.image.data;
    this.x0 = center[0] - (nx - 1) * dx / 2; this.y1 = center[1] + (ny - 1) * dx / 2;
    this.group = new THREE.Group();
    const shared = {
      uH: { value: this.tex }, uNx: { value: nx }, uNy: { value: ny }, uDx: { value: dx },
      uK: { value: 1e-6 }, uZ0: { value: 0 }, uHref: { value: 0 }, uFloorZ: { value: base + 0.25 },
      uLut: { value: lut }, uCref: { value: 0 }, uClim: { value: 300 }, uOpacity: { value: 1 },
    };
    this.u = shared;
    // top surface
    const pos = new Float32Array(nx * ny * 3), ij = new Float32Array(nx * ny * 2);
    for (let r = 0; r < ny; r++) for (let c = 0; c < nx; c++) {
      const i = r * nx + c;
      pos[3 * i] = this.x0 + c * dx; pos[3 * i + 1] = this.y1 - r * dx; pos[3 * i + 2] = 0;
      ij[2 * i] = c; ij[2 * i + 1] = r;
    }
    const idx = new Uint32Array((nx - 1) * (ny - 1) * 6);
    let k = 0;
    for (let r = 0; r < ny - 1; r++) for (let c = 0; c < nx - 1; c++) {
      const a = r * nx + c, b = a + 1, d = a + nx, e = d + 1;
      idx[k++] = a; idx[k++] = d; idx[k++] = b; idx[k++] = b; idx[k++] = d; idx[k++] = e;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aIJ', new THREE.BufferAttribute(ij, 2));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(center[0], center[1], 0), Math.hypot(nx * dx, ny * dx) + 100);
    this.topU = Object.assign({}, shared, LIGHT, glowUniforms(glow), {
      uColorMix: { value: 0 }, uNeutral: { value: vec3srgb(neutral) },
      uRec: { value: this.recTex }, uRecAmp: { value: 0 }, uRecNorm: { value: 20 }, uNSpan: { value: 1 },
      uSecOn: { value: 0 }, uSecY: { value: 0 }, uSecX0: { value: 0 }, uSecX1: { value: 0 }, uDash: { value: 1.2 }, uSecCol: { value: vec3srgb('#ffffff') },
    });
    this.topMat = new THREE.ShaderMaterial({ vertexShader: TOP_VERT, fragmentShader: TOP_FRAG, uniforms: this.topU, side: THREE.DoubleSide });
    this.top = new THREE.Mesh(g, this.topMat); this.top.frustumCulled = false;
    this.group.add(this.top);
    // walls
    const wp = [], wij = [], wt = [], wn = [], wi = [];
    const strip = (cells, nrm) => {
      const start = wp.length / 3;
      cells.forEach(([c, r]) => {
        const x = this.x0 + c * dx, y = this.y1 - r * dx;
        for (const top of [1, 0]) { wp.push(x, y, 0); wij.push(c, r); wt.push(top); wn.push(...nrm); }
      });
      for (let i = 0; i < cells.length - 1; i++) {
        const a = start + 2 * i, b = a + 1, c2 = a + 2, d = a + 3;
        wi.push(a, b, c2, c2, b, d);
      }
    };
    const rowCells = r => Array.from({ length: nx }, (_, c) => [c, r]);
    const colCells = c => Array.from({ length: ny }, (_, r) => [c, r]);
    strip(rowCells(0), [0, 1, 0]); strip(rowCells(ny - 1), [0, -1, 0]);
    strip(colCells(0), [-1, 0, 0]); strip(colCells(nx - 1), [1, 0, 0]);
    const wg = new THREE.BufferGeometry();
    wg.setAttribute('position', new THREE.Float32BufferAttribute(wp, 3));
    wg.setAttribute('aIJ', new THREE.Float32BufferAttribute(wij, 2));
    wg.setAttribute('aTop', new THREE.Float32BufferAttribute(wt, 1));
    wg.setAttribute('normal', new THREE.Float32BufferAttribute(wn, 3));
    wg.setIndex(wi);
    this.wallU = Object.assign({}, shared, LIGHT, {
      uBase: { value: base }, uWallTint: { value: 0 }, uPlaneH: { value: 1e9 }, uWallCol: { value: vec3srgb(wall) },
      uLineOn: { value: 0 }, uLineZ: { value: 0 }, uLineCol: { value: vec3srgb('#e9edf2') }, uZoff: { value: 0 },
    });
    this.wallMat = new THREE.ShaderMaterial({ vertexShader: WALL_VERT, fragmentShader: WALL_FRAG, uniforms: this.wallU, side: THREE.DoubleSide });
    this.walls = new THREE.Mesh(wg, this.wallMat); this.walls.frustumCulled = false;
    this.group.add(this.walls);
  }
  /** world position of texel (c, r) */
  xy(c, r) { return [this.x0 + c * this.dx, this.y1 - r * this.dx]; }
  upload(rec = false) { this.tex.needsUpdate = true; if (rec) this.recTex.needsUpdate = true; }
  /** displayed z (mm) at world (x, y), or null outside the slab */
  zAt(x, y) {
    const c = Math.round((x - this.x0) / this.dx), r = Math.round((this.y1 - y) / this.dx);
    if (c < 0 || r < 0 || c >= this.nx || r >= this.ny) return null;
    return this.zOf(this.h[r * this.nx + c]);
  }
  set opacity(o) {
    this.u.uOpacity.value = o;
    const tr = o < 0.999;
    for (const m of [this.topMat, this.wallMat]) { m.transparent = tr; m.depthWrite = !tr || o > 0.5; }
    this.group.visible = o > 0.001;
  }
  /** displayed z (mm) of height h (nm) */
  zOf(h) { return this.u.uZ0.value + this.u.uK.value * (h - this.u.uHref.value); }
}
