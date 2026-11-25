// Light on a mirror: a round concave mirror whose surface error is a height map, and a bundle of parallel
// rays reflected from that same surface. The mirror's displayed shape is z = uZ0 + sag(r) + uK (h - uHref), with
// sag(r) = r^2 / (4 f) (a paraboloid that focuses parallel light at height f) and h the error in nm, so uK (mm per nm)
// is the exaggeration. The rays use the same numbers on the CPU: each ray meets the surface where it is drawn, its
// normal comes from the same sag and the same height array, and it is reflected (d' = d - 2 (d . n) n) up to the focal
// plane. The focus spot is drawn with the RMS spread of a dense grid of rays, so its size is computed, not chosen.
import * as THREE from 'three';
import { GLSL_COMMON, vec3srgb, rgb01, heightTexture, lutTexture, theme } from '../../core/core.js';
import { GLSL_LIGHT, LIGHT } from '../../core/light.js';

const DISH_VERT = /* glsl */`
precision highp float; precision highp sampler2D;
uniform sampler2D uH; uniform int uN; uniform float uDx; uniform vec2 uC; uniform float uR; uniform float uF;
uniform float uK; uniform float uZ0; uniform float uHref; uniform float uSag;
attribute vec2 aIJ;
varying float vH; varying vec3 vN; varying vec3 vW;
float hAt(int c, int r){ return texelFetch(uH, ivec2(clamp(c, 0, uN - 1), clamp(r, 0, uN - 1)), 0).r; }
float sagAt(vec2 p){ vec2 q = p - uC; return uSag * dot(q, q) / (4.0 * uF); }
void main(){
  int c = int(aIJ.x + 0.5), r = int(aIJ.y + 0.5);
  float h = hAt(c, r);
  float dhdx = (hAt(c + 1, r) - hAt(c - 1, r)) / (2.0 * uDx);
  float dhdy = (hAt(c, r - 1) - hAt(c, r + 1)) / (2.0 * uDx);       // row 0 is the largest y
  vec2 q = position.xy - uC;
  float dzdx = uSag * q.x / (2.0 * uF) + uK * dhdx, dzdy = uSag * q.y / (2.0 * uF) + uK * dhdy;
  vN = normalize(vec3(-dzdx, -dzdy, 1.0));
  vH = h;
  vec4 w = modelMatrix * vec4(position.xy, uZ0 + sagAt(position.xy) + uK * (h - uHref), 1.0);
  vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
const DISH_FRAG = GLSL_COMMON + GLSL_LIGHT + /* glsl */`
uniform sampler2D uLut; uniform float uCref; uniform float uClim; uniform float uColorMix; uniform vec3 uNeutral;
uniform vec2 uC; uniform float uR; uniform float uOpacity; uniform float uSheen;
uniform vec3 uSpotPos; uniform float uSpotR; uniform float uSpotAmp; uniform vec3 uSpotCol;
varying float vH; varying vec3 vN; varying vec3 vW;
void main(){
  if (length(vW.xy - uC) > uR) discard;
  float s = clamp(0.5 + 0.5 * (vH - uCref) / uClim, 0.0, 1.0);
  vec3 cmap = srgb2lin(texture(uLut, vec2((s * 255.0 + 0.5) / 256.0, 0.5)).rgb);
  vec3 base = mix(srgb2lin(uNeutral), cmap, uColorMix);
  vec3 n = normalize(vN);
  vec3 col = shade(base, n, vW);
  vec3 V = normalize(cameraPosition - vW);
  col += uSheen * pow(1.0 - max(dot(n, V), 0.0), 3.0) * vec3(0.55, 0.6, 0.68);   // a mirror's grazing sheen
  float d = length(vW.xy - uSpotPos.xy);
  float g = uSpotAmp * exp(-0.5 * d * d / max(uSpotR * uSpotR, 1e-6));            // the tool's contact, lit
  col = mix(col, srgb2lin(uSpotCol), clamp(0.55 * g, 0.0, 0.6));
  vec3 o = lin2srgb(col) + (hash12(gl_FragCoord.xy) - 0.5) / 255.0;
  gl_FragColor = vec4(o, uOpacity);
}`;
const RIM_VERT = /* glsl */`
precision highp float; precision highp sampler2D;
uniform sampler2D uH; uniform int uN; uniform float uDx; uniform vec2 uC; uniform float uR; uniform float uF;
uniform float uK; uniform float uZ0; uniform float uHref; uniform float uSag; uniform float uBase; uniform float uX0; uniform float uY1;
attribute float aTop;
varying vec3 vW; varying vec3 vN2;
float hAt(int c, int r){ return texelFetch(uH, ivec2(clamp(c, 0, uN - 1), clamp(r, 0, uN - 1)), 0).r; }
float hBil(vec2 p){
  float fc = (p.x - uX0) / uDx, fr = (uY1 - p.y) / uDx;
  int c = int(floor(fc)), r = int(floor(fr)); float a = fc - float(c), b = fr - float(r);
  return mix(mix(hAt(c, r), hAt(c + 1, r), a), mix(hAt(c, r + 1), hAt(c + 1, r + 1), a), b);
}
void main(){
  vec2 q = position.xy - uC;
  vec2 pin = uC + q * (1.0 - 1.2 * uDx / uR);                         // sample just inside the rim
  float zt = uZ0 + uSag * dot(q, q) / (4.0 * uF) + uK * (hBil(pin) - uHref);
  float z = aTop > 0.5 ? zt : uBase;
  vec4 w = modelMatrix * vec4(position.xy, z, 1.0);
  vW = w.xyz; vN2 = normalize(vec3(q, 0.0));
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
const RIM_FRAG = GLSL_COMMON + GLSL_LIGHT + /* glsl */`
uniform vec3 uWallCol; uniform float uOpacity;
varying vec3 vW; varying vec3 vN2;
void main(){
  vec3 col = shade(srgb2lin(uWallCol), normalize(vN2), vW);
  gl_FragColor = vec4(lin2srgb(col) + (hash12(gl_FragCoord.xy) - 0.5) / 255.0, uOpacity);
}`;

export class DishMirror {
  /** n x n heights (nm) at dx mm, centred at center; radius R (mm); focal length f (mm); base z of the body (mm) */
  constructor({ n, dx, R, f, center = [0, 0], base = -30, lut = lutTexture(), neutral = theme.object.dish, wall = theme.object.dishWall }) {
    Object.assign(this, { n, dx, R, f, center, base });
    this.tex = heightTexture(n, n); this.h = this.tex.image.data;
    this.x0 = center[0] - (n - 1) * dx / 2; this.y1 = center[1] + (n - 1) * dx / 2;
    const shared = {
      uH: { value: this.tex }, uN: { value: n }, uDx: { value: dx }, uC: { value: new THREE.Vector2(...center) }, uR: { value: R },
      uF: { value: f }, uK: { value: 1e-9 }, uZ0: { value: 0 }, uHref: { value: 0 }, uSag: { value: 1 }, uOpacity: { value: 1 },
    };
    this.u = shared;
    const pos = new Float32Array(n * n * 3), ij = new Float32Array(n * n * 2);
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const i = r * n + c; pos[3 * i] = this.x0 + c * dx; pos[3 * i + 1] = this.y1 - r * dx; ij[2 * i] = c; ij[2 * i + 1] = r;
    }
    const idx = [];
    const inR = (c, r) => Math.hypot(this.x0 + c * dx - center[0], this.y1 - r * dx - center[1]) <= R + 1.5 * dx;
    for (let r = 0; r < n - 1; r++) for (let c = 0; c < n - 1; c++) {
      if (!(inR(c, r) || inR(c + 1, r + 1))) continue;
      const a = r * n + c, b = a + 1, d = a + n, e = d + 1; idx.push(a, d, b, b, d, e);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aIJ', new THREE.BufferAttribute(ij, 2)); g.setIndex(idx);
    this.topU = Object.assign({}, shared, LIGHT, {
      uLut: { value: lut }, uCref: { value: 0 }, uClim: { value: 10 }, uColorMix: { value: 0 }, uNeutral: { value: vec3srgb(neutral) },
      uSheen: { value: 0.35 }, uSpotPos: { value: new THREE.Vector3() }, uSpotR: { value: 5 }, uSpotAmp: { value: 0 }, uSpotCol: { value: vec3srgb(theme.light.contact) },
    });
    this.topU.uSpec = { value: 0.30 }; this.topU.uShin = { value: 90.0 };
    this.topMat = new THREE.ShaderMaterial({ vertexShader: DISH_VERT, fragmentShader: DISH_FRAG, uniforms: this.topU, side: THREE.DoubleSide });
    this.top = new THREE.Mesh(g, this.topMat); this.top.frustumCulled = false;
    // rim wall and bottom
    const M = 240, rp = [], rt = [], ri = [];
    for (let k = 0; k <= M; k++) { const a = 2 * Math.PI * k / M, x = center[0] + R * Math.cos(a), y = center[1] + R * Math.sin(a); rp.push(x, y, 0, x, y, 0); rt.push(1, 0); }
    for (let k = 0; k < M; k++) { const a = 2 * k; ri.push(a, a + 1, a + 2, a + 2, a + 1, a + 3); }
    const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3)); rg.setAttribute('aTop', new THREE.Float32BufferAttribute(rt, 1)); rg.setIndex(ri);
    this.rimU = Object.assign({}, shared, LIGHT, { uBase: { value: base }, uX0: { value: this.x0 }, uY1: { value: this.y1 }, uWallCol: { value: vec3srgb(wall) } });
    this.rimMat = new THREE.ShaderMaterial({ vertexShader: RIM_VERT, fragmentShader: RIM_FRAG, uniforms: this.rimU, side: THREE.DoubleSide });
    this.rim = new THREE.Mesh(rg, this.rimMat); this.rim.frustumCulled = false;
    this.bottom = new THREE.Mesh(new THREE.CircleGeometry(R, 120), new THREE.MeshBasicMaterial({ color: '#1a2028', transparent: true }));
    this.bottom.position.set(center[0], center[1], base); this.bottom.frustumCulled = false;
    this.group = new THREE.Group(); this.group.add(this.top, this.rim, this.bottom);
  }
  upload() { this.tex.needsUpdate = true; }
  set opacity(o) {
    this.u.uOpacity.value = o;
    const tr = o < 0.999;
    for (const m of [this.topMat, this.rimMat, this.bottom.material]) { m.transparent = tr; m.depthWrite = !tr || o > 0.5; }
    this.bottom.material.opacity = o;
    this.group.visible = o > 0.001;
  }
  /** bilinear height (nm) at world (x, y) */
  heightAt(x, y) {
    const n = this.n, fc = (x - this.x0) / this.dx, fr = (this.y1 - y) / this.dx;
    const c = Math.max(0, Math.min(n - 2, Math.floor(fc))), r = Math.max(0, Math.min(n - 2, Math.floor(fr)));
    const a = Math.max(0, Math.min(1, fc - c)), b = Math.max(0, Math.min(1, fr - r)), h = this.h;
    return (h[r * n + c] * (1 - a) + h[r * n + c + 1] * a) * (1 - b) + (h[(r + 1) * n + c] * (1 - a) + h[(r + 1) * n + c + 1] * a) * b;
  }
  /** displayed z (mm) and its slopes at world (x, y), with the current uniforms */
  surface(x, y) {
    const u = this.u, e = this.dx, qx = x - this.center[0], qy = y - this.center[1], s = u.uSag.value, K = u.uK.value;
    const z = u.uZ0.value + s * (qx * qx + qy * qy) / (4 * this.f) + K * (this.heightAt(x, y) - u.uHref.value);
    const dzdx = s * qx / (2 * this.f) + K * (this.heightAt(x + e, y) - this.heightAt(x - e, y)) / (2 * e);
    const dzdy = s * qy / (2 * this.f) + K * (this.heightAt(x, y + e) - this.heightAt(x, y - e)) / (2 * e);
    return { z, dzdx, dzdy };
  }
}

