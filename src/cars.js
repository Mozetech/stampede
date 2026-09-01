import * as THREE from 'three';
import { Voxels, MAT } from './voxel.js';

// Cars point down -Z (three.js forward). Length ~0.9, width ~0.56, so they sit inside one cell.
const GLASS = '#a9dcf5';
const DARK = '#2b2b33';
const TYRE = '#26262c';
const HUB = '#c9c9cf';
const LIGHT = '#fff4b0';
const TAIL = '#ff4b3a';

function wheelMesh(r = 0.12, w = 0.12) {
  const v = new Voxels();
  v.cyl(0, 0, 0, r, w, TYRE, 12, 'x');
  v.cyl(0, 0, 0, r * 0.55, w + 0.02, HUB, 8, 'x');
  const m = v.build();
  return m;
}

// Common chassis pieces -------------------------------------------------------
function lights(v, w, zf, zb, y) {
  v.box(-w / 2 + 0.07, y, zf, 0.1, 0.08, 0.03, LIGHT);
  v.box(w / 2 - 0.07, y, zf, 0.1, 0.08, 0.03, LIGHT);
  v.box(-w / 2 + 0.07, y, zb, 0.1, 0.07, 0.03, TAIL);
  v.box(w / 2 - 0.07, y, zb, 0.1, 0.07, 0.03, TAIL);
}
function windows(v, w, y, h, z, d, wrap = true) {
  // Slightly wider than the cabin so they read as inset glass strips.
  v.box(0, y, z, w + 0.02, h, d * 0.62, GLASS);
  if (wrap) v.box(0, y, z, w * 0.9, h, d + 0.02, GLASS);
}

