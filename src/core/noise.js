// Deterministic value-noise + fbm helpers used by the procedural texture bakery.

function hash2(x, y, seed) {
  let h = x * 374761393 + y * 668265263 + seed * 2147483647;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967295;
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
