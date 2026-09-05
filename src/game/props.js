// Scenery construction kit.
//
// The old props were three or four bare primitives dropped next to the track,
// so every world read as "the same shape again". Real detail means dozens of
// pieces per structure — which would normally mean dozens of draw calls.
//
// PropBuilder solves that: pieces are accumulated as geometry + transform,
// grouped by material, and merged into ONE mesh per material at the end. A
// forty-piece skyscraper costs the GPU two draw calls, so the scenery can be
// as detailed as it needs to be.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { rand, pick } from '../core/noise.js';

/* ------------------------------------------------------------- materials */
const matCache = new Map();

function surface(key, opts) {
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial(opts));
  return matCache.get(key);
}

export function rock(color, rough = 0.85, metal = 0.05, flat = true) {
  return surface(`r_${color}_${rough}_${metal}_${flat}`, {
    color, roughness: rough, metalness: metal, flatShading: flat,
  });
}

export function glow(color, intensity = 1.6) {
  return surface(`e_${color}_${intensity}`, {
    color: 0x0b0e15,
    emissive: new THREE.Color(color),
    emissiveIntensity: intensity,
    roughness: 0.4,
    metalness: 0.1,
  });
}

export function glass(color, opacity = 0.55, emissiveHex = null) {
  return surface(`g_${color}_${opacity}_${emissiveHex}`, {
    color,
    roughness: 0.08,
    metalness: 0.1,
    transparent: true,
    opacity,
    emissive: new THREE.Color(emissiveHex ?? 0x000000),
    emissiveIntensity: emissiveHex ? 0.8 : 0,
  });
}

/* ------------------------------------------------------------ geometries */
const geoCache = new Map();
/**
 * Every shape is stored NON-INDEXED.
 *
 * mergeGeometries refuses to combine indexed and non-indexed geometry, and
 * three's polyhedra (Icosahedron, Octahedron) are non-indexed while Box,
 * Cylinder and Sphere are indexed. Mixing them in one material bucket made the
 * merge fail and silently drop those pieces from the scene. Normalising here
 * means any shape can share a material with any other.
 */
const G = (key, make) => {
  if (!geoCache.has(key)) {
    const g = make();
    const flat = g.index ? g.toNonIndexed() : g;
    if (flat !== g) g.dispose();
    geoCache.set(key, flat);
  }
  return geoCache.get(key);
};

export const SHAPES = {
  box: () => G('box', () => new THREE.BoxGeometry(1, 1, 1)),
  cyl: (seg = 10) => G(`cyl${seg}`, () => new THREE.CylinderGeometry(0.5, 0.5, 1, seg)),
  taper: (seg = 8) => G(`tap${seg}`, () => new THREE.CylinderGeometry(0.28, 0.5, 1, seg)),
  cone: (seg = 7) => G(`cone${seg}`, () => new THREE.ConeGeometry(0.5, 1, seg)),
  sphere: (s = 12) => G(`sph${s}`, () => new THREE.SphereGeometry(0.5, s, Math.round(s * 0.7))),
  dome: (s = 14) => G(`dome${s}`, () => new THREE.SphereGeometry(0.5, s, 8, 0, Math.PI * 2, 0, Math.PI * 0.55)),
  hex: () => G('hex', () => new THREE.CylinderGeometry(0.5, 0.5, 1, 6)),
  torus: () => G('torus', () => new THREE.TorusGeometry(0.5, 0.12, 6, 18)),
  plane: () => G('plane', () => new THREE.PlaneGeometry(1, 1)),
  octa: () => G('octa', () => new THREE.OctahedronGeometry(0.5, 0)),
  icosa: () => G('icosa', () => new THREE.IcosahedronGeometry(0.5, 0)),
};

/* ---------------------------------------------------------------- builder */
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();

export class PropBuilder {
  constructor() {
    this.buckets = new Map(); // material -> geometry[]
    this.loose = [];          // meshes that must stay separate (animated)
    this.shadow = true;
  }

  /**
   * @param geometry  a shared unit-sized geometry from SHAPES
   * @param material  a shared material from rock/glow/glass
   * @param p [x,y,z] @param s [x,y,z] scale @param r [x,y,z] euler rotation
   */
  add(geometry, material, p, s, r = null) {
    _p.set(p[0], p[1], p[2]);
    _s.set(s[0], s[1], typeof s[2] === 'number' ? s[2] : s[0]);
    _q.setFromEuler(r ? _e.set(r[0], r[1], r[2]) : _e.set(0, 0, 0));
    _m.compose(_p, _q, _s);
    const g = geometry.clone().applyMatrix4(_m);
    if (!this.buckets.has(material)) this.buckets.set(material, []);
    this.buckets.get(material).push(g);
    return this;
  }

  /** A piece that must animate independently (spinning shard, bobbing drone). */
  addLoose(mesh) {
    this.loose.push(mesh);
    return this;
  }

  build() {
    const group = new THREE.Group();
    for (const [material, geos] of this.buckets) {
      const merged = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
      if (!merged) continue;
      // Normals came through applyMatrix4 already correct — recomputing here
      // would flatten every smooth dome and cap.
      const mesh = new THREE.Mesh(merged, material);
      mesh.castShadow = this.shadow;
      mesh.receiveShadow = false;
      group.add(mesh);
      for (const g of geos) if (g !== merged) g.dispose();
    }
    for (const m of this.loose) group.add(m);
    return group;
  }
}

/* ------------------------------------------------------- shared sub-parts */

/** A grid of lit windows across one face of a slab. */
export function windowGrid(b, mat, cx, cy, cz, w, h, faceZ, cols, rows, litChance = 0.55) {
  const cw = w / cols;
  const ch = h / rows;
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      if (Math.random() > litChance) continue;
      b.add(SHAPES.box(), mat,
        [cx - w / 2 + cw * (i + 0.5), cy - h / 2 + ch * (j + 0.5), cz],
        [cw * 0.55, ch * 0.5, 0.12],
        faceZ ? null : [0, Math.PI / 2, 0]);
    }
  }
}

