// Procedural texture bakery: every surface in XENO RUN is generated at runtime
// (no binary assets to download) but at high resolution with matching normal maps.
import * as THREE from 'three';
import { fbm, worley, worley2, valueNoise, clamp, lerp } from './noise.js';

const cache = new Map();

function canvas(size) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  return c;
}

function toTexture(cv, repeat = 1, srgb = true) {
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = 16;
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/** Sobel-derived normal map from a height field (Float32Array of size*size). */
function heightToNormal(height, size, strength = 2.4) {
  const cv = canvas(size);
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(size, size);
  const at = (x, y) => height[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      let nx = -dx;
      let ny = -dy;
      let nz = 1;
      const len = Math.hypot(nx, ny, nz);
      nx /= len; ny /= len; nz /= len;
      const i = (y * size + x) * 4;
      img.data[i] = (nx * 0.5 + 0.5) * 255;
      img.data[i + 1] = (ny * 0.5 + 0.5) * 255;
      img.data[i + 2] = (nz * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 16;
  return tex;
}

/** Pack a Float32Array (0..1) into a greyscale, non-colour-managed texture. */
function toDataTexture(field, size, aniso = 8) {
  const cv = canvas(size);
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < field.length; i++) {
    const v = clamp(field[i] * 255, 0, 255);
    const j = i * 4;
    img.data[j] = v; img.data[j + 1] = v; img.data[j + 2] = v; img.data[j + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = aniso;
  return tex; // linear space on purpose: this is data, not colour
}

const srgbToLinear = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const linearToSrgb = (c) => (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);

// Colour conversion over a 1024x1024 buffer is three million pow() calls per
// direction and it doubled the loading screen. Both directions are pure
// functions of one value, so they become table lookups.
const SRGB_TO_LIN = new Float32Array(256);
for (let i = 0; i < 256; i++) SRGB_TO_LIN[i] = srgbToLinear(i / 255);
const LIN_STEPS = 4096;
const LIN_TO_BYTE = new Uint8Array(LIN_STEPS + 1);
for (let i = 0; i <= LIN_STEPS; i++) LIN_TO_BYTE[i] = Math.round(linearToSrgb(i / LIN_STEPS) * 255);
const linToByte = (l) => LIN_TO_BYTE[l <= 0 ? 0 : l >= 1 ? LIN_STEPS : (l * LIN_STEPS) | 0];

/**
 * Give every deck the same average reflectance.
 *
 * Hand-picked palettes drift wildly in real brightness: the metropolis deck
 * measured a linear albedo of 0.022 while the glacier measured 0.221 — ten
 * times more light bounced off the same lighting rig. No single exposure can
 * serve both, so four of the five worlds rendered as black. Normalising the
 * mean here means the palette controls hue and the lights control brightness,
 * which is the only way the two stay independent.
 *
 * Scaling happens in linear space with a soft shoulder, so glowing veins roll
 * off toward white instead of clipping into flat blobs.
 */
function normaliseAlbedo(data, pixels, target) {
  let sum = 0;
  for (let i = 0; i < pixels; i++) {
    const j = i * 4;
    sum += 0.2126 * SRGB_TO_LIN[data[j]]
         + 0.7152 * SRGB_TO_LIN[data[j + 1]]
         + 0.0722 * SRGB_TO_LIN[data[j + 2]];
  }
  const mean = sum / pixels;
  if (!(mean > 0)) return 1;
  const k = clamp(target / mean, 0.4, 8);
  const KNEE = 0.75;
  // Real surfaces are far less saturated than a hand-picked palette: rock is
  // grey with a tint, and the hue arrives from the light hitting it. A deck of
  // near-pure blue has almost nothing in its red and green channels, so it goes
  // black the moment the lighting is anything but blue. Pulling the albedo
  // toward neutral keeps the biome's identity while giving every channel
  // something to reflect.
  const DESAT = 0.3;
  const inv = 1 - KNEE;
  for (let i = 0; i < pixels; i++) {
    const j = i * 4;
    const lr = SRGB_TO_LIN[data[j]];
    const lg = SRGB_TO_LIN[data[j + 1]];
    const lb = SRGB_TO_LIN[data[j + 2]];
    const y = 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
    let a = (lr + (y - lr) * DESAT) * k;
    let b = (lg + (y - lg) * DESAT) * k;
    let c = (lb + (y - lb) * DESAT) * k;
    if (a > KNEE) a = KNEE + inv * (1 - Math.exp(-(a - KNEE) / inv));
    if (b > KNEE) b = KNEE + inv * (1 - Math.exp(-(b - KNEE) / inv));
    if (c > KNEE) c = KNEE + inv * (1 - Math.exp(-(c - KNEE) / inv));
    data[j] = linToByte(a);
    data[j + 1] = linToByte(b);
    data[j + 2] = linToByte(c);
  }
  return k;
}

function hexToRgb(hex) {
  return [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
}

/**
 * Ground surface for a biome.
 * style: 'crystal' | 'city' | 'jungle' | 'magma' | 'ice'
 */
export function groundTexture(id, style, baseHex, accentHex, glowHex) {
  const key = `ground_${id}`;
  if (cache.has(key)) return cache.get(key);

  const size = 1024; // high-resolution deck: every crack and panel reads clearly
  const cv = canvas(size);
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(size, size);
  const height = new Float32Array(size * size);
  // Per-texel roughness. A single scalar makes every surface read as the same
  // moulded plastic; varying it is what separates wet asphalt from dry grit,
  // polished crystal facet from its dusty seam.
  const rough = new Float32Array(size * size);
  const base = hexToRgb(baseHex);
  const accent = hexToRgb(accentHex);
  const glow = hexToRgb(glowHex);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      let r, g, b, h, rgh = 0.6;

      const grain = fbm(u * 26, v * 26, 5, id * 13);
      const macro = fbm(u * 5, v * 5, 4, id * 7 + 3);

      if (style === 'crystal') {
        // Faceted crystal plating. F1 shades each facet as its own plane and
        // the F2-F1 edge field lights the seams between them.
        const [f1, f2, cellId] = worley2(u * 7, v * 7, id);
        const edge = f2 - f1;
        const facet = clamp(1 - f1 * 1.35, 0, 1);
        const t = clamp(facet * 0.5 + macro * 0.16 + cellId * 0.42, 0, 1);
        // each facet is cut at its own angle, so each takes the light differently
        const tilt = 0.7 + cellId * 0.66;
        r = (lerp(base[0], accent[0], t) + grain * 10) * tilt;
        g = (lerp(base[1], accent[1], t) + grain * 10) * tilt;
        b = (lerp(base[2], accent[2], t) + grain * 13) * tilt;
        // glowing veins in the seams, brightest where three facets meet
        const vein = Math.pow(clamp(1 - edge * 7, 0, 1), 1.7);
        r += glow[0] * vein * 0.8; g += glow[1] * vein * 0.8; b += glow[2] * vein * 0.85;
        // sparkle: rare specular flecks catching the light
        // rare, not a dust storm: only the very top of the noise range
        const sparkle = fbm(u * 210, v * 210, 2, id + 31) > 0.83 ? 1 : 0;
        r += sparkle * 70; g += sparkle * 72; b += sparkle * 85;
        h = facet * 0.62 + (1 - Math.min(1, edge * 6)) * -0.3 + grain * 0.12;
        rgh = 0.14 + (1 - facet) * 0.5 + grain * 0.1 - sparkle * 0.1;
      } else if (style === 'city') {
        // Rain-slick armour decking: bevelled panels, rivets, grime and wear.
        const PX = 8;
        const pu = u * PX, pv = v * PX;
        const panelU = Math.floor(pu), panelV = Math.floor(pv);
        const fu = pu % 1, fv = pv % 1;
        const seamD = Math.min(Math.min(fu, 1 - fu), Math.min(fv, 1 - fv)); // 0 at the seam
        const seam = seamD < 0.02 ? 1 : 0;
        const idp = valueNoise(panelU, panelV, id);
        const idp2 = valueNoise(panelU + 31, panelV - 17, id + 7);
        const tint = idp * 0.34 - 0.12; // panels differ far more than before
        const scratch = (fbm(u * 70, v * 14, 4, id + 5) - 0.5) * 0.26;
        r = base[0] * (0.78 + tint + scratch);
        g = base[1] * (0.78 + tint + scratch);
        b = base[2] * (0.82 + tint + scratch);

        // bevel: light catches the near edge, the far edge falls into shadow
        const bevel = clamp((0.055 - seamD) / 0.055, 0, 1);
        const lit = (fu < 0.5 ? 1 : -1) * 0.5 + (fv < 0.5 ? 1 : -1) * 0.5;
        r += bevel * lit * 26; g += bevel * lit * 26; b += bevel * lit * 28;

        // grime creeping out of every seam
        const grime = Math.pow(clamp(1 - seamD * 9, 0, 1), 2) * (0.35 + idp * 0.4);
        r *= 1 - grime * 0.55; g *= 1 - grime * 0.55; b *= 1 - grime * 0.5;
        if (seam) { r *= 0.32; g *= 0.32; b *= 0.36; }

        // rivets at the panel corners
        const rvx = Math.min(fu, 1 - fu), rvy = Math.min(fv, 1 - fv);
        const rd = Math.hypot(rvx - 0.055, rvy - 0.055);
        const rivet = rd < 0.02 ? clamp((0.02 - rd) / 0.02, 0, 1) : 0;
        r += rivet * 46; g += rivet * 48; b += rivet * 54;

        // one panel in nine wears hazard chevrons
        if (idp2 > 0.91) {
          const chev = ((pu + pv) * 6) % 1 < 0.5 ? 1 : 0;
          r = lerp(r, chev ? 210 : 40, 0.55);
          g = lerp(g, chev ? 170 : 38, 0.55);
          b = lerp(b, chev ? 40 : 42, 0.55);
        }

        // standing water: dark, mirror smooth
        const puddle = clamp((fbm(u * 4.5, v * 4.5, 4, id + 77) - 0.55) * 3.2, 0, 1);
        r *= 1 - puddle * 0.4; g *= 1 - puddle * 0.38; b *= 1 - puddle * 0.28;

        // one lit conduit per panel, wherever that panel's hash puts it
        const conduitAt = 0.18 + idp * 0.64;
        const circuit = (idp2 < 0.34 && Math.abs(fu - conduitAt) < 0.018) ? 1 : 0;
        r += glow[0] * circuit * 0.85; g += glow[1] * circuit * 0.85; b += glow[2] * circuit * 0.85;

        h = seam ? 0.05 : 0.55 + scratch + bevel * 0.25 + rivet * 0.5;
        rgh = seam ? 0.78 : 0.34 + scratch * 1.1 + grime * 0.5 - puddle * 0.33;
      } else if (style === 'jungle') {
        // Living forest floor: loam, moss cushions, roots and spore glow.
        const moss = fbm(u * 14, v * 14, 5, id + 2);
        const [mf1, mf2, mcell] = worley2(u * 12, v * 12, id + 8);
        const litter = fbm(u * 48, v * 22, 3, id + 21); // stretched: leaves, not dots
        const t = clamp((moss - 0.28) * 1.5, 0, 1);
        r = lerp(base[0], accent[0], t) + grain * 8;
        g = lerp(base[1], accent[1], t) + grain * 11;
        b = lerp(base[2], accent[2], t) + grain * 7;

        // big patches of bare wet mud breaking up the green
        const mud = clamp((fbm(u * 2.6, v * 2.6, 4, id + 55) - 0.52) * 2.6, 0, 1);
        r = lerp(r, 74, mud * 0.7); g = lerp(g, 54, mud * 0.72); b = lerp(b, 33, mud * 0.7);

        // dead leaf flecks scattered over the moss
        const fleck = litter > 0.6 ? clamp((litter - 0.6) * 4.5, 0, 1) : 0;
        r = lerp(r, 128, fleck * 0.5); g = lerp(g, 96, fleck * 0.42); b = lerp(b, 44, fleck * 0.4);

        // roots snaking along the cell borders
        const root = Math.pow(clamp(1 - (mf2 - mf1) * 5.5, 0, 1), 2.2);
        r = lerp(r, 62, root * 0.6); g = lerp(g, 46, root * 0.55); b = lerp(b, 30, root * 0.5);

        // spores pooling in the low ground between roots
        // only a third of the cells actually fruit, otherwise it reads as polka dots
        const fruiting = mcell > 0.62 ? clamp((mcell - 0.62) * 4, 0, 1) : 0;
        const spore = fruiting * Math.pow(clamp(1 - mf1 * 2.9, 0, 1), 2.0) * clamp(1.2 - root, 0, 1);
        r += glow[0] * spore * 0.85; g += glow[1] * spore * 0.85; b += glow[2] * spore * 0.8;

        h = moss * 0.65 + root * 0.5 + fleck * 0.2 - mud * 0.25;
        rgh = 0.5 + moss * 0.34 - spore * 0.25 - mud * 0.2 - clamp((fbm(u * 3.2, v * 3.2, 3, id + 44) - 0.55) * 2.4, 0, 1) * 0.3;
      } else if (style === 'magma') {
        // Cooled basalt crust split by a live melt network.
        // (F2 - F1) puts the glow ON the fracture lines; the old 1 - F1 lit the
        // cell centres instead, which is why this deck was orange polka dots.
        const [c1, c2] = worley2(u * 5.5, v * 5.5, id + 4);
        const crackline = clamp(1 - (c2 - c1) * 6.5, 0, 1);
        const [d1, d2] = worley2(u * 15, v * 15, id + 13);
        const fine = clamp(1 - (d2 - d1) * 9, 0, 1) * 0.55;
        const rock = 0.26 + macro * 0.34 + grain * 0.22;
        const pit = fbm(u * 90, v * 90, 3, id + 61) > 0.63 ? 0.72 : 1; // pumice pitting
        r = base[0] * rock * pit;
        g = base[1] * rock * pit;
        b = base[2] * rock * pit;

        // temperature ramp: black rock -> deep red -> orange -> white core
        const heat = Math.pow(Math.max(crackline, fine), 1.5) * (0.65 + macro * 0.5);
        r = lerp(r, glow[0], clamp(heat * 1.25, 0, 1));
        g = lerp(g, glow[1] * 0.85, clamp(heat * 0.95, 0, 1));
        b = lerp(b, glow[2] * 0.5, clamp(heat * 0.6, 0, 1));
        const core = Math.pow(crackline, 5);
        r += core * 90; g += core * 78; b += core * 44;

        h = (1 - Math.max(crackline, fine)) * 0.8 + grain * 0.14 + (1 - pit) * 0.3;
        rgh = 0.94 - heat * 0.5 - grain * 0.08;
      } else {
        // ice: polished glacier over deep internal fracture planes
        const [i1, i2] = worley2(u * 4.5, v * 4.5, id + 6);
        const fracture = Math.pow(clamp(1 - (i2 - i1) * 7, 0, 1), 1.6);
        const [j1, j2] = worley2(u * 11, v * 11, id + 19);
        const hair = Math.pow(clamp(1 - (j2 - j1) * 11, 0, 1), 2) * 0.5; // hairline cracks
        const t = clamp((macro - 0.35) * 1.1 + grain * 0.2, 0, 1);
        r = lerp(base[0], accent[0], t);
        g = lerp(base[1], accent[1], t);
        b = lerp(base[2], accent[2], t);

        // wind-scoured striations running down the deck
        const scour = fbm(u * 8, v * 90, 3, id + 33);
        r *= 0.86 + scour * 0.26; g *= 0.86 + scour * 0.26; b *= 0.88 + scour * 0.22;

        // trapped air bubbles
        const bub = fbm(u * 120, v * 120, 2, id + 71) > 0.74 ? 1 : 0;
        r += bub * 26; g += bub * 30; b += bub * 34;

        const crack = Math.max(fracture, hair);
        r = lerp(r, glow[0], crack * 0.75);
        g = lerp(g, glow[1], crack * 0.75);
        b = lerp(b, glow[2], crack * 0.7);

        // drifted snow filling the hollows
        const drift = clamp((fbm(u * 3.4, v * 3.4, 4, id + 88) - 0.56) * 2.8, 0, 1);
        r = lerp(r, 232, drift * 0.45); g = lerp(g, 240, drift * 0.45); b = lerp(b, 250, drift * 0.42);

        h = macro * 0.32 + crack * 0.4 + drift * 0.3;
        rgh = 0.07 + drift * 0.75 + Math.pow(clamp(grain, 0, 1), 3) * 0.4 + crack * 0.2 - bub * 0.03;
      }

      const i = (y * size + x) * 4;
      img.data[i] = clamp(r, 0, 255);
      img.data[i + 1] = clamp(g, 0, 255);
      img.data[i + 2] = clamp(b, 0, 255);
      img.data[i + 3] = 255;
      height[y * size + x] = h;
      rough[y * size + x] = clamp(rgh, 0.03, 1);
    }
  }
  normaliseAlbedo(img.data, size * size, 0.135);

  ctx.putImageData(img, 0, 0);
  const result = {
    map: toTexture(cv, 1),
    normalMap: heightToNormal(height, size, 2.0),
    roughnessMap: toDataTexture(rough, size),
  };
  cache.set(key, result);
  return result;
}

/** Mottled bio-luminescent alien skin + emissive stripe mask. */
export function alienSkin() {
  if (cache.has('skin')) return cache.get('skin');
  const size = 512;
  const cv = canvas(size);
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(size, size);
  const height = new Float32Array(size * size);

  const emCv = canvas(size);
  const emCtx = emCv.getContext('2d');
  const emImg = emCtx.createImageData(size, size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const cell = worley(u * 16, v * 16, 21);
      const grain = fbm(u * 40, v * 40, 5, 3);
      const blotch = fbm(u * 6, v * 6, 4, 11);
      const scale = clamp(1 - cell * 3.0, 0, 1);

      // Calibrated by test/lighting.mjs: bright enough to never silhouette,
      // dark enough to keep its blue-green character instead of going white.
      let r = 45 + blotch * 52 + scale * 38;
      let g = 99 + blotch * 68 + scale * 32;
      let b = 112 + blotch * 43 + grain * 27;
      // softer dorsal shading band — keeps the form readable from behind
      const dorsal = Math.exp(-Math.pow((v - 0.5) * 5, 2));
      r *= 1 - dorsal * 0.2; r += 6;
      g *= 1 - dorsal * 0.12; b *= 1 - dorsal * 0.06;

      const i = (y * size + x) * 4;
      img.data[i] = clamp(r, 0, 255);
      img.data[i + 1] = clamp(g, 0, 255);
      img.data[i + 2] = clamp(b, 0, 255);
      img.data[i + 3] = 255;
      height[y * size + x] = scale * 0.6 + grain * 0.4;

      // Emissive: glowing veins running along the body
      const veinField = fbm(u * 8, v * 3.2, 3, 55);
      const vein = clamp(1 - Math.abs(veinField - 0.5) * 16, 0, 1);
      const dots = clamp(1 - worley(u * 22, v * 22, 77) * 9, 0, 1);
      const e = clamp(vein * 0.9 + dots * 0.7, 0, 1);
      emImg.data[i] = e * 90;
      emImg.data[i + 1] = e * 255;
      emImg.data[i + 2] = e * 235;
      emImg.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  emCtx.putImageData(emImg, 0, 0);
  const result = {
    map: toTexture(cv, 1),
    normalMap: heightToNormal(height, size, 1.6),
    emissiveMap: toTexture(emCv, 1),
  };
  cache.set('skin', result);
  return result;
}

/** Vertical gradient sky dome texture with stars / clouds bands. */
/**
 * Full 360 degree equirectangular sky.
 *
 * The old version was a 512px square gradient, which is why distant sky read as
 * flat banded mush: a sphere needs 2:1 and far more pixels. This bakes a real
 * atmosphere — altitude gradient, wrapping volumetric cloud decks, a placed sun
 * with forward-scattered halo, horizon haze and a layered starfield. It doubles
 * as the scene's reflection probe, so its quality lifts every material too.
 */
export function skyTexture(id, topHex, midHex, bottomHex, starDensity = 0.0, sunPos = null, feature = null) {
  const key = `sky_${id}`;
  if (cache.has(key)) return cache.get(key);
  const w = 2048;
  const h = 1024;
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d');
  const toCss = (hex) => `#${hex.toString(16).padStart(6, '0')}`;

  // ---- altitude gradient -------------------------------------------------
  // On an equirectangular map the TRUE horizon is the exact vertical centre.
  // Everything below v=0.5 is under the player's feet and never seen, so the
  // horizon glow has to peak just above 0.5 — putting it lower (the old 0.8)
  // buried the brightest part of the sky underground and left the visible half
  // as a dull two-tone wash.
  const grd = ctx.createLinearGradient(0, 0, 0, h);
  const dark = (hex, f) => {
    const [r, g, b] = hexToRgb(hex);
    return `rgb(${(r * f) | 0},${(g * f) | 0},${(b * f) | 0})`;
  };
  grd.addColorStop(0.00, toCss(topHex));
  grd.addColorStop(0.26, toCss(topHex));
  grd.addColorStop(0.42, toCss(midHex));
  grd.addColorStop(0.492, toCss(bottomHex)); // horizon burn, just above eye level
  // The lower hemisphere is normally hidden by the ground, but the ground only
  // reaches 75 m to each side — past that the sky shows through. Keeping it
  // near-black turned that gap into a void hanging over the world, so it is
  // now a ground-haze tone that reads as distant terrain instead.
  grd.addColorStop(0.512, dark(bottomHex, 0.88));
  grd.addColorStop(0.62, dark(midHex, 0.72));
  grd.addColorStop(1.00, dark(midHex, 0.58));
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, w, h);

  // ---- starfield (behind the clouds) -------------------------------------
  if (starDensity > 0) {
    // galactic band: a soft diagonal smear of unresolved stars
    ctx.save();
    ctx.translate(w * 0.5, h * 0.34);
    ctx.rotate(-0.22);
    const band = ctx.createLinearGradient(0, -h * 0.16, 0, h * 0.16);
    band.addColorStop(0, 'rgba(180,200,255,0)');
    band.addColorStop(0.5, `rgba(200,214,255,${0.1 * starDensity})`);
    band.addColorStop(1, 'rgba(180,200,255,0)');
    ctx.fillStyle = band;
    ctx.fillRect(-w, -h * 0.16, w * 2, h * 0.32);
    ctx.restore();

    const count = (5200 * starDensity) | 0;
    for (let i = 0; i < count; i++) {
      const x = Math.random() * w;
      const y = Math.pow(Math.random(), 1.35) * h * 0.49; // stars only above the horizon
      const fade = 1 - y / (h * 0.55);
      const a = Math.random() * 0.95 * fade;
      const s = Math.random() < 0.93 ? 1 : 2;
      // real stars are not white: scatter across the blue-amber sequence
      const t = Math.random();
      const cr = t < 0.7 ? 255 : 200 + ((55 * t) | 0);
      const cg = t < 0.7 ? 250 : 220;
      const cb = t < 0.35 ? 255 : 215;
      ctx.fillStyle = `rgba(${cr},${cg},${cb},${a})`;
      ctx.fillRect(x, y, s, s);
    }
    // a handful of bright ones with visible flare
    for (let i = 0; i < 22 * starDensity; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h * 0.44;
      const g2 = ctx.createRadialGradient(x, y, 0, x, y, 9);
      g2.addColorStop(0, 'rgba(255,255,255,0.95)');
      g2.addColorStop(0.3, 'rgba(200,225,255,0.35)');
      g2.addColorStop(1, 'rgba(200,225,255,0)');
      ctx.fillStyle = g2;
      ctx.fillRect(x - 9, y - 9, 18, 18);
    }
  }

  // ---- cloud decks: low-res seamless fbm, smoothly upscaled ---------------
  // Sampling fbm per pixel at 2048x1024 would stall the phone for a second, so
  // the noise is baked small and the canvas resampler does the interpolation.
  const nw = 320;
  const nh = 160;
  // all three decks live in the visible upper hemisphere (v < 0.5)
  const layers = [
    { scale: 2.0, oct: 5, alpha: 0.42, yTop: 0.02, yBot: 0.40, tint: [255, 255, 255], op: 'lighter', bias: 0.50, gain: 2.5, pow: 1.5 },
    { scale: 4.4, oct: 4, alpha: 0.80, yTop: 0.14, yBot: 0.47, tint: hexToRgb(midHex), op: 'source-over', bias: 0.46, gain: 2.7, pow: 1.2 },
    { scale: 8.5, oct: 3, alpha: 0.45, yTop: 0.28, yBot: 0.495, tint: hexToRgb(bottomHex), op: 'lighter', bias: 0.52, gain: 2.6, pow: 1.8 },
  ];
  for (let li = 0; li < layers.length; li++) {
    const L = layers[li];
    const nc = document.createElement('canvas');
    nc.width = nw; nc.height = nh;
    const nctx = nc.getContext('2d');
    const nimg = nctx.createImageData(nw, nh);
    for (let y = 0; y < nh; y++) {
      const v = y / nh;
      // vertical mask keeps cloud out of the zenith and below the horizon
      const band = clamp((v - L.yTop) / 0.12, 0, 1) * clamp((L.yBot - v) / 0.09, 0, 1);
      for (let x = 0; x < nw; x++) {
        const u = x / nw;
        // polar coordinates make the noise wrap seamlessly around the dome
        const a = u * Math.PI * 2;
        const n = fbm(
          Math.cos(a) * L.scale + L.scale + 4,
          v * L.scale * 2.1 + id * 3.7 + li * 11,
          L.oct,
          id * 17 + li
        );
        const m = fbm(Math.sin(a) * L.scale + L.scale + 9, v * L.scale * 2.1 + 40, L.oct, id * 17 + li + 5);
        // fbm spans ~0.08..0.92 with a 0.5 mean; bias sits near that mean so
        // roughly half the dome carries cloud.
        const ridged = Math.max(n, m) * 0.8 + Math.min(n, m) * 0.35;
        const d = Math.pow(clamp((ridged - L.bias) * L.gain, 0, 1), L.pow);
        const i = (y * nw + x) * 4;
        nimg.data[i] = L.tint[0];
        nimg.data[i + 1] = L.tint[1];
        nimg.data[i + 2] = L.tint[2];
        nimg.data[i + 3] = d * band * L.alpha * 255;
      }
    }
    nctx.putImageData(nimg, 0, 0);
    ctx.save();
    ctx.globalCompositeOperation = L.op;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(nc, 0, 0, w, h);
    ctx.restore();
  }

  // ---- signature sky feature ---------------------------------------------
  if (feature === 'aurora' || feature === 'nebula') {
    const aw = 512;
    const ah = 256;
    const ac = document.createElement('canvas');
    ac.width = aw; ac.height = ah;
    const actx = ac.getContext('2d');
    const aimg = actx.createImageData(aw, ah);
    for (let y = 0; y < ah; y++) {
      const v = y / ah;
      for (let x = 0; x < aw; x++) {
        const u = x / aw;
        const a = u * Math.PI * 2;
        let r = 0, g = 0, bl = 0, alpha = 0;

        if (feature === 'aurora') {
          // Three curtains at different altitudes. Each is a soft vertical band
          // whose base height ripples around the dome, streaked by noise —
          // the same structure a real auroral arc has.
          for (let c = 0; c < 3; c++) {
            const base = 0.17 + c * 0.072
              + Math.sin(a * (2 + c) + c * 2.1) * 0.045
              + Math.sin(a * (5 + c * 2) + 1.3) * 0.022;
            const height = 0.10 + c * 0.03;
            const d = (v - base) / height;
            if (d < -1.4 || d > 1.6) continue;
            // brightest at the base, trailing off upward like real curtains
            let band = Math.exp(-d * d * 2.2) * (d < 0 ? 1 : 1 - d * 0.45);
            const streak = fbm(Math.cos(a) * 9 + 9, Math.sin(a) * 9 + v * 3 + c * 7, 4, id + c);
            band *= clamp((streak - 0.42) * 2.6, 0, 1.15); // sparser: real curtains have gaps
            if (band <= 0) continue;
            // green core rising into cyan, magenta at the very top
            const t = clamp((v - base + 0.06) / 0.2, 0, 1);
            r += band * (40 + t * 190);
            g += band * (255 - t * 60);
            bl += band * (150 + t * 90);
            alpha += band * 0.75;
          }
        } else {
          // nebula: broad interstellar gas, two clashing hues
          const n1 = fbm(Math.cos(a) * 2.4 + 3, v * 3.4 + 1.7, 5, id);
          const n2 = fbm(Math.sin(a) * 3.1 + 8, v * 3.9 + 6.1, 5, id + 9);
          const mask = clamp((1 - v * 2.0), 0, 1); // upper sky only
          const c1 = Math.pow(clamp((n1 - 0.44) * 2.4, 0, 1), 1.6) * mask;
          const c2 = Math.pow(clamp((n2 - 0.47) * 2.3, 0, 1), 1.9) * mask;
          r = c1 * 150 + c2 * 220;
          g = c1 * 70 + c2 * 60;
          bl = c1 * 255 + c2 * 190;
          alpha = (c1 * 0.5 + c2 * 0.38);
        }

        const i = (y * aw + x) * 4;
        aimg.data[i] = clamp(r, 0, 255);
        aimg.data[i + 1] = clamp(g, 0, 255);
        aimg.data[i + 2] = clamp(bl, 0, 255);
        aimg.data[i + 3] = clamp(alpha * 255, 0, 255);
      }
    }
    actx.putImageData(aimg, 0, 0);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.globalAlpha = feature === 'aurora' ? 0.72 : 0.6;
    ctx.drawImage(ac, 0, 0, w, h);
    ctx.restore();
  }

  // ---- the sun, placed where the actual DirectionalLight sits -------------
  if (sunPos) {
    const [sx, sy, sz] = sunPos;
    const len = Math.hypot(sx, sy, sz) || 1;
    const ny = sy / len;
    // matches THREE.SphereGeometry's UV convention for the sky dome
    let u = Math.atan2(sz / len, -sx / len) / (Math.PI * 2);
    u = (u % 1 + 1) % 1;
    const v = Math.acos(clamp(ny, -1, 1)) / Math.PI;
    const px = u * w;
    const py = v * h;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    // wide forward-scatter bloom, then the disc
    for (const [rad, alpha] of [[520, 0.16], [230, 0.2], [86, 0.34]]) {
      const g3 = ctx.createRadialGradient(px, py, 0, px, py, rad);
      g3.addColorStop(0, `rgba(255,246,224,${alpha})`);
      g3.addColorStop(0.45, `rgba(255,214,168,${alpha * 0.32})`);
      g3.addColorStop(1, 'rgba(255,190,140,0)');
      ctx.fillStyle = g3;
      ctx.fillRect(px - rad, py - rad, rad * 2, rad * 2);
      // repeat across the seam so a sun near u=0 is not sliced in half
      ctx.fillRect(px - rad + (px < w / 2 ? w : -w), py - rad, rad * 2, rad * 2);
    }
    const disc = ctx.createRadialGradient(px, py, 0, px, py, 30);
    disc.addColorStop(0, 'rgba(255,255,252,0.95)');
    disc.addColorStop(0.6, 'rgba(255,240,214,0.5)');
    disc.addColorStop(1, 'rgba(255,230,200,0)');
    ctx.fillStyle = disc;
    ctx.fillRect(px - 30, py - 30, 60, 60);
    ctx.restore();
  }

  // ---- horizon haze: the band that sells atmospheric depth ----------------
  // Centred on the true horizon and faded out on BOTH sides, so it never
  // leaves the hard seam a one-sided gradient used to cut across the sky.
  const y0 = h * 0.36;
  const y1 = h * 0.54;
  const haze = ctx.createLinearGradient(0, y0, 0, y1);
  const [hr, hg, hb] = hexToRgb(bottomHex);
  haze.addColorStop(0.0, `rgba(${hr},${hg},${hb},0)`);
  haze.addColorStop(0.55, `rgba(${hr},${hg},${hb},0.42)`);
  haze.addColorStop(0.78, `rgba(${hr},${hg},${hb},0.62)`);
  haze.addColorStop(1.0, `rgba(${hr},${hg},${hb},0)`);
  ctx.fillStyle = haze;
  ctx.fillRect(0, y0, w, y1 - y0);

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.wrapS = THREE.RepeatWrapping;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 8;
  cache.set(key, tex);
  return tex;
}

/** Radial glow sprite used for orbs, embers, dust. */
export function glowSprite(hex = 0xffffff) {
  const key = `glow_${hex}`;
  if (cache.has(key)) return cache.get(key);
  const size = 128;
  const cv = canvas(size);
  const ctx = cv.getContext('2d');
  const [r, g, b] = hexToRgb(hex);
  const grd = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0, `rgba(255,255,255,1)`);
  grd.addColorStop(0.25, `rgba(${r},${g},${b},0.9)`);
  grd.addColorStop(0.6, `rgba(${r},${g},${b},0.25)`);
  grd.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, tex);
  return tex;
}

/** Distant parallax silhouette strip (mountains / skyline / trees). */
export function skylineTexture(id, style, hex) {
  const key = `skyline_${id}`;
  if (cache.has(key)) return cache.get(key);
  const w = 1024;
  const h = 256;
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  const [r, g, b] = hexToRgb(hex);
  ctx.fillStyle = `rgb(${r},${g},${b})`;

  if (style === 'city') {
    let x = 0;
    while (x < w) {
      const bw = 18 + Math.random() * 46;
      const bh = 40 + Math.random() * 190;
      ctx.fillRect(x, h - bh, bw, bh);
      // windows
      ctx.fillStyle = `rgba(255,255,255,0.18)`;
      for (let wy = h - bh + 8; wy < h - 6; wy += 12) {
        for (let wx = x + 5; wx < x + bw - 5; wx += 10) {
          if (Math.random() < 0.45) ctx.fillRect(wx, wy, 4, 6);
        }
      }
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      x += bw + 3 + Math.random() * 12;
    }
  } else if (style === 'trees') {
    for (let i = 0; i < 130; i++) {
      const x = Math.random() * w;
      const th = 70 + Math.random() * 150;
      const cap = 18 + Math.random() * 34;
      ctx.fillRect(x - 4, h - th, 8, th);
      ctx.beginPath();
      ctx.ellipse(x, h - th, cap, cap * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // jagged mountains / crystal spires
    const layers = style === 'spires' ? 3 : 2;
    for (let l = 0; l < layers; l++) {
      ctx.globalAlpha = 1 - l * 0.25;
      ctx.beginPath();
      ctx.moveTo(0, h);
      let x = 0;
      while (x < w) {
        const step = style === 'spires' ? 24 + Math.random() * 40 : 60 + Math.random() * 90;
        const peak = h - (60 + Math.random() * (style === 'spires' ? 180 : 140)) * (1 - l * 0.25);
        ctx.lineTo(x + step * 0.5, peak);
        ctx.lineTo(x + step, h - 10 - Math.random() * 20);
        x += step;
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // dissolve the bases so the backdrop melts into the volumetric fog
  ctx.globalCompositeOperation = 'destination-out';
  const fade = ctx.createLinearGradient(0, h * 0.55, 0, h);
  fade.addColorStop(0, 'rgba(0,0,0,0)');
  fade.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.fillStyle = fade;
  ctx.fillRect(0, h * 0.55, w, h * 0.45);
  ctx.globalCompositeOperation = 'source-over';

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  cache.set(key, tex);
  return tex;
}

/** Metal / energy panel texture used for obstacles. */
export function panelTexture(hex = 0x9fb3c8, glowHex = 0x40e0ff) {
  const key = `panel_${hex}_${glowHex}`;
  if (cache.has(key)) return cache.get(key);
  const size = 256;
  const cv = canvas(size);
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(size, size);
  const base = hexToRgb(hex);
  const glow = hexToRgb(glowHex);
  const height = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const brushed = (fbm(u * 90, v * 8, 4, 17) - 0.5) * 0.36;
      const seam = (Math.abs((v * 4) % 1 - 0.5) > 0.46) ? 1 : 0;
      let r = base[0] * (0.7 + brushed);
      let g = base[1] * (0.7 + brushed);
      let b = base[2] * (0.72 + brushed);
      if (seam) { r *= 0.4; g *= 0.4; b *= 0.45; }
      const stripe = (Math.abs((v * 4) % 1 - 0.18) < 0.035) ? 1 : 0;
      r = lerp(r, glow[0], stripe * 0.85);
      g = lerp(g, glow[1], stripe * 0.85);
      b = lerp(b, glow[2], stripe * 0.85);
      const i = (y * size + x) * 4;
      img.data[i] = clamp(r, 0, 255);
      img.data[i + 1] = clamp(g, 0, 255);
      img.data[i + 2] = clamp(b, 0, 255);
      img.data[i + 3] = 255;
      height[y * size + x] = seam ? 0.1 : 0.5 + brushed;
    }
  }
  ctx.putImageData(img, 0, 0);
  const result = { map: toTexture(cv, 1), normalMap: heightToNormal(height, size, 1.4) };
  cache.set(key, result);
  return result;
}