// Body builders. Each returns { wheels: [{x, y, z, r, w}], length }
const BODIES = {
  hatch(v, c) {
    v.box(0, 0.22, 0, 0.56, 0.2, 0.9, c.paint);
    v.box(0, 0.4, -0.02, 0.5, 0.17, 0.52, c.paint);
    windows(v, 0.5, 0.41, 0.11, -0.02, 0.52);
    v.box(0, 0.5, -0.02, 0.44, 0.03, 0.4, c.roof || c.paint);
    v.box(0, 0.13, 0, 0.58, 0.05, 0.94, DARK);
    lights(v, 0.56, -0.45, 0.45, 0.24);
    return { wheels: std(0.28, 0.13) };
  },
  sedan(v, c) {
    v.box(0, 0.21, 0, 0.56, 0.18, 0.96, c.paint);
    v.box(0, 0.38, 0.03, 0.5, 0.16, 0.48, c.paint);
    windows(v, 0.5, 0.39, 0.1, 0.03, 0.48);
    v.box(0, 0.47, 0.03, 0.46, 0.03, 0.4, c.roof || c.paint);
    v.box(0, 0.12, 0, 0.58, 0.05, 1.0, DARK);
    lights(v, 0.56, -0.48, 0.48, 0.23);
    return { wheels: std(0.31, 0.12) };
  },
  sport(v, c) {
    v.box(0, 0.16, 0, 0.58, 0.14, 0.98, c.paint);
    v.box(0, 0.29, 0.05, 0.5, 0.12, 0.44, c.paint);
    windows(v, 0.5, 0.3, 0.08, 0.05, 0.44);
    v.box(0, 0.36, 0.05, 0.42, 0.02, 0.32, c.roof || DARK);
    v.box(0, 0.3, 0.44, 0.5, 0.03, 0.1, c.accent || DARK); // spoiler
    v.box(-0.2, 0.25, 0.44, 0.04, 0.08, 0.06, DARK); v.box(0.2, 0.25, 0.44, 0.04, 0.08, 0.06, DARK);
    v.box(0, 0.08, 0, 0.6, 0.05, 1.0, DARK);
    lights(v, 0.58, -0.49, 0.49, 0.18);
    return { wheels: std(0.3, 0.11) };
  },
  pickup(v, c) {
    v.box(0, 0.22, 0.1, 0.56, 0.2, 0.7, c.paint);
    v.box(0, 0.25, 0.22, 0.44, 0.1, 0.42, c.bed || '#5a4a3a'); // bed floor
    v.box(0, 0.42, -0.14, 0.52, 0.2, 0.36, c.paint);
    windows(v, 0.52, 0.44, 0.12, -0.14, 0.36);
    v.box(0, 0.53, -0.14, 0.46, 0.03, 0.3, c.roof || c.paint);
    v.box(0, 0.26, -0.33, 0.56, 0.12, 0.22, c.paint); // hood
    v.box(0, 0.13, 0, 0.58, 0.05, 0.94, DARK);
    lights(v, 0.56, -0.45, 0.45, 0.24);
    return { wheels: std(0.3, 0.14) };
  },
  van(v, c) {
    v.box(0, 0.3, 0, 0.58, 0.4, 0.94, c.paint);
    v.box(0, 0.35, 0, 0.6, 0.06, 0.96, c.accent || '#ffffff');
    windows(v, 0.58, 0.42, 0.1, -0.05, 0.6, false);
    v.box(0, 0.45, -0.46, 0.44, 0.1, 0.02, GLASS);
    v.box(0, 0.51, 0, 0.5, 0.03, 0.8, c.roof || c.paint);
    v.box(0, 0.12, 0, 0.6, 0.05, 0.98, DARK);
    lights(v, 0.58, -0.47, 0.47, 0.22);
    return { wheels: std(0.3, 0.13) };
  },
  truck(v, c) {
    v.box(0, 0.38, -0.2, 0.56, 0.36, 0.42, c.paint); // cab
    windows(v, 0.56, 0.46, 0.11, -0.2, 0.42, false);
    v.box(0, 0.5, -0.41, 0.44, 0.1, 0.02, GLASS);
    v.box(0, 0.34, 0.22, 0.6, 0.44, 0.5, c.accent || c.paint); // box
    v.box(0, 0.12, 0, 0.58, 0.05, 0.96, DARK);
    lights(v, 0.56, -0.41, 0.47, 0.26);
    return { wheels: std(0.3, 0.14) };
  },
  monster(v, c) {
    v.box(0, 0.5, 0.05, 0.54, 0.18, 0.7, c.paint);
    v.box(0, 0.66, -0.1, 0.48, 0.16, 0.36, c.paint);
    windows(v, 0.48, 0.67, 0.1, -0.1, 0.36);
    v.box(0, 0.76, -0.1, 0.42, 0.03, 0.3, c.roof || c.paint);
    v.box(0, 0.36, 0, 0.3, 0.12, 0.8, DARK); // frame
    v.box(0, 0.4, 0, 0.7, 0.05, 0.08, DARK); v.box(0, 0.4, 0.3, 0.7, 0.05, 0.08, DARK);
    lights(v, 0.54, -0.31, 0.4, 0.5);
    return { wheels: [{ x: -0.34, z: -0.28 }, { x: 0.34, z: -0.28 }, { x: -0.34, z: 0.28 }, { x: 0.34, z: 0.28 }].map((w) => ({ ...w, y: 0.24, r: 0.24, w: 0.16 })) };
  },
  tractor(v, c) {
    v.box(0, 0.28, -0.12, 0.42, 0.24, 0.5, c.paint); // engine
    v.box(0, 0.44, 0.15, 0.4, 0.3, 0.3, c.paint);
    v.box(0, 0.7, 0.15, 0.46, 0.04, 0.42, c.roof || DARK); // canopy
    v.box(-0.18, 0.56, 0.02, 0.04, 0.26, 0.04, DARK); v.box(0.18, 0.56, 0.02, 0.04, 0.26, 0.04, DARK);
    v.box(-0.18, 0.56, 0.3, 0.04, 0.26, 0.04, DARK); v.box(0.18, 0.56, 0.3, 0.04, 0.26, 0.04, DARK);
    v.box(0, 0.5, 0.16, 0.2, 0.1, 0.16, DARK); // seat
    v.cyl(0.14, 0.5, -0.3, 0.03, 0.2, DARK, 6); // exhaust
    lights(v, 0.42, -0.37, 0.3, 0.3);
    return { wheels: [{ x: -0.26, z: -0.25, y: 0.13, r: 0.13, w: 0.1 }, { x: 0.26, z: -0.25, y: 0.13, r: 0.13, w: 0.1 }, { x: -0.3, z: 0.22, y: 0.24, r: 0.24, w: 0.14 }, { x: 0.3, z: 0.22, y: 0.24, r: 0.24, w: 0.14 }] };
  },
  convertible(v, c) {
    v.box(0, 0.2, 0, 0.56, 0.18, 0.96, c.paint);
    v.box(0, 0.32, -0.17, 0.5, 0.12, 0.03, GLASS); // windshield
    v.box(-0.12, 0.34, 0.1, 0.16, 0.14, 0.16, c.seat || '#e8dcc4'); v.box(0.12, 0.34, 0.1, 0.16, 0.14, 0.16, c.seat || '#e8dcc4');
    v.box(0, 0.3, 0.32, 0.5, 0.06, 0.2, c.roof || DARK); // folded roof
    v.box(0, 0.12, 0, 0.58, 0.05, 1.0, DARK);
    lights(v, 0.56, -0.48, 0.48, 0.22);
    return { wheels: std(0.31, 0.12) };
  },
  bus(v, c) {
    v.box(0, 0.32, 0, 0.6, 0.46, 0.98, c.paint);
    for (let z = -0.3; z <= 0.3; z += 0.2) v.box(0, 0.42, z, 0.62, 0.12, 0.12, GLASS);
    v.box(0, 0.4, -0.49, 0.48, 0.16, 0.02, GLASS);
    v.box(0, 0.56, 0, 0.5, 0.03, 0.9, c.roof || c.paint);
    v.box(0, 0.22, 0, 0.62, 0.05, 0.98, c.accent || DARK);
    v.box(0, 0.11, 0, 0.6, 0.05, 1.0, DARK);
    lights(v, 0.6, -0.49, 0.49, 0.26);
    return { wheels: std(0.32, 0.12) };
  },
  formula(v, c) {
    v.box(0, 0.14, 0, 0.26, 0.12, 0.9, c.paint);
    v.box(0, 0.24, 0.05, 0.2, 0.1, 0.4, c.paint);
    v.box(0, 0.32, 0.05, 0.12, 0.08, 0.12, '#f2c27a'); // helmet
    v.box(0, 0.18, -0.46, 0.6, 0.03, 0.12, c.accent || DARK); // front wing
    v.box(0, 0.3, 0.44, 0.56, 0.04, 0.1, c.accent || DARK); // rear wing
    v.box(-0.2, 0.22, 0.44, 0.03, 0.12, 0.06, DARK); v.box(0.2, 0.22, 0.44, 0.03, 0.12, 0.06, DARK);
    return { wheels: [{ x: -0.28, z: -0.3 }, { x: 0.28, z: -0.3 }, { x: -0.3, z: 0.28 }, { x: 0.3, z: 0.28 }].map((w) => ({ ...w, y: 0.12, r: 0.12, w: 0.1 })) };
  },
  jeep(v, c) {
    v.box(0, 0.26, 0, 0.56, 0.22, 0.9, c.paint);
    v.box(0, 0.42, -0.12, 0.5, 0.13, 0.03, GLASS);
    v.box(0, 0.52, 0.06, 0.52, 0.03, 0.46, c.roof || '#3b3a36'); // soft top
    v.box(-0.25, 0.44, 0.06, 0.03, 0.14, 0.4, DARK); v.box(0.25, 0.44, 0.06, 0.03, 0.14, 0.4, DARK);
    v.box(0, 0.36, 0.3, 0.46, 0.06, 0.02, GLASS);
    v.cyl(0, 0.34, 0.47, 0.11, 0.06, TYRE, 10, 'z'); // spare
    v.box(0, 0.13, 0, 0.6, 0.06, 0.98, DARK);
    lights(v, 0.56, -0.45, 0.45, 0.28);
    return { wheels: std(0.3, 0.15) };
  },
  tuk(v, c) {
    v.box(0, 0.24, 0.05, 0.5, 0.2, 0.7, c.paint);
    v.box(0, 0.5, 0.05, 0.52, 0.03, 0.7, c.roof || c.paint);
    v.box(0, 0.4, -0.28, 0.46, 0.14, 0.02, GLASS);
    v.box(-0.24, 0.4, 0.15, 0.02, 0.18, 0.4, c.paint); v.box(0.24, 0.4, 0.15, 0.02, 0.18, 0.4, c.paint);
    v.box(0, 0.36, 0.2, 0.3, 0.06, 0.16, DARK);
    v.box(0, 0.2, -0.36, 0.2, 0.14, 0.14, c.paint);
    v.box(0, 0.28, -0.44, 0.1, 0.08, 0.03, LIGHT);
    return { wheels: [{ x: 0, z: -0.4, y: 0.11, r: 0.11, w: 0.08 }, { x: -0.24, z: 0.26, y: 0.11, r: 0.11, w: 0.08 }, { x: 0.24, z: 0.26, y: 0.11, r: 0.11, w: 0.08 }] };
  },
};
function std(r = 0.3, wr = 0.12) {
  return [{ x: -0.27, z: -r }, { x: 0.27, z: -r }, { x: -0.27, z: r }, { x: 0.27, z: r }].map((w) => ({ ...w, y: wr, r: wr, w: 0.12 }));
}

