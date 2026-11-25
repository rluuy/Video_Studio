// The ion source (schematic) and its beam column.
// The beam column is a camera-facing strip with a Gaussian cross-profile, drawn additively; the slab occludes
// it below the surface through the depth test. Motion blur: one strip per sub-step of the frame interval,
// each carrying its share of the brightness, so a fast pass reads as a streak and a slow pass as a bright spot.
import * as THREE from 'three';
import { RoomEnvironment } from '/vendor/three/examples/jsm/environments/RoomEnvironment.js';
import { GLSL_COMMON, vec3srgb } from '../../core/core.js';
import { MAX_STEPS } from '../../core/glow.js';
import { BEAM } from './colors.js';

const COL_VERT = /* glsl */`
uniform vec3 uTop; uniform float uLen; uniform float uHalfW;
varying vec2 vUV;
void main(){
  vec3 toCam = cameraPosition - uTop; toCam.z = 0.0;
  vec3 side = normalize(cross(vec3(0.0, 0.0, 1.0), normalize(toCam + vec3(1e-6, 0.0, 0.0))));
  vec3 p = uTop + vec3(0.0, 0.0, -position.y * uLen) + side * (position.x * uHalfW);
  vUV = position.xy;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;
const COL_FRAG = GLSL_COMMON + /* glsl */`
uniform vec3 uCol; uniform float uAlpha; uniform float uLen; uniform float uTopFade; uniform float uBotFade; uniform float uCore;
varying vec2 vUV;
void main(){
  float core = exp(-0.5 * pow(vUV.x * 6.0, 2.0)) * uCore;
  float prof = (1.0 - 0.38 * uCore) * exp(-0.5 * pow(vUV.x * 2.5, 2.0)) + 0.38 * core;
  float d = vUV.y * uLen;
  float top = smoothstep(0.0, uTopFade, d), bot = smoothstep(0.0, uBotFade, uLen - d);
  vec3 c = mix(uCol, vec3(1.0), 0.40 * core);
  float a = prof * top * bot * uAlpha * 0.95 + (hash12(gl_FragCoord.xy) - 0.5) / 255.0;
  gl_FragColor = vec4(c, clamp(a, 0.0, 1.0));
}`;

export class Beam {
  constructor({ scene, renderer, halfWidth = 3.4, color = BEAM }) {
    this.scene = scene;
    // ---- schematic ion source: body, flange and aperture plate
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    const metal = new THREE.MeshStandardMaterial({ color: '#8a949f', metalness: 0.75, roughness: 0.34, envMap: env, envMapIntensity: 0.55 });
    const dark = new THREE.MeshStandardMaterial({ color: '#3b424b', metalness: 0.6, roughness: 0.45, envMap: env, envMapIntensity: 0.4 });
    const plateM = new THREE.MeshStandardMaterial({ color: '#9aa4ae', metalness: 0.55, roughness: 0.48, envMap: env, envMapIntensity: 0.35 });
    const cyl = (r, h, m, z) => { const g = new THREE.CylinderGeometry(r, r, h, 96, 1); g.rotateX(Math.PI / 2); const o = new THREE.Mesh(g, m); o.position.z = z; return o; };
    this.source = new THREE.Group();
    this.source.add(cyl(5.0, 9, metal, 4.5 + 1.0));              // body
    this.source.add(cyl(5.8, 0.8, dark, 1.0 + 9 + 0.4));          // top cap
    this.source.add(cyl(6.6, 1.0, plateM, 0.5));                 // aperture plate (bottom at z = 0)
    const hole = new THREE.Mesh(new THREE.CircleGeometry(2.5, 64), new THREE.MeshBasicMaterial({ color: '#05070a' }));
    hole.position.z = -0.02; hole.rotation.x = Math.PI; this.source.add(hole);
    this.mouth = new THREE.Mesh(new THREE.CircleGeometry(2.4, 64), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.mouth.position.z = -0.04; this.mouth.rotation.x = Math.PI; this.source.add(this.mouth);
    this.source.traverse(o => { o.frustumCulled = false; });
    this.srcMats = [metal, dark, plateM, hole.material];
    scene.add(this.source);
    // ---- beam strips (one per motion-blur sub-step)
    const g = new THREE.BufferGeometry();
    const xs = [], idx = []; const NX = 24, NY = 40;
    for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) xs.push(-1 + 2 * i / NX, j / NY, 0);
    for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) { const a = j * (NX + 1) + i; idx.push(a, a + NX + 1, a + 1, a + 1, a + NX + 1, a + NX + 2); }
    g.setAttribute('position', new THREE.Float32BufferAttribute(xs, 3)); g.setIndex(idx);
    this.cols = [];
    for (let k = 0; k < MAX_STEPS; k++) {
      const u = { uTop: { value: new THREE.Vector3() }, uLen: { value: 50 }, uHalfW: { value: halfWidth }, uCol: { value: vec3srgb(color) }, uAlpha: { value: 0 },
        uTopFade: { value: 0.5 }, uBotFade: { value: 0.5 }, uCore: { value: 1 } };
      const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ vertexShader: COL_VERT, fragmentShader: COL_FRAG, uniforms: u, transparent: true, blending: THREE.NormalBlending, depthWrite: false, side: THREE.DoubleSide }));
      m.frustumCulled = false; m.renderOrder = 10; m.visible = false; this.cols.push(m); scene.add(m);
    }
    this.halfWidth = halfWidth;
  }
  /**
   * steps: [[x, y, w], ...] (w sums to 1); on: 0..1 beam intensity; zTop: z of the aperture; zBottom: column end
   * src: [x, y] of the source (defaults to the last step); srcZ: aperture height; srcOn: 0..1 source visibility
   */
  update({ steps, on, zTop, zBottom, src = null, srcZ = zTop, srcVisible = true, srcOpacity = 1, halfWidth = this.halfWidth, topFade = 0.5, botFade = 0.6 }) {
    for (const m of this.srcMats) { m.transparent = srcOpacity < 0.999; m.opacity = srcOpacity; }
    const n = Math.min(steps.length, MAX_STEPS);
    let gap = 0; for (let k = 1; k < n; k++) gap = Math.max(gap, Math.hypot(steps[k][0] - steps[k - 1][0], steps[k][1] - steps[k - 1][1]));
    const core = Math.max(0, Math.min(1, 1.6 - gap / 0.6));
    for (let k = 0; k < MAX_STEPS; k++) {
      const m = this.cols[k], u = m.material.uniforms;
      if (k < n && on > 0.001) {
        m.visible = true;
        const zb = steps[k].length > 3 && steps[k][3] !== null ? steps[k][3] : zBottom;
        u.uTop.value.set(steps[k][0], steps[k][1], zTop); u.uLen.value = Math.max(zTop - zb, 0.5);
        u.uAlpha.value = on * Math.min(1, steps[k][2] * 1.35); u.uHalfW.value = halfWidth;
        u.uTopFade.value = topFade; u.uBotFade.value = botFade; u.uCore.value = core;
      } else m.visible = false;
    }
    const s = src || (n ? [steps[n - 1][0], steps[n - 1][1]] : [0, 0]);
    this.source.position.set(s[0], s[1], srcZ);
    this.source.visible = srcVisible && srcOpacity > 0.002;
    this.mouth.material.opacity = 0.9 * on;
  }
}
