import * as THREE from 'three';
import { Voxels, MAT, MAT_FLAT, colorize, rand, pick } from './voxel.js';

export const HALF = 16;        // rendered half-width in cells
export const PLAY = 6;         // playable half-width
const W = HALF * 2 + 1;

export const C = {
  grassA: '#9ed36a', grassB: '#93cb60', grassEdge: '#7fb955',
  road: '#4d4d5c', roadEdge: '#3f3f4c', dash: '#f5f0dc',
  water: '#59c3f5', waterDeep: '#3ea9e0', ripple: '#8fdcff',
  dirt: '#d3ad73', dirtDark: '#b8925c', hoof: '#a67f4c',
  trunk: '#8a5a2b', leafA: '#4f9d3c', leafB: '#5fae47', leafC: '#3f8a31', rock: '#9aa3ad', rockDark: '#7d8794',
  log: '#8b5a2b', logEnd: '#c68b4b', logDark: '#6e4520', coin: '#ffc300', coinDark: '#e0a300',
};

// Lane ground blocks. Each returns one merged mesh spanning the full width.
export function grassLane(row, forestCols) {
  const v = new Voxels();
  const c = row % 2 ? C.grassA : C.grassB;
  v.box(0, -0.25, 0, W, 0.5, 1, c);
  // Slight darker strips beyond the playable area to hint at the forest edge.
  v.box(-(PLAY + 1 + HALF) / 2 - 0.5, 0.005, 0, HALF - PLAY, 0.02, 1, C.grassEdge);
  v.box((PLAY + 1 + HALF) / 2 + 0.5, 0.005, 0, HALF - PLAY, 0.02, 1, C.grassEdge);
  return v.build();
}
export function roadLane(dashFar, dashNear) {
  const v = new Voxels();
  v.box(0, -0.27, 0, W, 0.5, 1, C.road);
  const dash = (z) => { for (let x = -HALF; x <= HALF; x += 1.2) v.box(x, -0.015, z, 0.55, 0.01, 0.07, C.dash); };
  if (dashFar) dash(-0.5); if (dashNear) dash(0.5);
  if (!dashFar) v.box(0, -0.015, -0.47, W, 0.01, 0.06, C.roadEdge);
  if (!dashNear) v.box(0, -0.015, 0.47, W, 0.01, 0.06, C.roadEdge);
  return v.build();
}
export function riverLane() {
  const v = new Voxels();
  v.box(0, -0.4, 0, W, 0.4, 1, C.water);
  for (let i = 0; i < 6; i++) v.box(rand(-HALF, HALF), -0.195, rand(-0.35, 0.35), rand(0.5, 1.1), 0.01, 0.06, C.ripple);
  return v.build();
}
export function trackLane() {
  const v = new Voxels();
  v.box(0, -0.27, 0, W, 0.5, 1, C.dirt);
  v.box(0, -0.015, -0.47, W, 0.01, 0.06, C.dirtDark); v.box(0, -0.015, 0.47, W, 0.01, 0.06, C.dirtDark);
  for (let x = -HALF; x <= HALF; x += 0.9) { v.box(x, -0.015, -0.18, 0.12, 0.01, 0.16, C.hoof); v.box(x + 0.4, -0.015, 0.18, 0.12, 0.01, 0.16, C.hoof); }
  return v.build();
}

// Warning post with a lamp. The lamp is a separate flat-shaded mesh so it can blink.
export function warningPost() {
  const v = new Voxels();
  v.box(0, 0.4, 0, 0.12, 0.8, 0.12, '#f4f4f8');
  v.box(0, 0.86, 0, 0.36, 0.28, 0.16, '#2b2b33');
  const post = v.build();
  const lamp = new THREE.Mesh(colorize(new THREE.BoxGeometry(0.12, 0.12, 0.05), '#5a1a1a', false), MAT_FLAT.clone());
  lamp.position.set(0, 0.86, 0.1);
  const lamp2 = lamp.clone(); lamp2.position.z = -0.1;
  const g = new THREE.Group(); g.add(post, lamp, lamp2);
  return { group: g, lamps: [lamp, lamp2] };
}

