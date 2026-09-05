// The five worlds of XENO RUN. Each biome owns its palette, lighting, ground
// material, parallax skyline, side-scenery factory and ambient particle style.
import * as THREE from 'three';
import { groundTexture, skylineTexture } from '../core/textures.js';
import { rand, pick } from '../core/noise.js';

const geoCache = {};
function geo(key, factory) {
  if (!geoCache[key]) geoCache[key] = factory();
  return geoCache[key];
}

function emissive(color, intensity = 1.4) {
  return new THREE.MeshStandardMaterial({
    color: 0x101018,
    emissive: new THREE.Color(color),
    emissiveIntensity: intensity,
    roughness: 0.4,
    metalness: 0.1,
  });
}

function rock(color, rough = 0.85, metal = 0.05) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, flatShading: true });
}

/* ---------------------------------------------------------------- BIOME 1 */
function crystalProp() {
  const g = new THREE.Group();
  const count = 2 + ((Math.random() * 3) | 0);
  for (let i = 0; i < count; i++) {
    const h = rand(4, 16);
    const m = new THREE.Mesh(
      geo('crystal', () => new THREE.ConeGeometry(1, 1, 6, 1)),
      Math.random() < 0.45
        ? new THREE.MeshStandardMaterial({
            color: pick([0x7b4dff, 0x3ad7ff, 0xc44bff]),
            emissive: new THREE.Color(pick([0x5a2bff, 0x22b6ff])),
            emissiveIntensity: 1.1,
            roughness: 0.15,
            metalness: 0.2,
            transparent: true,
            opacity: 0.88,
            flatShading: true,
          })
        : rock(0x3b2f5e, 0.6, 0.15)
    );
    m.scale.set(rand(0.6, 2.2), h, rand(0.6, 2.2));
    m.position.set(rand(-4, 4), h * 0.5 - 0.4, rand(-8, 8));
    m.rotation.set(rand(-0.16, 0.16), rand(0, 6.28), rand(-0.16, 0.16));
    m.castShadow = true;
    g.add(m);
  }
  // floating shard
  if (Math.random() < 0.6) {
    const s = new THREE.Mesh(
      geo('octa', () => new THREE.OctahedronGeometry(1, 0)),
      emissive(0x8a5bff, 1.8)
    );
    s.scale.setScalar(rand(0.5, 1.5));
    s.position.set(rand(-5, 5), rand(8, 18), rand(-8, 8));
    s.userData.spin = rand(0.2, 0.9);
    g.add(s);
  }
  return g;
}

/* ---------------------------------------------------------------- BIOME 2 */
function cityProp() {
  const g = new THREE.Group();
  const towers = 2 + ((Math.random() * 2) | 0);
  for (let i = 0; i < towers; i++) {
    const h = rand(14, 46);
    const w = rand(3, 7);
    const body = new THREE.Mesh(
      geo('box', () => new THREE.BoxGeometry(1, 1, 1)),
      rock(pick([0x1b2438, 0x232f47, 0x141c2c]), 0.55, 0.55)
    );
    body.scale.set(w, h, rand(3, 7));
    body.position.set(rand(-6, 6), h * 0.5, rand(-9, 9));
    body.castShadow = true;
    g.add(body);
    // neon signage strips
    for (let s = 0; s < 3; s++) {
      const sign = new THREE.Mesh(
        geo('box', () => new THREE.BoxGeometry(1, 1, 1)),
        emissive(pick([0xff2f8e, 0x28e0ff, 0xffd23f, 0x8a5bff]), 2.2)
      );
      sign.scale.set(0.25, rand(1.5, 6), rand(0.6, 2.4));
      sign.position.set(
        body.position.x + (Math.random() < 0.5 ? -w / 2 - 0.2 : w / 2 + 0.2),
        rand(4, h - 3),
        body.position.z + rand(-2, 2)
      );
      g.add(sign);
    }
  }
  // hovering ad drone
  if (Math.random() < 0.5) {
    const d = new THREE.Mesh(geo('box', () => new THREE.BoxGeometry(1, 1, 1)), emissive(0x28e0ff, 2.4));
    d.scale.set(2.6, 0.16, 1.2);
    d.position.set(rand(-8, 8), rand(10, 22), rand(-8, 8));
    d.userData.bob = rand(0.4, 1.2);
    g.add(d);
  }
  return g;
}