/** Bolted pipe running between two points. */
export function pipe(b, mat, x1, y1, z1, x2, y2, z2, radius) {
  const dx = x2 - x1, dy = y2 - y1, dz = z2 - z1;
  const len = Math.hypot(dx, dy, dz) || 0.001;
  const mid = [(x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2];
  // orient the unit cylinder (which points up +Y) along the segment
  const yaw = Math.atan2(dx, dz);
  const pitch = Math.acos(Math.max(-1, Math.min(1, dy / len)));
  b.add(SHAPES.cyl(8), mat, mid, [radius * 2, len, radius * 2], [pitch, yaw, 0]);
}

/** Ladder/truss lattice up a vertical run. */
export function truss(b, mat, x, y0, y1, z, width, rungs) {
  const h = y1 - y0;
  b.add(SHAPES.box(), mat, [x - width / 2, y0 + h / 2, z], [0.12, h, 0.12]);
  b.add(SHAPES.box(), mat, [x + width / 2, y0 + h / 2, z], [0.12, h, 0.12]);
  for (let i = 0; i <= rungs; i++) {
    const t = i / rungs;
    b.add(SHAPES.box(), mat, [x, y0 + h * t, z], [width, 0.09, 0.09]);
    if (i < rungs) {
      b.add(SHAPES.box(), mat, [x, y0 + h * (t + 0.5 / rungs), z],
        [Math.hypot(width, h / rungs), 0.07, 0.07], [0, 0, Math.atan2(h / rungs, width)]);
    }
  }
}

/* ========================================================================= *
 *  BIOME 1 — CRYSTAL CANYON
 * ========================================================================= */
function crystalCluster(b) {
  const shard = rock(pick([0x8f6fd8, 0xa88ce8, 0x6f5ab8]), 0.22, 0.2);
  const stone = rock(0x6b5f8a, 0.85, 0.02);
  const lit = glow(pick([0xb98bff, 0x7fd8ff]), 1.7);
  // a rocky plinth the shards erupt from
  for (let i = 0; i < 4; i++) {
    b.add(SHAPES.icosa(), stone,
      [rand(-4, 4), rand(-0.6, 1.2), rand(-8, 8)],
      [rand(2, 4.5), rand(1.4, 2.6), rand(2, 4.5)],
      [rand(0, 3), rand(0, 6.28), rand(0, 3)]);
  }
  // scree scattered around the base
  for (let i = 0; i < 9; i++) {
    b.add(SHAPES.icosa(), stone, [rand(-8, 8), rand(0, 1.1), rand(-10, 10)],
      [rand(0.5, 1.8), rand(0.4, 1.2), rand(0.5, 1.8)], [rand(0, 3), rand(0, 6), rand(0, 3)]);
  }
  const n = 7 + ((Math.random() * 6) | 0);
  for (let i = 0; i < n; i++) {
    const h = rand(5, 17);
    const w = rand(0.7, 2.3);
    const x = rand(-5, 5), z = rand(-9, 9);
    const tilt = [rand(-0.22, 0.22), rand(0, 6.28), rand(-0.22, 0.22)];
    b.add(SHAPES.cone(6), Math.random() < 0.4 ? lit : shard, [x, h * 0.42, z], [w, h, w], tilt);
    // a smaller shard sprouting from the base of the big one
    if (Math.random() < 0.7) {
      const h2 = h * rand(0.25, 0.5);
      b.add(SHAPES.cone(6), shard, [x + rand(-1.4, 1.4), h2 * 0.42, z + rand(-1.4, 1.4)],
        [w * 0.6, h2, w * 0.6], [rand(-0.4, 0.4), rand(0, 6.28), rand(-0.4, 0.4)]);
    }
  }
}

function crystalArch(b) {
  const stone = rock(0x6b5f8a, 0.8, 0.05);
  const lit = glow(0x9b6bff, 1.5);
  const span = rand(9, 15);
  const height = rand(9, 14);
  const x = rand(-3, 3), z = rand(-6, 6);
  for (const side of [-1, 1]) {
    b.add(SHAPES.taper(7), stone, [x + side * span / 2, height * 0.45, z],
      [rand(2.2, 3.4), height, rand(2.2, 3.4)], [0, rand(0, 3), side * 0.1]);
  }
  // the keystone span, built from wedges so it reads as carved rock
  const segs = 7;
  for (let i = 0; i < segs; i++) {
    const t = i / (segs - 1);
    const a = (t - 0.5) * Math.PI * 0.9;
    b.add(SHAPES.box(), stone,
      [x + Math.sin(a) * span * 0.55, height + Math.cos(a) * 2.4 - 0.6, z],
      [span / segs * 1.25, 1.7, rand(2.4, 3.2)], [0, 0, -a * 0.8]);
  }
  b.add(SHAPES.box(), lit, [x, height + 2.1, z], [span * 0.7, 0.16, 0.5]);
}

function crystalWreck(b) {
  const hull = rock(0x74707e, 0.55, 0.65);
  const dark = rock(0x2f2c38, 0.8, 0.4);
  const lit = glow(0xff8a3d, 1.4);
  const x = rand(-4, 4), z = rand(-6, 6), yaw = rand(0, 6.28);
  // a broken-backed hull half buried in the canyon floor
  b.add(SHAPES.cyl(9), hull, [x, 1.6, z], [4.2, 11, 4.2], [1.35, yaw, 0.18]);
  b.add(SHAPES.cyl(9), dark, [x + Math.sin(yaw) * 6.4, 2.6, z + Math.cos(yaw) * 6.4],
    [3.4, 4.6, 3.4], [1.1, yaw, 0.5]);
  for (const s of [-1, 1]) {
    b.add(SHAPES.box(), hull, [x + Math.cos(yaw) * s * 3.6, 2.2, z - Math.sin(yaw) * s * 3.6],
      [5.5, 0.4, 2.2], [rand(-0.3, 0.3), yaw, s * 0.35]);
  }
  b.add(SHAPES.sphere(10), lit, [x, 3.4, z], [1.5, 1.5, 1.5]);
  truss(b, dark, x + 3, 0, 5.5, z + 3, 1.4, 5);
}

/** A layered strata cliff walling in the canyon, veined with crystal. */
function canyonWall(b) {
  const strata = [0x7a6a92, 0x6b5c82, 0x8a7aa2, 0x5d5074];
  const vein = glow(0x9b6bff, 1.4);
  const scree = rock(0x6b5f8a, 0.9, 0.02);
  const x = rand(4, 9);
  let y = 0;
  const beds = 7 + ((Math.random() * 5) | 0);
  for (let i = 0; i < beds; i++) {
    const th = rand(1.4, 4.2);
    const inset = i * rand(0.15, 0.5);
    b.add(SHAPES.box(), rock(strata[i % strata.length], 0.92, 0.02),
      [x + inset, y + th / 2, rand(-1.5, 1.5)],
      [rand(7, 11), th, rand(20, 26)], [0, rand(-0.05, 0.05), rand(-0.03, 0.03)]);
    // a glowing seam between two beds
    if (Math.random() < 0.35) {
      b.add(SHAPES.box(), vein, [x + inset - 3.6, y + th, rand(-2, 2)], [0.5, 0.22, rand(10, 20)]);
    }
    y += th;
  }
  // crystals erupting from the cliff face
  for (let i = 0; i < 6; i++) {
    const h = rand(2.5, 7);
    b.add(SHAPES.cone(6), Math.random() < 0.5 ? vein : scree,
      [x - rand(3, 5), rand(2, y - 1), rand(-10, 10)], [rand(0.5, 1.3), h, rand(0.5, 1.3)],
      [rand(-0.6, 0.6), rand(0, 6.28), rand(-1.2, -0.4)]);
  }
  // talus slope of fallen blocks at the base
  for (let i = 0; i < 10; i++) {
    b.add(SHAPES.icosa(), scree, [x - rand(3, 7), rand(0, 1.6), rand(-11, 11)],
      [rand(0.8, 2.6), rand(0.6, 1.8), rand(0.8, 2.6)], [rand(0, 3), rand(0, 6), rand(0, 3)]);
  }
}

export function crystalProp() {
  const b = new PropBuilder();
  const roll = Math.random();
  if (roll < 0.34) crystalCluster(b);
  else if (roll < 0.62) canyonWall(b);
  else if (roll < 0.84) crystalArch(b);
  else crystalWreck(b);

  // a slowly turning shard suspended above the canyon
  if (Math.random() < 0.55) {
    const s = new THREE.Mesh(SHAPES.octa(), glow(0x8a5bff, 1.9));
    s.scale.setScalar(rand(1.0, 3.0));
    s.position.set(rand(-6, 6), rand(9, 20), rand(-9, 9));
    s.userData.spin = rand(0.2, 0.8);
    b.addLoose(s);
  }
  return b.build();
}

/* ========================================================================= *
 *  BIOME 2 — NEON METROPOLIS
 * ========================================================================= */
function tower(b, x, z, h, w, d) {
  const shell = rock(pick([0x28324a, 0x1d2538, 0x323c56]), 0.5, 0.6, false);
  const dark = rock(0x11151f, 0.7, 0.3, false);
  const win = glow(pick([0xffd9a0, 0xa8e6ff, 0xfff0c8]), 2.0);
  const neon = glow(pick([0xff2f8e, 0x28e0ff, 0xffd23f, 0x8a5bff]), 2.6);

  b.add(SHAPES.box(), shell, [x, h / 2, z], [w, h, d]);
  // setback near the top: the classic skyscraper profile
  const capH = h * rand(0.12, 0.22);
  b.add(SHAPES.box(), shell, [x, h + capH / 2, z], [w * 0.68, capH, d * 0.68]);
  b.add(SHAPES.box(), dark, [x, h + capH + 0.3, z], [w * 0.74, 0.5, d * 0.74]);
  // mast with an aircraft-warning lamp
  b.add(SHAPES.cyl(6), dark, [x, h + capH + rand(2, 5), z], [0.22, rand(4, 9), 0.22]);
  b.add(SHAPES.sphere(8), glow(0xff3040, 3), [x, h + capH + rand(6, 10), z], [0.5, 0.5, 0.5]);

  // lit window grids on the two faces that can be seen from the track
  const cols = Math.max(3, Math.round(w / 1.1));
  const rows = Math.max(5, Math.round(h / 2.0));
  windowGrid(b, win, x, h / 2, z + d / 2 + 0.06, w * 0.86, h * 0.9, true, cols, rows, 0.42);
  windowGrid(b, win, x - w / 2 - 0.06, h / 2, z, d * 0.86, h * 0.9, false, Math.max(3, Math.round(d / 1.1)), rows, 0.34);

  // vertical neon banner down one corner
  if (Math.random() < 0.7) {
    const s = Math.random() < 0.5 ? -1 : 1;
    b.add(SHAPES.box(), neon, [x + s * (w / 2 + 0.25), h * rand(0.45, 0.7), z + d / 2 * rand(-0.6, 0.6)],
      [0.3, h * rand(0.25, 0.45), 1.1]);
  }
  // service balconies
  for (let i = 0; i < 3; i++) {
    const by = h * rand(0.2, 0.85);
    b.add(SHAPES.box(), dark, [x, by, z + d / 2 + 0.5], [w * 1.02, 0.28, 1.1]);
  }
}

/** Elevated maglev line carrying a multi-car train over the street. */
function cityViaduct(b) {
  const concrete = rock(0x39415a, 0.85, 0.05, false);
  const steel = rock(0x5a6480, 0.4, 0.75, false);
  const dark = rock(0x11151f, 0.7, 0.3, false);
  const win = glow(0xbfe8ff, 2.2);
  const strip = glow(0x28e0ff, 2.4);

  const x = rand(-7, 7);
  const deckY = rand(9, 15);
  // piers marching along the track direction
  for (let z = -10; z <= 10; z += 10) {
    b.add(SHAPES.box(), concrete, [x, deckY / 2, z], [2.2, deckY, 2.2]);
    b.add(SHAPES.box(), concrete, [x, deckY - 1.2, z], [4.2, 1.0, 3.4]);
  }
  // the deck itself and its guide rails, running the length of the tile
  b.add(SHAPES.box(), concrete, [x, deckY, 0], [5.0, 0.8, 26]);
  for (const s of [-1, 1]) {
    b.add(SHAPES.box(), steel, [x + s * 2.0, deckY + 0.6, 0], [0.35, 0.5, 26]);
    b.add(SHAPES.box(), strip, [x + s * 2.45, deckY + 0.2, 0], [0.12, 0.14, 26]);
  }

  // the train: nose car plus carriages, windows and skirts
  const cars = 3;
  const carLen = 7.4;
  const z0 = rand(-8, 2);
  for (let c = 0; c < cars; c++) {
    const cz = z0 + c * (carLen + 0.5);
    const nose = c === 0;
    b.add(SHAPES.box(), steel, [x, deckY + 2.1, cz], [3.4, 2.4, carLen]);
    b.add(SHAPES.box(), steel, [x, deckY + 3.4, cz], [2.8, 0.6, carLen * 0.9]);
    if (nose) {
      b.add(SHAPES.cone(6), steel, [x, deckY + 2.1, cz - carLen / 2 - 1.1],
        [3.2, 2.6, 2.4], [-Math.PI / 2, 0, 0]);
      b.add(SHAPES.box(), win, [x, deckY + 2.5, cz - carLen / 2 - 0.1], [2.4, 0.9, 0.3]);
    }
    for (const s of [-1, 1]) {
      windowGrid(b, win, x + s * 1.76, deckY + 2.3, cz, carLen * 0.82, 1.0, false, 5, 1, 0.9);
      b.add(SHAPES.box(), dark, [x + s * 1.6, deckY + 0.85, cz], [0.4, 0.7, carLen * 0.95]);
    }
    b.add(SHAPES.box(), strip, [x, deckY + 0.95, cz], [3.2, 0.12, carLen * 0.95]);
  }
}

/** Street-level freight yard: containers, a gantry crane, parked haulers. */
function cityYard(b) {
  const steel = rock(0x4d566e, 0.55, 0.6, false);
  const dark = rock(0x181d29, 0.75, 0.3, false);
  const lamp = glow(0xffd9a0, 2.4);
  const strip = glow(0x28e0ff, 2.2);
  const crates = [0xc4562f, 0x2f7ac4, 0xc4a72f, 0x3ea36a, 0x8a3ec4];

  // stacked shipping containers
  const stacks = 3 + ((Math.random() * 3) | 0);
  for (let i = 0; i < stacks; i++) {
    const cx = rand(-7, 7), cz = rand(-9, 9);
    const high = 1 + ((Math.random() * 3) | 0);
    for (let k = 0; k < high; k++) {
      const col = rock(pick(crates), 0.75, 0.25, false);
      const yaw = Math.random() < 0.5 ? 0 : Math.PI / 2;
      b.add(SHAPES.box(), col, [cx + rand(-0.2, 0.2), 1.35 + k * 2.7, cz], [3.0, 2.6, 6.4], [0, yaw, 0]);
      // corrugated ribs
      for (let r = -2; r <= 2; r++) {
        b.add(SHAPES.box(), dark, [cx, 1.35 + k * 2.7, cz + r * 1.2], [3.12, 2.3, 0.18], [0, yaw, 0]);
      }
    }
  }
  // gantry crane straddling the yard
  const gx = rand(-4, 4);
  for (const s of [-1, 1]) {
    truss(b, steel, gx + s * 6, 0, 13, rand(-6, 6), 1.6, 8);
  }
  b.add(SHAPES.box(), steel, [gx, 13.4, 0], [13.5, 0.9, 1.6]);
  b.add(SHAPES.box(), dark, [gx + rand(-4, 4), 12.2, 0], [2.0, 1.6, 2.0]);
  b.add(SHAPES.box(), strip, [gx, 12.9, 0], [13.0, 0.14, 0.3]);

  // floodlight masts
  for (let i = 0; i < 2; i++) {
    const lx = rand(-8, 8), lz = rand(-9, 9);
    b.add(SHAPES.cyl(6), dark, [lx, 5, lz], [0.3, 10, 0.3]);
    b.add(SHAPES.box(), dark, [lx, 10.2, lz], [2.4, 0.4, 0.8]);
    b.add(SHAPES.box(), lamp, [lx, 9.9, lz], [2.2, 0.3, 0.7]);
  }
}

export function cityProp() {
  const b = new PropBuilder();
  const roll = Math.random();
  if (roll < 0.5) {
    const n = 2 + ((Math.random() * 2) | 0);
    for (let i = 0; i < n; i++) {
      tower(b, rand(-6, 6), rand(-9, 9), rand(16, 52), rand(3.5, 7.5), rand(3.5, 7));
    }
  } else if (roll < 0.78) {
    cityViaduct(b);
  } else {
    cityYard(b);
  }

  // hovering ad drone drifting over the street
  if (Math.random() < 0.5) {
    const d = new THREE.Mesh(SHAPES.box(), glow(pick([0x28e0ff, 0xff2f8e]), 2.6));
    d.scale.set(2.8, 0.18, 1.3);
    d.position.set(rand(-8, 8), rand(11, 24), rand(-8, 8));
    d.userData.bob = rand(0.4, 1.2);
    b.addLoose(d);
  }
  return b.build();
}

/* ========================================================================= *
 *  BIOME 3 — SPORE JUNGLE
 * ========================================================================= */
function mushroom(b, x, z, scale) {
  const stalkMat = rock(pick([0xd8cfb0, 0xc2b894, 0xe0d8bc]), 0.9, 0, false);
  const capHex = pick([0xd94f6a, 0xe08a2f, 0x7a4fd9, 0xd9c23f, 0xe0554f]);
  const capMat = rock(capHex, 0.72, 0, false);
  const gillMat = rock(0xf0e6d0, 0.85, 0, false);
  const spotMat = rock(0xf5efdd, 0.8, 0, false);

  const h = rand(4, 12) * scale;
  const r = rand(1.6, 3.6) * scale;
  const lean = rand(-0.14, 0.14);
  // stalk swells at the base like a real fruiting body
  b.add(SHAPES.taper(9), stalkMat, [x, h * 0.5, z], [r * 0.62, h, r * 0.62], [0, 0, lean]);
  b.add(SHAPES.sphere(9), stalkMat, [x, h * 0.06, z], [r * 0.95, r * 0.5, r * 0.95]);
  // ring skirt
  b.add(SHAPES.cyl(12), gillMat, [x + lean * h * 0.5, h * 0.66, z], [r * 0.85, 0.16, r * 0.85]);
  // cap
  const cx = x + lean * h;
  b.add(SHAPES.dome(14), capMat, [cx, h, z], [r * 2, r * rand(0.85, 1.35), r * 2]);
  b.add(SHAPES.cyl(14), gillMat, [cx, h - 0.12, z], [r * 1.9, 0.3, r * 1.9]);
  // pale spots scattered over the cap
  const spots = 5 + ((Math.random() * 6) | 0);
  for (let i = 0; i < spots; i++) {
    const a = rand(0, 6.28), d = Math.sqrt(Math.random()) * r * 0.85;
    b.add(SHAPES.sphere(7), spotMat,
      [cx + Math.cos(a) * d, h + Math.sqrt(Math.max(0, 1 - (d / r) ** 2)) * r * 0.55, z + Math.sin(a) * d],
      [rand(0.2, 0.5) * scale, rand(0.1, 0.2) * scale, rand(0.2, 0.5) * scale]);
  }
}

function jungleGrove(b) {
  const n = 2 + ((Math.random() * 3) | 0);
  for (let i = 0; i < n; i++) mushroom(b, rand(-6, 6), rand(-9, 9), rand(0.7, 1.25));
  fernPatch(b, 4 + ((Math.random() * 4) | 0));
}

/** Broad fronds fanning out of the undergrowth. */
function fernPatch(b, count) {
  const leafA = rock(0x3f8a3c, 0.92, 0, false);
  const leafB = rock(0x5aa845, 0.92, 0, false);
  for (let i = 0; i < count; i++) {
    const x = rand(-8, 8), z = rand(-10, 10);
    const blades = 5 + ((Math.random() * 4) | 0);
    const size = rand(1.4, 3.2);
    for (let j = 0; j < blades; j++) {
      const a = (j / blades) * 6.28 + rand(-0.2, 0.2);
      const droop = rand(0.5, 1.1);
      b.add(SHAPES.cone(4), j % 2 ? leafA : leafB,
        [x + Math.cos(a) * size * 0.45, size * 0.5, z + Math.sin(a) * size * 0.45],
        [rand(0.25, 0.5), size * rand(1.1, 1.8), rand(0.1, 0.2)],
        [droop * Math.sin(a), -a, -droop * Math.cos(a)]);
    }
  }
}

/** A buttressed canopy tree with hanging lianas. */
function jungleTree(b) {
  const bark = rock(0x4a3a2a, 0.95, 0, false);
  const barkLight = rock(0x5d4a34, 0.95, 0, false);
  const leaf = rock(pick([0x2f7a3a, 0x3d8f42, 0x276b35]), 0.9, 0, false);
  const moss = rock(0x6ba84f, 0.95, 0, false);

  const x = rand(-6, 6), z = rand(-7, 7);
  const h = rand(16, 28);
  b.add(SHAPES.taper(9), bark, [x, h * 0.5, z], [rand(1.8, 2.8), h, rand(1.8, 2.8)]);
  // root buttresses flaring out at the base
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * 6.28 + rand(-0.2, 0.2);
    b.add(SHAPES.cone(4), barkLight,
      [x + Math.cos(a) * 1.6, 1.6, z + Math.sin(a) * 1.6],
      [0.7, 4.4, 2.2], [0.34 * Math.sin(a) + 0.2, -a, -0.34 * Math.cos(a)]);
  }
  // branches
  for (let i = 0; i < 5; i++) {
    const a = rand(0, 6.28), by = h * rand(0.55, 0.95), len = rand(3, 7);
    pipe(b, bark, x, by, z, x + Math.cos(a) * len, by + rand(1, 3), z + Math.sin(a) * len, 0.3);
    // leaf mass at the branch tip
    b.add(SHAPES.icosa(), leaf,
      [x + Math.cos(a) * len, by + rand(1.5, 3.5), z + Math.sin(a) * len],
      [rand(3, 5.5), rand(2, 3.5), rand(3, 5.5)], [rand(0, 3), rand(0, 6), rand(0, 3)]);
  }
  // crown
  for (let i = 0; i < 3; i++) {
    b.add(SHAPES.icosa(), leaf, [x + rand(-2, 2), h + rand(0, 3), z + rand(-2, 2)],
      [rand(5, 8), rand(3.5, 5.5), rand(5, 8)], [rand(0, 3), rand(0, 6), rand(0, 3)]);
  }
  // lianas dropping from the branches
  for (let i = 0; i < 4; i++) {
    const a = rand(0, 6.28), d = rand(2, 6), len = rand(5, 13);
    b.add(SHAPES.cyl(5), moss,
      [x + Math.cos(a) * d, h * 0.8 - len / 2, z + Math.sin(a) * d], [0.16, len, 0.16],
      [rand(-0.08, 0.08), 0, rand(-0.08, 0.08)]);
  }
}

