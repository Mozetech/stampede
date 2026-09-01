import * as THREE from 'three';
import { World } from './world.js';
import { buildCar, CAR_BY_ID } from './cars.js';
import { buildEagle } from './animals.js';
import { Particles, PLAY, HALF } from './scenery.js';
import { Input } from './input.js';
import { audio } from './audio.js';
import { save, addCoins, recordScore } from './store.js';
import { damp, clamp, lerp } from './voxel.js';

const HOP_TIME = 0.16;
const HOP_HEIGHT = 0.42;
const CAM_OFFSET = new THREE.Vector3(5.5, 14, 11);
const BG = '#e9f3ff';

export class Game {
  constructor(canvas, ui) {
    this.ui = ui;
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(BG);
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 120);
    this.camTarget = new THREE.Vector3(0, 0, 0);
    this.camPos = new THREE.Vector3(0, 0, 0);

    this.scene.add(new THREE.HemisphereLight('#ffffff', '#b8d4a8', 0.9));
    const amb = new THREE.AmbientLight('#ffffff', 0.25); this.scene.add(amb);
    this.sun = new THREE.DirectionalLight('#fff7e6', 1.6);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera; sc.left = -16; sc.right = 16; sc.top = 16; sc.bottom = -16; sc.near = 1; sc.far = 80;
    this.sun.shadow.bias = -0.0004; this.sun.shadow.normalBias = 0.02;
    this.sunTarget = new THREE.Object3D();
    this.scene.add(this.sun, this.sunTarget);
    this.sun.target = this.sunTarget;

    this.world = new World(this.scene);
    this.particles = new Particles(this.scene);
    this.player = new THREE.Group(); this.scene.add(this.player);
    this.carHolder = new THREE.Group(); this.player.add(this.carHolder);
    this.car = null;
    this.eagle = buildEagle(); this.eagle.group.visible = false; this.scene.add(this.eagle.group);

