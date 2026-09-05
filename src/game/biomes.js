// The five worlds of XENO RUN. Each biome owns its palette, lighting, ground
// material, parallax skyline, side-scenery factory and ambient particle style.
import * as THREE from 'three';
import { groundTexture, skylineTexture } from '../core/textures.js';
import { rand, pick } from '../core/noise.js';
import { crystalProp, cityProp, jungleProp, magmaProp, iceProp } from './props.js';

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






export const BIOMES = [
  {
    id: 0,
    name: 'CRYSTAL CANYON',
    tag: 'Bioluminescent shard fields of Kepler-9c',
    accent: 0x8a5bff,
    fog: 0x1f1935,
    fogDensity: 0.0030,
    // Daylight. The five worlds now alternate bright/dark so the run never
    // spends more than one biome in the same key.
    sky: [0x21356e, 0x5f6fa8, 0xc9a9c8],
    stars: 0.0,
    skyFeature: null,
    hemi: [0xa8bcf0, 0x39304f, 1.15],
    sun: [0xffe6c0, 2.5],
    sunPos: [-24, 34, -30],
    ground: { style: 'crystal', base: 0x2a1c4d, accent: 0x5b3f9e, glow: 0x9b6bff, repeat: [3, 8], rough: 0.45, metal: 0.25, albedo: 0.075 },
    laneGlow: 0x9b6bff,
    skyline: { style: 'spires', color: 0x3b3260 },
    prop: crystalProp,
    particles: { color: 0xf0e4ff, count: 260, style: 'float', size: 0.28 },
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
    hemi: [0x2d6fff, 0x05070f, 1.2],
    sun: [0x7fd4ff, 2.6],
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
    fog: 0x16301f,
    fogDensity: 0.0044,
    // Daylight filtering down through the canopy.
    sky: [0x14508e, 0x5d9ab0, 0xbcd489],
    stars: 0.0,
    skyFeature: null,
    hemi: [0xbfe8d8, 0x1c3a22, 1.1],
    sun: [0xfff2cc, 2.4],
    sunPos: [18, 44, -34],
    ground: { style: 'jungle', base: 0x1d3a24, accent: 0x3f7a3c, glow: 0x6bffb0, repeat: [3, 8], rough: 0.85, metal: 0.0, albedo: 0.078 },
    laneGlow: 0x6bffb0,
    skyline: { style: 'trees', color: 0x1e4530 },
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
    sky: [0x1a0402, 0x6b1608, 0xff7e2e],
    stars: 0.0,
    hemi: [0xff8a3d, 0x2a0a05, 1.3],
    sun: [0xffb066, 2.9],
    sunPos: [-20, 26, -22],
    ground: { style: 'magma', base: 0x3a2622, accent: 0x6b3a24, glow: 0xff6a1f, repeat: [3, 8], rough: 0.75, metal: 0.2, albedo: 0.10 },
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
    sky: [0x02060f, 0x0a2340, 0x1f5d80],
    stars: 0.9,
    skyFeature: 'aurora',
    hemi: [0x9fe4ff, 0x0a1826, 1.15],
    sun: [0xd8f6ff, 2.5],
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

/**
 * The terrain either side of the track.
 *
 * This was a single flat colour (0x11131f) shared by every world, and it is
 * 140 m wide against the track's 11.5 m — so roughly nine tenths of the ground
 * on screen had no texture at all, which is why the floor read as a smooth
 * grey gradient no matter how much detail went into groundTexture.
 */
const sideMatCache = new Map();
export function biomeSideMaterial(b) {
  if (sideMatCache.has(b.id)) return sideMatCache.get(b.id);
  const { map, normalMap, roughnessMap } = groundTexture(b.id, b.ground.style, b.ground.base, b.ground.accent, b.ground.glow, b.ground.albedo);
  const clones = [map, normalMap, roughnessMap].map((t) => {
    const c = t.clone();
    c.wrapS = c.wrapT = THREE.RepeatWrapping;
    c.repeat.set(14, 8); // wider tiling: this plane is six times the track's width
    c.anisotropy = 16;
    c.needsUpdate = true;
    return c;
  });
  const [m, n, rm] = clones;
  const mat = new THREE.MeshStandardMaterial({
    map: m,
    normalMap: n,
    normalScale: new THREE.Vector2(1.2, 1.2),
    roughnessMap: rm,
    // a touch darker and rougher than the track, so the running surface still
    // reads as the running surface
    color: new THREE.Color(0x8d93a8),
    roughness: Math.min(1, b.ground.rough + 0.25),
    metalness: b.ground.metal * 0.35,
    envMapIntensity: 0.5,
  });
  addDetailBreakup(mat, b);
  sideMatCache.set(b.id, mat);
  return mat;
}

export function biomeGroundMaterial(b) {
  if (groundMatCache.has(b.id)) return groundMatCache.get(b.id);
  const { map, normalMap, roughnessMap } = groundTexture(b.id, b.ground.style, b.ground.base, b.ground.accent, b.ground.glow, b.ground.albedo);
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
    envMapIntensity: 0.8,
  });
  addDetailBreakup(mat, b);
  groundMatCache.set(b.id, mat);
  return mat;
}

export function biomeSkylineTexture(b) {
  return skylineTexture(b.id, b.skyline.style, b.skyline.color);
}
