// A spot of light on a surface: a footprint image added at up to 32 places, so a moving spot blurs along its path.
// Surfaces that can be lit this way (the slab, the floor) include GLSL_GLOW and glowUniforms().
import * as THREE from 'three';
import { vec3srgb, theme } from './core.js';

export const MAX_STEPS = 32;
export const GLSL_GLOW = /* glsl */`
uniform sampler2D uGlow; uniform vec4 uGlowExt; uniform vec3 uBeam[${MAX_STEPS}]; uniform int uNBeam;
uniform float uGlowAmp; uniform vec3 uGlowCol;
float footprint(vec2 w){
  float g = 0.0;
  for (int k = 0; k < ${MAX_STEPS}; k++) {
    if (k >= uNBeam) break;
    vec2 q = w - uBeam[k].xy;
    vec2 uv = vec2((q.x - uGlowExt.x) / (uGlowExt.y - uGlowExt.x), (q.y - uGlowExt.z) / (uGlowExt.w - uGlowExt.z));
    if (uv.x >= 0.0 && uv.x <= 1.0 && uv.y >= 0.0 && uv.y <= 1.0) g += uBeam[k].z * texture(uGlow, uv).r;
  }
  return g;
}
`;
/** glow: { tex, ext: [x0, x1, y0, y1] } from filteredTexture, or null for a surface that is never lit */
export function glowUniforms(glow, color = theme.light.glow) {
  return {
    uGlow: { value: glow ? glow.tex : null }, uGlowExt: { value: glow ? new THREE.Vector4(...glow.ext) : new THREE.Vector4(0, 1, 0, 1) },
    uBeam: { value: Array.from({ length: MAX_STEPS }, () => new THREE.Vector3()) }, uNBeam: { value: 0 },
    uGlowAmp: { value: 0 }, uGlowCol: { value: vec3srgb(color) },
  };
}
/** place the spot: steps [[x, y, weight], ...], weights summing to 1, and the overall brightness */
export function setGlow(u, steps, amp) {
  const n = Math.min(steps.length, MAX_STEPS);
  for (let i = 0; i < n; i++) u.uBeam.value[i].set(steps[i][0], steps[i][1], steps[i][2]);
  u.uNBeam.value = n; u.uGlowAmp.value = amp;
}