/* ---------------------------------------------------------------- BIOME 3 */
function jungleProp() {
  const g = new THREE.Group();
  const count = 2 + ((Math.random() * 3) | 0);
  for (let i = 0; i < count; i++) {
    const h = rand(4, 13);
    const stalk = new THREE.Mesh(
      geo('cyl', () => new THREE.CylinderGeometry(0.5, 0.8, 1, 7)),
      rock(0x5d7a4a, 0.9)
    );
    stalk.scale.set(rand(0.5, 1.3), h, rand(0.5, 1.3));
    stalk.position.set(rand(-6, 6), h * 0.5, rand(-9, 9));
    stalk.castShadow = true;
    g.add(stalk);
    const capColor = pick([0x39e6a0, 0x6ff0ff, 0xd2ff5e, 0xff8ad0]);
    const cap = new THREE.Mesh(
      geo('sphere', () => new THREE.SphereGeometry(1, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55)),
      new THREE.MeshStandardMaterial({
        color: capColor,
        emissive: new THREE.Color(capColor),
        emissiveIntensity: 0.75,
        roughness: 0.6,
        flatShading: true,
      })
    );
    const cs = rand(1.6, 4.4) * stalk.scale.x;
    cap.scale.set(cs, cs * rand(0.5, 0.9), cs);
    cap.position.set(stalk.position.x, h, stalk.position.z);
    cap.castShadow = true;
    g.add(cap);
  }
  // hanging vine
  const vine = new THREE.Mesh(geo('cyl', () => new THREE.CylinderGeometry(0.5, 0.8, 1, 7)), rock(0x2f4a2c, 0.95));
  vine.scale.set(0.12, rand(6, 14), 0.12);
  vine.position.set(rand(-7, 7), rand(12, 18), rand(-9, 9));
  g.add(vine);
  return g;
}

/* ---------------------------------------------------------------- BIOME 4 */
function magmaProp() {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const h = rand(3, 14);
    const m = new THREE.Mesh(
      geo('rock', () => new THREE.DodecahedronGeometry(1, 0)),
      rock(pick([0x2a1a18, 0x3a231d, 0x1d1312]), 0.95)
    );
    m.scale.set(rand(1.4, 4), h * 0.35, rand(1.4, 4));
    m.position.set(rand(-6, 6), h * 0.15, rand(-9, 9));
    m.rotation.y = rand(0, 6.28);
    m.castShadow = true;
    g.add(m);
  }
  // lava pool
  const pool = new THREE.Mesh(
    geo('plane', () => new THREE.PlaneGeometry(1, 1)),
    new THREE.MeshBasicMaterial({ color: 0xff5a1f, transparent: true, opacity: 0.9 })
  );
  pool.rotation.x = -Math.PI / 2;
  pool.scale.set(rand(4, 11), rand(4, 11), 1);
  pool.position.set(rand(-7, 7), 0.06, rand(-9, 9));
  g.add(pool);
  // industrial pipe tower
  if (Math.random() < 0.55) {
    const pipe = new THREE.Mesh(geo('cyl', () => new THREE.CylinderGeometry(0.5, 0.8, 1, 7)), rock(0x4b3a33, 0.6, 0.6));
    const ph = rand(10, 26);
    pipe.scale.set(rand(1.2, 2.6), ph, rand(1.2, 2.6));
    pipe.position.set(rand(-8, 8), ph * 0.5, rand(-9, 9));
    pipe.castShadow = true;
    g.add(pipe);
    const ring = new THREE.Mesh(geo('torus', () => new THREE.TorusGeometry(1, 0.12, 6, 16)), emissive(0xff7a1f, 2));
    ring.scale.setScalar(pipe.scale.x * 1.3);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(pipe.position.x, ph * 0.85, pipe.position.z);
    g.add(ring);
  }
  return g;
}

