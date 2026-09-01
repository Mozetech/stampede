import * as THREE from 'three';
import { rand, randInt, pick, clamp } from './voxel.js';
import { SPECIES, pickSpecies, buildAnimal, animateAnimal } from './animals.js';
import { HALF, PLAY, grassLane, roadLane, riverLane, trackLane, warningPost, tree, rock, bush, log, coin } from './scenery.js';

const LOOP = HALF * 2 + 8; // conveyor length for traffic

export class World {
  constructor(scene) {
    this.scene = scene;
    this.lanes = new Map();
    this.reset();
  }
  reset() {
    for (const lane of this.lanes.values()) this.destroy(lane);
    this.lanes.clear();
    this.nextRow = -22;
    this.run = { type: 'grass', left: 27 };
    this.prevFree = null;
    this.lastType = 'grass';
    this.onWarn = null;
  }
  lane(row) { return this.lanes.get(row); }
  difficulty(row) { return clamp(row / 160, 0, 1); }

  ensure(upTo) { while (this.nextRow <= upTo) this.generate(this.nextRow++); }
  prune(below) {
    for (const [row, lane] of this.lanes) if (row < below) { this.destroy(lane); this.lanes.delete(row); }
  }
  destroy(lane) {
    this.scene.remove(lane.group);
    lane.group.traverse((o) => { if (o.userData.own && o.geometry) o.geometry.dispose(); });
  }

  chooseRun(row) {
    const d = this.difficulty(row);
    const options = [
      ['grass', 1.0, [1, 3]],
      ['road', 1.3, [1, 2 + Math.round(d * 3)]],
      ['river', 0.45 + d * 0.5, [1, 1 + Math.round(d * 2)]],
      ['track', 0.2 + d * 0.5, [1, 1]],
    ].filter(([t]) => t === 'grass' || t !== this.lastType);
    if (this.lastType !== 'grass' && Math.random() < 0.55) return { type: 'grass', left: randInt(1, 2) };
    const total = options.reduce((s, o) => s + o[1], 0);
    let r = Math.random() * total;
    for (const [type, w, [a, b]] of options) { r -= w; if (r <= 0) return { type, left: randInt(a, b) }; }
    return { type: 'grass', left: 1 };
  }

  generate(row) {
    if (this.run.left <= 0) { this.lastType = this.run.type; this.run = this.chooseRun(row); }
    this.run.left--;
    const type = this.run.type;
    const group = new THREE.Group();
    group.position.z = -row;
    const lane = { row, type, group, coins: new Map() };
    const d = this.difficulty(row);

    if (type === 'grass') this.makeGrass(lane, row, d);
    else if (type === 'road') this.makeRoad(lane, row, d);
    else if (type === 'river') this.makeRiver(lane, row, d);
    else this.makeTrack(lane, row, d);

    this.scene.add(group);
    this.lanes.set(row, lane);
    // Road dashes depend on neighbours, so refresh the previous lane's ground when needed.
    const prev = this.lanes.get(row - 1);
    if (prev && prev.type === 'road') this.refreshRoad(prev);
    if (type === 'road') this.refreshRoad(lane);
  }

  addCoin(lane, col) {
    const c = coin(); c.position.x = col; lane.group.add(c); lane.coins.set(col, c);
  }

  makeGrass(lane, row, d) {
    const g = grassLane(row); g.userData.own = true; lane.group.add(g);
    lane.blocked = new Set();
    // Dense forest beyond the playable strip.
    for (let col = -HALF; col <= HALF; col++) {
      if (Math.abs(col) <= PLAY) continue;
      if (Math.random() < 0.85) { const t = tree(); t.position.x = col; lane.group.add(t); }
      lane.blocked.add(col);
    }
    const free = new Set();
    const density = row < 0 ? 0.55 : row < 3 ? 0 : row < 8 ? 0.12 : 0.18 + d * 0.16;
    for (let col = -PLAY; col <= PLAY; col++) {
      const nearStart = row >= 0 && row < 6 && Math.abs(col) < 2;
      if (!nearStart && Math.random() < density) {
        const r = Math.random();
        const m = r < 0.7 ? tree() : r < 0.85 ? rock() : bush();
        m.position.x = col; lane.group.add(m);
        lane.blocked.add(col);
      } else free.add(col);
    }
    // Never seal the path: keep at least one cell open that was open on the previous grass row.
    if (row >= 0 && this.prevFree && ![...free].some((c) => this.prevFree.has(c))) {
      const col = pick([...this.prevFree]);
      const obj = lane.group.children.find((o) => o.position.x === col && o !== g);
      if (obj) lane.group.remove(obj);
      lane.blocked.delete(col); free.add(col);
    }
    if (row >= 0 && free.size < 4) { for (const col of [...lane.blocked].filter((c) => Math.abs(c) <= PLAY).slice(0, 3)) { const obj = lane.group.children.find((o) => o.position.x === col && o !== g); if (obj) lane.group.remove(obj); lane.blocked.delete(col); free.add(col); } }
    this.prevFree = row < 0 ? null : free;
    if (row > 2) for (const col of free) if (Math.random() < 0.06) this.addCoin(lane, col);
  }

