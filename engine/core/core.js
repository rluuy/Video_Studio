// What every scene needs: the renderer, time helpers, colors, data loading, the camera and shared shader code.
// A scene is a pure function of its time t, so every helper here is too.
import * as THREE from 'three';
import { W, H, BG, INK, C, LUT, theme } from './theme.js';

export { W, H, BG, INK, C, LUT, theme };

export function makeRenderer(container) {
  const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  r.setPixelRatio(window.devicePixelRatio || 1);
  r.setSize(W, H);
  r.setClearColor(new THREE.Color(BG), 1);
  r.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(r.domElement);
  return r;
}

// ---- time
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const clamp01 = x => clamp(x, 0, 1);
export const lerp = (a, b, s) => a + (b - a) * s;
export const smooth = x => { x = clamp01(x); return x * x * (3 - 2 * x); };
export const smoother = x => { x = clamp01(x); return x * x * x * (x * (x * 6 - 15) + 10); };
export const easeOut = x => { x = clamp01(x); return 1 - Math.pow(1 - x, 3); };
export const easeIn = x => { x = clamp01(x); return x * x * x; };
/** eased progress of t through [t0, t1] */
export const seg = (t, t0, t1, ease = smoother) => ease((t - t0) / (t1 - t0));
/** opacity of something shown over [t0, t1] with fades of length f */
export const window01 = (t, t0, t1, f = 0.45) => Math.min(smooth((t - t0) / f), smooth((t1 - t) / f));
/** piecewise keyframes [[t, value], ...] with easing between keys. A value is a number or a list of numbers */
export function keys(t, ks, ease = smoother) {
  if (t <= ks[0][0]) return ks[0][1];
  for (let i = 1; i < ks.length; i++) {
    if (t <= ks[i][0]) {
      const [t0, a] = ks[i - 1], [t1, b] = ks[i];
      const s = ease((t - t0) / (t1 - t0));
      if (Array.isArray(a)) return a.map((v, k) => lerp(v, b[k], s));
      return lerp(a, b, s);
    }
  }
  return ks[ks.length - 1][1];
}
/** a repeatable pseudo-random number in [0, 1) for item k and stream s */
export const rnd = (k, s = 0) => { const x = Math.sin(k * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };

// ---- color
export const hexToRgb = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
/** sRGB triple in 0..1, the form the unlit shaders take */
export const rgb01 = hex => { const [r, g, b] = hexToRgb(hex); return [r / 255, g / 255, b / 255]; };
export const srgbToLinear = c => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
export function vec3srgb(h) { const [r, g, b] = hexToRgb(h); return new THREE.Vector3(r / 255, g / 255, b / 255); }
/** a color map as a 256 x 1 texture. Without an argument, the signed map */
export function lutTexture(hexList = LUT.signed) {
  const d = new Uint8Array(256 * 4);
  hexList.forEach((h, i) => { const [r, g, b] = hexToRgb(h); d.set([r, g, b, 255], i * 4); });
  const t = new THREE.DataTexture(d, 256, 1, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.magFilter = t.minFilter = THREE.LinearFilter; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.colorSpace = THREE.NoColorSpace; t.needsUpdate = true; return t;
}
export function lutColor(hexList, s) { return hexList[Math.round(clamp01(s) * 255)]; }

// ---- data
async function fetchOk(u) { const r = await fetch(u); if (!r.ok) throw new Error(`cannot load ${u} (${r.status})`); return r; }
export const getJSON = async u => (await fetchOk(u)).json();
export const getF32 = async u => new Float32Array(await (await fetchOk(u)).arrayBuffer());

/** single-channel float texture, read texel by texel (heights) */
export function heightTexture(nx, ny) {
  const data = new Float32Array(nx * ny);
  const t = new THREE.DataTexture(data, nx, ny, THREE.RedFormat, THREE.FloatType);
  t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true;
  return t;
}
/** filtered half-float texture (a spot's shape, for the glow) */
export function filteredTexture(f32, nx, ny) {
  const h = new Uint16Array(f32.length);
  for (let i = 0; i < f32.length; i++) h[i] = THREE.DataUtils.toHalfFloat(f32[i]);
  const t = new THREE.DataTexture(h, nx, ny, THREE.RedFormat, THREE.HalfFloatType);
  t.magFilter = t.minFilter = THREE.LinearFilter; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.generateMipmaps = false; t.needsUpdate = true;
  return t;
}

// ---- camera: target, azimuth (deg, from +x toward +y), elevation (deg), distance, field of view (deg)
export function placeCamera(cam, { target, az, el, dist, fov }) {
  const a = az * Math.PI / 180, e = el * Math.PI / 180;
  cam.fov = fov; cam.up.set(0, 0, 1);
  cam.position.set(target[0] + dist * Math.cos(e) * Math.cos(a), target[1] + dist * Math.cos(e) * Math.sin(a), target[2] + dist * Math.sin(e));
  cam.lookAt(target[0], target[1], target[2]);
  cam.updateProjectionMatrix(); cam.updateMatrixWorld(true);
}
/** screen position (px) of a world point, plus its depth */
export function project(cam, x, y, z) {
  const v = new THREE.Vector3(x, y, z).project(cam);
  return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H, v.z];
}

// ---- shader code shared by the materials
export const GLSL_COMMON = /* glsl */`
vec3 srgb2lin(vec3 c){ return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); }
vec3 lin2srgb(vec3 c){ c = max(c, vec3(0.0)); return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
`;