/* ---------------------------------------------------------------- BIOME 5 */
function iceProp() {
  const g = new THREE.Group();
  const iceMat = new THREE.MeshStandardMaterial({
    color: 0xbfe9ff,
    emissive: new THREE.Color(0x2b6fa8),
    emissiveIntensity: 0.35,
    roughness: 0.12,
    metalness: 0.05,
    transparent: true,
    opacity: 0.85,
    flatShading: true,
  });
  for (let i = 0; i < 3 + ((Math.random() * 2) | 0); i++) {
    const h = rand(4, 20);
    const m = new THREE.Mesh(geo('icosa', () => new THREE.IcosahedronGeometry(1, 0)), iceMat);
    m.scale.set(rand(1, 3.4), h * 0.5, rand(1, 3.4));
    m.position.set(rand(-7, 7), h * 0.2, rand(-9, 9));
    m.rotation.set(rand(-0.2, 0.2), rand(0, 6.3), rand(-0.2, 0.2));
    m.castShadow = true;
    g.add(m);
  }
  // frozen arch
  if (Math.random() < 0.4) {
    const arch = new THREE.Mesh(geo('torus2', () => new THREE.TorusGeometry(1, 0.18, 6, 20, Math.PI)), iceMat);
    arch.scale.setScalar(rand(5, 10));
    arch.position.set(rand(-9, 9), 0, rand(-9, 9));
    arch.rotation.y = rand(0, 3.14);
    g.add(arch);
  }
  return g;
}

export const BIOMES = [
  {
    id: 0,
    name: 'CRYSTAL CANYON',
    tag: 'Bioluminescent shard fields of Kepler-9c',
    accent: 0x8a5bff,
    fog: 0x1a0f3a,
    fogDensity: 0.0072,
    sky: [0x120a2e, 0x3a1c6b, 0x7b3fa8],
    stars: 1.0,
    skyFeature: 'nebula',
    hemi: [0x6a4bff, 0x160c2e, 0.55],
    sun: [0xb98bff, 1.25],
    sunPos: [-24, 34, -30],
    ground: { style: 'crystal', base: 0x2a1c4d, accent: 0x5b3f9e, glow: 0x9b6bff, repeat: [3, 8], rough: 0.45, metal: 0.25 },
    laneGlow: 0x9b6bff,
    skyline: { style: 'spires', color: 0x2a1750 },
    prop: crystalProp,
    particles: { color: 0xb18bff, count: 260, style: 'float', size: 0.28 },
    music: 'crystal',
  },
  {
    id: 1,
    name: 'NEON METROPOLIS',
    tag: 'Rain-slick megacity of the Vore Syndicate',
    accent: 0x28e0ff,
    fog: 0x070d1c,
    fogDensity: 0.0080,
    sky: [0x030713, 0x0b1b33, 0x27406b],
    stars: 0.35,
    hemi: [0x2d6fff, 0x05070f, 0.5],
    sun: [0x7fd4ff, 1.0],
    sunPos: [28, 40, -26],
    ground: { style: 'city', base: 0x243044, accent: 0x38506e, glow: 0x28e0ff, repeat: [3, 8], rough: 0.28, metal: 0.75 },
    laneGlow: 0x28e0ff,
    skyline: { style: 'city', color: 0x0b1526 },
    prop: cityProp,
    particles: { color: 0x9fd8ff, count: 420, style: 'rain', size: 0.2 },
    music: 'city',
  },
  {
    id: 2,
    name: 'SPORE JUNGLE',
    tag: 'Living fungal canopy that breathes with you',
    accent: 0x39e6a0,
    fog: 0x0a2a1e,
    fogDensity: 0.0098,
    sky: [0x04160f, 0x0e3a26, 0x2f7a4d],
    stars: 0.25,
    hemi: [0x66ffbf, 0x0a2016, 0.75],
    sun: [0xbfffd9, 1.15],
    sunPos: [18, 44, -34],
    ground: { style: 'jungle', base: 0x1d3a24, accent: 0x3f7a3c, glow: 0x6bffb0, repeat: [3, 8], rough: 0.85, metal: 0.0 },
    laneGlow: 0x6bffb0,
    skyline: { style: 'trees', color: 0x0a2417 },
    prop: jungleProp,
    particles: { color: 0x9dffd0, count: 340, style: 'float', size: 0.3 },
    music: 'jungle',
  },
  {
    id: 3,
    name: 'MAGMA FORGE',
    tag: 'Machine hell drilling into a dying star',
    accent: 0xff7a1f,
    fog: 0x2a0a05,
    fogDensity: 0.0110,
    sky: [0x1a0402, 0x581206, 0xc4441a],
    stars: 0.0,
    hemi: [0xff8a3d, 0x2a0a05, 0.7],
    sun: [0xffb066, 1.5],
    sunPos: [-20, 26, -22],
    ground: { style: 'magma', base: 0x3a2622, accent: 0x6b3a24, glow: 0xff6a1f, repeat: [3, 8], rough: 0.75, metal: 0.2 },
    laneGlow: 0xff8a3d,
    skyline: { style: 'mountains', color: 0x2b0d06 },
    prop: magmaProp,
    particles: { color: 0xffa04d, count: 380, style: 'ember', size: 0.26 },
    music: 'magma',
  },
  {
    id: 4,
    name: 'AURORA GLACIER',
    tag: 'Comet ice under a screaming aurora',
    accent: 0x7fe9ff,
    fog: 0x0a1c33,
    fogDensity: 0.0074,
    sky: [0x02060f, 0x0d2b4d, 0x3f8fb8],
    stars: 0.9,
    skyFeature: 'aurora',
    hemi: [0x9fe4ff, 0x0a1826, 0.7],
    sun: [0xd8f6ff, 1.35],
    sunPos: [22, 38, -30],
    ground: { style: 'ice', base: 0x2c5776, accent: 0x8fc9e8, glow: 0xa9f0ff, repeat: [3, 8], rough: 0.14, metal: 0.15 },
    laneGlow: 0xa9f0ff,
    skyline: { style: 'mountains', color: 0x123049 },
    prop: iceProp,
    particles: { color: 0xe6fbff, count: 420, style: 'snow', size: 0.24 },
    music: 'ice',
  },
];