  refreshRoad(lane) {
    const far = this.lanes.get(lane.row + 1)?.type === 'road';
    const near = this.lanes.get(lane.row - 1)?.type === 'road';
    if (lane.ground) { lane.group.remove(lane.ground); lane.ground.geometry.dispose(); }
    lane.ground = roadLane(far, near); lane.ground.userData.own = true; lane.group.add(lane.ground);
  }

  makeRoad(lane, row, d) {
    this.prevFree = null;
    const prev = this.lanes.get(row - 1);
    lane.dir = prev?.type === 'road' ? (Math.random() < 0.7 ? -prev.dir : prev.dir) : (Math.random() < 0.5 ? 1 : -1);
    const id = pickSpecies(d);
    const spec = SPECIES[id];
    lane.speed = rand(spec.speed[0], spec.speed[1]) * (1 + d * 0.45);
    lane.animals = [];
    lane.time = rand(0, 100);
    const minGap = Math.max(1.9, 2.8 - d * 0.9);
    let cursor = 0;
    let guard = 0;
    while (cursor < LOOP && guard++ < 40) {
      const n = randInt(spec.group[0], spec.group[1]);
      const groupLen = n * spec.half * 2 + (n - 1) * rand(spec.gap[0], spec.gap[1]);
      if (cursor + groupLen + minGap > LOOP) break;
      let x = cursor;
      for (let i = 0; i < n; i++) {
        const a = buildAnimal(id);
        a.group.rotation.y = lane.dir > 0 ? 0 : Math.PI;
        a.group.userData.share = true;
        lane.group.add(a.group);
        lane.animals.push({ a, x0: x + spec.half, half: spec.half, phase: rand(0, 6) });
        x += spec.half * 2 + rand(spec.gap[0], spec.gap[1]);
      }
      cursor += groupLen + rand(minGap, minGap + 4 - d * 1.5);
    }
    if (Math.random() < 0.2) this.addCoin(lane, randInt(-PLAY, PLAY));
    this.positionTraffic(lane);
  }

  makeRiver(lane, row, d) {
    this.prevFree = null;
    const g = riverLane(); g.userData.own = true; lane.group.add(g);
    const prev = this.lanes.get(row - 1);
    lane.dir = prev?.type === 'river' ? -prev.dir : (Math.random() < 0.5 ? 1 : -1);
    lane.speed = rand(1.2, 2.0) + d * 1.4;
    lane.logs = [];
    lane.time = rand(0, 100);
    const minGap = Math.max(1.4, 2.6 - d);
    let cursor = 0, guard = 0;
    while (cursor < LOOP && guard++ < 20) {
      const len = randInt(2, 4 - Math.round(d));
      if (cursor + len + minGap > LOOP) break;
      const m = log(len); m.userData.own = true; lane.group.add(m);
      lane.logs.push({ m, x0: cursor + len / 2, len, bobPhase: rand(0, 6) });
      cursor += len + rand(minGap, minGap + 3);
    }
    this.positionTraffic(lane);
  }

  makeTrack(lane, row, d) {
    this.prevFree = null;
    const g = trackLane(); g.userData.own = true; lane.group.add(g);
    lane.dir = Math.random() < 0.5 ? 1 : -1;
    lane.state = 'idle';
    lane.timer = rand(2.5, 6);
    lane.posts = [];
    for (const x of [-PLAY - 1, PLAY + 1]) {
      const p = warningPost(); p.group.position.set(x, 0, 0.42); lane.group.add(p.group); lane.posts.push(p);
    }
    lane.herd = [];
    for (let i = 0; i < 6; i++) {
      const a = buildAnimal('buffalo');
      a.group.rotation.y = lane.dir > 0 ? 0 : Math.PI;
      a.group.visible = false;
      lane.group.add(a.group);
      lane.herd.push({ a, offset: -i * 1.5 + (i % 2) * 0.3, z: (i % 2 ? 0.18 : -0.18) });
    }
    lane.herdX = 0;
  }

