// Small secondary renderer used for garage thumbnails and the rotating showcase car.
import * as THREE from 'three';
import { buildCar, CAR_BY_ID } from './cars.js';

function makeScene() {
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#ffffff', '#c9b28f', 1.0));
  const sun = new THREE.DirectionalLight('#fff7e6', 1.8); sun.position.set(3, 6, 4); scene.add(sun);
  const fill = new THREE.DirectionalLight('#dfe9ff', 0.6); fill.position.set(-4, 2, -3); scene.add(fill);
  const cam = new THREE.OrthographicCamera(-0.9, 0.9, 0.9, -0.9, 0.1, 50);
  cam.position.set(2.2, 2.0, 2.6); cam.lookAt(0, 0.22, 0);
  return { scene, cam };
}

export class Preview {
  constructor() {
    this.thumbs = new Map();
    this.thumbCanvas = document.createElement('canvas');
    this.thumbRenderer = new THREE.WebGLRenderer({ canvas: this.thumbCanvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    this.thumbRenderer.setPixelRatio(2);
    this.thumbRenderer.setSize(160, 160, false);
    this.thumbRenderer.setClearColor(0x000000, 0);
    const s = makeScene(); this.tScene = s.scene; this.tCam = s.cam;
    this.live = null;
  }
  thumb(id) {
    if (this.thumbs.has(id)) return this.thumbs.get(id);
    const car = buildCar(CAR_BY_ID[id]);
    car.group.rotation.y = 0.5;
    this.tScene.add(car.group);
    this.thumbRenderer.render(this.tScene, this.tCam);
    const url = this.thumbCanvas.toDataURL('image/png');
    this.tScene.remove(car.group);
    car.group.traverse((o) => o.geometry?.dispose());
    this.thumbs.set(id, url);
    return url;
  }
  attach(canvas) {
    if (this.live) return;
    this.liveRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.liveRenderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.liveRenderer.setClearColor(0x000000, 0);
    const s = makeScene(); this.lScene = s.scene; this.lCam = s.cam;
    this.live = { canvas, car: null, id: null, spin: 0.6, kick: 0 };
  }
  showCar(id) {
    if (!this.live) return;
    const l = this.live;
    if (l.car) { this.lScene.remove(l.car.group); l.car.group.traverse((o) => o.geometry?.dispose()); }
    l.car = buildCar(CAR_BY_ID[id]); l.id = id; l.kick = 1;
    this.lScene.add(l.car.group);
  }
  render(dt, active) {
    if (!this.live || !active || !this.live.car) return;
    const l = this.live;
    const w = l.canvas.clientWidth, h = l.canvas.clientHeight;
    if (l.canvas.width !== Math.round(w * this.liveRenderer.getPixelRatio())) this.liveRenderer.setSize(w, h, false);
    const aspect = w / h;
    this.lCam.left = -0.95 * aspect; this.lCam.right = 0.95 * aspect; this.lCam.top = 0.95; this.lCam.bottom = -0.95; this.lCam.updateProjectionMatrix();
    l.spin += dt * 0.9;
    l.kick = Math.max(0, l.kick - dt * 2.5);
    l.car.group.rotation.y = l.spin;
    const s = 1 + Math.sin(l.kick * Math.PI) * 0.12;
    l.car.group.scale.set(s, 1 / s + 0.0, s);
    l.car.group.position.y = Math.abs(Math.sin(performance.now() / 350)) * 0.03;
    for (const wh of l.car.wheels) wh.rotation.x -= dt * 4;
    this.liveRenderer.render(this.lScene, this.lCam);
  }
}