    this.state = 'title';
    this.input = new Input(canvas, (d) => this.onDir(d), () => audio.unlock());
    this.resize();
    window.addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => { this.hidden = document.hidden; this.last = performance.now(); });
    this.setCar(save.selected);
    this.resetRun();
    this.last = performance.now();
    this.shake = 0;
    requestAnimationFrame((t) => this.frame(t));
  }

  resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h, false);
    const aspect = w / h;
    // Keep ~15 cells visible across the short axis so phones see enough of the lane.
    const d = aspect < 1 ? 6.8 / aspect : 8.2;
    this.camera.left = -d * aspect; this.camera.right = d * aspect; this.camera.top = d; this.camera.bottom = -d;
    this.camera.zoom = aspect < 1 ? 1.05 : 1.45;
    this.camera.updateProjectionMatrix();
  }

  setCar(id) {
    if (this.car) { this.carHolder.remove(this.car.group); this.car.group.traverse((o) => o.geometry?.dispose()); }
    this.car = buildCar(CAR_BY_ID[id] || CAR_BY_ID.runabout);
    this.carHolder.add(this.car.group);
    this.carId = id;
  }

  resetRun() {
    this.world.reset();
    this.world.ensure(34);
    this.p = { x: 0, z: 0, row: 0, col: 0, hop: null, facing: 0, targetFacing: 0, sy: 1, syV: 0, y: 0, log: null, offset: 0, moved: false, idle: 0, queue: null };
    this.score = 0; this.coinsRun = 0; this.floorRow = 0; this.maxRow = 0;
    this.player.position.set(0, 0, 0); this.player.rotation.set(0, 0, 0); this.player.scale.set(1, 1, 1);
    this.carHolder.position.set(0, 0, 0); this.carHolder.rotation.set(0, 0, 0); this.carHolder.scale.set(1, 1, 1);
    this.eagle.group.visible = false;
    this.deathT = 0; this.death = null;
    this.camTarget.set(0, 0, 0);
    this.camPos.copy(CAM_OFFSET);
    this.ui.setHUD(0, this.coinsRun);
  }

  start() {
    this.resetRun();
    this.state = 'playing';
    this.ui.show('hud');
    audio.playMusic('theme');
    audio.duck(false);
  }
  toTitle() {
    this.resetRun();
    this.state = 'title';
    this.ui.show('title');
    audio.playMusic('menu');
    audio.duck(false);
  }

  onDir(d) {
    if (this.state === 'title') { if (this.ui.modalOpen()) return; this.start(); if (d !== 'up') return; }
    if (this.state !== 'playing') return;
    const p = this.p;
    if (p.hop) { p.queue = d; return; }
    this.tryHop(d);
  }

  tryHop(d) {
    const p = this.p;
    const dx = d === 'left' ? -1 : d === 'right' ? 1 : 0;
    const dr = d === 'up' ? 1 : d === 'down' ? -1 : 0;
    p.targetFacing = d === 'up' ? 0 : d === 'down' ? Math.PI : d === 'right' ? -Math.PI / 2 : Math.PI / 2;
    const fromX = p.x;
    const toCol = Math.round(p.x) + dx;
    const toRow = p.row + dr;
    if (toRow < 0 || this.world.blocked(toRow, toCol) || (dx !== 0 && Math.abs(toCol) > PLAY)) {
      // Bump against the obstacle: a little squash and a honk, no movement.
      p.sy = 0.8; p.syV = 0; audio.play('honk', { vol: 0.35, rate: 1.2 });
      p.hop = { from: { x: fromX, z: p.z }, to: { x: fromX + dx * 0.18, z: p.z - dr * 0.18 }, t: 0, dur: 0.12, bump: true, row: p.row };
      return;
    }
    p.log = null;
    p.hop = { from: { x: fromX, z: p.z }, to: { x: toCol, z: -toRow }, t: 0, dur: HOP_TIME, row: toRow };
    p.sy = 1.22; p.syV = 0;
    p.moved = true; p.idle = 0;
    audio.hop();
  }

  land() {
    const p = this.p;
    const h = p.hop;
    p.hop = null;
    if (h.bump) { p.x = h.from.x; p.z = h.from.z; return; }
    p.row = h.row; p.x = h.to.x; p.z = h.to.z;
    p.sy = 0.72; p.syV = 0;
    if (p.row > this.maxRow) { this.maxRow = p.row; this.score = p.row; this.ui.setHUD(this.score, this.coinsRun); }
    this.floorRow = Math.max(this.floorRow, p.row - 4);
    const lane = this.world.lane(p.row);
    if (lane?.type === 'river') {
      const log = this.world.logAt(p.row, p.x);
      if (log) { p.log = log; p.offset = p.x - log.x; this.particles.burst(new THREE.Vector3(p.x, 0.1, p.z), { count: 5, color: '#8fdcff', speed: 1, up: 1.5, size: 0.08, life: 0.4 }); }
      else return this.die('drown');
    } else {
      this.particles.burst(new THREE.Vector3(p.x, 0.05, p.z), { count: 5, color: lane?.type === 'grass' ? '#c8e6a0' : '#d9c7a8', speed: 1.2, up: 1.2, size: 0.09, life: 0.35, grav: 5 });
    }
    if (this.world.takeCoin(p.row, p.x)) this.collectCoin();
    if (p.queue) { const q = p.queue; p.queue = null; this.tryHop(q); }
  }

  collectCoin() {
    this.coinsRun += 1;
    addCoins(1);
    audio.coin();
    this.particles.burst(new THREE.Vector3(this.p.x, 0.5, this.p.z), { count: 10, color: '#ffc300', speed: 1.6, up: 2.6, size: 0.09, life: 0.5, grav: 7 });
    this.ui.setHUD(this.score, this.coinsRun);
    this.ui.coinPop();
  }

  die(reason, info = {}) {
    if (this.state !== 'playing') return;
    this.state = 'dying';
    this.death = { reason, t: 0, ...info };
    this.p.hop = null; this.p.queue = null;
    const pos = new THREE.Vector3(this.p.x, 0.2, this.p.z);
    if (reason === 'hit' || reason === 'trample') {
      audio.play('crash'); this.shake = 0.5;
      this.particles.burst(pos, { count: 16, color: '#2b2b33', speed: 3, up: 3.5, size: 0.11, life: 0.7, spread: 0.3 });
      this.particles.burst(pos, { count: 8, color: CAR_BY_ID[this.carId]?.paint || '#e63946', speed: 3, up: 4, size: 0.12, life: 0.8 });
    } else if (reason === 'drown' || reason === 'swept') {
      audio.play('splash'); this.particles.burst(pos, { count: 18, color: '#8fdcff', speed: 2, up: 3.5, size: 0.1, life: 0.7, spread: 0.3 });
    } else if (reason === 'eagle') {
      audio.play('eagle');
      const e = this.eagle.group; e.visible = true; e.position.set(this.p.x - 6, 9, this.p.z - 5); e.rotation.y = 0;
    }
    audio.duck(true);
  }

  finishRun() {
    this.state = 'over';
    const rank = recordScore(this.score, this.carId);
    const isBest = this.score > 0 && this.score >= save.best && rank === 0;
    if (isBest) audio.play('record');
    this.ui.showGameOver({ score: this.score, coins: this.coinsRun, reason: this.death.reason, best: save.best, rank, isBest, species: this.death.species });
  }

  triggerEagle() { this.die('eagle'); }

  update(dt) {
    const p = this.p;
    const playing = this.state === 'playing';
    this.world.update(dt, p.row, audio);
    this.particles.update(dt);

    if (playing) {
      // Hop interpolation.
      if (p.hop) {
        const h = p.hop; h.t += dt;
        const t = Math.min(1, h.t / h.dur);
        const e = h.bump ? Math.sin(t * Math.PI) : t;
        p.x = lerp(h.from.x, h.to.x, e); p.z = lerp(h.from.z, h.to.z, e);
        p.y = h.bump ? 0 : HOP_HEIGHT * 4 * t * (1 - t);
        for (const w of this.car.wheels) w.rotation.x -= dt * 18;
        if (t >= 1) this.land();
      } else if (p.log) {
        p.x = p.log.x + p.offset;
        p.y = p.log.m.position.y + 0.02;
        if (Math.abs(p.x) > PLAY + 1.6) return this.die('swept');
      } else p.y = 0;

      // Pressure from behind + idle eagle.
      if (p.moved) {
        this.floorRow += dt * (0.35 + Math.min(this.score, 250) * 0.004);
        p.idle += dt;
        if (p.idle > 6.5 || p.row < this.floorRow - 3.2) this.triggerEagle();
      }
      const hit = this.world.hitAt(p.x, p.z);
      if (hit) this.die(hit.hit === 'buffalo' ? 'trample' : 'hit', hit);
    }

    // Squash and stretch spring.
    const k = 220, c = 16;
    p.syV += (-(p.sy - 1) * k - p.syV * c) * dt; p.sy += p.syV * dt;
    const sy = clamp(p.sy, 0.4, 1.5);
    const sxz = 1 / Math.sqrt(sy);

    // Facing: shortest rotation.
    let diff = p.targetFacing - p.facing;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    p.facing += diff * Math.min(1, dt * 22);

    this.player.position.set(p.x, p.y, p.z);
    this.carHolder.rotation.y = p.facing;
    if (this.state === 'title') {
      const t = performance.now() / 1000;
      this.carHolder.position.y = Math.abs(Math.sin(t * 2.2)) * 0.04;
      this.carHolder.scale.set(1, 1 + Math.sin(t * 4.4) * 0.015, 1);
    } else if (this.state === 'playing') {
      this.carHolder.position.y = 0;
      this.carHolder.scale.set(sxz, sy, sxz);
    } else if (this.state === 'dying') this.updateDeath(dt);

    this.updateCamera(dt, playing);
  }

  updateDeath(dt) {
    const d = this.death; d.t += dt;
    const p = this.p; const ch = this.carHolder;
    if (d.reason === 'hit' || d.reason === 'trample') {
      const k = Math.min(1, d.t / 0.14);
      ch.scale.set(1 + k * 0.5, 1 - k * 0.72, 1 + k * 0.4);
      p.x += (d.dir || 1) * Math.max(0, 2.5 - d.t * 5) * dt * 2;
      ch.rotation.y += dt * 9 * Math.max(0, 1 - d.t);
      this.player.position.set(p.x, 0, p.z);
    } else if (d.reason === 'drown' || d.reason === 'swept') {
      this.player.position.y = -Math.min(0.9, d.t * 1.4);
      ch.rotation.x = Math.min(0.6, d.t);
      ch.rotation.z = Math.sin(d.t * 6) * 0.15;
    } else if (d.reason === 'eagle') {
      const e = this.eagle.group;
      const target = new THREE.Vector3(p.x, 0.55, p.z);
      if (d.t < 0.8) { e.position.lerp(target, Math.min(1, dt * 7)); e.rotation.z = -0.4; }
      else { e.position.y += dt * 6; e.position.x += dt * 4; e.position.z -= dt * 3; this.player.position.set(e.position.x, e.position.y - 0.5, e.position.z); e.rotation.z = 0; }
      const flap = Math.sin(d.t * 22) * 0.6;
      this.eagle.wings[0].rotation.x = flap; this.eagle.wings[1].rotation.x = -flap;
    }
    if (d.t > 1.35) this.finishRun();
  }

  updateCamera(dt, playing) {
    const p = this.p;
    const rowTarget = playing || this.state === 'dying' ? Math.max(-p.z, this.floorRow) : 0;
    const tx = clamp(p.x, -3.5, 3.5);
    const tz = this.state === 'title' ? 0.6 : -rowTarget - (innerWidth > innerHeight ? 2.4 : 1.5);
    this.camTarget.x = damp(this.camTarget.x, tx, 4, dt);
    this.camTarget.z = damp(this.camTarget.z, tz, playing ? 5 : 3, dt);
    const shake = this.shake > 0 ? this.shake : 0;
    this.shake = Math.max(0, this.shake - dt * 1.6);
    const jitter = shake * 0.25;
    this.camera.position.set(this.camTarget.x + CAM_OFFSET.x + (Math.random() - 0.5) * jitter, CAM_OFFSET.y, this.camTarget.z + CAM_OFFSET.z + (Math.random() - 0.5) * jitter);
    this.camera.lookAt(this.camTarget.x, 0, this.camTarget.z);
    this.sun.position.set(this.camTarget.x - 6, 18, this.camTarget.z + 4);
    this.sunTarget.position.set(this.camTarget.x, 0, this.camTarget.z);
    const camRow = -this.camTarget.z;
    this.world.ensure(Math.ceil(camRow) + 26);
    this.world.prune(Math.floor(camRow) - 19);
  }

  frame(t) {
    requestAnimationFrame((n) => this.frame(n));
    if (this.hidden) return;
    let dt = (t - this.last) / 1000; this.last = t;
    dt = Math.min(dt, 0.05);
    // Sub-step fast traffic so collisions never tunnel.
    const steps = dt > 0.025 ? 2 : 1;
    for (let i = 0; i < steps; i++) this.update(dt / steps);
    this.renderer.render(this.scene, this.camera);
  }
}
