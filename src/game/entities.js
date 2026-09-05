// Obstacles, pickups and gates. Every prefab is procedurally modelled and
// recycled through a type-keyed pool so mobile GC never hitches.
import * as THREE from 'three';
import { panelTexture, glowSprite } from '../core/textures.js';
import { PHASE_COLORS } from '../config.js';

const shared = {};
function G(key, f) { if (!shared[key]) shared[key] = f(); return shared[key]; }

function metalMat(hex = 0x8fa3bb, glow = 0x40e0ff) {
  const key = `mm_${hex}_${glow}`;
  return G(key, () => {
    const { map, normalMap } = panelTexture(hex, glow);
    const m = map.clone(); const n = normalMap.clone();
    m.needsUpdate = n.needsUpdate = true;
    m.repeat.set(2, 1); n.repeat.set(2, 1);
    return new THREE.MeshStandardMaterial({ map: m, normalMap: n, roughness: 0.42, metalness: 0.8 });
  });
}

function neonMat(hex, intensity = 2.6, opacity = 1) {
  return new THREE.MeshStandardMaterial({
    color: 0x0a0f14,
    emissive: new THREE.Color(hex),
    emissiveIntensity: intensity,
    roughness: 0.3,
    transparent: opacity < 1,
    opacity,
  });
}

/* ------------------------------------------------------------------ builds */

function buildBarrier() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(G('bx', () => new THREE.BoxGeometry(1, 1, 1)), metalMat(0x76889e, 0xffb23f));
  body.scale.set(2.05, 1.0, 0.45);
  body.position.y = 0.5;
  body.castShadow = true;
  g.add(body);
  const strip = new THREE.Mesh(G('bx', () => new THREE.BoxGeometry(1, 1, 1)), neonMat(0xffb23f, 3));
  strip.scale.set(2.1, 0.13, 0.52);
  strip.position.y = 0.95;
  g.add(strip);
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(G('bx', () => new THREE.BoxGeometry(1, 1, 1)), metalMat(0x4a5666, 0xffb23f));
    leg.scale.set(0.18, 1.1, 0.6);
    leg.position.set(s * 1.03, 0.55, 0);
    g.add(leg);
  }
  g.userData.box = { hw: 1.05, hh: 0.55, hd: 0.35, cy: 0.52 };
  return g;
}

function buildGate() {
  const g = new THREE.Group();
  for (const s of [-1, 1]) {
    const post = new THREE.Mesh(G('cy', () => new THREE.CylinderGeometry(0.5, 0.5, 1, 10)), metalMat(0x8595ab, 0xff3e6a));
    post.scale.set(0.22, 3.6, 0.22);
    post.position.set(s * 1.25, 1.8, 0);
    post.castShadow = true;
    g.add(post);
  }
  const beams = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const beam = new THREE.Mesh(G('bx', () => new THREE.BoxGeometry(1, 1, 1)), neonMat(0xff3e6a, 3.4, 0.85));
    beam.scale.set(2.5, 0.09, 0.09);
    beam.position.y = 1.35 + i * 0.5;
    beams.add(beam);
  }
  g.add(beams);
  const head = new THREE.Mesh(G('bx', () => new THREE.BoxGeometry(1, 1, 1)), metalMat(0x8595ab, 0xff3e6a));
  head.scale.set(2.8, 0.3, 0.4);
  head.position.y = 3.5;
  g.add(head);
  g.userData.beams = beams;
  g.userData.box = { hw: 1.25, hh: 1.1, hd: 0.3, cy: 2.4 };
  return g;
}

function buildPillar() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(G('bx', () => new THREE.BoxGeometry(1, 1, 1)), metalMat(0x5f6f84, 0x2fe0ff));
  body.scale.set(1.85, 3.5, 0.9);
  body.position.y = 1.75;
  body.castShadow = true;
  g.add(body);
  for (let i = 0; i < 3; i++) {
    const strip = new THREE.Mesh(G('bx', () => new THREE.BoxGeometry(1, 1, 1)), neonMat(0x2fe0ff, 2.8));
    strip.scale.set(1.92, 0.1, 0.95);
    strip.position.y = 0.7 + i * 1.1;
    g.add(strip);
  }
  const cap = new THREE.Mesh(G('bx', () => new THREE.BoxGeometry(1, 1, 1)), metalMat(0x39485a, 0x2fe0ff));
  cap.scale.set(2.05, 0.22, 1.1);
  cap.position.y = 3.55;
  g.add(cap);
  g.userData.box = { hw: 0.95, hh: 1.8, hd: 0.5, cy: 1.75 };
  return g;
}

