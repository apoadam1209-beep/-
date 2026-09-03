import * as THREE from 'three';

export const LANES = [-2.4, 0, 2.4];

export const THEMES = [
  {
    key: 'city',
    name_ar: 'مدينة النيبولا',
    name_en: 'Nebula City',
    fog: 0x0b0e2a,
    ground: 0x131a3a,
    light: 0x8f9bff,
    accent: 0x36e0ff,
    secondary: 0xff4d93,
    speed: 1.0,
    obstacleForms: ['crystal', 'lava', 'shadow', 'barrier'],
  },
  {
    key: 'crystal',
    name_ar: 'كهوف الكريستال',
    name_en: 'Crystal Caverns',
    fog: 0x071a2b,
    ground: 0x0e2c44,
    light: 0x8bf0ff,
    accent: 0x2fe7c6,
    secondary: 0x6cf3ff,
    speed: 1.04,
    obstacleForms: ['shadow', 'crystal', 'beam', 'block'],
  },
  {
    key: 'volcano',
    name_ar: 'عالم الحمم',
    name_en: 'Lava World',
    fog: 0x1c0a06,
    ground: 0x24100c,
    light: 0xff7a3d,
    accent: 0xff5c3d,
    secondary: 0xffb347,
    speed: 1.08,
    obstacleForms: ['lava', 'block', 'barrier', 'lava'],
  },
  {
    key: 'jungle',
    name_ar: 'أدغال النور',
    name_en: 'Biolume Jungle',
    fog: 0x06120a,
    ground: 0x0b2214,
    light: 0x7dff8a,
    accent: 0x46f08a,
    secondary: 0xb7ff62,
    speed: 1.12,
    obstacleForms: ['block', 'shadow', 'beam', 'lava'],
  },
  {
    key: 'blackhole',
    name_ar: 'محطة الفردية',
    name_en: 'Singularity Station',
    fog: 0x07010d,
    ground: 0x12061d,
    light: 0xc77dff,
    accent: 0x8f5bff,
    secondary: 0xff5bd1,
    speed: 1.16,
    obstacleForms: ['shadow', 'lava', 'crystal', 'beam'],
  },
];

const OBSTACLE_TYPES = {
  block: { width: 1.9, height: 2.7, bottom: 0, top: 2.7, form: 'crystal', pass: true, breakable: true, label: 'block' },
  lava: { width: 1.6, height: 2.9, bottom: 0, top: 2.9, form: 'plasma', pass: true, breakable: false, label: 'lava' },
  shadow: { width: 1.9, height: 2.8, bottom: 0, top: 2.8, form: 'shadow', pass: true, breakable: false, label: 'shadow' },
  barrier: { width: 2.5, height: 1.0, bottom: 0, top: 1.0, physical: 'low', pass: false, label: 'barrier' },
  beam: { width: 2.5, height: 0.75, bottom: 1.75, top: 2.5, physical: 'high', pass: false, label: 'beam' },
};

export class World {
  constructor(scene) {
    this.scene = scene;
    this.speed = 18;
    this.distance = 0;
    this.themeIndex = 0;
    this.theme = THEMES[0];
    this.themeChangeDistance = 350;
    this.themeJustChanged = false;

    this.obstacles = [];
    this.collectibles = [];
    this.scenery = [];
    this.groundSegments = [];
    this.spawnTimer = 0;
    this.orbitRingActive = true;

    this.buildGround();
    this.applyTheme(this.themeIndex, true);
  }

  buildGround() {
    const segDepth = 36;
    const count = 6;
    for (let i = 0; i < count; i++) {
      const geo = new THREE.BoxGeometry(42, 0.5, segDepth + 0.5);
      const mat = new THREE.MeshStandardMaterial({ color: 0x131a3a, roughness: 0.7, metalness: 0.2 });
      const seg = new THREE.Mesh(geo, mat);
      seg.position.set(0, -0.25, (i - count / 2) * segDepth);
      seg.receiveShadow = true;
      this.scene.add(seg);
      this.groundSegments.push(seg);
    }
    this.groundDepth = segDepth * count;
  }

  applyTheme(index, initial = false) {
    this.themeIndex = ((index % THEMES.length) + THEMES.length) % THEMES.length;
    this.theme = THEMES[this.themeIndex];
    const t = this.theme;
    this.scene.fog = new THREE.Fog(t.fog, 8, 95);
    this.scene.background = new THREE.Color(t.fog);
    for (const seg of this.groundSegments) {
      seg.material.color.setHex(t.ground);
    }
    this.themeJustChanged = !initial;
    this.clearScenery();
    this.buildScenery();
    this.spawnTimer = 0.35;
  }