// Extras that decorate a body after it is built.
const EXTRAS = {
  taxiSign: (v) => { v.box(0, 0.56, -0.02, 0.24, 0.08, 0.1, '#ffd23f'); v.box(0, 0.56, -0.02, 0.2, 0.05, 0.11, DARK); },
  lightbar: (v, y = 0.55) => { v.box(-0.09, y, -0.05, 0.16, 0.06, 0.1, '#ff3b3b'); v.box(0.09, y, -0.05, 0.16, 0.06, 0.1, '#3b7bff'); },
  cross: (v) => { v.box(0, 0.42, 0.24, 0.62, 0.16, 0.06, '#ff3b3b'); v.box(0, 0.42, 0.24, 0.62, 0.06, 0.16, '#ff3b3b'); },
  cone: (v) => { v.cyl(0, 0.68, 0.2, 0.09, 0.14, '#f2c27a', 8); v.cyl(0, 0.8, 0.2, 0.1, 0.1, '#ffd1e3', 8); v.cyl(0, 0.9, 0.2, 0.07, 0.08, '#ff8fb8', 8); v.box(0, 0.98, 0.2, 0.03, 0.06, 0.03, '#d62839'); },
  ladder: (v) => { v.box(0, 0.6, 0.12, 0.2, 0.04, 0.7, '#c9c9cf'); v.box(-0.08, 0.63, 0.12, 0.03, 0.04, 0.7, '#8a8a92'); v.box(0.08, 0.63, 0.12, 0.03, 0.04, 0.7, '#8a8a92'); },
  stripes: (v, y, c) => { v.box(-0.09, y, 0, 0.08, 0.02, 0.98, c); v.box(0.09, y, 0, 0.08, 0.02, 0.98, c); },
  flames: (v, y) => { for (let i = 0; i < 4; i++) { v.box(-0.29, y, -0.35 + i * 0.12, 0.02, 0.06 + i * 0.02, 0.08, i % 2 ? '#ffb703' : '#fb5607'); v.box(0.29, y, -0.35 + i * 0.12, 0.02, 0.06 + i * 0.02, 0.08, i % 2 ? '#ffb703' : '#fb5607'); } },
  checker: (v, y) => { for (let i = 0; i < 6; i++) { v.box(-0.29, y, -0.42 + i * 0.16, 0.02, 0.06, 0.08, i % 2 ? DARK : '#ffffff'); v.box(0.29, y, -0.42 + i * 0.16, 0.02, 0.06, 0.08, i % 2 ? DARK : '#ffffff'); } },
  roofrack: (v) => { v.box(0, 0.56, 0.05, 0.4, 0.05, 0.4, '#8a6b45'); v.box(0, 0.6, 0.05, 0.3, 0.06, 0.3, '#e0b76a'); },
  siren: (v, y = 0.55) => { v.box(0, y, -0.1, 0.1, 0.06, 0.1, '#ff3b3b'); },
  rust: (v) => { v.box(0.22, 0.3, 0.15, 0.12, 0.06, 0.16, '#8f5a2d'); v.box(-0.2, 0.26, -0.3, 0.16, 0.06, 0.1, '#8f5a2d'); v.box(0.1, 0.2, 0.42, 0.14, 0.1, 0.02, '#8f5a2d'); },
  glow: (v) => { v.box(0, 0.09, 0, 0.5, 0.02, 0.9, '#7cf9ff'); },
};

