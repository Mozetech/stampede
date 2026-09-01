import * as THREE from 'three';
import { Voxels, rand } from './voxel.js';

// Animals are modelled facing +X. Legs pivot at the hip and swing around Z.
const HOOF = '#2b2b33';

function leg(x, y, z, w, len, color, hoof = HOOF, hoofH = 0.05) {
  const v = new Voxels();
  v.box(0, -len / 2, 0, w, len, w, color);
  if (hoof) v.box(0, -len + hoofH / 2, 0, w + 0.02, hoofH, w + 0.02, hoof);
  const m = v.build();
  m.position.set(x, y, z);
  return m;
}
function eyes(v, x, y, z, spread, size = 0.06) {
  v.box(x, y, z - spread, size, size, 0.02, '#111');
  v.box(x, y, z + spread, size, size, 0.02, '#111');
}

export const SPECIES = {
  chicken: {
    speed: [3.4, 4.6], half: 0.32, group: [1, 3], gap: [0.9, 1.6], bob: 0.05, stride: 9,
    build() {
      const v = new Voxels();
      v.box(0, 0.42, 0, 0.5, 0.36, 0.38, '#fdfdfd');
      v.box(0.28, 0.62, 0, 0.2, 0.26, 0.24, '#fdfdfd'); // head
      v.box(0.28, 0.79, 0, 0.14, 0.08, 0.1, '#e63946'); // comb
      v.box(0.42, 0.62, 0, 0.1, 0.07, 0.08, '#ff9f1c'); // beak
      v.box(0.36, 0.53, 0, 0.06, 0.08, 0.06, '#e63946'); // wattle
      v.box(-0.28, 0.5, 0, 0.1, 0.22, 0.2, '#f2f2f2'); // tail
      v.box(0, 0.42, -0.2, 0.32, 0.2, 0.04, '#ededed'); v.box(0, 0.42, 0.2, 0.32, 0.2, 0.04, '#ededed'); // wings
      eyes(v, 0.36, 0.68, 0, 0.12, 0.05);
      return { body: v.build(), legs: [leg(0.05, 0.25, -0.1, 0.05, 0.25, '#ff9f1c', null), leg(0.05, 0.25, 0.1, 0.05, 0.25, '#ff9f1c', null)] };
    },
  },
  duck: {
    speed: [2.6, 3.4], half: 0.34, group: [2, 4], gap: [0.6, 1.0], bob: 0.04, stride: 8,
    build() {
      const v = new Voxels();
      v.box(0, 0.36, 0, 0.56, 0.3, 0.38, '#f6efd8');
      v.box(0.26, 0.6, 0, 0.22, 0.24, 0.24, '#2d6a4f'); // head
      v.box(0.42, 0.58, 0, 0.14, 0.06, 0.16, '#ffb703'); // bill
      v.box(0.26, 0.47, 0, 0.2, 0.04, 0.22, '#ffffff'); // ring
      v.box(-0.3, 0.44, 0, 0.1, 0.12, 0.16, '#e9e2c8');
      eyes(v, 0.34, 0.66, 0, 0.12, 0.05);
      return { body: v.build(), legs: [leg(0.02, 0.21, -0.1, 0.05, 0.2, '#ff9f1c', null), leg(0.02, 0.21, 0.1, 0.05, 0.2, '#ff9f1c', null)] };
    },
  },
  pig: {
    speed: [2.0, 2.9], half: 0.44, group: [1, 3], gap: [1.0, 1.8], bob: 0.03, stride: 7,
    build() {
      const v = new Voxels();
      v.box(0, 0.42, 0, 0.74, 0.4, 0.46, '#ffb5c2');
      v.box(0.36, 0.5, 0, 0.26, 0.3, 0.36, '#ffb5c2'); // head
      v.box(0.5, 0.46, 0, 0.06, 0.14, 0.16, '#ff8fa3'); // snout
      v.box(0.53, 0.46, -0.04, 0.02, 0.05, 0.04, '#d6607a'); v.box(0.53, 0.46, 0.04, 0.02, 0.05, 0.04, '#d6607a');
      v.box(0.36, 0.68, -0.12, 0.1, 0.1, 0.08, '#ff8fa3'); v.box(0.36, 0.68, 0.12, 0.1, 0.1, 0.08, '#ff8fa3'); // ears
      v.box(-0.38, 0.55, 0, 0.06, 0.08, 0.06, '#ff8fa3'); // tail
      eyes(v, 0.49, 0.58, 0, 0.1, 0.04);
      const L = 0.24;
      return { body: v.build(), legs: [leg(0.22, 0.24, -0.15, 0.1, L, '#ffb5c2', '#d6607a'), leg(0.22, 0.24, 0.15, 0.1, L, '#ffb5c2', '#d6607a'), leg(-0.22, 0.24, -0.15, 0.1, L, '#ffb5c2', '#d6607a'), leg(-0.22, 0.24, 0.15, 0.1, L, '#ffb5c2', '#d6607a')] };
    },
  },
  sheep: {
    speed: [1.8, 2.6], half: 0.42, group: [2, 4], gap: [0.5, 0.9], bob: 0.03, stride: 7,
    build() {
      const v = new Voxels();
      v.box(0, 0.48, 0, 0.7, 0.44, 0.5, '#f8f4ea');
      v.box(0.1, 0.62, 0, 0.5, 0.26, 0.4, '#fffdf7'); // fluffy top
      v.box(-0.3, 0.5, 0, 0.14, 0.3, 0.4, '#f1ece0');
      v.box(0.4, 0.5, 0, 0.2, 0.26, 0.28, '#2b2b33'); // face
      v.box(0.4, 0.62, -0.18, 0.08, 0.06, 0.12, '#2b2b33'); v.box(0.4, 0.62, 0.18, 0.08, 0.06, 0.12, '#2b2b33'); // ears
      eyes(v, 0.5, 0.55, 0, 0.09, 0.04);
      const L = 0.26;
      return { body: v.build(), legs: [leg(0.22, 0.26, -0.16, 0.09, L, '#2b2b33', null), leg(0.22, 0.26, 0.16, 0.09, L, '#2b2b33', null), leg(-0.2, 0.26, -0.16, 0.09, L, '#2b2b33', null), leg(-0.2, 0.26, 0.16, 0.09, L, '#2b2b33', null)] };
    },
  },
  goat: {
    speed: [2.6, 3.6], half: 0.42, group: [1, 2], gap: [1.2, 2.0], bob: 0.05, stride: 8,
    build() {
      const v = new Voxels();
      v.box(0, 0.5, 0, 0.7, 0.36, 0.38, '#d9d4cc');
      v.box(0.38, 0.66, 0, 0.24, 0.3, 0.26, '#d9d4cc'); // head up
      v.box(0.5, 0.58, 0, 0.06, 0.12, 0.18, '#bdb6ab');
      v.box(0.34, 0.84, -0.08, 0.05, 0.12, 0.05, '#8d7b68'); v.box(0.34, 0.84, 0.08, 0.05, 0.12, 0.05, '#8d7b68'); // horns
      v.box(0.5, 0.5, 0, 0.06, 0.1, 0.06, '#f5f1ea'); // beard
      v.box(-0.36, 0.62, 0, 0.06, 0.1, 0.06, '#d9d4cc');
      eyes(v, 0.5, 0.7, 0, 0.1, 0.04);
      const L = 0.32;
      return { body: v.build(), legs: [leg(0.24, 0.32, -0.12, 0.08, L, '#bdb6ab'), leg(0.24, 0.32, 0.12, 0.08, L, '#bdb6ab'), leg(-0.24, 0.32, -0.12, 0.08, L, '#bdb6ab'), leg(-0.24, 0.32, 0.12, 0.08, L, '#bdb6ab')] };
    },
  },
  cow: {
    speed: [1.5, 2.2], half: 0.55, group: [1, 2], gap: [1.2, 2.2], bob: 0.02, stride: 6,
    build() {
      const v = new Voxels();
      v.box(0, 0.6, 0, 0.96, 0.5, 0.52, '#fbfbfb');
      v.box(-0.2, 0.62, 0.2, 0.36, 0.3, 0.14, '#2b2b33'); v.box(0.15, 0.7, -0.22, 0.3, 0.26, 0.1, '#2b2b33'); v.box(-0.3, 0.82, -0.1, 0.22, 0.1, 0.3, '#2b2b33'); // patches
      v.box(0.48, 0.66, 0, 0.3, 0.34, 0.36, '#fbfbfb'); // head
      v.box(0.62, 0.56, 0, 0.06, 0.16, 0.26, '#ffb5c2'); // muzzle
      v.box(0.42, 0.88, -0.12, 0.06, 0.12, 0.06, '#e9d8a6'); v.box(0.42, 0.88, 0.12, 0.06, 0.12, 0.06, '#e9d8a6'); // horns
      v.box(0.44, 0.78, -0.22, 0.1, 0.06, 0.1, '#fbfbfb'); v.box(0.44, 0.78, 0.22, 0.1, 0.06, 0.1, '#fbfbfb'); // ears
      v.box(-0.2, 0.36, 0, 0.26, 0.1, 0.24, '#ffb5c2'); // udder
      v.box(-0.5, 0.6, 0, 0.06, 0.28, 0.06, '#fbfbfb'); v.box(-0.5, 0.44, 0, 0.08, 0.08, 0.08, '#2b2b33'); // tail
      eyes(v, 0.63, 0.74, 0, 0.11, 0.05);
      const L = 0.36;
      return { body: v.build(), legs: [leg(0.32, 0.36, -0.17, 0.12, L, '#fbfbfb'), leg(0.32, 0.36, 0.17, 0.12, L, '#fbfbfb'), leg(-0.32, 0.36, -0.17, 0.12, L, '#fbfbfb'), leg(-0.32, 0.36, 0.17, 0.12, L, '#fbfbfb')] };
    },
  },
  deer: {
    speed: [4.0, 5.4], half: 0.5, group: [1, 2], gap: [1.6, 2.6], bob: 0.08, stride: 6,
    build() {
      const v = new Voxels();
      v.box(0, 0.66, 0, 0.8, 0.36, 0.36, '#c68b4b');
      v.box(0.36, 0.82, 0, 0.2, 0.34, 0.22, '#c68b4b'); // neck
      v.box(0.46, 1.02, 0, 0.3, 0.2, 0.24, '#c68b4b'); // head
      v.box(0.6, 0.98, 0, 0.06, 0.1, 0.14, '#2b2b33'); // nose
      v.box(0.4, 1.16, -0.1, 0.04, 0.16, 0.04, '#5b3a1e'); v.box(0.4, 1.16, 0.1, 0.04, 0.16, 0.04, '#5b3a1e');
      v.box(0.4, 1.24, -0.16, 0.04, 0.04, 0.16, '#5b3a1e'); v.box(0.4, 1.24, 0.16, 0.04, 0.04, 0.16, '#5b3a1e'); // antlers
      v.box(0.44, 1.12, -0.16, 0.06, 0.06, 0.1, '#e0b58a'); v.box(0.44, 1.12, 0.16, 0.06, 0.06, 0.1, '#e0b58a'); // ears
      v.box(-0.42, 0.7, 0, 0.06, 0.12, 0.1, '#fdfdfd'); // tail
      v.box(0, 0.5, 0, 0.5, 0.06, 0.38, '#f1d8b5'); // belly
      eyes(v, 0.55, 1.06, 0, 0.1, 0.04);
      const L = 0.48;
      return { body: v.build(), legs: [leg(0.28, 0.48, -0.12, 0.08, L, '#b57c3f'), leg(0.28, 0.48, 0.12, 0.08, L, '#b57c3f'), leg(-0.28, 0.48, -0.12, 0.08, L, '#b57c3f'), leg(-0.28, 0.48, 0.12, 0.08, L, '#b57c3f')] };
    },
  },
  zebra: {
    speed: [3.0, 4.2], half: 0.55, group: [1, 3], gap: [1.0, 1.8], bob: 0.05, stride: 6,
    build() {
      const v = new Voxels();
      v.box(0, 0.7, 0, 0.96, 0.44, 0.44, '#fbfbfb');
      for (let i = -0.36; i <= 0.36; i += 0.18) v.box(i, 0.7, 0, 0.08, 0.46, 0.46, '#2b2b33');
      v.box(0.42, 0.9, 0, 0.22, 0.36, 0.24, '#fbfbfb'); v.box(0.42, 0.9, 0, 0.24, 0.08, 0.26, '#2b2b33'); // neck
      v.box(0.56, 1.08, 0, 0.3, 0.22, 0.24, '#fbfbfb'); v.box(0.7, 1.04, 0, 0.06, 0.12, 0.16, '#2b2b33'); // head
      v.box(0.36, 1.1, 0, 0.16, 0.14, 0.06, '#2b2b33'); // mane
      v.box(0.5, 1.24, -0.09, 0.05, 0.1, 0.06, '#fbfbfb'); v.box(0.5, 1.24, 0.09, 0.05, 0.1, 0.06, '#fbfbfb');
      v.box(-0.5, 0.66, 0, 0.06, 0.3, 0.06, '#2b2b33');
      eyes(v, 0.66, 1.12, 0, 0.1, 0.04);
      const L = 0.48;
      return { body: v.build(), legs: [leg(0.34, 0.48, -0.14, 0.1, L, '#fbfbfb'), leg(0.34, 0.48, 0.14, 0.1, L, '#fbfbfb'), leg(-0.34, 0.48, -0.14, 0.1, L, '#fbfbfb'), leg(-0.34, 0.48, 0.14, 0.1, L, '#fbfbfb')] };
    },
  },
  giraffe: {
    speed: [2.0, 2.8], half: 0.55, group: [1, 2], gap: [1.4, 2.4], bob: 0.03, stride: 5,
    build() {
      const v = new Voxels();
      v.box(0, 0.86, 0, 0.94, 0.44, 0.46, '#f4c95d');
      const spots = [[-0.3, 0.9, 0.24], [0.1, 0.8, 0.24], [0.3, 0.96, -0.24], [-0.1, 1.0, -0.24], [-0.32, 0.78, -0.24]];
      for (const [x, y, z] of spots) v.box(x, y, z, 0.16, 0.14, 0.02, '#b5651d');
      v.box(0.38, 1.36, 0, 0.2, 0.7, 0.2, '#f4c95d'); // neck
      v.box(0.42, 1.2, 0.11, 0.12, 0.12, 0.02, '#b5651d'); v.box(0.36, 1.5, -0.11, 0.12, 0.12, 0.02, '#b5651d');
      v.box(0.36, 1.06, 0, 0.16, 0.7, 0.04, '#8b4513'); // mane
      v.box(0.52, 1.78, 0, 0.32, 0.2, 0.22, '#f4c95d'); // head
      v.box(0.66, 1.74, 0, 0.06, 0.1, 0.14, '#8b6b3a');
      v.box(0.44, 1.96, -0.07, 0.05, 0.14, 0.05, '#8b4513'); v.box(0.44, 1.96, 0.07, 0.05, 0.14, 0.05, '#8b4513'); // ossicones
      v.box(0.48, 1.86, -0.16, 0.06, 0.06, 0.1, '#f4c95d'); v.box(0.48, 1.86, 0.16, 0.06, 0.06, 0.1, '#f4c95d');
      v.box(-0.5, 0.86, 0, 0.06, 0.34, 0.06, '#f4c95d'); v.box(-0.5, 0.66, 0, 0.08, 0.08, 0.08, '#8b4513');
      eyes(v, 0.6, 1.82, 0, 0.1, 0.04);
      const L = 0.64;
      return { body: v.build(), legs: [leg(0.34, 0.64, -0.15, 0.1, L, '#f4c95d'), leg(0.34, 0.64, 0.15, 0.1, L, '#f4c95d'), leg(-0.34, 0.64, -0.15, 0.1, L, '#f4c95d'), leg(-0.34, 0.64, 0.15, 0.1, L, '#f4c95d')] };
    },
  },
  elephant: {
    speed: [1.2, 1.8], half: 0.8, group: [1, 1], gap: [2.0, 3.2], bob: 0.02, stride: 4,
    build() {
      const v = new Voxels();
      v.box(0, 0.78, 0, 1.3, 0.72, 0.7, '#9aa3ad');
      v.box(0.66, 0.92, 0, 0.5, 0.56, 0.56, '#9aa3ad'); // head
      v.box(0.7, 0.98, -0.36, 0.34, 0.4, 0.06, '#8791a0'); v.box(0.7, 0.98, 0.36, 0.34, 0.4, 0.06, '#8791a0'); // ears
      v.box(0.88, 0.7, 0, 0.16, 0.5, 0.16, '#9aa3ad'); v.box(0.92, 0.42, 0, 0.16, 0.16, 0.16, '#8791a0'); // trunk
      v.box(0.86, 0.72, -0.16, 0.06, 0.06, 0.2, '#fdfdfd'); v.box(0.86, 0.72, 0.16, 0.06, 0.06, 0.2, '#fdfdfd'); // tusks
      v.box(-0.68, 0.8, 0, 0.06, 0.34, 0.06, '#9aa3ad');
      eyes(v, 0.9, 1.06, 0, 0.16, 0.05);
      const L = 0.42;
      return { body: v.build(), legs: [leg(0.42, 0.42, -0.24, 0.2, L, '#9aa3ad', '#7d8794'), leg(0.42, 0.42, 0.24, 0.2, L, '#9aa3ad', '#7d8794'), leg(-0.42, 0.42, -0.24, 0.2, L, '#9aa3ad', '#7d8794'), leg(-0.42, 0.42, 0.24, 0.2, L, '#9aa3ad', '#7d8794')] };
    },
  },
  buffalo: {
    speed: [12, 12], half: 0.62, group: [6, 6], gap: [0.4, 0.4], bob: 0.06, stride: 3,
    build() {
      const v = new Voxels();
      v.box(0, 0.7, 0, 1.1, 0.56, 0.56, '#4a2f1d');
      v.box(0.16, 0.98, 0, 0.5, 0.18, 0.5, '#3a2416'); // hump
      v.box(0.56, 0.72, 0, 0.34, 0.4, 0.44, '#3a2416'); // head
      v.box(0.7, 0.62, 0, 0.08, 0.14, 0.24, '#2b1a10');
      v.box(0.5, 0.96, -0.26, 0.08, 0.1, 0.16, '#e9d8a6'); v.box(0.5, 0.96, 0.26, 0.08, 0.1, 0.16, '#e9d8a6'); // horns
      v.box(0.5, 1.02, -0.32, 0.08, 0.12, 0.06, '#e9d8a6'); v.box(0.5, 1.02, 0.32, 0.08, 0.12, 0.06, '#e9d8a6');
      v.box(-0.56, 0.7, 0, 0.06, 0.3, 0.06, '#4a2f1d');
      eyes(v, 0.72, 0.8, 0, 0.14, 0.05);
      const L = 0.42;
      return { body: v.build(), legs: [leg(0.36, 0.42, -0.18, 0.13, L, '#3a2416'), leg(0.36, 0.42, 0.18, 0.13, L, '#3a2416'), leg(-0.36, 0.42, -0.18, 0.13, L, '#3a2416'), leg(-0.36, 0.42, 0.18, 0.13, L, '#3a2416')] };
    },
  },
};

