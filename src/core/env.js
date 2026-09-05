// Image-based lighting.
//
// Every PBR material in the game asks the scene for an environment to reflect.
// Without one, `metalness` surfaces resolve to black and `roughness` reads as
// flat plastic — which is exactly why the worlds looked like untextured props.
// Here the biome's own sky is convolved into a real irradiance/specular probe,
// so wet city asphalt mirrors the neon horizon and glacier ice catches the
// aurora. Baked once per biome, then cached forever.
import * as THREE from 'three';

let pmrem = null;
const cache = new Map();

/** True only for a renderer backed by an actual WebGL context (not the test stub). */
function isLiveRenderer(renderer) {
  try {
    const gl = renderer && renderer.getContext && renderer.getContext();
    return !!gl && typeof gl.drawArrays === 'function';
  } catch (err) {
    return false;
  }
}

/**
 * Convolve a biome's equirectangular sky canvas into a PMREM probe.
 * Returns null on headless/soft renderers — callers must tolerate that.
 */
export function biomeEnvironment(renderer, id, skyTexture) {
  if (cache.has(id)) return cache.get(id);
  if (!isLiveRenderer(renderer) || !skyTexture || !skyTexture.image) return null;

  let texture = null;
  try {
    if (!pmrem) pmrem = new THREE.PMREMGenerator(renderer);
    const eq = new THREE.Texture(skyTexture.image);
    eq.mapping = THREE.EquirectangularReflectionMapping;
    eq.colorSpace = THREE.SRGBColorSpace;
    eq.needsUpdate = true;
    const target = pmrem.fromEquirectangular(eq);
    texture = target.texture;
    eq.dispose();
  } catch (err) {
    console.warn('environment probe unavailable', err);
    texture = null;
  }
  cache.set(id, texture);
  return texture;
}

export function disposeEnvironments() {
  cache.clear();
  if (pmrem) { pmrem.dispose(); pmrem = null; }
}