  clearScenery() {
    for (const s of this.scenery) {
      this.scene.remove(s);
      while (s.children.length) {
        const c = s.children.pop();
        if (c.geometry) c.geometry.dispose();
        if (c.material) c.material.dispose();
      }
    }
    this.scenery = [];
  }

  rand(a, b) {
    return a + Math.random() * (b - a);
  }

  buildScenery() {
    const t = this.theme;
    const make = (mesh, x, y, z) => {
      mesh.position.set(x, y, z);
      this.scene.add(mesh);
      this.scenery.push(mesh);
      return mesh;
    };

    if (t.key === 'city') {
      const winMat = new THREE.MeshStandardMaterial({
        color: t.accent,
        emissive: t.accent,
        emissiveIntensity: 1.1,
        metalness: 0.2,
        roughness: 0.5,
      });
      for (let i = 0; i < 30; i++) {
        const w = this.rand(1.2, 2.2);
        const h = this.rand(6, 18);
        const d = this.rand(1.2, 2.2);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1c2a52, roughness: 0.5, metalness: 0.4 });
        const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), bodyMat);
        const side = Math.random() > 0.5 ? 1 : -1;
        const x = side * this.rand(9, 17);
        // window strips
        const strip = new THREE.Mesh(new THREE.BoxGeometry(w * 1.02, h * 0.55, d * 0.1), winMat);
        strip.position.z = d / 2 + 0.02;
        box.add(strip);
        make(box, x, h / 2 - 0.2, this.rand(-190, 30));
      }
    } else if (t.key === 'crystal') {
      const iceMat = new THREE.MeshStandardMaterial({
        color: t.accent,
        emissive: t.accent,
        emissiveIntensity: 0.8,
        transparent: true,
        opacity: 0.75,
        metalness: 0.2,
        roughness: 0.1,
      });
      for (let i = 0; i < 36; i++) {
        const h = this.rand(2, 11);
        const cone = new THREE.Mesh(new THREE.ConeGeometry(this.rand(0.5, 1.4), h, 6), iceMat);
        const x = (Math.random() > 0.5 ? 1 : -1) * this.rand(8, 16);
        make(cone, x, h / 2 - 0.2, this.rand(-200, 30));
      }
    } else if (t.key === 'volcano') {
      const rockMat = new THREE.MeshStandardMaterial({ color: 0x2a1410, roughness: 0.9, metalness: 0.1 });
      const lavaMat = new THREE.MeshBasicMaterial({ color: t.accent });
      for (let i = 0; i < 30; i++) {
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(this.rand(1.2, 3.2), 0), rockMat);
        const x = (Math.random() > 0.5 ? 1 : -1) * this.rand(8, 17);
        make(rock, x, this.rand(0.5, 2), this.rand(-200, 30));
        if (i % 3 === 0) {
          const pool = new THREE.Mesh(new THREE.CircleGeometry(this.rand(0.6, 1.4), 16), lavaMat);
          pool.rotation.x = -Math.PI / 2;
          make(pool, x * 0.8, 0.01, this.rand(-200, 30));
        }
      }
    } else if (t.key === 'jungle') {
      const plantMat = new THREE.MeshStandardMaterial({
        color: t.accent,
        emissive: t.accent,
        emissiveIntensity: 0.8,
        roughness: 0.4,
      });
      const stemMat = new THREE.MeshStandardMaterial({ color: 0x0f4022, roughness: 0.7 });
      for (let i = 0; i < 28; i++) {
        const x = (Math.random() > 0.5 ? 1 : -1) * this.rand(8, 17);
        const h = this.rand(2, 8);
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, h, 6), stemMat);
        make(stem, x, h / 2, this.rand(-200, 30));
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(this.rand(0.5, 1), 10, 8), plantMat);
        make(bulb, x, h + 0.2, this.rand(-200, 30));
      }
    } else {
      // black hole / space station
      const metal = new THREE.MeshStandardMaterial({ color: 0x33284f, roughness: 0.5, metalness: 0.8 });
      const glowMat = new THREE.MeshBasicMaterial({ color: t.secondary });
      for (let i = 0; i < 24; i++) {
        const size = this.rand(0.8, 3);
        const box = new THREE.Mesh(new THREE.BoxGeometry(size, size * 0.7, size * 0.6), metal);
        const x = (Math.random() > 0.5 ? 1 : -1) * this.rand(8, 18);
        make(box, x, this.rand(1, 5), this.rand(-200, 30));
        if (i % 4 === 0) {
          const halo = new THREE.Mesh(new THREE.TorusGeometry(this.rand(0.5, 1.2), 0.04, 8, 24), glowMat);
          halo.rotation.x = Math.PI / 2;
          make(halo, x * 0.7, this.rand(0.5, 3), this.rand(-200, 30));
        }
      }
    }
  }

  spawnObstacleTheme() {
    const forms = this.theme.obstacleForms;
    const type = forms[Math.floor(Math.random() * forms.length)];
    const lane = LANES[Math.floor(Math.random() * LANES.length)];
    const safeLanes = LANES.filter((l) => l !== lane);
    this.spawnObstacle(type, lane);
    // occasionally second obstacle in an adjacent lane
    if (Math.random() < 0.45) {
      const other = safeLanes[Math.floor(Math.random() * safeLanes.length)];
      const t2 = forms[Math.floor(Math.random() * forms.length)];
      this.spawnObstacle(t2, other);
    }
    // fill safe lane with a collectible line
    const safe = safeLanes[Math.floor(Math.random() * safeLanes.length)];
    for (let i = 0; i < 3; i++) {
      this.spawnCollectible(safe, -38 - i * 4, Math.random() < 0.5 ? 'energy' : 'dna');
    }
  }

  spawnObstacle(type, laneX) {
    const def = OBSTACLE_TYPES[type];
    const t = this.theme;
    let mesh;
    const mat = (color, emissive, op) =>
      new THREE.MeshStandardMaterial({
        color,
        emissive,
        emissiveIntensity: 0.85,
        transparent: op !== undefined,
        opacity: op ?? 1,
        roughness: 0.35,
        metalness: 0.4,
      });

    if (type === 'lava') {
      mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.05, def.height, 8), mat(0xff7a3d, 0xff3d00, 0.8));
    } else if (type === 'shadow') {
      mesh = new THREE.Mesh(new THREE.BoxGeometry(def.width, def.height, 0.55), mat(0x8f5bff, 0x4b1f9e, 0.5));
    } else if (type === 'block') {
      mesh = new THREE.Mesh(new THREE.BoxGeometry(def.width, def.height, def.width * 0.62), mat(t.ground, t.accent, 0.96));
      const edge = new THREE.Mesh(
        new THREE.BoxGeometry(def.width + 0.04, 0.12, def.width * 0.62 + 0.04),
        new THREE.MeshStandardMaterial({ color: t.accent, emissive: t.accent, emissiveIntensity: 1.4 })
      );
      edge.position.y = -def.height / 2 + 0.06;
      mesh.add(edge);
    } else if (type === 'barrier') {
      mesh = new THREE.Mesh(new THREE.BoxGeometry(def.width, def.height, 0.6), mat(0xffffff, t.accent, 0.92));
    } else {
      mesh = new THREE.Mesh(new THREE.BoxGeometry(def.width, def.height, 0.6), mat(0xffffff, t.secondary, 0.92));
      mesh.position.y = (def.bottom + def.top) / 2;
    }

    mesh.position.x = laneX;
    mesh.position.z = -52;
    if (type !== 'beam' && type !== 'barrier') {
      mesh.position.y = def.height / 2;
    } else if (type === 'barrier') {
      mesh.position.y = def.height / 2;
    } else {
      mesh.position.y = (def.bottom + def.top) / 2;
    }
    mesh.castShadow = true;
    this.scene.add(mesh);
    this.obstacles.push({
      mesh,
      type,
      ...def,
      laneX,
      passed: false,
    });
  }

  spawnCollectible(laneX, z, kind = 'energy') {
    const color = kind === 'dna' ? 0x7dff9b : 0x36e0ff;
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 });
    const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.34, 1), mat);
    mesh.position.set(laneX, 1.15, z);
    this.scene.add(mesh);
    this.collectibles.push({ mesh, kind, laneX, collected: false, t0: Math.random() * 6 });
  }

  consumeEvents() {
    const events = this.events || [];
    this.events = [];
    return events;
  }

  emit(type, payload) {
    if (!this.events) this.events = [];
    this.events.push({ type, ...payload });
  }

  update(dt, playerState, t) {
    this.speed = Math.min(44, 18 + this.distance * 0.00022) * this.theme.speed;
    this.distance += this.speed * dt;
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnObstacleTheme();
      this.spawnTimer = this.rand(0.62, 0.88);
    }
    if (this.distance >= this.themeChangeDistance) {
      this.themeChangeDistance += 350;
      this.applyTheme(this.themeIndex + 1);
      this.emit('theme', { index: this.themeIndex, theme: this.theme });
    }

    const dz = this.speed * dt;

    // move ground
    for (const seg of this.groundSegments) {
      seg.position.z += dz;
      if (seg.position.z > this.groundDepth / 2) seg.position.z -= this.groundDepth;
    }

    // move scenery
    for (const s of this.scenery) {
      s.position.z += dz;
      if (s.position.z > 36) {
        s.position.z = this.rand(-190, -80);
        s.position.x = (Math.random() > 0.5 ? 1 : -1) * this.rand(8, 18);
      }
    }

    // collectibles magnetic + move
    for (const c of this.collectibles) {
      c.t0 += dt;
      c.mesh.rotation.y += dt * 2;
      c.mesh.position.y = 1.15 + Math.sin(c.t0 * 3) * 0.15;
      const dx = playerState.x - c.mesh.position.x;
      const dzz = playerState.z - c.mesh.position.z;
      const dist = Math.hypot(dx, dzz);
      if (dist < 4.6) {
        const pull = (4.6 - dist) * 1.5;
        c.mesh.position.x += dx * pull * dt;
        c.mesh.position.z += dzz * pull * dt;
      }
      c.mesh.position.z += dz;
    }

    // move obstacles
    for (const o of this.obstacles) {
      o.mesh.position.z += dz;
      if (!o.passed && !o.dead) this.checkHit(o, playerState, t);
      if (!o.dead && !o.passed && o.mesh.position.z - playerState.z > 0.6) {
        // got past the player
        o.passed = true;
        const dx = Math.abs(o.laneX - playerState.x);
        if (dx < 1.6) {
          if (!this.events) this.events = [];
          this.emit('near', { type: o.type, z: playerState.z });
        }
      }
    }

    // clean up
    const keepObs = [];
    for (const o of this.obstacles) {
      const behind = o.mesh.position.z > playerState.z + 8;
      if (behind && !o.dead) o.dead = true;
      if (!o.dead) {
        keepObs.push(o);
      } else {
        this.scene.remove(o.mesh);
        o.mesh.geometry.dispose();
        o.mesh.material.dispose();
      }
    }
    this.obstacles = keepObs;

    const keepCol = [];
    for (const c of this.collectibles) {
      const dist = Math.hypot(playerState.x - c.mesh.position.x, playerState.z - c.mesh.position.z);
      if (dist < 1.15) {
        this.collect(c);
        continue;
      }
      if (c.mesh.position.z > playerState.z + 10) {
        c.dead = true;
      }
      if (!c.dead) keepCol.push(c);
      else {
        this.scene.remove(c.mesh);
        c.mesh.geometry.dispose();
        c.mesh.material.dispose();
      }
    }
    this.collectibles = keepCol;

    if (this.themeJustChanged) this.themeJustChanged = false;
  }

  collect(c) {
    c.dead = true;
    this.scene.remove(c.mesh);
    c.mesh.geometry.dispose();
    c.mesh.material.dispose();
    this.emit('collect', { kind: c.kind, pos: c.mesh.position.clone() });
  }

  checkHit(o, player, t) {
    const pz = player.z;
    const xOverlap = Math.abs(player.x - o.laneX) < o.width / 2 + 0.42;
    const zOverlap = Math.abs(o.mesh.position.z - pz) < 0.62 + 0.42;
    if (!xOverlap || !zOverlap) return;

    const playerTop = player.sliding ? 0.85 : player.y + 1.0;
    const playerBottom = player.y - 0.55;
    const yOverlap = playerTop > o.bottom && playerBottom < o.top;

    if (o.pass && o.form) {
      if (player.form === o.form) {
        // form-compatible: pass or break
        o.passed = true;
        o.dead = true;
        this.scene.remove(o.mesh);
        o.mesh.geometry.dispose();
        o.mesh.material.dispose();
        this.emit('shift', { type: o.type, pos: o.mesh.position.clone() });
        return;
      }
    }

    // physical obstacle passage
    if (o.physical === 'high') {
      if (player.sliding && playerTop < o.bottom) return;
    } else if (o.physical === 'low') {
      if (playerBottom > o.top) return;
    }

    if (yOverlap) {
      o.dead = true;
      this.scene.remove(o.mesh);
      o.mesh.geometry.dispose();
      o.mesh.material.dispose();
      this.emit('hit', { type: o.type, pos: o.mesh.position.clone() });
    }
  }
}
