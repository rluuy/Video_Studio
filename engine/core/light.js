// Light: one key direction for the height-map shaders (LIGHT, GLSL_LIGHT) and the matching three.js lights for ordinary
// meshes (addLights). The shaders do not see the three.js lights, and the meshes do not see LIGHT.
import * as THREE from 'three';

export const LIGHT = {
  uKeyDir: { value: new THREE.Vector3(-0.50, -0.40, 0.56).normalize() },
  uKey: { value: 0.86 }, uAmb: { value: 0.10 }, uSky: { value: 0.24 }, uGround: { value: 0.04 },
  uSpec: { value: 0.12 }, uShin: { value: 70.0 },
};

export const GLSL_LIGHT = /* glsl */`
uniform vec3 uKeyDir; uniform float uKey; uniform float uAmb; uniform float uSky; uniform float uGround; uniform float uSpec; uniform float uShin;
vec3 shade(vec3 base, vec3 n, vec3 wpos){
  vec3 V = normalize(cameraPosition - wpos);
  if (dot(n, V) < 0.0) n = -n;
  float hemi = mix(uGround, uSky, 0.5 + 0.5 * n.z);
  float diff = max(dot(n, uKeyDir), 0.0);
  float spec = uSpec * pow(max(dot(n, normalize(uKeyDir + V)), 0.0), uShin);
  return base * (uAmb + hemi + uKey * diff) + vec3(spec);
}`;

export function addLights(scene) {
  const hemi = new THREE.HemisphereLight(0xcfd8e2, 0x151b22, 0.85);
  const key = new THREE.DirectionalLight(0xffffff, 1.5); key.position.set(-0.50, -0.40, 0.56).multiplyScalar(500);
  scene.add(hemi, key);
  return { hemi, key };
}
