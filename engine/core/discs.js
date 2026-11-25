// Discs: many small dots that always face the camera (grains, spray, powder, ions, sparks). Their places come from
// closed-form paths in the scene, so every frame is a pure function of time. Call begin, add for each dot, then end.
import * as THREE from 'three';

const VERT = /* glsl */`
attribute vec4 aPos; attribute vec4 aCol;
varying vec4 vCol; varying vec2 vUv;
void main(){
  vCol = aCol; vUv = uv;
  vec4 mv = viewMatrix * modelMatrix * vec4(aPos.xyz, 1.0);
  mv.xy += position.xy * aPos.w;
  gl_Position = projectionMatrix * mv;
}`;
const FRAG = /* glsl */`
uniform float uOpacity; uniform float uHard; uniform float uAdd;
varying vec4 vCol; varying vec2 vUv;
void main(){
  vec2 d = (vUv - 0.5) * 2.0; float r = length(d);
  float a = vCol.a * uOpacity * mix(exp(-3.0 * r * r), 1.0 - smoothstep(0.78, 1.0, r), uHard);
  if (a < 0.004) discard;
  float shade = mix(1.0, 0.72 + 0.28 * (1.0 - d.y * 0.5 - d.x * 0.3), uHard);
  gl_FragColor = uAdd > 0.5 ? vec4(vCol.rgb * a, a) : vec4(vCol.rgb * shade, a);
}`;

export class Discs {
  /** n: the most dots in one frame. hard: 1 for solid grains, 0 for soft glows. additive: for light */
  constructor({ scene, n, hard = 1, additive = false, renderOrder = 9, depthTest = true }) {
    const base = new THREE.PlaneGeometry(1, 1);
    const g = new THREE.InstancedBufferGeometry();
    g.index = base.index; g.setAttribute('position', base.attributes.position); g.setAttribute('uv', base.attributes.uv);
    this.pos = new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4); this.col = new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4);
    this.pos.setUsage(THREE.DynamicDrawUsage); this.col.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('aPos', this.pos); g.setAttribute('aCol', this.col); g.instanceCount = 0;
    this.u = { uOpacity: { value: 1 }, uHard: { value: hard }, uAdd: { value: additive ? 1 : 0 } };
    const mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: this.u, transparent: true, depthWrite: false, depthTest });
    if (additive) { mat.blending = THREE.CustomBlending; mat.blendSrc = THREE.OneFactor; mat.blendDst = THREE.OneFactor; }
    this.mesh = new THREE.Mesh(g, mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = renderOrder;
    this.g = g; this.n = n; this.used = 0;
    scene.add(this.mesh);
  }
  begin() { this.used = 0; }
  add(x, y, z, size, rgb, a) {
    if (this.used >= this.n || a < 0.004) return;
    const i = this.used++;
    this.pos.setXYZW(i, x, y, z, size); this.col.setXYZW(i, rgb[0], rgb[1], rgb[2], a);
  }
  end() { this.g.instanceCount = this.used; this.pos.needsUpdate = true; this.col.needsUpdate = true; this.mesh.visible = this.used > 0; }
  set opacity(o) { this.u.uOpacity.value = o; }
}
