// Procedural texture bakery: every surface in XENO RUN is generated at runtime
// (no binary assets to download) but at high resolution with matching normal maps.
import * as THREE from 'three';
import { fbm, worley, valueNoise, clamp, lerp } from './noise.js';

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
  tex.anisotropy = 8;
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
  tex.anisotropy = 8;
  return tex;
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

  const size = 512;
  const cv = canvas(size);
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(size, size);
  const height = new Float32Array(size * size);
  const base = hexToRgb(baseHex);
  const accent = hexToRgb(accentHex);
  const glow = hexToRgb(glowHex);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      let r, g, b, h;

      const grain = fbm(u * 26, v * 26, 5, id * 13);
      const macro = fbm(u * 5, v * 5, 4, id * 7 + 3);

      if (style === 'crystal') {
        const cell = worley(u * 7, v * 7, id);
        const facet = clamp(cell * 1.5, 0, 1);
        const t = clamp(facet * 0.75 + macro * 0.35, 0, 1);
        r = lerp(base[0], accent[0], t) + grain * 26;
        g = lerp(base[1], accent[1], t) + grain * 26;
        b = lerp(base[2], accent[2], t) + grain * 30;
        const vein = 1 - clamp(Math.abs(cell - 0.12) * 9, 0, 1);
        r += glow[0] * vein * 0.55; g += glow[1] * vein * 0.55; b += glow[2] * vein * 0.55;
        h = facet * 0.7 + grain * 0.3;
      } else if (style === 'city') {
        const panelU = Math.floor(u * 8);
        const panelV = Math.floor(v * 8);
        const seam = (Math.abs((u * 8) % 1 - 0.5) > 0.47 || Math.abs((v * 8) % 1 - 0.5) > 0.47) ? 1 : 0;
        const tint = valueNoise(panelU, panelV, id) * 0.28;
        const scratch = fbm(u * 60, v * 12, 4, id + 5) * 0.22;
        r = base[0] * (0.82 + tint + scratch);
        g = base[1] * (0.82 + tint + scratch);
        b = base[2] * (0.85 + tint + scratch);
        if (seam) { r *= 0.45; g *= 0.45; b *= 0.5; }
        const circuit = (Math.abs((u * 32) % 1 - 0.5) < 0.03 && panelV % 3 === 0) ? 1 : 0;
        r += glow[0] * circuit * 0.7; g += glow[1] * circuit * 0.7; b += glow[2] * circuit * 0.7;
        h = seam ? 0.15 : 0.6 + scratch;
      } else if (style === 'jungle') {
        const moss = fbm(u * 14, v * 14, 5, id + 2);
        const cell = worley(u * 12, v * 12, id + 8);
        const t = clamp(moss * 1.2, 0, 1);
        r = lerp(base[0], accent[0], t) + grain * 18;
        g = lerp(base[1], accent[1], t) + grain * 24;
        b = lerp(base[2], accent[2], t) + grain * 16;
        const spore = 1 - clamp(cell * 6, 0, 1);
        r += glow[0] * spore * 0.5; g += glow[1] * spore * 0.5; b += glow[2] * spore * 0.5;
        h = moss * 0.8 + (1 - cell) * 0.2;
      } else if (style === 'magma') {
        const crack = worley(u * 6, v * 6, id + 4);
        const crackline = clamp(1 - crack * 4.2, 0, 1);
        const rock = 0.35 + macro * 0.4 + grain * 0.25;
        r = base[0] * rock;
        g = base[1] * rock;
        b = base[2] * rock;
        const hot = Math.pow(crackline, 1.6);
        r = lerp(r, glow[0], hot); g = lerp(g, glow[1], hot * 0.8); b = lerp(b, glow[2], hot * 0.4);
        h = (1 - crackline) * 0.85 + grain * 0.15;
      } else {
        // ice
        const cell = worley(u * 5, v * 5, id + 6);
        const crackline = clamp(1 - cell * 5.5, 0, 1);
        const t = clamp(macro * 0.8 + grain * 0.3, 0, 1);
        r = lerp(base[0], accent[0], t);
        g = lerp(base[1], accent[1], t);
        b = lerp(base[2], accent[2], t);
        r = lerp(r, glow[0], crackline * 0.7);
        g = lerp(g, glow[1], crackline * 0.7);
        b = lerp(b, glow[2], crackline * 0.7);
        h = macro * 0.55 + crackline * 0.45;
      }

      const i = (y * size + x) * 4;
      img.data[i] = clamp(r, 0, 255);
      img.data[i + 1] = clamp(g, 0, 255);
      img.data[i + 2] = clamp(b, 0, 255);
      img.data[i + 3] = 255;
      height[y * size + x] = h;
    }
  }
  ctx.putImageData(img, 0, 0);
  const result = { map: toTexture(cv, 1), normalMap: heightToNormal(height, size, 2.0) };
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

      let r = 34 + blotch * 78 + scale * 34;
      let g = 78 + blotch * 120 + scale * 26;
      let b = 96 + blotch * 60 + grain * 40;
      // dark dorsal shading band
      const dorsal = Math.exp(-Math.pow((v - 0.5) * 5, 2));
      r *= 1 - dorsal * 0.35; g *= 1 - dorsal * 0.22; b *= 1 - dorsal * 0.12;

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
export function skyTexture(id, topHex, midHex, bottomHex, starDensity = 0.0) {
  const key = `sky_${id}`;
  if (cache.has(key)) return cache.get(key);
  const w = 512;
  const h = 512;
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d');

  const grd = ctx.createLinearGradient(0, 0, 0, h);
  const toCss = (hex) => `#${hex.toString(16).padStart(6, '0')}`;
  grd.addColorStop(0, toCss(topHex));
  grd.addColorStop(0.55, toCss(midHex));
  grd.addColorStop(1, toCss(bottomHex));
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, w, h);

  // Soft nebula bands
  for (let i = 0; i < 26; i++) {
    const y = Math.random() * h * 0.75;
    const rad = 40 + Math.random() * 150;
    const g2 = ctx.createRadialGradient(Math.random() * w, y, 0, Math.random() * w, y, rad);
    g2.addColorStop(0, `rgba(255,255,255,${0.03 + Math.random() * 0.05})`);
    g2.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, w, h);
  }

  if (starDensity > 0) {
    const count = (900 * starDensity) | 0;
    for (let i = 0; i < count; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h * 0.62;
      const a = Math.random() * 0.9 * (1 - y / (h * 0.7));
      const s = Math.random() < 0.9 ? 1 : 2;
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.fillRect(x, y, s, s);
    }
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.mapping = THREE.EquirectangularReflectionMapping;
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
      const brushed = fbm(u * 90, v * 8, 4, 17) * 0.35;
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