/** A fallen trunk with shelf fungus and glowing spore vents. */
function fallenLog(b) {
  const bark = rock(0x453626, 0.95, 0, false);
  const inner = rock(0x6b5334, 0.9, 0, false);
  const shelf = rock(pick([0xd9a24f, 0xc98f3e]), 0.85, 0, false);
  const lit = glow(0x6bffb0, 1.5);
  const x = rand(-6, 6), z = rand(-6, 6), yaw = rand(0, 3.14);
  const len = rand(10, 18);
  b.add(SHAPES.cyl(10), bark, [x, 1.3, z], [2.6, len, 2.6], [Math.PI / 2, yaw, 0]);
  b.add(SHAPES.cyl(10), inner, [x + Math.sin(yaw) * len * 0.5, 1.3, z + Math.cos(yaw) * len * 0.5],
    [2.2, 0.4, 2.2], [Math.PI / 2, yaw, 0]);
  for (let i = 0; i < 9; i++) {
    const t = rand(-0.45, 0.45);
    const px = x + Math.sin(yaw) * len * t, pz = z + Math.cos(yaw) * len * t;
    b.add(SHAPES.dome(8), shelf, [px + rand(-1.2, 1.2), rand(1.4, 2.4), pz + rand(-1.2, 1.2)],
      [rand(1.0, 2.2), rand(0.3, 0.6), rand(1.0, 2.2)], [rand(-0.4, 0.4), rand(0, 6), rand(-0.4, 0.4)]);
  }
  b.add(SHAPES.sphere(8), lit, [x, 2.6, z], [0.7, 0.7, 0.7]);
  fernPatch(b, 3);
}

