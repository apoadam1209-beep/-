// Light colour normalisation.
//
// A hex colour carries hue AND brightness. Deep violet (0x6a4bff) has roughly a
// quarter of the luminance of pale mint (0xbfffd9), so two biomes configured
// with "intensity 1.2" were actually lit four stops apart — and the solver had
// to fight it with per-biome multipliers from 1.8x to 6.3x.
//
// Normalising every light colour to a fixed luminance separates the two
// concerns: the hex picks the hue, `intensity` picks the brightness, and one
// set of intensities then works across all five worlds.
import * as THREE from 'three';

const cache = new Map();

/**
 * @param {number} hex        sRGB hue for the light
 * @param {number} luminance  target linear luminance (1.0 = as bright as white)
 * @returns {THREE.Color}     a fresh Color, safe for the caller to mutate
 */
export function normalisedLightColor(hex, luminance = 1) {
  const key = `${hex}_${luminance}`;
  let c = cache.get(key);
  if (!c) {
    c = new THREE.Color(hex); // three converts sRGB -> linear working space here
    const y = c.r * 0.2126 + c.g * 0.7152 + c.b * 0.0722;
    if (y > 1e-4) c.multiplyScalar(luminance / y);
    cache.set(key, c);
  }
  return c.clone();
}

/** Same maths without three, for the headless lighting budget test. */
export function normalisedLightRGB(hex, luminance = 1) {
  const s = [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255].map((v) => v / 255);
  const lin = s.map((c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  const y = 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
  if (y <= 1e-4) return lin;
  return lin.map((c) => (c * luminance) / y);
}