function buildPhaseWall() {
  const g = new THREE.Group();
  const field = new THREE.Mesh(
    G('pl', () => new THREE.PlaneGeometry(1, 1, 1, 1)),
    new THREE.MeshBasicMaterial({ color: PHASE_COLORS[0], transparent: true, opacity: 0.42, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })
  );
  field.scale.set(2.3, 3.0, 1);
  field.position.y = 1.5;
  g.add(field);
  const grid = new THREE.Mesh(
    G('pl2', () => new THREE.PlaneGeometry(1, 1, 6, 8)),
    new THREE.MeshBasicMaterial({ color: PHASE_COLORS[0], wireframe: true, transparent: true, opacity: 0.85 })
  );
  grid.scale.set(2.3, 3.0, 1);
  grid.position.y = 1.5;
  g.add(grid);
  const frame = new THREE.Group();
  for (const s of [-1, 1]) {
    const post = new THREE.Mesh(G('bx', () => new THREE.BoxGeometry(1, 1, 1)), metalMat(0x2a3340, 0xffffff));
    post.scale.set(0.16, 3.2, 0.16);
    post.position.set(s * 1.2, 1.6, 0);
    frame.add(post);
  }
  g.add(frame);
  g.userData.field = field;
  g.userData.grid = grid;
  g.userData.box = { hw: 1.15, hh: 1.5, hd: 0.25, cy: 1.5 };
  return g;
}

function buildCrystal() {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: 0xff7ad4, emissive: new THREE.Color(0xb02fff), emissiveIntensity: 1.1,
    roughness: 0.15, metalness: 0.3, flatShading: true, transparent: true, opacity: 0.92,
  });
  for (let i = 0; i < 4; i++) {
    const c = new THREE.Mesh(G('oc', () => new THREE.OctahedronGeometry(1, 0)), mat);
    const s = 0.5 + Math.random() * 0.55;
    c.scale.set(s, s * (1.4 + Math.random()), s);
    c.position.set((Math.random() - 0.5) * 1.2, s * 1.1, (Math.random() - 0.5) * 0.5);
    c.rotation.set(Math.random() * 0.4, Math.random() * 3, Math.random() * 0.4);
    c.castShadow = true;
    g.add(c);
  }
  const base = new THREE.Mesh(G('cy', () => new THREE.CylinderGeometry(0.5, 0.5, 1, 10)), metalMat(0x40304f, 0xb02fff));
  base.scale.set(1.7, 0.25, 1.7);
  base.position.y = 0.12;
  g.add(base);
  g.userData.box = { hw: 0.95, hh: 1.2, hd: 0.5, cy: 1.2 };
  return g;
}

function buildDrone() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(G('sp', () => new THREE.SphereGeometry(0.42, 16, 12)), metalMat(0x9aa9bd, 0xff2f6a));
  body.scale.set(1.2, 0.85, 1);
  body.castShadow = true;
  g.add(body);
  const eye = new THREE.Mesh(G('sp2', () => new THREE.SphereGeometry(0.15, 12, 10)), neonMat(0xff2f6a, 4));
  eye.position.z = 0.36;
  g.add(eye);
  const rotors = new THREE.Group();
  for (const [x, z] of [[-0.5, -0.4], [0.5, -0.4], [-0.5, 0.4], [0.5, 0.4]]) {
    const arm = new THREE.Mesh(G('bx', () => new THREE.BoxGeometry(1, 1, 1)), metalMat(0x505d6e, 0xff2f6a));
    arm.scale.set(0.5, 0.06, 0.1);
    arm.position.set(x, 0.05, z);
    arm.rotation.y = Math.atan2(z, x);
    g.add(arm);
    const rotor = new THREE.Mesh(G('cy2', () => new THREE.CylinderGeometry(0.26, 0.26, 0.03, 12)), neonMat(0x8fd8ff, 1.6, 0.5));
    rotor.position.set(x * 1.35, 0.12, z * 1.35);
    rotors.add(rotor);
  }
  g.add(rotors);
  g.userData.rotors = rotors;
  g.userData.box = { hw: 0.6, hh: 0.5, hd: 0.5, cy: 0 };
  return g;
}