export function jungleProp() {
  const b = new PropBuilder();
  const roll = Math.random();
  if (roll < 0.45) jungleGrove(b);
  else if (roll < 0.8) jungleTree(b);
  else fallenLog(b);

  // drifting spore pod
  if (Math.random() < 0.45) {
    const s = new THREE.Mesh(SHAPES.sphere(9), glow(0x9dffd0, 1.7));
    s.scale.setScalar(rand(0.5, 1.2));
    s.position.set(rand(-8, 8), rand(6, 16), rand(-9, 9));
    s.userData.bob = rand(0.5, 1.3);
    b.addLoose(s);
  }
  return b.build();
}

/* ========================================================================= *
 *  BIOME 4 — MAGMA FORGE
 * ========================================================================= */
function basaltColumns(b) {
  const stoneA = rock(0x3a3330, 0.95, 0.02);
  const stoneB = rock(0x2a2422, 0.95, 0.02);
  const hot = glow(0xff6a1f, 2.0);
  const n = 7 + ((Math.random() * 7) | 0);
  for (let i = 0; i < n; i++) {
    const h = rand(3, 16);
    const r = rand(0.9, 2.1);
    const x = rand(-7, 7), z = rand(-10, 10);
    b.add(SHAPES.hex(), Math.random() < 0.5 ? stoneA : stoneB,
      [x, h * 0.5, z], [r, h, r], [rand(-0.05, 0.05), rand(0, 6.28), rand(-0.05, 0.05)]);
    // molten seam glowing between two columns
    if (Math.random() < 0.25) b.add(SHAPES.box(), hot, [x, h * 0.45, z + r], [r * 1.1, h * 0.7, 0.1]);
  }
}