// ---- glowing ray segments: thin cores plus wide faint halos, additive, as instanced cylinders
const SEG_VERT = /* glsl */`
attribute vec4 aCol; varying vec4 vCol; varying vec2 vUv;
void main(){ vCol = aCol; vUv = uv; gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0); }`;
const SEG_FRAG = /* glsl */`
uniform float uOpacity; uniform float uSoft; varying vec4 vCol; varying vec2 vUv;
void main(){
  float a = vCol.a * uOpacity;
  if (uSoft > 0.0) { float x = abs(vUv.x - 0.5) * 2.0; a *= exp(-3.0 * x * x); }
  if (a < 0.003) discard;
  gl_FragColor = vec4(vCol.rgb * a, a);
}`;
export class Segs {
  constructor({ scene, n, radius, soft = 0, renderOrder = 11 }) {
    const g = new THREE.CylinderGeometry(1, 1, 1, 12, 1, true); g.rotateX(Math.PI / 2); g.translate(0, 0, 0.5);   // unit tube along +z from 0 to 1
    this.col = new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4); g.setAttribute('aCol', this.col);
    this.u = { uOpacity: { value: 1 }, uSoft: { value: soft } };
    this.mat = new THREE.ShaderMaterial({ vertexShader: SEG_VERT, fragmentShader: SEG_FRAG, uniforms: this.u, transparent: true, depthWrite: false,
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, side: THREE.DoubleSide });
    this.mesh = new THREE.InstancedMesh(g, this.mat, n); this.mesh.frustumCulled = false; this.mesh.renderOrder = renderOrder;
    this.n = n; this.r = radius; this.used = 0;
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._s = new THREE.Vector3(); this._a = new THREE.Vector3(); this._d = new THREE.Vector3();
    this._z = new THREE.Vector3(0, 0, 1); this._hid = new THREE.Matrix4().makeScale(0, 0, 0);
    scene.add(this.mesh);
  }
  begin() { this.used = 0; }
  add(a, b, rgb, alpha, r = this.r) {
    if (this.used >= this.n || alpha < 0.003) return;
    this._a.set(a[0], a[1], a[2]); this._d.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const L = this._d.length(); if (L < 1e-6) return;
    this._q.setFromUnitVectors(this._z, this._d.divideScalar(L));
    this._s.set(r, r, L); this._m.compose(this._a, this._q, this._s);
    const i = this.used++; this.mesh.setMatrixAt(i, this._m); this.col.setXYZW(i, rgb[0], rgb[1], rgb[2], alpha);
  }
  end() {
    for (let i = this.used; i < this.n; i++) this.mesh.setMatrixAt(i, this._hid);
    this.mesh.instanceMatrix.needsUpdate = true; this.col.needsUpdate = true; this.mesh.visible = this.used > 0;
  }
}