const groundMatCache = new Map();

/**
 * Kill the tiling repeat.
 *
 * The deck is 24 m of texture repeated forever, and the human eye locks onto
 * that rhythm instantly — it is the single biggest "this is a game, not a
 * place" tell. This injects a large-scale, world-space noise field over the
 * albedo and roughness, so no two stretches of floor look alike even though
 * they share one texture. Costs a handful of ALU ops per pixel.
 */
function addDetailBreakup(mat, b) {
  mat.userData.breakup = true;
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uWear = { value: b.ground.style === 'ice' || b.ground.style === 'city' ? 0.5 : 0.34 };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vXWorld;')
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\n  vXWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;'
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vXWorld;
        uniform float uWear;
        float xhash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float xnoise(vec2 p) {
          vec2 i = floor(p), f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(mix(xhash(i), xhash(i + vec2(1, 0)), f.x),
                     mix(xhash(i + vec2(0, 1)), xhash(i + vec2(1, 1)), f.x), f.y);
        }
        float xfbm(vec2 p) {
          return xnoise(p) * 0.6 + xnoise(p * 2.3) * 0.26 + xnoise(p * 5.1) * 0.14;
        }`
      )
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        float wear = xfbm(vXWorld.xz * 0.035);
        float patch = xfbm(vXWorld.xz * 0.011 + 17.0);
        diffuseColor.rgb *= 1.0 - uWear * (0.5 - wear) - 0.28 * (0.5 - patch);`
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
        roughnessFactor = clamp(roughnessFactor + (wear - 0.5) * 0.45 + (patch - 0.5) * 0.3, 0.03, 1.0);`
      );
    mat.userData.shader = shader;
  };
}

export function biomeGroundMaterial(b) {
  if (groundMatCache.has(b.id)) return groundMatCache.get(b.id);
  const { map, normalMap, roughnessMap } = groundTexture(b.id, b.ground.style, b.ground.base, b.ground.accent, b.ground.glow);
  const [ru, rv] = b.ground.repeat;
  const clones = [map, normalMap, roughnessMap].map((t) => {
    const c = t.clone();
    c.wrapS = c.wrapT = THREE.RepeatWrapping;
    c.repeat.set(ru, rv);
    c.anisotropy = 16;
    c.needsUpdate = true;
    return c;
  });
  const [m, n, rm] = clones;
  const mat = new THREE.MeshStandardMaterial({
    map: m,
    normalMap: n,
    normalScale: new THREE.Vector2(1.7, 1.7),
    roughnessMap: rm,
    roughness: b.ground.rough,
    metalness: b.ground.metal,
    envMapIntensity: 1.15,
  });
  addDetailBreakup(mat, b);
  groundMatCache.set(b.id, mat);
  return mat;
}

export function biomeSkylineTexture(b) {
  return skylineTexture(b.id, b.skyline.style, b.skyline.color);
}