/** A drilling gantry with pipework and a tapped magma feed. */
function forgeRig(b) {
  const steel = rock(0x5a5048, 0.55, 0.7, false);
  const dark = rock(0x231e1c, 0.8, 0.4, false);
  const hot = glow(0xff7a1f, 2.4);
  const warn = glow(0xffd23f, 2.0);

  const x = rand(-5, 5), z = rand(-5, 5);
  const h = rand(16, 26);
  // four legs and the derrick between them
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    truss(b, steel, x + sx * 3.4, 0, h * 0.7, z + sz * 3.4, 1.2, Math.round(h / 3));
  }
  b.add(SHAPES.box(), dark, [x, h * 0.7, z], [9.5, 1.2, 9.5]);
  b.add(SHAPES.box(), steel, [x, h * 0.86, z], [4.2, h * 0.32, 4.2]);
  b.add(SHAPES.cone(6), dark, [x, h * 1.06, z], [4.6, 3.2, 4.6]);
  // the drill string punching down into the crust
  b.add(SHAPES.cyl(8), steel, [x, h * 0.35, z], [0.9, h * 0.7, 0.9]);
  b.add(SHAPES.cone(8), hot, [x, 0.9, z], [1.6, 2.6, 1.6], [Math.PI, 0, 0]);
  // pipework running off the platform
  for (let i = 0; i < 4; i++) {
    const a = rand(0, 6.28), d = rand(6, 11);
    pipe(b, steel, x, h * 0.62, z, x + Math.cos(a) * d, rand(1.5, 4), z + Math.sin(a) * d, 0.34);
    b.add(SHAPES.cyl(8), dark, [x + Math.cos(a) * d, rand(1.5, 3), z + Math.sin(a) * d], [1.5, 3.0, 1.5]);
  }
  b.add(SHAPES.box(), warn, [x, h * 0.72, z + 4.8], [8.0, 0.2, 0.2]);
  b.add(SHAPES.sphere(8), glow(0xff3040, 3), [x, h * 1.2, z], [0.55, 0.55, 0.55]);
}

