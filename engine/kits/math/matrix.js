// Matrices: flat tiles that can fly from one place to another, a matrix drawn as a card and revealed column by column,
// plain panels, dots on grid points and rectangle outlines.
import * as THREE from 'three';
import { rgb01 } from '../../core/core.js';

export { rgb01 };

const TILE_VERT = /* glsl */`
attribute vec4 aCol;
varying vec4 vCol; varying vec2 vUv;
void main(){
  vCol = aCol; vUv = uv;
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0);
}`;
const TILE_FRAG = /* glsl */`
uniform float uEdge; uniform float uOpacity;
varying vec4 vCol; varying vec2 vUv;
void main(){
  vec2 d = abs(vUv - 0.5) * 2.0;
  float e = max(d.x, d.y), aa = fwidth(e) * 1.2;
  float a = vCol.a * uOpacity * (1.0 - smoothstep(uEdge - aa, uEdge + aa, e));
  if (a < 0.004) discard;
  gl_FragColor = vec4(vCol.rgb, a);
}`;

/** n flat square tiles, each with its own place, size, colour and opacity (colours are sRGB, drawn unlit) */
export class Tiles {
  constructor({ scene, n, edge = 0.9, renderOrder = 7 }) {
    const g = new THREE.PlaneGeometry(1, 1);
    this.col = new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4);
    g.setAttribute('aCol', this.col);
    this.u = { uEdge: { value: edge }, uOpacity: { value: 1 } };
    this.mat = new THREE.ShaderMaterial({ vertexShader: TILE_VERT, fragmentShader: TILE_FRAG, uniforms: this.u, transparent: true, side: THREE.DoubleSide, depthWrite: true });
    this.mesh = new THREE.InstancedMesh(g, this.mat, n);
    this.mesh.frustumCulled = false; this.mesh.renderOrder = renderOrder;
    this.n = n; this.used = 0;
    this._m = new THREE.Matrix4(); this._s = new THREE.Vector3(); this._hid = new THREE.Matrix4().makeScale(0, 0, 0);
    scene.add(this.mesh);
  }
  begin() { this.used = 0; }
  /** add one tile: p Vector3, q Quaternion, size (mm), rgb [0..1 sRGB], alpha */
  add(p, q, sx, sy, rgb, a) {
    if (a < 0.004 || this.used >= this.n) return;
    const i = this.used++;
    this._s.set(sx, sy, 1); this._m.compose(p, q, this._s);
    this.mesh.setMatrixAt(i, this._m);
    this.col.setXYZW(i, rgb[0], rgb[1], rgb[2], a);
  }
  end() {
    for (let i = this.used; i < this._last; i++) this.mesh.setMatrixAt(i, this._hid);
    this._last = this.used;
    this.mesh.count = Math.max(this.used, 1);
    if (this.used === 0) this.mesh.setMatrixAt(0, this._hid);
    this.mesh.instanceMatrix.needsUpdate = true; this.col.needsUpdate = true;
    this.mesh.visible = this.used > 0;
  }
}
Tiles.prototype._last = 0;

/**
 * A matrix as a card: nRows x nCols cells, the nonzeros colored through `color(row, col)` (null = zero).
 * draw({ upto, cols, hi, ghost }) shows columns [0, upto) plus the listed ones; hi outlines one column.
 */