function buildPad() {
  const g = new THREE.Group();
  const base = new THREE.Mesh(G('cy', () => new THREE.CylinderGeometry(0.5, 0.5, 1, 10)), metalMat(0x3d4d5e, 0x39ff9e));
  base.scale.set(2.0, 0.2, 2.0);
  base.position.y = 0.1;
  g.add(base);
  const ring = new THREE.Mesh(G('to', () => new THREE.TorusGeometry(1, 0.08, 8, 24)), neonMat(0x39ff9e, 3.5));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.22;
  g.add(ring);
  const cone = new THREE.Mesh(
    G('co', () => new THREE.ConeGeometry(0.9, 2.2, 16, 1, true)),
    new THREE.MeshBasicMaterial({ color: 0x39ff9e, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })
  );
  cone.position.y = 1.2;
  g.add(cone);
  g.userData.ring = ring;
  g.userData.box = { hw: 0.95, hh: 0.4, hd: 0.9, cy: 0.2 };
  return g;
}

function buildWarpGate() {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(G('to2', () => new THREE.TorusGeometry(4.2, 0.28, 10, 40)), neonMat(0xffffff, 3.2));
  ring.position.y = 3.4;
  g.add(ring);
  const inner = new THREE.Mesh(
    G('ci', () => new THREE.CircleGeometry(4.0, 40)),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })
  );
  inner.position.y = 3.4;
  g.add(inner);
  const swirl = new THREE.Mesh(
    G('to3', () => new THREE.TorusGeometry(3.2, 0.06, 6, 40)),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 })
  );
  swirl.position.y = 3.4;
  g.add(swirl);
  g.userData.ring = ring;
  g.userData.inner = inner;
  g.userData.swirl = swirl;
  g.userData.box = { hw: 6, hh: 4, hd: 0.4, cy: 3.4 };
  return g;
}

function buildFlipGate() {
  const g = new THREE.Group();
  const frame = new THREE.Mesh(G('to4', () => new THREE.TorusGeometry(3.6, 0.22, 8, 4)), neonMat(0xb44bff, 3));
  frame.position.y = 3.7;
  frame.rotation.z = Math.PI / 4;
  g.add(frame);
  const field = new THREE.Mesh(
    G('pl', () => new THREE.PlaneGeometry(1, 1, 1, 1)),
    new THREE.MeshBasicMaterial({ color: 0xb44bff, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })
  );
  field.scale.set(5.6, 6.4, 1);
  field.position.y = 3.7;
  g.add(field);
  for (const s of [-1, 1]) {
    const arrow = new THREE.Mesh(G('co2', () => new THREE.ConeGeometry(0.35, 0.8, 4)), neonMat(0xe6b3ff, 4));
    arrow.position.set(s * 2.4, 3.7, 0);
    arrow.rotation.x = Math.PI;
    g.add(arrow);
  }
  g.userData.frame = frame;
  g.userData.box = { hw: 6, hh: 4.4, hd: 0.4, cy: 3.7 };
  return g;
}

function buildCeilingSlab() {
  const g = new THREE.Group();
  const slab = new THREE.Mesh(G('bx', () => new THREE.BoxGeometry(1, 1, 1)), metalMat(0x4c5a6b, 0xb44bff));
  slab.scale.set(11.5, 0.4, 24);
  g.add(slab);
  for (const s of [-1, 1]) {
    const rail = new THREE.Mesh(G('bx', () => new THREE.BoxGeometry(1, 1, 1)), neonMat(0xb44bff, 2.4));
    rail.scale.set(0.14, 0.16, 24);
    rail.position.set(s * 5.6, -0.25, 0);
    g.add(rail);
  }
  g.userData.box = null;
  return g;
}

