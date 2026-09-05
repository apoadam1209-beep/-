// Deterministic value-noise + fbm helpers used by the procedural texture bakery.

/**
 * Integer hash -> [0, 1).
 *
 * The previous version ended with `(h ^ (h >> 16)) >>> 0`. For any negative
 * int32, an arithmetic >>16 fills the top bits with ones, so the XOR always
 * cleared the sign bit — the result could never exceed 2^31 and the hash
 * returned 0..0.5 instead of 0..1. Every valueNoise, fbm and worley value in
 * the game inherited that, which is why textures came out low-contrast and
 * washed out. Using Math.imul with an unsigned final shift fixes the range.
 */
function hash2(x, y, seed) {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function smooth(t) {
  return t * t * (3 - 2 * t);
}

export function valueNoise(x, y, seed = 0) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const a = hash2(xi, yi, seed);
  const b = hash2(xi + 1, yi, seed);
  const c = hash2(xi, yi + 1, seed);
  const d = hash2(xi + 1, yi + 1, seed);
  const u = smooth(xf);
  const v = smooth(yf);
  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
}

export function fbm(x, y, octaves = 5, seed = 0, lacunarity = 2.0, gain = 0.5) {
  let amp = 0.5;
  let freq = 1.0;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * valueNoise(x * freq, y * freq, seed + i * 37);
    norm += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return sum / norm;
}

// Cheap worley / cellular noise, returns distance to closest feature point.
export function worley(x, y, seed = 0) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  let best = 10;
  for (let oy = -1; oy <= 1; oy++) {
    for (let ox = -1; ox <= 1; ox++) {
      const cx = xi + ox;
      const cy = yi + oy;
      const px = cx + hash2(cx, cy, seed);
      const py = cy + hash2(cx, cy, seed + 91);
      const dx = px - x;
      const dy = py - y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < best) best = d;
    }
  }
  return Math.min(1, best);
}

/**
 * Worley returning BOTH nearest distances.
 *
 * F1 alone peaks at the cell centres, so "1 - F1" draws dots, not cracks — the
 * magma deck came out as orange polka dots because of exactly that. The border
 * between two cells is where F1 and F2 are equal, so (F2 - F1) is near zero
 * along every cell edge: that is the crack/vein field.
 */
export function worley2(x, y, seed = 0) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  let f1 = 10;
  let f2 = 10;
  let cell = 0; // hash of the OWNING cell: lets each facet get its own colour
  for (let oy = -1; oy <= 1; oy++) {
    for (let ox = -1; ox <= 1; ox++) {
      const cx = xi + ox;
      const cy = yi + oy;
      const px = cx + hash2(cx, cy, seed);
      const py = cy + hash2(cx, cy, seed + 91);
      const dx = px - x;
      const dy = py - y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < f1) { f2 = f1; f1 = d; cell = hash2(cx, cy, seed + 313); } else if (d < f2) { f2 = d; }
    }
  }
  return [Math.min(1, f1), Math.min(2, f2), cell];
}

/** Ridge field: 0 exactly on a cell border, rising to 1 inside the cell. */
export function worleyEdge(x, y, seed = 0) {
  const [f1, f2] = worley2(x, y, seed);
  return Math.min(1, f2 - f1);
}

export function mixColor(a, b, t) {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

export function clamp(v, a, b) {
  return v < a ? a : v > b ? b : v;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function rand(min, max) {
  return min + Math.random() * (max - min);
}

export function pick(arr) {
  return arr[(Math.random() * arr.length) | 0];
}
