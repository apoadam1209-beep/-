// World: sky dome, planets, lighting, recycled ground tiles, parallax skyline,
// side scenery pools and ambient weather particles — all biome driven.
import * as THREE from 'three';
import { BIOMES, biomeGroundMaterial, biomeSideMaterial, biomeSkylineTexture } from './biomes.js';
import { skyTexture, glowSprite } from '../core/textures.js';
import { biomeEnvironment } from '../core/env.js';
import { normalisedLightColor } from '../core/light.js';
import { TRACK_WIDTH, TILE_LENGTH, TILE_COUNT } from '../config.js';
import { rand } from '../core/noise.js';

export class World {
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;
    this.biome = BIOMES[0];
    this.propPools = new Map();
    this.parks = new Map(); // detached holders: parked props are never traversed
    this.time = 0;

    scene.fog = new THREE.FogExp2(this.biome.fog, this.biome.fogDensity);

    // ---------------------------------------------------------------- sky
    this.skyMat = new THREE.MeshBasicMaterial({
      map: skyTexture(0, ...BIOMES[0].sky, BIOMES[0].stars, BIOMES[0].sunPos, BIOMES[0].skyFeature),
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(600, 32, 20), this.skyMat);
    this.sky.renderOrder = -100;
    scene.add(this.sky);

    // alien planet + ring in the sky
    this.planetGroup = new THREE.Group();
    scene.add(this.planetGroup);
    this.planet = new THREE.Mesh(
      new THREE.SphereGeometry(52, 28, 20),
      new THREE.MeshBasicMaterial({ color: 0x8a5bff, fog: false, transparent: true, opacity: 0.9 })
    );
    this.planet.position.set(-210, 96, -470);
    this.planetRing = new THREE.Mesh(
      new THREE.TorusGeometry(84, 4, 6, 60),
      new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
    );
    this.planetRing.position.copy(this.planet.position);
    this.planetRing.rotation.set(1.15, 0.4, 0.2);
    this.planetGroup.add(this.planet, this.planetRing);

    // ------------------------------------------------------------- lights
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x101018, 0.6);
    scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffffff, 1.2);
    this.sun.position.set(-24, 40, -30);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 140;
    const d = 26;
    this.sun.shadow.camera.left = -d;
    this.sun.shadow.camera.right = d;
    this.sun.shadow.camera.top = d;
    this.sun.shadow.camera.bottom = -d;
    this.sun.shadow.bias = -0.0012;
    scene.add(this.sun);
    this.sunTarget = new THREE.Object3D();
    scene.add(this.sunTarget);
    this.sun.target = this.sunTarget;
    this.fill = new THREE.DirectionalLight(0xffffff, 0.35);
    this.fill.position.set(18, 12, 26);
    scene.add(this.fill);

    // -------------------------------------------------------------- ground
    this.groundMat = biomeGroundMaterial(this.biome);
    this.sideMat = biomeSideMaterial(this.biome);
    this.railMat = new THREE.MeshBasicMaterial({ color: this.biome.laneGlow, fog: true });
    this.laneMat = new THREE.MeshBasicMaterial({ color: this.biome.laneGlow, transparent: true, opacity: 0.75, fog: true });

    this.tiles = [];
    this.sideMeshes = [];
    const tileGeo = new THREE.PlaneGeometry(TRACK_WIDTH, TILE_LENGTH, 1, 1);
    const sideGeo = new THREE.PlaneGeometry(70, TILE_LENGTH, 1, 1);
    const railGeo = new THREE.BoxGeometry(0.22, 0.3, TILE_LENGTH);
    const laneGeo = new THREE.PlaneGeometry(0.16, TILE_LENGTH);

    for (let i = 0; i < TILE_COUNT; i++) {
      const g = new THREE.Group();
      const floor = new THREE.Mesh(tileGeo, this.groundMat);
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      g.add(floor);

      for (const s of [-1, 1]) {
        const side = new THREE.Mesh(sideGeo, this.sideMat);
        this.sideMeshes.push(side);
        side.rotation.x = -Math.PI / 2;
        side.position.set(s * (TRACK_WIDTH / 2 + 35), -0.35, 0);
        side.receiveShadow = true;
        g.add(side);

        const rail = new THREE.Mesh(railGeo, this.railMat);
        rail.position.set(s * (TRACK_WIDTH / 2 - 0.05), 0.11, 0);
        g.add(rail);
      }
      for (const x of [-1.175, 1.175]) {
        const lane = new THREE.Mesh(laneGeo, this.laneMat);
        lane.rotation.x = -Math.PI / 2;
        lane.position.set(x, 0.02, 0);
        g.add(lane);
      }

      const propSlots = [new THREE.Group(), new THREE.Group()];
      propSlots[0].position.set(-(TRACK_WIDTH / 2 + 9), -0.32, 0);
      propSlots[1].position.set(TRACK_WIDTH / 2 + 9, -0.32, 0);
      g.add(propSlots[0], propSlots[1]);

      g.position.z = -i * TILE_LENGTH;
      this.scene.add(g);
      this.tiles.push({ group: g, slots: propSlots, props: [] });
    }

    // ------------------------------------------------------------ skyline
    const skyGeo = new THREE.CylinderGeometry(210, 210, 74, 40, 1, true);
    this.skylineMat = new THREE.MeshBasicMaterial({
      map: biomeSkylineTexture(this.biome),
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      opacity: 0.95,
    });
    this.skylineMat.map.repeat.set(4, 1);
    this.skyline = new THREE.Mesh(skyGeo, this.skylineMat);
    this.skyline.position.y = 20;
    this.skyline.renderOrder = -90;
    scene.add(this.skyline);

    // ------------------------------------------------------ distant relief
    this._buildRidges();

    // ---------------------------------------------------------- particles
    this._buildParticles();
    this.applyBiome(this.biome, true);
  }


  /**
   * Distant relief belts.
   *
   * The skyline cylinder is welded to the player, so it can never convey
   * forward motion — the background used to sit dead still while the track
   * raced past. These are real recycled meshes far off to each side: at that
   * distance perspective slides them by slowly, and the near belt overtakes
   * the far belt, which is the parallax cue the eye reads as "huge and far".
   */
  setShadowResolution(size) {
    if (this.sun.shadow.mapSize.width === size) return;
    this.sun.shadow.mapSize.set(size, size);
    if (this.sun.shadow.map) { this.sun.shadow.map.dispose(); this.sun.shadow.map = null; }
  }

  _buildRidges() {
    this.ridgeMat = new THREE.MeshStandardMaterial({
      color: 0x1b2233,
      roughness: 0.95,
      metalness: 0.0,
      flatShading: true,
      fog: true,
    });
    this.ridgeFarMat = new THREE.MeshStandardMaterial({
      color: 0x1b2233,
      roughness: 1.0,
      metalness: 0.0,
      flatShading: true,
      fog: true,
      transparent: true,
      opacity: 0.85,
    });

    this.ridges = [];
    this.RIDGE_SLOTS = 5;
    const layers = [
      { name: 'near', spacing: 190, x: 96, scale: 1.0, mat: this.ridgeMat },
      { name: 'far', spacing: 300, x: 215, scale: 2.15, mat: this.ridgeFarMat },
    ];
    for (const layer of layers) {
      for (let i = 0; i < this.RIDGE_SLOTS; i++) {
        for (const side of [-1, 1]) {
          const mesh = new THREE.Mesh(this._ridgeGeometry(this.biome.skyline.style, i * 2 + (side > 0 ? 1 : 0)), layer.mat);
          mesh.position.set(side * layer.x, -6, -i * layer.spacing);
          mesh.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
          mesh.scale.setScalar(layer.scale);
          mesh.renderOrder = -50;
          this.scene.add(mesh);
          this.ridges.push({ mesh, layer, side, seed: i * 2 + (side > 0 ? 1 : 0) });
        }
      }
    }
  }

  /** A silhouette wall whose profile is shaped by the biome's skyline style. */
  _ridgeGeometry(style, seed) {
    const key = `${style}_${seed}`;
    this._ridgeGeo = this._ridgeGeo || new Map();
    if (this._ridgeGeo.has(key)) return this._ridgeGeo.get(key);

    const SEGS = 42;
    const LENGTH = 320;
    const geo = new THREE.PlaneGeometry(LENGTH, 1, SEGS, 1);
    const pos = geo.attributes.position;
    const profile = (t) => {
      const a = Math.sin(t * 7.3 + seed * 2.1) * 0.5 + 0.5;
      const b = Math.sin(t * 19.7 + seed * 5.7) * 0.5 + 0.5;
      const c = Math.sin(t * 41.1 + seed * 1.3) * 0.5 + 0.5;
      if (style === 'city') {
        // stepped towers with the occasional supertall
        const block = Math.floor(t * 26 + seed) % 5;
        const q = Math.round((a * 0.65 + b * 0.35) * 7) / 7;
        return 16 + q * 46 + (block === 0 ? 34 : 0);
      }
      if (style === 'trees') {
        // rounded canopy, bumpy and dense
        return 22 + a * 20 + b * 12 + Math.pow(c, 3) * 16;
      }
      if (style === 'spires') {
        // sharp crystal needles
        const spike = Math.pow(Math.abs(Math.sin(t * 23.0 + seed)), 6);
        return 14 + a * 24 + spike * 52;
      }
      // mountains: broad massifs with jagged crests
      return 20 + Math.pow(a, 1.4) * 58 + b * 16 + c * 7;
    };
    for (let i = 0; i <= SEGS; i++) {
      const t = i / SEGS;
      const h = profile(t);
      pos.setY(i, h);            // top row
      pos.setY(i + SEGS + 1, 0); // bottom row stays at the base
    }
    geo.computeVertexNormals();
    this._ridgeGeo.set(key, geo);
    return geo;
  }

  _applyRidgeStyle(biome) {
    if (!this.ridges) return;
    const base = new THREE.Color(biome.skyline.color);
    this.ridgeMat.color.copy(base).multiplyScalar(1.35);
    // the far belt is washed toward the horizon: cheap, convincing aerial haze
    this.ridgeFarMat.color.copy(base).lerp(new THREE.Color(biome.sky[2]), 0.55);
    for (const r of this.ridges) r.mesh.geometry = this._ridgeGeometry(biome.skyline.style, r.seed);
  }

  _updateRidges(playerZ, playerX) {
    if (!this.ridges) return;
    for (const r of this.ridges) {
      const span = r.layer.spacing * this.RIDGE_SLOTS;
      // parallax: the belt drifts sideways with the player, less the further out
      r.mesh.position.x = r.side * r.layer.x + playerX * (r.layer.name === 'far' ? 0.12 : 0.045);
      while (r.mesh.position.z > playerZ + r.layer.spacing) r.mesh.position.z -= span;
      while (r.mesh.position.z < playerZ - span) r.mesh.position.z += span;
    }
  }

  _buildParticles() {
    const MAX = 460;
    this.pCount = MAX;
    const positions = new Float32Array(MAX * 3);
    this.pVel = new Float32Array(MAX * 3);
    for (let i = 0; i < MAX; i++) {
      positions[i * 3] = rand(-34, 34);
      positions[i * 3 + 1] = rand(0, 34);
      positions[i * 3 + 2] = rand(-140, 40);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.pMat = new THREE.PointsMaterial({
      size: 0.3,
      map: glowSprite(0xffffff),
      color: 0xffffff,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    this.particles = new THREE.Points(geo, this.pMat);
    this.particles.frustumCulled = false;
    this.scene.add(this.particles);
  }

  _park(p) {
    const park = this.parks.get(p.userData.biomeId);
    if (park) park.add(p);
    p.visible = false;
    p.userData.owner = null;
  }

  _propPool(biome) {
    if (!this.propPools.has(biome.id)) {
      const park = new THREE.Group(); // deliberately NOT added to the scene
      this.parks.set(biome.id, park);
      const pool = [];
      for (let i = 0; i < 58; i++) {
        const p = biome.prop();
        p.visible = false;
        p.userData.biomeId = biome.id;
        park.add(p);
        pool.push(p);
      }
      this.propPools.set(biome.id, pool);
    }
    return this.propPools.get(biome.id);
  }

  /** Bake a biome's textures and scenery ahead of time (no mid-run hitching). */
  prebake(biome) {
    biomeGroundMaterial(biome);
    biomeSkylineTexture(biome);
    const sky = skyTexture(biome.id, ...biome.sky, biome.stars, biome.sunPos, biome.skyFeature);
    biomeEnvironment(this.renderer, biome.id, sky); // convolve the probe off the hot path
    this._propPool(biome);
  }

  applyBiome(biome, instant = false) {
    const prev = this.biome;
    this.biome = biome;

    // release old props
    for (const t of this.tiles) {
      for (const p of t.props) this._park(p);
      t.props = [];
    }
    if (prev) {
      const old = this.propPools.get(prev.id);
      if (old) for (const p of old) this._park(p);
    }

    const newMat = biomeGroundMaterial(biome);
    for (const t of this.tiles) {
      t.group.children[0].material = newMat;
    }
    this.groundMat = newMat;

    const nextSide = biomeSideMaterial(biome);
    if (nextSide !== this.sideMat) {
      this.sideMat = nextSide;
      for (const s2 of this.sideMeshes) s2.material = nextSide;
    }
    this.railMat.color.setHex(biome.laneGlow);
    this.laneMat.color.setHex(biome.laneGlow);
    const sky = skyTexture(biome.id, ...biome.sky, biome.stars, biome.sunPos, biome.skyFeature);
    this.skyMat.map = sky;
    this.skyMat.needsUpdate = true;

    // Reflections: let every surface mirror this biome's own sky.
    const env = biomeEnvironment(this.renderer, biome.id, sky);
    this.hasEnv = this.hasEnv || !!env;
    if (env) {
      this.scene.environment = env;
      this.scene.environmentIntensity = biome.envIntensity ?? 0.8;
    }
    this.skylineMat.map = biomeSkylineTexture(biome);
    this.skylineMat.map.repeat.set(biome.skyline.style === 'city' ? 5 : 4, 1);
    this.skylineMat.needsUpdate = true;

    // Aerial perspective: distance must dissolve into the HORIZON, not into a
    // darker colour than the sky. Mismatched fog is what turned every far-off
    // shape into an unreadable grey-purple smear.
    this.targetFog = new THREE.Color(biome.sky[2]).lerp(new THREE.Color(biome.fog), 0.45);
    this.targetFogDensity = biome.fogDensity;
    // Hue from the palette, brightness from the intensity — see core/light.js.
    this.hemi.color.copy(normalisedLightColor(biome.hemi[0], 1));
    this.hemi.groundColor.copy(normalisedLightColor(biome.hemi[1], 0.35));
    this.hemi.intensity = biome.hemi[2];
    this.sun.color.copy(normalisedLightColor(biome.sun[0], 1));
    this.sun.intensity = biome.sun[1];
    this.sunOffset = new THREE.Vector3(...biome.sunPos);
    this.fill.color.copy(normalisedLightColor(biome.accent, 1));

    this.planet.material.color.setHex(biome.accent);
    this.planetRing.material.color.setHex(biome.sun[0]);
    this.planet.visible = biome.id !== 1;
    this.planetRing.visible = biome.id !== 1;

    this._applyRidgeStyle(biome);

    this.pMat.color.setHex(biome.particles.color);
    this.pMat.size = biome.particles.size;
    this.pStyle = biome.particles.style;
    this.pActive = biome.particles.count;

    if (instant) {
      this.scene.fog.color.copy(this.targetFog);
      this.scene.fog.density = this.targetFogDensity;
    }
    // repopulate scenery
    const pool = this._propPool(biome);
    this.poolCursor = 0;
    for (const t of this.tiles) this._dressTile(t, pool);
  }

  _dressTile(tile, pool) {
    for (const p of tile.props) {
      if (p.userData.owner === tile) this._park(p);
    }
    tile.props = [];
    for (let s = 0; s < 2; s++) {
      for (let k = 0; k < 2; k++) { // two clusters per side = a denser, richer world
        if (Math.random() < 0.08) continue;
        const p = pool[this.poolCursor % pool.length];
        this.poolCursor++;
        if (p.userData.owner) continue; // still dressing another tile
        p.userData.owner = tile;
        p.visible = true;
        p.rotation.y = rand(0, Math.PI * 2);
        p.scale.setScalar(rand(0.75, 1.3));
        tile.slots[s].add(p);
        p.position.set(rand(-4, 4) + (s === 0 ? -2 : 2) + k * (s === 0 ? -7 : 7), 0, rand(-11, 11) + (k ? 6 : -6));
        tile.props.push(p);
      }
    }
  }

  update(dt, playerZ, playerX, beat) {
    this.time += dt;
    // fog / colour easing
    if (this.targetFog) {
      this.scene.fog.color.lerp(this.targetFog, Math.min(1, dt * 1.6));
      this.scene.fog.density += (this.targetFogDensity - this.scene.fog.density) * Math.min(1, dt * 1.6);
    }

    this._updateRidges(playerZ, playerX);
    this.sky.position.set(playerX * 0.3, 0, playerZ);
    this.skyline.position.set(playerX * 0.15, 20, playerZ);
    this.planetGroup.position.z = playerZ;
    this.planetGroup.position.x = playerX * 0.2;
    this.sun.position.set(playerX + this.sunOffset.x, this.sunOffset.y, playerZ + this.sunOffset.z);
    this.sunTarget.position.set(playerX, 0, playerZ - 12);
    this.fill.position.set(playerX + 18, 12, playerZ + 26);

    // recycle tiles
    const span = TILE_COUNT * TILE_LENGTH;
    const pool = this._propPool(this.biome);
    for (const t of this.tiles) {
      if (t.group.position.z > playerZ + TILE_LENGTH * 1.6) {
        t.group.position.z -= span;
        this._dressTile(t, pool);
      }
    }

    // scenery secondary motion
    for (const t of this.tiles) {
      for (const p of t.props) {
        for (const c of p.children) {
          if (c.userData.spin) c.rotation.y += dt * c.userData.spin;
          if (c.userData.bob) c.position.y += Math.sin(this.time * c.userData.bob) * dt * 1.2;
        }
      }
    }

    // ambient particles
    const pos = this.particles.geometry.attributes.position.array;
    const style = this.pStyle;
    for (let i = 0; i < this.pCount; i++) {
      const i3 = i * 3;
      if (i >= this.pActive) { pos[i3 + 1] = -999; continue; }
      if (style === 'rain') {
        pos[i3 + 1] -= dt * 46;
        pos[i3 + 2] += dt * 22;
        if (pos[i3 + 1] < 0) { pos[i3 + 1] = rand(24, 40); pos[i3] = playerX + rand(-26, 26); pos[i3 + 2] = playerZ + rand(-110, 20); }
      } else if (style === 'snow') {
        pos[i3 + 1] -= dt * 4.5;
        pos[i3] += Math.sin(this.time * 1.4 + i) * dt * 2.4;
        if (pos[i3 + 1] < 0) { pos[i3 + 1] = rand(18, 34); pos[i3] = playerX + rand(-30, 30); pos[i3 + 2] = playerZ + rand(-120, 20); }
      } else if (style === 'ember') {
        pos[i3 + 1] += dt * (5 + (i % 7));
        pos[i3] += Math.sin(this.time * 2.2 + i) * dt * 1.6;
        if (pos[i3 + 1] > 30) { pos[i3 + 1] = rand(-1, 3); pos[i3] = playerX + rand(-30, 30); pos[i3 + 2] = playerZ + rand(-120, 20); }
      } else {
        pos[i3 + 1] += dt * 1.6;
        pos[i3] += Math.sin(this.time * 0.9 + i * 0.3) * dt * 1.1;
        if (pos[i3 + 1] > 26) { pos[i3 + 1] = rand(0, 4); pos[i3] = playerX + rand(-30, 30); pos[i3 + 2] = playerZ + rand(-120, 20); }
      }
      if (pos[i3 + 2] > playerZ + 26) pos[i3 + 2] -= 150;
    }
    this.particles.geometry.attributes.position.needsUpdate = true;

    // beat pulse on rails
    const b = 0.7 + beat * 0.5;
    this.railMat.color.setHex(this.biome.laneGlow).multiplyScalar(b);
    this.laneMat.opacity = 0.25 + beat * 0.35;
  }
}