/** A ledge pouring lava into a pool below. */
function lavaFall(b) {
  const stone = rock(0x332b28, 0.95, 0.02);
  const molten = glow(0xff8a2f, 2.6);
  const crust = rock(0x51372c, 0.9, 0.05);
  const x = rand(-6, 6), z = rand(-6, 6);
  const h = rand(10, 20);
  b.add(SHAPES.box(), stone, [x, h * 0.5, z], [rand(7, 12), h, rand(5, 9)],
    [0, rand(0, 1), rand(-0.06, 0.06)]);
  b.add(SHAPES.box(), crust, [x, h + 0.4, z], [rand(7, 11), 1.0, rand(5, 8)]);
  // the fall itself, narrowing as it drops
  const drops = 5;
  for (let i = 0; i < drops; i++) {
    const t = i / (drops - 1);
    b.add(SHAPES.box(), molten,
      [x + rand(-0.3, 0.3), h * (1 - t) * 0.98, z + 2.6],
      [rand(1.2, 2.4) * (1 - t * 0.45), h / drops * 1.1, 0.5]);
  }
  b.add(SHAPES.cyl(12), molten, [x, 0.15, z + 3.2], [rand(6, 10), 0.3, rand(5, 8)]);
  basaltColumnsSmall(b, x, z);
}