const SPRITE_VERT = /* glsl */`
uniform vec3 uPos; uniform float uSize; varying vec2 vUv;
void main(){
  vUv = uv;
  vec4 mv = viewMatrix * vec4(uPos, 1.0);
  mv.xy += position.xy * uSize;
  gl_Position = projectionMatrix * mv;
}`;
const SPRITE_FRAG = /* glsl */`
uniform vec3 uCol; uniform float uAmp; varying vec2 vUv;
void main(){
  vec2 d = (vUv - 0.5) * 2.0; float r2 = dot(d, d);
  float a = uAmp * (exp(-4.0 * r2) + 0.6 * exp(-40.0 * r2));
  if (a < 0.003) discard;
  gl_FragColor = vec4(uCol * a, a);
}`;
/** an additive glowing disc that always faces the camera; size = full width (mm) */
export class GlowSprite {
  constructor({ scene, color = theme.light.ray, renderOrder = 12 }) {
    this.u = { uPos: { value: new THREE.Vector3() }, uSize: { value: 10 }, uCol: { value: vec3srgb(color) }, uAmp: { value: 0 } };
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({ vertexShader: SPRITE_VERT, fragmentShader: SPRITE_FRAG, uniforms: this.u,
      transparent: true, depthWrite: false, depthTest: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor }));
    this.mesh.frustumCulled = false; this.mesh.renderOrder = renderOrder; scene.add(this.mesh);
  }
  set(p, size, amp) { this.u.uPos.value.set(p[0], p[1], p[2]); this.u.uSize.value = size; this.u.uAmp.value = amp; this.mesh.visible = amp > 0.003; }
}