export class MatrixCard {
  constructor({ scene, nRows, nCols, w, px = 4, color, frame = '#e8a33d', panel = '#0f151c', zero = '#161d26' }) {
    Object.assign(this, { nRows, nCols, w, px, frame, panel, zero });
    this.pad = 10;
    const cw = nCols * px + 2 * this.pad, ch = nRows * px + 2 * this.pad;
    this.h = w * ch / cw;
    this.full = document.createElement('canvas'); this.full.width = nCols * px; this.full.height = nRows * px;
    const g = this.full.getContext('2d');
    g.fillStyle = zero; g.fillRect(0, 0, this.full.width, this.full.height);
    for (let j = 0; j < nRows; j++) for (let i = 0; i < nCols; i++) { const c = color(j, i); if (c) { g.fillStyle = c; g.fillRect(i * px, j * px, px, px); } }
    this.cv = document.createElement('canvas'); this.cv.width = cw; this.cv.height = ch;
    this.tex = new THREE.CanvasTexture(this.cv);
    this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.anisotropy = 8;
    this.tex.minFilter = THREE.LinearMipmapLinearFilter; this.tex.magFilter = THREE.NearestFilter;
    this.mat = new THREE.MeshBasicMaterial({ map: this.tex, transparent: true, opacity: 1, side: THREE.DoubleSide, depthWrite: false, toneMapped: false });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, this.h), this.mat);
    this.mesh.frustumCulled = false; this.mesh.renderOrder = 5;
    scene.add(this.mesh);
    this.key = null;
  }
  draw({ upto = 0, cols = [], hi = -1, hiColor = '#ffffff', frame = this.frame, empty = 1 } = {}) {
    const sig = `${upto}|${cols.join(',')}|${hi}|${hiColor}|${frame}|${empty.toFixed(3)}`;
    if (sig === this.key) return;
    this.key = sig;
    const g = this.cv.getContext('2d'), { px, pad, nCols, nRows } = this;
    g.fillStyle = this.panel; g.fillRect(0, 0, this.cv.width, this.cv.height);
    g.globalAlpha = empty; g.fillStyle = '#0c1117'; g.fillRect(pad, pad, nCols * px, nRows * px); g.globalAlpha = 1;
    const n = Math.max(0, Math.min(nCols, Math.floor(upto)));
    if (n > 0) g.drawImage(this.full, 0, 0, n * px, nRows * px, pad, pad, n * px, nRows * px);
    for (const c of cols) if (c >= n) g.drawImage(this.full, c * px, 0, px, nRows * px, pad + c * px, pad, px, nRows * px);
    if (hi >= 0) { g.strokeStyle = hiColor; g.lineWidth = 2; g.strokeRect(pad + hi * px - 1.5, pad - 1.5, px + 3, nRows * px + 3); }
    g.strokeStyle = frame; g.lineWidth = 4; g.strokeRect(2, 2, this.cv.width - 4, this.cv.height - 4);
    this.tex.needsUpdate = true;
  }
  place(x, y, z, rotX) { this.mesh.position.set(x, y, z); this.mesh.rotation.set(rotX, 0, 0); this.mesh.updateMatrixWorld(true); }
  /** world position of the centre of cell (row, col); fractional indices allowed */
  cellWorld(row, col, out = new THREE.Vector3()) {
    const u = (this.pad + (col + 0.5) * this.px) / this.cv.width - 0.5, v = 0.5 - (this.pad + (row + 0.5) * this.px) / this.cv.height;
    return this.mesh.localToWorld(out.set(u * this.w, v * this.h, 0.02));
  }
  get cell() { return this.w * this.px / this.cv.width; }      // world size of one cell (mm)
  set opacity(o) { this.mat.opacity = o; this.mesh.visible = o > 0.002; }
  get opacity() { return this.mat.opacity; }
}

/** a flat rectangular panel with a thin frame (sheet backings, the footprint tile's plate) */
export class Panel {
  constructor({ scene, w, h, color = '#121920', frame = '#5d6772', alpha = 0.86, renderOrder = 6 }) {
    this.a0 = alpha;
    this.mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: alpha, side: THREE.DoubleSide, depthWrite: false, toneMapped: false });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), this.mat);
    this.lineMat = new THREE.LineBasicMaterial({ color: frame, transparent: true, opacity: 1, toneMapped: false });
    this.edges = new THREE.LineSegments(new THREE.EdgesGeometry(this.mesh.geometry), this.lineMat);
    this.group = new THREE.Group(); this.group.add(this.mesh, this.edges);
    this.mesh.renderOrder = renderOrder; this.edges.renderOrder = renderOrder + 1;
    this.group.traverse(o => { o.frustumCulled = false; });
    scene.add(this.group);
  }
  place(x, y, z, rotX = 0) { this.group.position.set(x, y, z); this.group.rotation.set(rotX, 0, 0); }
  set opacity(o) { this.mat.opacity = this.a0 * o; this.lineMat.opacity = o; this.group.visible = o > 0.002; }
  setFrame(hex) { this.lineMat.color.set(hex); }
}

/** a rectangle outline in the plane z = const (dashed when dash > 0) */
export function outlineRect({ scene, x0, x1, y0, y1, z, color = '#eef1f5', dash = 0, renderOrder = 8 }) {
  const pts = [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]].map(p => new THREE.Vector3(p[0], p[1], z));
  const g = new THREE.BufferGeometry().setFromPoints(pts);
  const mat = dash > 0 ? new THREE.LineDashedMaterial({ color, dashSize: dash, gapSize: dash * 0.7, transparent: true, toneMapped: false, depthTest: false })
    : new THREE.LineBasicMaterial({ color, transparent: true, toneMapped: false, depthTest: false });
  const line = new THREE.Line(g, mat); line.computeLineDistances(); line.frustumCulled = false; line.renderOrder = renderOrder;
  scene.add(line);
  return { line, mat, set opacity(o) { mat.opacity = o; line.visible = o > 0.002; } };
}

/** small discs lying flat at given points (grid points, dwell points) */
export class Dots {
  constructor({ scene, pts, r = 0.22, color = '#eef1f5', z = 0.03, renderOrder = 8 }) {
    const g = new THREE.CircleGeometry(r, 20);
    this.mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1, depthWrite: false, toneMapped: false });
    this.mesh = new THREE.InstancedMesh(g, this.mat, pts.length);
    const m = new THREE.Matrix4();
    pts.forEach((p, i) => { m.makeTranslation(p[0], p[1], z); this.mesh.setMatrixAt(i, m); });
    this.mesh.frustumCulled = false; this.mesh.renderOrder = renderOrder;
    scene.add(this.mesh);
  }
  set opacity(o) { this.mat.opacity = o; this.mesh.visible = o > 0.002; }
  set color(hex) { this.mat.color.set(hex); }
}