function basaltColumnsSmall(b, x, z) {
  const stone = rock(0x2a2422, 0.95, 0.02);
  for (let i = 0; i < 5; i++) {
    const h = rand(2, 6);
    b.add(SHAPES.hex(), stone, [x + rand(-9, 9), h * 0.5, z + rand(-9, 9)],
      [rand(0.8, 1.6), h, rand(0.8, 1.6)], [0, rand(0, 6.28), 0]);
  }
}

export function magmaProp() {
  const b = new PropBuilder();
  const roll = Math.random();
  if (roll < 0.42) basaltColumns(b);
  else if (roll < 0.75) forgeRig(b);
  else lavaFall(b);

  if (Math.random() < 0.4) {
    const s = new THREE.Mesh(SHAPES.icosa(), glow(0xff7a1f, 2.2));
    s.scale.setScalar(rand(0.5, 1.4));
    s.position.set(rand(-8, 8), rand(5, 15), rand(-9, 9));
    s.userData.spin = rand(0.3, 1.0);
    b.addLoose(s);
  }
  return b.build();
}

/* ========================================================================= *
 *  BIOME 5 — AURORA GLACIER
 * ========================================================================= */
function iceSeracs(b) {
  const ice = glass(0xbfe4f5, 0.72, 0x2f6f88);
  const packed = rock(0xd8ecf5, 0.35, 0.02);
  const deep = rock(0x6ea8c4, 0.2, 0.05);
  // wind-packed drifts between the ice towers
  for (let i = 0; i < 8; i++) {
    b.add(SHAPES.icosa(), packed, [rand(-9, 9), rand(0, 1.2), rand(-11, 11)],
      [rand(1.5, 4.5), rand(0.5, 1.4), rand(1.5, 4.5)], [rand(0, 3), rand(0, 6), rand(0, 3)]);
  }
  const n = 8 + ((Math.random() * 7) | 0);
  for (let i = 0; i < n; i++) {
    const h = rand(4, 18);
    const w = rand(1.2, 3.4);
    const x = rand(-7, 7), z = rand(-10, 10);
    b.add(SHAPES.cone(5), i % 3 === 0 ? deep : ice, [x, h * 0.45, z], [w, h, w],
      [rand(-0.16, 0.16), rand(0, 6.28), rand(-0.16, 0.16)]);
    b.add(SHAPES.icosa(), packed, [x + rand(-1, 1), rand(0.2, 1.2), z + rand(-1, 1)],
      [w * rand(1.2, 2.2), rand(0.8, 1.8), w * rand(1.2, 2.2)], [rand(0, 3), rand(0, 6), rand(0, 3)]);
  }
}

/** An icebreaker hull locked in the pack ice, listing hard over. */
function frozenWreck(b) {
  const hull = rock(0x6b3a34, 0.7, 0.4, false);
  const rust = rock(0x8a4a32, 0.9, 0.2, false);
  const deck = rock(0x3a4450, 0.7, 0.4, false);
  const ice = glass(0xbfe4f5, 0.7, 0x2f6f88);
  const win = glow(0xffd9a0, 1.6);

  const x = rand(-4, 4), z = rand(-5, 5);
  const yaw = rand(0, 6.28);
  const list = rand(0.2, 0.45);
  // hull
  b.add(SHAPES.box(), hull, [x, 3.0, z], [6.0, 5.0, 20], [0, yaw, list]);
  b.add(SHAPES.cone(5), hull, [x + Math.sin(yaw) * 11.5, 3.4, z + Math.cos(yaw) * 11.5],
    [6.0, 5.5, 4.0], [-Math.PI / 2, yaw, list]);
  b.add(SHAPES.box(), rust, [x, 5.6, z], [6.3, 0.6, 20.2], [0, yaw, list]);
  // superstructure
  b.add(SHAPES.box(), deck, [x - Math.sin(yaw) * 3, 8.0, z - Math.cos(yaw) * 3], [4.4, 4.6, 6.0], [0, yaw, list]);
  windowGrid(b, win, x - Math.sin(yaw) * 3, 9.2, z - Math.cos(yaw) * 3 + 3.1, 3.6, 1.2, true, 4, 1, 0.6);
  b.add(SHAPES.cyl(8), rust, [x - Math.sin(yaw) * 3, 12.4, z - Math.cos(yaw) * 3], [1.8, 4.0, 1.8], [0, 0, list]);
  b.add(SHAPES.cyl(6), deck, [x - Math.sin(yaw) * 7, 11, z - Math.cos(yaw) * 7], [0.22, 10, 0.22], [0, 0, list]);
  // ice heaved up around the trapped hull
  for (let i = 0; i < 7; i++) {
    const a = rand(0, 6.28), d = rand(4, 9);
    b.add(SHAPES.cone(5), ice, [x + Math.cos(a) * d, rand(1, 3.5), z + Math.sin(a) * d],
      [rand(1.5, 3), rand(3, 7), rand(1.5, 3)], [rand(-0.4, 0.4), rand(0, 6), rand(-0.4, 0.4)]);
  }
}