export const CARS = [
  { id: 'runabout', name: 'Runabout', price: 0, body: 'hatch', paint: '#e63946', desc: 'Dependable. Slightly dented.' },
  { id: 'junker', name: 'Junker', price: 80, body: 'pickup', paint: '#7d9d9c', bed: '#4e4038', extras: ['rust'], desc: 'Held together by hope.' },
  { id: 'taxi', name: 'Cab', price: 150, body: 'sedan', paint: '#ffd23f', roof: '#ffd23f', extras: ['taxiSign', ['checker', 0.22]], desc: 'Meter is always running.' },
  { id: 'police', name: 'Patrol', price: 200, body: 'sedan', paint: '#f4f4f8', roof: '#1d1d2b', extras: [['lightbar', 0.52]], desc: 'Pulls over cows.' },
  { id: 'pickup', name: 'Ranch Hand', price: 180, body: 'pickup', paint: '#3a86ff', desc: 'Hauls hay. And regret.' },
  { id: 'camper', name: 'Camper', price: 220, body: 'van', paint: '#fff5e1', accent: '#ff9f1c', roof: '#ffffff', extras: ['roofrack'], desc: 'Home is where you park it.' },
  { id: 'ambulance', name: 'Medic', price: 260, body: 'truck', paint: '#ffffff', accent: '#ffffff', extras: ['cross', ['siren', 0.6]], desc: 'Ironically, needs help.' },
  { id: 'icecream', name: 'Sundae', price: 300, body: 'truck', paint: '#ffd1e3', accent: '#fff5f9', extras: ['cone'], desc: 'Plays one song. Forever.' },
  { id: 'sport', name: 'Comet', price: 350, body: 'sport', paint: '#ff5400', roof: '#1d1d2b', accent: '#1d1d2b', desc: 'Zero to hop in 0.15s.' },
  { id: 'muscle', name: 'Thunder', price: 380, body: 'sport', paint: '#1d1d2b', accent: '#ffffff', extras: [['stripes', 0.24, '#ffffff'], ['stripes', 0.36, '#ffffff']], desc: 'Loud in every way.' },
  { id: 'hotrod', name: 'Hot Rod', price: 420, body: 'convertible', paint: '#6a0dad', seat: '#ffe3a3', extras: [['flames', 0.22]], desc: 'Flames add ten hops.' },
  { id: 'jeep', name: 'Trail Goat', price: 320, body: 'jeep', paint: '#6b8e23', roof: '#3b3a36', desc: 'Roll cage. Cage-free.' },
  { id: 'tractor', name: 'Old Bess', price: 280, body: 'tractor', paint: '#2d8a3e', roof: '#ffd23f', desc: 'The animals respect it. Sort of.' },
  { id: 'monster', name: 'Stomper', price: 500, body: 'monster', paint: '#00b4d8', roof: '#1d1d2b', desc: 'Big wheels, same hop.' },
  { id: 'bus', name: 'Schoolie', price: 300, body: 'bus', paint: '#ffb703', roof: '#ffb703', accent: '#1d1d2b', desc: 'Stops for nobody.' },
  { id: 'firetruck', name: 'Blaze', price: 450, body: 'truck', paint: '#d62828', accent: '#d62828', extras: ['ladder', ['siren', 0.62]], desc: 'Puts out stampedes.' },
  { id: 'formula', name: 'Apex', price: 600, body: 'formula', paint: '#e63946', accent: '#1d1d2b', desc: 'Every lane is a pit lane.' },
  { id: 'tuk', name: 'Tuk-Tuk', price: 240, body: 'tuk', paint: '#2ec4b6', roof: '#ffbf69', desc: 'Three wheels, all heart.' },
  { id: 'convertible', name: 'Riviera', price: 340, body: 'convertible', paint: '#48cae4', seat: '#fff1d6', roof: '#f4f4f8', desc: 'Wind in your bumper.' },
  { id: 'neon', name: 'Midnight', price: 550, body: 'sport', paint: '#14213d', roof: '#7cf9ff', accent: '#7cf9ff', extras: ['glow'], desc: 'Underglow included.' },
];

export const CAR_BY_ID = Object.fromEntries(CARS.map((c) => [c.id, c]));

// Builds a car: returns { group, wheels[] }. Wheels spin on their local X axis.
export function buildCar(spec) {
  const v = new Voxels();
  const { wheels } = BODIES[spec.body](v, spec);
  for (const ex of spec.extras || []) {
    if (Array.isArray(ex)) EXTRAS[ex[0]](v, ...ex.slice(1)); else EXTRAS[ex](v);
  }
  const group = new THREE.Group();
  const body = v.build();
  group.add(body);
  const wheelMeshes = [];
  const cache = new Map();
  for (const w of wheels) {
    const key = `${w.r}_${w.w}`;
    let m;
    if (cache.has(key)) m = cache.get(key).clone(); else { m = wheelMesh(w.r, w.w); cache.set(key, m); }
    m.position.set(w.x, w.y, w.z);
    group.add(m);
    wheelMeshes.push(m);
  }
  return { group, body, wheels: wheelMeshes };
}
