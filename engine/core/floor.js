// The floor: a dark ground that fades into the background, with soft contact shadows under rectangles and a spot's glow.
import * as THREE from 'three';
import { BG, GLSL_COMMON, theme, vec3srgb } from './core.js';
import { GLSL_GLOW, glowUniforms } from './glow.js';

const FLOOR_VERT = /* glsl */`varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const FLOOR_FRAG = GLSL_COMMON + GLSL_GLOW + /* glsl */`
uniform vec3 uBg; uniform vec3 uFloor; uniform vec2 uCenter; uniform float uR0; uniform float uR1;
uniform vec4 uRect[4]; uniform int uNRect; uniform float uSoft; uniform float uShadow;
varying vec3 vW;
float sdBox(vec2 p, vec4 r){ vec2 c = 0.5 * (r.xz + r.yw); vec2 b = 0.5 * vec2(r.y - r.x, r.w - r.z); vec2 d = abs(p - c) - b; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }
void main(){
  float d = length((vW.xy - uCenter) * vec2(0.55, 1.0));
  float f = 1.0 - smoothstep(uR0, uR1, d);
  vec3 col = mix(srgb2lin(uBg), srgb2lin(uFloor), f);
  float sh = 0.0;
  for (int i = 0; i < 4; i++) { if (i >= uNRect) break; sh = max(sh, 1.0 - smoothstep(-0.5, uSoft, sdBox(vW.xy, uRect[i]))); }
  col *= 1.0 - uShadow * sh;
  float g = uGlowAmp * footprint(vW.xy); vec3 gc = srgb2lin(uGlowCol);
  col = mix(col, gc * 0.5, clamp(0.45 * g, 0.0, 0.5)) + gc * 0.10 * g;
  gl_FragColor = vec4(lin2srgb(col) + (hash12(gl_FragCoord.xy) - 0.5) / 255.0, 1.0);
}`;

export class Floor {
  constructor({ scene, z, glow = null, center = [0, 0], r0 = 40, r1 = 230, color = theme.panel.floor }) {
    this.u = Object.assign({
      uBg: { value: vec3srgb(BG) }, uFloor: { value: vec3srgb(color) }, uCenter: { value: new THREE.Vector2(...center) },
      uR0: { value: r0 }, uR1: { value: r1 }, uRect: { value: Array.from({ length: 4 }, () => new THREE.Vector4()) }, uNRect: { value: 0 },
      uSoft: { value: 7 }, uShadow: { value: 0.55 },
    }, glowUniforms(glow));
    const m = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.ShaderMaterial({ vertexShader: FLOOR_VERT, fragmentShader: FLOOR_FRAG, uniforms: this.u, depthWrite: true }));
    m.position.z = z; m.frustumCulled = false; m.renderOrder = -1; scene.add(m); this.mesh = m;
  }
  /** up to four [x0, x1, y0, y1] rectangles that cast a soft shadow */
  setRects(rects) { rects.forEach((r, i) => this.u.uRect.value[i].set(...r)); this.u.uNRect.value = rects.length; }
}