/** A polar research mast: dish, solar wings, guy wires. */
function iceStation(b) {
  const shell = rock(0xc8ccd4, 0.5, 0.3, false);
  const dark = rock(0x2b3138, 0.7, 0.5, false);
  const panel = glass(0x1f3a6b, 0.9, 0x14243f);
  const lamp = glow(0x7fe9ff, 2.4);

  const x = rand(-5, 5), z = rand(-5, 5);
  // module on stilts above the drift
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    b.add(SHAPES.cyl(6), dark, [x + sx * 3, 1.6, z + sz * 4], [0.35, 3.2, 0.35]);
  }
  b.add(SHAPES.box(), shell, [x, 4.6, z], [7.6, 3.4, 10.4]);
  b.add(SHAPES.cyl(12), shell, [x, 6.6, z], [7.6, 2.0, 10.4], [Math.PI / 2, 0, 0]);
  windowGrid(b, lamp, x + 3.85, 4.8, z, 8.0, 1.2, false, 4, 1, 0.8);
  b.add(SHAPES.box(), dark, [x, 2.9, z], [7.8, 0.3, 10.6]);
  // dish on the roof
  b.add(SHAPES.cyl(8), dark, [x + 2, 8.6, z - 2], [0.3, 3.0, 0.3]);
  b.add(SHAPES.dome(14), shell, [x + 2, 10.4, z - 2], [4.0, 2.0, 4.0], [-0.9, 0.6, 0]);
  // solar wings
  for (const s of [-1, 1]) {
    b.add(SHAPES.box(), panel, [x + s * 7.5, 7.2, z + 2], [6.4, 0.2, 4.4], [0, 0, s * 0.35]);
    pipe(b, dark, x + s * 3.6, 6.4, z + 2, x + s * 5.2, 7.0, z + 2, 0.16);
  }
  b.add(SHAPES.cyl(6), dark, [x - 3, 11, z + 3], [0.2, 16, 0.2]);
  b.add(SHAPES.sphere(8), glow(0xff3040, 3), [x - 3, 19, z + 3], [0.45, 0.45, 0.45]);
}

/** A calving glacier face: layered blue ice, crevasses, fallen bergs. */
function glacierWall(b) {
  const bands = [0xc4e2f0, 0xa8d2e8, 0xd8eef8, 0x8fbfd8];
  const deep = rock(0x4f88a8, 0.18, 0.04);
  const snow = rock(0xecf6fb, 0.7, 0.0);
  const x = rand(4, 9);
  let y = 0;
  const beds = 6 + ((Math.random() * 4) | 0);
  for (let i = 0; i < beds; i++) {
    const th = rand(1.8, 4.6);
    b.add(SHAPES.box(), rock(bands[i % bands.length], 0.22, 0.03),
      [x + i * rand(0.1, 0.4), y + th / 2, rand(-1.5, 1.5)],
      [rand(7, 11), th, rand(20, 26)], [0, rand(-0.04, 0.04), rand(-0.03, 0.03)]);
    y += th;
  }
  // crevasses cut into the face
  for (let i = 0; i < 4; i++) {
    b.add(SHAPES.box(), deep, [x - 4.2, rand(2, y - 2), rand(-10, 10)],
      [1.2, rand(3, 8), rand(0.6, 1.6)], [0, 0, rand(-0.2, 0.2)]);
  }
  // wind-carved cornice along the top
  for (let i = 0; i < 7; i++) {
    b.add(SHAPES.icosa(), snow, [x - rand(2, 5), y + rand(-0.5, 1), rand(-11, 11)],
      [rand(1.5, 4), rand(0.8, 2), rand(1.5, 4)], [rand(0, 3), rand(0, 6), rand(0, 3)]);
  }
  // calved bergs at the foot
  for (let i = 0; i < 8; i++) {
    b.add(SHAPES.icosa(), rock(bands[i % bands.length], 0.2, 0.03),
      [x - rand(4, 9), rand(0.2, 2), rand(-11, 11)],
      [rand(1, 3.2), rand(1, 3), rand(1, 3.2)], [rand(0, 3), rand(0, 6), rand(0, 3)]);
  }
}

export function iceProp() {
  const b = new PropBuilder();
  const roll = Math.random();
  if (roll < 0.34) iceSeracs(b);
  else if (roll < 0.6) glacierWall(b);
  else if (roll < 0.84) frozenWreck(b);
  else iceStation(b);

  if (Math.random() < 0.4) {
    const s = new THREE.Mesh(SHAPES.octa(), glow(0xa9f0ff, 1.8));
    s.scale.setScalar(rand(0.5, 1.3));
    s.position.set(rand(-8, 8), rand(7, 17), rand(-9, 9));
    s.userData.spin = rand(0.2, 0.7);
    b.addLoose(s);
  }
  return b.build();
}