const WARM = rgb01(theme.light.rayCore);
/**
 * Parallel rays coming straight down (-z) onto a DishMirror, reflected to its focal plane.
 * xs: the drawn rays (a fan in the plane y = y0); the spot uses a dense grid of rays over the whole aperture.
 */
export class RayBundle {
  constructor({ scene, dish, xs, y0 = 0, zTop, spacing = 12 }) {
    Object.assign(this, { dish, xs, y0, zTop });
    this.core = new Segs({ scene, n: 2 * xs.length + 4, radius: 0.55 });
    this.halo = new Segs({ scene, n: 2 * xs.length + 4, radius: 3.2, soft: 1, renderOrder: 10 });
    this.dots = new Segs({ scene, n: xs.length, radius: 1.6, renderOrder: 12 });
    this.spot = new GlowSprite({ scene });
    this.grid = [];
    const { R, center } = dish;
    for (let y = -R; y <= R; y += spacing) for (let x = -R; x <= R; x += spacing) if (Math.hypot(x, y) <= R - 4) this.grid.push([center[0] + x, center[1] + y]);
    this.spread = 0; this.centroid = [0, 0, 0];
  }
  /** trace one ray from above (x, y): hit point and the point where it crosses z = zf (or null if it goes down) */
  trace(x, y, zf) {
    const s = this.dish.surface(x, y);
    let nx = -s.dzdx, ny = -s.dzdy, nz = 1; const L = Math.hypot(nx, ny, nz); nx /= L; ny /= L; nz /= L;
    const dn = -nz;                                                     // d = (0, 0, -1)
    const rx = -2 * dn * nx, ry = -2 * dn * ny, rz = -1 - 2 * dn * nz;
    const hit = [x, y, s.z];
    if (rz <= 1e-6) return { hit, out: null, dir: [rx, ry, rz] };
    const k = (zf - s.z) / rz;
    return { hit, out: [x + rx * k, y + ry * k, zf], dir: [rx, ry, rz] };
  }
  /**
   * draw: o = opacity of the rays; inT 0..1 = how far the incoming rays have come down; outT 0..1 = how far the reflected
   * rays have gone toward the focal plane; extend (mm) = how far they continue past it
   */
  update({ o = 1, inT = 1, outT = 1, extend = 30, spotAmp = 1 }) {
    const d = this.dish, zf = d.u.uZ0.value + d.f;
    this.core.begin(); this.halo.begin(); this.dots.begin();
    // spot statistics from the dense grid
    let sx = 0, sy = 0, m = 0; const pts = [];
    for (const [x, y] of this.grid) { const r = this.trace(x, y, zf); if (r.out) { pts.push(r.out); sx += r.out[0]; sy += r.out[1]; m++; } }
    sx /= Math.max(m, 1); sy /= Math.max(m, 1);
    let v = 0; for (const p of pts) v += (p[0] - sx) ** 2 + (p[1] - sy) ** 2;
    this.spread = Math.sqrt(v / Math.max(m, 1)); this.centroid = [sx, sy, zf];
    if (o > 0.003) {
      for (const x of this.xs) {
        const r = this.trace(x, this.y0, zf);
        const zIn = this.zTop + (r.hit[2] - this.zTop) * Math.min(1, inT);
        this.core.add([x, this.y0, this.zTop], [x, this.y0, zIn], WARM, 0.85 * o);
        this.halo.add([x, this.y0, this.zTop], [x, this.y0, zIn], WARM, 0.10 * o);
        if (inT >= 1 && outT > 0 && r.out) {
          const L = Math.hypot(r.out[0] - r.hit[0], r.out[1] - r.hit[1], r.out[2] - r.hit[2]);
          const ext = Math.min(1, outT) * (L + extend), u = ext / L;
          const e = [r.hit[0] + (r.out[0] - r.hit[0]) * u, r.hit[1] + (r.out[1] - r.hit[1]) * u, r.hit[2] + (r.out[2] - r.hit[2]) * u];
          this.core.add(r.hit, e, WARM, 0.85 * o);
          this.halo.add(r.hit, e, WARM, 0.10 * o);
          if (outT >= 0.98) this.dots.add([r.out[0], r.out[1], r.out[2] - 0.8], [r.out[0], r.out[1], r.out[2] + 0.8], [1, 0.97, 0.9], 0.9 * o * (outT - 0.98) / 0.02);
        }
      }
    }
    this.core.end(); this.halo.end(); this.dots.end();
    const reach = inT >= 1 ? Math.min(1, outT) : 0;
    this.spot.set(this.centroid, Math.max(9, 4.0 * this.spread), o * spotAmp * reach ** 3 * (1.1 / (1 + this.spread / 25)));
    return this.spread;
  }
}
