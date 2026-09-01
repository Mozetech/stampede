import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// One shared material for the entire world: every model carries its colour per vertex.
export const MAT = new THREE.MeshLambertMaterial({ vertexColors: true });
export const MAT_FLAT = new THREE.MeshBasicMaterial({ vertexColors: true });

const tmpColor = new THREE.Color();

// Paints a geometry a single colour, with a subtle per-face tint so stacked
// boxes read as sculpted objects instead of flat silhouettes.
export function colorize(g, color, shade = true) {
  tmpColor.set(color);
  const pos = g.attributes.position;
  const nrm = g.attributes.normal;
  const arr = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    let k = 1;
    if (shade && nrm) {
      const ny = nrm.getY(i), nx = nrm.getX(i);
      if (ny > 0.5) k = 1.07; else if (ny < -0.5) k = 0.8; else if (Math.abs(nx) > 0.5) k = 0.93;
    }
    arr[i * 3] = Math.min(1, tmpColor.r * k);
    arr[i * 3 + 1] = Math.min(1, tmpColor.g * k);
    arr[i * 3 + 2] = Math.min(1, tmpColor.b * k);
  }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}

export class Voxels {
  constructor() { this.geos = []; }
  // Axis-aligned box centred at (x, y, z).
  box(x, y, z, w, h, d, color) {
    const g = new THREE.BoxGeometry(w, h, d);
    g.translate(x, y, z);
    this.geos.push(colorize(g, color));
    return this;
  }
  // Box whose bottom face sits at y (handy for anything standing on the ground).
  up(x, y, z, w, h, d, color) { return this.box(x, y + h / 2, z, w, h, d, color); }
  cyl(x, y, z, r, h, color, seg = 10, axis = 'y') {
    const g = new THREE.CylinderGeometry(r, r, h, seg);
    if (axis === 'x') g.rotateZ(Math.PI / 2);
    if (axis === 'z') g.rotateX(Math.PI / 2);
    g.translate(x, y, z);
    this.geos.push(colorize(g, color));
    return this;
  }
  geometry() {
    if (!this.geos.length) return new THREE.BufferGeometry();
    const g = mergeGeometries(this.geos, false);
    this.geos.forEach((x) => x.dispose());
    this.geos = [];
    return g;
  }
  build(mat = MAT) {
    const m = new THREE.Mesh(this.geometry(), mat);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }
}

export function disposeObject(obj) {
  obj.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
}

export const rand = (a, b) => a + Math.random() * (b - a);
export const randInt = (a, b) => Math.floor(rand(a, b + 1));
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));