const treeProtos = [];
export function tree() {
  if (!treeProtos.length) {
    for (let i = 0; i < 6; i++) {
      const v = new Voxels();
      const h = 0.4 + i * 0.16;
      v.up(0, 0, 0, 0.26, h, 0.26, C.trunk);
      const leaf = pick([C.leafA, C.leafB, C.leafC]);
      if (i % 3 === 0) { v.up(0, h, 0, 0.8, 0.5, 0.8, leaf); v.up(0, h + 0.5, 0, 0.6, 0.4, 0.6, leaf); v.up(0, h + 0.9, 0, 0.36, 0.3, 0.36, leaf); }
      else if (i % 3 === 1) { v.up(0, h, 0, 0.7, 0.9, 0.7, leaf); v.up(0, h + 0.9, 0, 0.4, 0.3, 0.4, leaf); }
      else { v.up(0, h, 0, 0.84, 0.36, 0.84, leaf); v.up(0, h + 0.36, 0, 0.66, 0.36, 0.66, leaf); v.up(0, h + 0.72, 0, 0.4, 0.32, 0.4, leaf); }
      treeProtos.push(v.build());
    }
  }
  const m = pick(treeProtos).clone();
  m.rotation.y = Math.floor(Math.random() * 4) * Math.PI / 2;
  return m;
}
let rockProto, bushProto;
export function rock() {
  if (!rockProto) { const v = new Voxels(); v.up(0, 0, 0, 0.6, 0.34, 0.5, C.rock); v.up(0.12, 0.34, -0.06, 0.3, 0.16, 0.26, C.rockDark); v.up(-0.16, 0.2, 0.14, 0.24, 0.18, 0.22, C.rockDark); rockProto = v.build(); }
  const m = rockProto.clone(); m.rotation.y = Math.floor(Math.random() * 4) * Math.PI / 2; return m;
}
export function bush() {
  if (!bushProto) { const v = new Voxels(); v.up(0, 0, 0, 0.5, 0.3, 0.44, C.leafB); v.up(0.14, 0.2, 0.1, 0.3, 0.22, 0.3, C.leafA); v.up(-0.14, 0.24, -0.1, 0.26, 0.2, 0.26, C.leafC); bushProto = v.build(); }
  const m = bushProto.clone(); m.rotation.y = Math.floor(Math.random() * 4) * Math.PI / 2; return m;
}

export function log(len) {
  const v = new Voxels();
  v.box(0, -0.1, 0, len - 0.12, 0.34, 0.62, C.log);
  v.box(-(len - 0.12) / 2, -0.1, 0, 0.04, 0.3, 0.56, C.logEnd); v.box((len - 0.12) / 2, -0.1, 0, 0.04, 0.3, 0.56, C.logEnd);
  v.box(0, 0.075, 0, len - 0.3, 0.02, 0.12, C.logDark);
  return v.build();
}

let coinProto;
export function coin() {
  if (!coinProto) {
    const v = new Voxels();
    v.cyl(0, 0, 0, 0.24, 0.07, C.coin, 14, 'z');
    v.cyl(0, 0, 0, 0.16, 0.09, C.coinDark, 12, 'z');
    v.box(0, 0, 0, 0.06, 0.18, 0.1, C.coin);
    coinProto = v.build();
    coinProto.receiveShadow = false;
  }
  const m = coinProto.clone();
  m.position.y = 0.45;
  return m;
}

// Tiny cube particles used for dust, splashes and coin sparkles.
export class Particles {
  constructor(scene, n = 120) {
    this.pool = [];
    this.geo = new THREE.BoxGeometry(1, 1, 1);
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(this.geo, new THREE.MeshLambertMaterial({ color: '#fff' }));
      m.visible = false; m.castShadow = false;
      scene.add(m);
      this.pool.push({ m, life: 0, vel: new THREE.Vector3(), size: 0.1, grav: 0 });
    }
    this.i = 0;
  }
  burst(pos, { count = 8, color = '#ffffff', speed = 2, size = 0.12, life = 0.5, up = 2, grav = 6, spread = 0.2 } = {}) {
    for (let k = 0; k < count; k++) {
      const p = this.pool[this.i = (this.i + 1) % this.pool.length];
      p.m.visible = true;
      p.m.material.color.set(color);
      p.m.position.set(pos.x + rand(-spread, spread), pos.y, pos.z + rand(-spread, spread));
      p.vel.set(rand(-speed, speed), rand(up * 0.4, up), rand(-speed, speed));
      p.life = p.maxLife = life * rand(0.7, 1.2);
      p.size = size * rand(0.7, 1.3);
      p.grav = grav;
      p.m.rotation.set(rand(0, 3), rand(0, 3), 0);
    }
  }
  update(dt) {
    for (const p of this.pool) {
      if (!p.m.visible) continue;
      p.life -= dt;
      if (p.life <= 0) { p.m.visible = false; continue; }
      p.vel.y -= p.grav * dt;
      p.m.position.addScaledVector(p.vel, dt);
      if (p.m.position.y < 0.02) { p.m.position.y = 0.02; p.vel.y *= -0.3; p.vel.x *= 0.8; p.vel.z *= 0.8; }
      const s = p.size * Math.min(1, p.life / p.maxLife * 2);
      p.m.scale.setScalar(Math.max(0.001, s));
      p.m.rotation.x += dt * 4;
    }
  }
}