  positionTraffic(lane) {
    const items = lane.animals || lane.logs;
    const shift = lane.time * lane.speed * lane.dir;
    for (const it of items) {
      let x = ((it.x0 + shift) % LOOP + LOOP) % LOOP - LOOP / 2;
      it.x = x;
      const obj = it.a ? it.a.group : it.m;
      obj.position.x = x;
    }
  }

  update(dt, playerRow, audio) {
    for (const lane of this.lanes.values()) {
      if (lane.type === 'road') {
        lane.time += dt;
        this.positionTraffic(lane);
        const phase = lane.time * lane.speed * lane.animals[0]?.a.spec.stride;
        for (const it of lane.animals) animateAnimal(it.a, phase + it.phase);
      } else if (lane.type === 'river') {
        lane.time += dt;
        this.positionTraffic(lane);
        for (const it of lane.logs) { it.m.position.y = Math.sin(lane.time * 2 + it.bobPhase) * 0.02; it.m.rotation.x = Math.sin(lane.time * 1.5 + it.bobPhase) * 0.03; }
      } else if (lane.type === 'track') {
        this.updateTrack(lane, dt, playerRow, audio);
      }
      for (const c of lane.coins.values()) { c.rotation.z += dt * 3; c.position.y = 0.45 + Math.sin(performance.now() / 300 + c.position.x) * 0.05; }
    }
  }

  updateTrack(lane, dt, playerRow, audio) {
    lane.timer -= dt;
    if (lane.state === 'idle' && lane.timer <= 0) {
      lane.state = 'warn'; lane.timer = 1.6;
      if (Math.abs(lane.row - playerRow) < 6) audio?.play('stampede', { vol: 0.7 });
    } else if (lane.state === 'warn') {
      const on = Math.floor(lane.timer * 6) % 2 === 0;
      for (const p of lane.posts) p.lamps.forEach((l, i) => l.material.color.set(on === (i === 0) ? '#ff2d2d' : '#5a1a1a'));
      if (lane.timer <= 0) {
        lane.state = 'run'; lane.timer = 0;
        lane.herdX = lane.dir > 0 ? -HALF - 3 : HALF + 3;
        for (const h of lane.herd) h.a.group.visible = true;
      }
    } else if (lane.state === 'run') {
      lane.timer += dt;
      lane.herdX += lane.dir * 13 * dt;
      const phase = lane.timer * 13 * 3;
      for (const h of lane.herd) {
        h.a.group.position.set(lane.herdX + h.offset * lane.dir, 0, h.z);
        animateAnimal(h.a, phase + h.offset);
      }
      const tailX = lane.herdX - lane.dir * 9;
      if ((lane.dir > 0 && tailX > HALF + 3) || (lane.dir < 0 && tailX < -HALF - 3)) {
        lane.state = 'idle'; lane.timer = rand(3, 8);
        for (const h of lane.herd) h.a.group.visible = false;
        for (const p of lane.posts) p.lamps.forEach((l) => l.material.color.set('#5a1a1a'));
      }
    }
  }

  // Collision helpers -----------------------------------------------------------
  // Returns { hit: 'animal' | 'buffalo' } or null for a point (x, z world).
  hitAt(x, z) {
    const row = Math.round(-z);
    for (const r of [row - 1, row, row + 1]) {
      const lane = this.lanes.get(r);
      if (!lane) continue;
      const dz = Math.abs(z + r);
      if (dz > 0.55) continue;
      if (lane.type === 'road') {
        for (const it of lane.animals) if (Math.abs(x - it.x) < it.half + 0.28) return { hit: 'animal', dir: lane.dir, speed: lane.speed, species: it.a.id };
      } else if (lane.type === 'track' && lane.state === 'run') {
        for (const h of lane.herd) if (Math.abs(x - h.a.group.position.x) < 0.62 + 0.28) return { hit: 'buffalo', dir: lane.dir, speed: 13 };
      }
    }
    return null;
  }
  logAt(row, x) {
    const lane = this.lanes.get(row);
    if (!lane || lane.type !== 'river') return null;
    for (const it of lane.logs) if (Math.abs(x - it.x) <= it.len / 2 + 0.05) return it;
    return null;
  }
  blocked(row, col) {
    const lane = this.lanes.get(row);
    if (!lane) return Math.abs(col) > PLAY;
    if (Math.abs(col) > PLAY) return true;
    return lane.type === 'grass' && lane.blocked.has(col);
  }
  takeCoin(row, x) {
    const lane = this.lanes.get(row);
    if (!lane || !lane.coins.size) return false;
    const col = Math.round(x);
    const c = lane.coins.get(col);
    if (!c || Math.abs(x - col) > 0.5) return false;
    lane.group.remove(c); lane.coins.delete(col);
    return true;
  }
}