function buildOrb() {
  const g = new THREE.Group();
  const core = new THREE.Mesh(G('sp3', () => new THREE.SphereGeometry(0.22, 14, 12)), neonMat(0xffe259, 4.5));
  g.add(core);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowSprite(0xffd23f), transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.scale.setScalar(1.15);
  g.add(halo);
  g.userData.box = { hw: 0.5, hh: 0.5, hd: 0.5, cy: 0 };
  return g;
}

function powerup(hex, inner) {
  const g = new THREE.Group();
  const shell = new THREE.Mesh(
    G('ic', () => new THREE.IcosahedronGeometry(0.42, 0)),
    new THREE.MeshStandardMaterial({ color: hex, emissive: new THREE.Color(hex), emissiveIntensity: 1.4, roughness: 0.2, metalness: 0.4, transparent: true, opacity: 0.55, flatShading: true })
  );
  g.add(shell);
  const nucleus = new THREE.Mesh(G('sp4', () => new THREE.SphereGeometry(0.18, 12, 10)), neonMat(inner, 5));
  g.add(nucleus);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowSprite(hex), transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.scale.setScalar(1.9);
  g.add(halo);
  g.userData.shell = shell;
  g.userData.box = { hw: 0.6, hh: 0.6, hd: 0.6, cy: 0 };
  return g;
}

export const BUILDERS = {
  barrier: buildBarrier,
  gate: buildGate,
  pillar: buildPillar,
  phasewall: buildPhaseWall,
  crystal: buildCrystal,
  drone: buildDrone,
  pad: buildPad,
  warp: buildWarpGate,
  flip: buildFlipGate,
  ceiling: buildCeilingSlab,
  orb: buildOrb,
  shield: () => powerup(0x39c6ff, 0xd8f6ff),
  magnet: () => powerup(0xff8a3d, 0xffe0b3),
  x2: () => powerup(0xb44bff, 0xf0d8ff),
  core: () => powerup(0x39ff9e, 0xe0fff0),
};

export const HAZARDS = new Set(['barrier', 'gate', 'pillar', 'phasewall', 'crystal', 'drone']);
export const PICKUPS = new Set(['orb', 'shield', 'magnet', 'x2', 'core']);
export const SMASHABLE = new Set(['barrier', 'crystal', 'drone', 'pillar']);

export class EntityPool {
  constructor(scene) {
    this.scene = scene;
    this.pools = new Map();
    this.active = [];
  }

  spawn(type, x, y, z, opts = {}) {
    let pool = this.pools.get(type);
    if (!pool) { pool = []; this.pools.set(type, pool); }
    let e = pool.pop();
    if (!e) {
      const mesh = BUILDERS[type]();
      mesh.userData.type = type;
      e = { type, mesh, box: mesh.userData.box, data: {} };
      this.scene.add(mesh);
    }
    e.mesh.visible = true;
    e.mesh.position.set(x, y, z);
    e.mesh.rotation.set(0, 0, opts.flip ? Math.PI : 0);
    e.mesh.scale.setScalar(1);
    e.dead = false;
    e.hit = false;
    e.flip = !!opts.flip;
    e.phase = opts.phase ?? -1;
    e.data = opts.data || {};
    e.spawnX = x;
    e.spawnY = y;
    if (type === 'phasewall') {
      const c = PHASE_COLORS[e.phase] ?? PHASE_COLORS[0];
      e.mesh.userData.field.material.color.setHex(c);
      e.mesh.userData.grid.material.color.setHex(c);
    }
    this.active.push(e);
    return e;
  }

  /** Mark for removal. The free-list hand-off happens in cullBehind so an
   *  entity can never live in `active` twice. */
  release(e) {
    e.mesh.visible = false;
    e.dead = true;
  }

  _free(e) {
    e.mesh.visible = false;
    e.dead = true;
    const pool = this.pools.get(e.type);
    if (pool) pool.push(e);
  }

  cullBehind(z) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const e = this.active[i];
      if (e.dead || e.mesh.position.z > z) {
        this._free(e);
        this.active.splice(i, 1);
      }
    }
  }

  clear() {
    for (const e of this.active) this._free(e);
    this.active.length = 0;
  }
}