// Weighted species pool by difficulty (0..1).
export function pickSpecies(diff) {
  const table = [
    ['chicken', 1.2], ['duck', 0.8], ['pig', 1.0], ['sheep', 1.0], ['goat', 0.6 + diff * 0.4],
    ['cow', 0.9], ['deer', 0.2 + diff * 1.4], ['zebra', 0.2 + diff * 1.0], ['giraffe', 0.3 + diff * 0.6], ['elephant', 0.3 + diff * 0.8],
  ];
  let total = table.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [id, w] of table) { r -= w; if (r <= 0) return id; }
  return 'pig';
}

// Prototype cache: build each species once, then clone per instance.
const protos = new Map();
export function buildAnimal(id) {
  if (!protos.has(id)) protos.set(id, SPECIES[id].build());
  const p = protos.get(id);
  const group = new THREE.Group();
  const body = p.body.clone();
  group.add(body);
  const legs = p.legs.map((l) => { const c = l.clone(); group.add(c); return c; });
  return { group, body, legs, spec: SPECIES[id], id };
}

// Runs the leg cycle. phase is in radians, driven by distance travelled so stride matches speed.
export function animateAnimal(a, phase) {
  const amp = 0.55;
  for (let i = 0; i < a.legs.length; i++) {
    const side = i % 2 === 0 ? 1 : -1;
    const pair = i < 2 ? 1 : -1;
    a.legs[i].rotation.z = Math.sin(phase + (side * pair > 0 ? 0 : Math.PI)) * amp;
  }
  a.body.position.y = Math.abs(Math.sin(phase)) * a.spec.bob;
  a.body.rotation.z = Math.sin(phase * 2) * 0.02;
}

