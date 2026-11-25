// 3D bars: one box per value, its height the value, standing on any lattice (lit by addLights in light.js), and a
// translucent plane that marks a level, such as a limit.
import * as THREE from 'three';
import { theme } from './core.js';

export class Bars {
  constructor({ scene, n, size = 1.4 }) {
    const g = new THREE.BoxGeometry(1, 1, 1); g.translate(0, 0, 0.5);          // unit box standing on z = 0
    this.mat = new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: 0.0, roughness: 0.6, transparent: true, opacity: 1 });
    this.mesh = new THREE.InstancedMesh(g, this.mat, n);
    this.mesh.frustumCulled = false; this.mesh.renderOrder = 4;
    this.n = n; this.size = size;
    this._m = new THREE.Matrix4(); this._c = new THREE.Color();
    for (let i = 0; i < n; i++) { this.set(i, 0, 0, 0, 1e-4, '#888888'); }
    this.commit();
    scene.add(this.mesh);
  }
  set(i, x, y, z0, h, color) {
    this._m.makeScale(this.size, this.size, Math.max(h, 1e-4)); this._m.setPosition(x, y, z0);
    this.mesh.setMatrixAt(i, this._m);
    this._c.set(color); this.mesh.setColorAt(i, this._c);
  }
  commit() { this.mesh.instanceMatrix.needsUpdate = true; if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true; }
  set opacity(o) { this.mat.opacity = o; this.mesh.visible = o > 0.002; }
  get opacity() { return this.mat.opacity; }
}

export class LevelPlane {
  constructor({ scene, w, d, color = theme.accent.mark }) {
    this.mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false, toneMapped: false });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), this.mat);
    this.mesh.frustumCulled = false; this.mesh.renderOrder = 5;
    this.lineMat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9, toneMapped: false });
    this.edges = new THREE.LineSegments(new THREE.EdgesGeometry(this.mesh.geometry), this.lineMat);
    this.edges.frustumCulled = false; this.edges.renderOrder = 5;
    this.group = new THREE.Group(); this.group.add(this.mesh, this.edges);
    scene.add(this.group);
    this.o = 1;
  }
  place(cx, cy, z) { this.group.position.set(cx, cy, z); }
  set opacity(o) { this.o = o; this.mat.opacity = 0.16 * o; this.lineMat.opacity = 0.9 * o; this.group.visible = o > 0.002; }
  get opacity() { return this.o; }
}
