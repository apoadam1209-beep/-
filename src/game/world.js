// World: sky dome, planets, lighting, recycled ground tiles, parallax skyline,
// side scenery pools and ambient weather particles — all biome driven.
import * as THREE from 'three';
import { BIOMES, biomeGroundMaterial, biomeSkylineTexture } from './biomes.js';
import { skyTexture, glowSprite } from '../core/textures.js';
import { TRACK_WIDTH, TILE_LENGTH, TILE_COUNT } from '../config.js';
import { rand } from '../core/noise.js';

export class World {
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;
    this.biome = BIOMES[0];
    this.propPools = new Map();
    this.time = 0;

    scene.fog = new THREE.FogExp2(this.biome.fog, this.biome.fogDensity);

    // ---------------------------------------------------------------- sky
    this.skyMat = new THREE.MeshBasicMaterial({
      map: skyTexture(0, ...BIOMES[0].sky, BIOMES[0].stars),
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
    this.planet.position.set(-160, 130, -420);
    this.planetRing = new THREE.Mesh(
      new THREE.TorusGeometry(84, 5, 2, 60),
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
    this.sideMat = new THREE.MeshStandardMaterial({ color: 0x11131f, roughness: 0.95, metalness: 0.0 });
    this.railMat = new THREE.MeshBasicMaterial({ color: this.biome.laneGlow, fog: true });
    this.laneMat = new THREE.MeshBasicMaterial({ color: this.biome.laneGlow, transparent: true, opacity: 0.35, fog: true });

    this.tiles = [];
    const tileGeo = new THREE.PlaneGeometry(TRACK_WIDTH, TILE_LENGTH, 1, 1);
    const sideGeo = new THREE.PlaneGeometry(70, TILE_LENGTH, 1, 1);
    const railGeo = new THREE.BoxGeometry(0.16, 0.22, TILE_LENGTH);
    const laneGeo = new THREE.PlaneGeometry(0.09, TILE_LENGTH);

    for (let i = 0; i < TILE_COUNT; i++) {
      const g = new THREE.Group();
      const floor = new THREE.Mesh(tileGeo, this.groundMat);
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      g.add(floor);

      for (const s of [-1, 1]) {
        const side = new THREE.Mesh(sideGeo, this.sideMat);
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

    // ---------------------------------------------------------- particles
    this._buildParticles();
    this.applyBiome(this.biome, true);
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

  _propPool(biome) {
    if (!this.propPools.has(biome.id)) {
      const pool = [];
      for (let i = 0; i < 34; i++) {
        const p = biome.prop();
        p.visible = false;
        this.scene.add(p);
        pool.push(p);
      }
      this.propPools.set(biome.id, pool);
    }
    return this.propPools.get(biome.id);
  }

  applyBiome(biome, instant = false) {
    const prev = this.biome;
    this.biome = biome;

    // release old props
    for (const t of this.tiles) {
      for (const p of t.props) { p.visible = false; p.userData.owner = null; this.scene.add(p); }
      t.props = [];
    }
    if (prev) {
      const old = this.propPools.get(prev.id);
      if (old) for (const p of old) { p.visible = false; p.userData.owner = null; }
    }

    const newMat = biomeGroundMaterial(biome);
    for (const t of this.tiles) {
      t.group.children[0].material = newMat;
    }
    this.groundMat = newMat;

    this.railMat.color.setHex(biome.laneGlow);
    this.laneMat.color.setHex(biome.laneGlow);
    this.skyMat.map = skyTexture(biome.id, ...biome.sky, biome.stars);
    this.skyMat.needsUpdate = true;
    this.skylineMat.map = biomeSkylineTexture(biome);
    this.skylineMat.map.repeat.set(biome.skyline.style === 'city' ? 5 : 4, 1);
    this.skylineMat.needsUpdate = true;

    this.targetFog = new THREE.Color(biome.fog);
    this.targetFogDensity = biome.fogDensity;
    this.hemi.color.setHex(biome.hemi[0]);
    this.hemi.groundColor.setHex(biome.hemi[1]);
    this.hemi.intensity = biome.hemi[2];
    this.sun.color.setHex(biome.sun[0]);
    this.sun.intensity = biome.sun[1];
    this.sunOffset = new THREE.Vector3(...biome.sunPos);
    this.fill.color.setHex(biome.accent);

    this.planet.material.color.setHex(biome.accent);
    this.planetRing.material.color.setHex(biome.sun[0]);
    this.planet.visible = biome.id !== 1;
    this.planetRing.visible = biome.id !== 1;

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
      if (p.userData.owner === tile) { p.visible = false; p.userData.owner = null; this.scene.add(p); }
    }
    tile.props = [];
    for (let s = 0; s < 2; s++) {
      if (Math.random() < 0.18) continue;
      const p = pool[this.poolCursor % pool.length];
      this.poolCursor++;
      if (p.userData.owner) continue; // still dressing another tile
      p.userData.owner = tile;
      p.visible = true;
      p.rotation.y = rand(0, Math.PI * 2);
      const sc = rand(0.8, 1.25);
      p.scale.setScalar(sc);
      tile.slots[s].add(p);
      p.position.set(rand(-3, 3) + (s === 0 ? -2 : 2), 0, rand(-10, 10));
      tile.props.push(p);
    }
  }

  update(dt, playerZ, playerX, beat) {
    this.time += dt;
    // fog / colour easing
    if (this.targetFog) {
      this.scene.fog.color.lerp(this.targetFog, Math.min(1, dt * 1.6));
      this.scene.fog.density += (this.targetFogDensity - this.scene.fog.density) * Math.min(1, dt * 1.6);
    }

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