// Eagle that snatches idle drivers. Wings flap around their root.
export function buildEagle() {
  const v = new Voxels();
  v.box(0, 0, 0, 1.1, 0.34, 0.4, '#5b3a1e');
  v.box(0.6, 0.06, 0, 0.32, 0.3, 0.32, '#fdfdfd'); // head
  v.box(0.8, 0.02, 0, 0.14, 0.1, 0.12, '#ffb703'); // beak
  v.box(-0.66, 0.02, 0, 0.3, 0.1, 0.36, '#fdfdfd'); // tail
  v.box(0.2, -0.24, -0.1, 0.06, 0.16, 0.06, '#ffb703'); v.box(0.2, -0.24, 0.1, 0.06, 0.16, 0.06, '#ffb703');
  eyes(v, 0.7, 0.12, 0, 0.14, 0.05);
  const body = v.build();
  const wing = (sign) => {
    const w = new Voxels();
    w.box(0, 0, sign * 0.55, 0.7, 0.08, 1.1, '#6b4423');
    w.box(-0.1, 0, sign * 0.95, 0.5, 0.06, 0.4, '#4a2f1d');
    const m = w.build();
    m.position.set(0, 0.1, sign * 0.2);
    return m;
  };
  const group = new THREE.Group();
  const wings = [wing(1), wing(-1)];
  group.add(body, ...wings);
  return { group, wings };
}
