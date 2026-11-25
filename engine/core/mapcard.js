// Map card: a small grid of values drawn as a panel in 3D, one square per value, colored by a map and framed. The
// canvas is redrawn only when the values or the marked cells change.
import * as THREE from 'three';
import { lutColor, LUT, theme } from './core.js';

export class MapCard {
  /**
   * nI x nJ values drawn into a w x h (mm) plane. px = canvas pixels per cell. frame = outline color.
   */
  constructor({ scene, nI, nJ, w, h, lut = LUT.positive, frame = '#aeb8c3', px = 12, panel = theme.panel.fill }) {
    Object.assign(this, { nI, nJ, w, h, lut, frame, px, panel });
    this.pad = Math.max(6, Math.round(px * 0.6));
    this.cv = document.createElement('canvas');
    this.cv.width = nJ * px + 2 * this.pad; this.cv.height = nI * px + 2 * this.pad;
    this.tex = new THREE.CanvasTexture(this.cv);
    this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.anisotropy = 8;
    this.tex.minFilter = THREE.LinearMipmapLinearFilter; this.tex.magFilter = THREE.LinearFilter;
    this.mat = new THREE.MeshBasicMaterial({ map: this.tex, transparent: true, opacity: 1, side: THREE.DoubleSide, depthWrite: false, toneMapped: false });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), this.mat);
    this.mesh.frustumCulled = false; this.mesh.renderOrder = 6;
    scene.add(this.mesh);
    this.key = null;
  }
  /** draw a map (row-major nI x nJ) on a 0..vmax scale; mark cells where mark[i] is true with an orange outline */
  draw(map, vmax, mark = null, markColor = theme.accent.mark) {
    const sig = `${vmax}|${mark ? mark.join('') : ''}|${map.length}|${map[0]}|${map[map.length - 1]}|${map[(map.length / 2) | 0]}`;
    if (sig === this.key) return;
    this.key = sig;
    const g = this.cv.getContext('2d'), { nI, nJ, px, pad } = this;
    g.fillStyle = this.panel; g.fillRect(0, 0, this.cv.width, this.cv.height);
    const gap = px >= 10 ? 1 : 0;
    for (let i = 0; i < nI; i++) for (let j = 0; j < nJ; j++) {
      const v = map[i * nJ + j] / vmax;
      g.fillStyle = lutColor(this.lut, Math.max(0, Math.min(1, v)));
      g.fillRect(pad + j * px, pad + i * px, px - gap, px - gap);
    }
    if (mark) {
      g.strokeStyle = markColor; g.lineWidth = Math.max(2, px * 0.22);
      for (let i = 0; i < nI; i++) for (let j = 0; j < nJ; j++) if (mark[i * nJ + j]) g.strokeRect(pad + j * px + 1, pad + i * px + 1, px - gap - 2, px - gap - 2);
    }
    g.strokeStyle = this.frame; g.lineWidth = Math.max(3, pad * 0.45);
    g.strokeRect(g.lineWidth / 2, g.lineWidth / 2, this.cv.width - g.lineWidth, this.cv.height - g.lineWidth);
    this.tex.needsUpdate = true;
  }
  /** centre the card at (x, y, z) and tilt it back by rotX radians about the x axis (PI/2 = upright, facing -y) */
  place(x, y, z, rotX = Math.PI / 2) { this.mesh.position.set(x, y, z); this.mesh.rotation.set(rotX, 0, 0); }
  /** world position of the centre of cell (i, j) on the card, for pins and cursors */
  cellWorld(i, j) {
    const u = (this.pad + (j + 0.5) * this.px) / this.cv.width - 0.5, v = 0.5 - (this.pad + (i + 0.5) * this.px) / this.cv.height;
    const p = new THREE.Vector3(u * this.w, v * this.h, 0);
    return this.mesh.localToWorld(p);
  }
  /** world position of a point given in card fractions (u right, v up, from the centre) */
  pointWorld(u, v) { return this.mesh.localToWorld(new THREE.Vector3(u * this.w, v * this.h, 0)); }
  set opacity(o) { this.mat.opacity = o; this.mesh.visible = o > 0.002; }
  get opacity() { return this.mat.opacity; }
}
