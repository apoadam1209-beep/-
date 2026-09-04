import * as THREE from 'three';

export const LANES = [-2.4, 0, 2.4];

export const THEMES = [
  {
    key: 'city',
    name_ar: 'مدينة النيبولا',
    name_en: 'Nebula City',
    fog: 0x0b102a,
    ground: 0x14204a,
    light: 0x8f9bff,
    accent: 0x36e0ff,
    secondary: 0xff4d93,
    dust: 0x7fb7ff,
    speed: 1.0,
    obstacleForms: ['crystal', 'lava', 'shadow', 'barrier'],
  },
  {
    key: 'crystal',
    name_ar: 'كهوف الكريستال',
    name_en: 'Crystal Caverns',
    fog: 0x061b2f,
    ground: 0x0e2f4a,
    light: 0x8bf0ff,
    accent: 0x2fe7c6,
    secondary: 0x6cf3ff,
    dust: 0xbffcff,
    speed: 1.04,
    obstacleForms: ['shadow', 'crystal', 'beam', 'block'],
  },
  {
    key: 'volcano',
    name_ar: 'عالم الحمم',
    name_en: 'Lava World',
    fog: 0x1e0a06,
    ground: 0x2a120d,
    light: 0xff7a3d,
    accent: 0xff5c3d,
    secondary: 0xffb347,
    dust: 0xff7a3d,
    speed: 1.08,
    obstacleForms: ['lava', 'block', 'barrier', 'lava'],
  },
  {
    key: 'jungle',
    name_ar: 'أدغال النور',
    name_en: 'Biolume Jungle',
    fog: 0x05130b,
    ground: 0x0c2417,
    light: 0x7dff8a,
    accent: 0x46f08a,
    secondary: 0xb7ff62,
    dust: 0x9cff9c,
    speed: 1.12,
    obstacleForms: ['block', 'shadow', 'beam', 'lava'],
  },
  {
    key: 'blackhole',
    name_ar: 'محطة الفردية',
    name_en: 'Singularity Station',
    fog: 0x080110,
    ground: 0x150722,
    light: 0xc77dff,
    accent: 0x8f5bff,
    secondary: 0xff5bd1,
    dust: 0xb07fff,
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

function makeNoiseTexture() {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 16000; i++) {
    const g = 70 + Math.random() * 150;
    ctx.fillStyle = `rgba(${g},${g},${g},${0.05 + Math.random() * 0.3})`;
    const r = Math.random() * 2.5 + 0.5;
    ctx.beginPath();
    ctx.arc(Math.random() * size, Math.random() * size, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(5, 1);
  return tex;
}

function makeWindowTexture(accent) {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#0b1026';
  ctx.fillRect(0, 0, 128, 256);
  const color = '#' + accent.toString(16).padStart(6, '0');
  for (let y = 8; y < 248; y += 18) {
    for (let x = 8; x < 120; x += 16) {
      if (Math.random() < 0.5) {
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.25 + Math.random() * 0.6;
        ctx.fillRect(x, y, 9, 12);
      }
    }
  }
  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

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
    this.laneStrips = [];
    this.creatures = [];
    this.spawnTimer = 0;
    this.creatureTimer = 2;
    this.orbitRingActive = true;

    this.noiseTex = makeNoiseTexture();
    this.buildSky();
    this.buildGround();
    this.buildDust();
    this.applyTheme(this.themeIndex, true);
  }

  buildSky() {
    // star field (fog disabled so it reads as deep space)
    const count = 1600;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 130;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = Math.abs(r * Math.cos(phi)) * 0.7 + 2;
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta) - 20;
      const bright = 0.5 + Math.random() * 0.5;
      const mix = Math.random();
      colors[i * 3] = bright * (mix > 0.66 ? 0.65 : 1);
      colors[i * 3 + 1] = bright * (mix > 0.33 ? 0.7 : 1);
      colors[i * 3 + 2] = bright;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.35,
      vertexColors: true,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      fog: false,
    });
    this.stars = new THREE.Points(geo, mat);
    this.scene.add(this.stars);
  }

  buildGround() {
    const segDepth = 36;
    const count = 6;
    const geo = new THREE.BoxGeometry(44, 0.6, segDepth + 0.5);
    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshPhysicalMaterial({
        color: 0x131a3a,
        roughness: 0.62,
        metalness: 0.35,
        clearcoat: 0.35,
        clearcoatRoughness: 0.5,
        bumpMap: this.noiseTex,
        bumpScale: 0.12,
        envMapIntensity: 0.5,
      });
      const seg = new THREE.Mesh(geo, mat);
      seg.position.set(0, -0.3, (i - count / 2) * segDepth);
      seg.receiveShadow = true;
      this.scene.add(seg);
      this.groundSegments.push(seg);
    }
    this.groundDepth = segDepth * count;

    // glowing lane guide strips
    for (const x of LANES) {
      for (const dz of [-this.groundDepth / 2, this.groundDepth / 2]) {
        const strip = new THREE.Mesh(
          new THREE.BoxGeometry(0.12, 0.03, this.groundDepth),
          new THREE.MeshBasicMaterial({
            color: 0x36e0ff,
            transparent: true,
            opacity: 0.65,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          })
        );
        strip.position.set(x, -0.02, dz);
        strip.renderOrder = 2;
        this.scene.add(strip);
        this.laneStrips.push(strip);
      }
    }
  }

  buildDust() {
    const count = 420;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = this.rand(-22, 22);
      positions[i * 3 + 1] = this.rand(0.2, 18);
      positions[i * 3 + 2] = this.rand(-110, 20);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0x7fb7ff,
      size: 0.16,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
    this.dust = new THREE.Points(geo, mat);
    this.scene.add(this.dust);
  }

  applyTheme(index, initial = false) {
    this.themeIndex = ((index % THEMES.length) + THEMES.length) % THEMES.length;
    this.theme = THEMES[this.themeIndex];
    const t = this.theme;
    this.scene.fog = new THREE.Fog(t.fog, 10, 120);
    this.scene.background = new THREE.Color(t.fog);
    for (const seg of this.groundSegments) seg.material.color.setHex(t.ground);
    for (const strip of this.laneStrips) strip.material.color.setHex(t.accent);
    this.dust.material.color.setHex(t.dust);
    this.themeJustChanged = !initial;
    this.clearScenery();
    this.buildScenery();
    this.spawnTimer = 0.35;
  }

  clearScenery() {
    for (const s of this.scenery) {
      this.scene.remove(s);
      s.traverse((c) => {
        if (c.geometry) c.geometry.dispose();
        if (c.material) {
          if (c.material.map) c.material.map.dispose();
          c.material.dispose();
        }
      });
    }
    this.scenery = [];
  }

  rand(a, b) {
    return a + Math.random() * (b - a);
  }

  make(mesh, x, y, z, ownMat) {
    mesh.position.set(x, y, z);
    if (ownMat) mesh.userData.ownMat = ownMat;
    this.scene.add(mesh);
    this.scenery.push(mesh);
    return mesh;
  }

  buildScenery() {
    const t = this.theme;

    if (t.key === 'city') {
      const winTex = makeWindowTexture(t.accent);
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1a2a58, roughness: 0.55, metalness: 0.6, envMapIntensity: 0.8 });
      const winMat = new THREE.MeshStandardMaterial({ map: winTex, emissive: t.accent, emissiveMap: winTex, emissiveIntensity: 1.2, roughness: 0.4, metalness: 0.3, transparent: true, opacity: 0.95 });
      for (let i = 0; i < 38; i++) {
        const w = this.rand(1.4, 2.6);
        const h = this.rand(5, 22);
        const d = this.rand(1.4, 2.6);
        const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), bodyMat);
        const side = Math.random() > 0.5 ? 1 : -1;
        const x = side * this.rand(9, 19);
        const win = new THREE.Mesh(new THREE.BoxGeometry(w * 1.04, h * 0.9, d * 1.04), winMat);
        win.scale.set(0.9, 0.92, 0.05);
        win.position.z = d / 2 + 0.01;
        box.add(win);
        this.make(box, x, h / 2 - 0.2, this.rand(-220, 40), { body: bodyMat, win: winMat });
      }
      // holographic rings
      for (let i = 0; i < 8; i++) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(this.rand(0.8, 1.7), 0.035, 8, 28), new THREE.MeshBasicMaterial({ color: t.secondary, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
        ring.rotation.x = Math.PI / 2;
        this.make(ring, (Math.random() > 0.5 ? 1 : -1) * this.rand(6, 15), this.rand(2, 8), this.rand(-220, 40), { ring: ring.material });
      }
    } else if (t.key === 'crystal') {
      const iceMat = new THREE.MeshPhysicalMaterial({
        color: t.accent,
        emissive: t.accent,
        emissiveIntensity: 1,
        transparent: true,
        opacity: 0.86,
        metalness: 0.1,
        roughness: 0.05,
        clearcoat: 1,
        envMapIntensity: 1.6,
      });
      const iceMat2 = iceMat.clone();
      iceMat2.color.set(t.secondary);
      iceMat2.emissive.set(t.secondary);
      for (let i = 0; i < 42; i++) {
        const cluster = new THREE.Group();
        const mats = { a: iceMat, b: iceMat2 };
        const n = 2 + Math.floor(Math.random() * 3);
        for (let j = 0; j < n; j++) {
          const h = this.rand(1.4, 9);
          const cone = new THREE.Mesh(new THREE.ConeGeometry(this.rand(0.4, 1.1), h, 7), j % 2 ? iceMat2 : iceMat);
          cone.position.set(this.rand(-1.2, 1.2), h / 2 - 0.2, this.rand(-1, 1));
          cone.rotation.z = this.rand(-0.35, 0.35);
          cone.castShadow = true;
          cluster.add(cone);
        }
        const x = (Math.random() > 0.5 ? 1 : -1) * this.rand(8, 17);
        this.make(cluster, x, 0, this.rand(-220, 40), mats);
      }
    } else if (t.key === 'volcano') {
      const rockMat = new THREE.MeshStandardMaterial({ color: 0x321610, roughness: 0.92, metalness: 0.15, bumpMap: this.noiseTex, bumpScale: 0.2 });
      const lavaMat = new THREE.MeshBasicMaterial({ color: t.accent, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
      const lavaDark = new THREE.MeshBasicMaterial({ color: t.secondary, transparent: true, opacity: 0.65, blending: THREE.AdditiveBlending, depthWrite: false });
      for (let i = 0; i < 34; i++) {
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(this.rand(1.4, 3.6), 1), rockMat);
        const x = (Math.random() > 0.5 ? 1 : -1) * this.rand(8, 19);
        this.make(rock, x, this.rand(0.4, 2.4), this.rand(-220, 40), { rock: rockMat });
        if (i % 3 === 0) {
          const pool = new THREE.Mesh(new THREE.CircleGeometry(this.rand(0.7, 1.6), 24), lavaMat);
          pool.rotation.x = -Math.PI / 2;
          pool.position.y = 0.02;
          this.make(pool, x * 0.8, 0.02, this.rand(-220, 40), { lava: lavaMat });
        }
        if (i % 5 === 0) {
          const vein = new THREE.Mesh(new THREE.TorusGeometry(this.rand(0.6, 1.1), 0.035, 6, 18), lavaDark);
          vein.rotation.x = Math.PI / 2;
          vein.position.y = 0.03;
          this.make(vein, x * 0.7, 0.03, this.rand(-220, 40), { lava: lavaDark });
        }
      }
    } else if (t.key === 'jungle') {
      const plantMat = new THREE.MeshPhysicalMaterial({
        color: t.accent,
        emissive: t.accent,
        emissiveIntensity: 1,
        roughness: 0.45,
        clearcoat: 0.6,
        envMapIntensity: 1.1,
      });
      const stemMat = new THREE.MeshStandardMaterial({ color: 0x124825, roughness: 0.8, metalness: 0.1 });
      const leafMat = new THREE.MeshStandardMaterial({ color: 0x1c6a36, roughness: 0.7, side: THREE.DoubleSide });
      const glowMat2 = new THREE.MeshBasicMaterial({ color: t.secondary, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false });
      for (let i = 0; i < 36; i++) {
        const x = (Math.random() > 0.5 ? 1 : -1) * this.rand(8, 18);
        const h = this.rand(2, 9);
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.22, h, 8), stemMat);
        this.make(stem, x, h / 2, this.rand(-220, 40), { stem: stemMat });
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(this.rand(0.45, 1.0), 14, 10), plantMat);
        bulb.position.y = h + 0.2;
        stem.add(bulb);
        for (let j = 0; j < 4; j++) {
          const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.3, 4), leafMat);
          leaf.position.y = this.rand(1, h);
          leaf.rotation.z = Math.PI / 2 + this.rand(-0.7, 0.7);
          stem.add(leaf);
        }
        if (i % 6 === 0) {
          const spore = new THREE.Mesh(new THREE.TorusGeometry(this.rand(0.4, 0.8), 0.02, 6, 20), glowMat2);
          spore.rotation.x = Math.PI / 2;
          this.make(spore, x + 1, this.rand(2, 6), this.rand(-220, 40), { glow: glowMat2 });
        }
      }
    } else {
      // black hole debris station
      const metal = new THREE.MeshPhysicalMaterial({ color: 0x33284f, roughness: 0.45, metalness: 0.9, envMapIntensity: 1.4 });
      const glowMat = new THREE.MeshBasicMaterial({ color: t.secondary, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false });
      for (let i = 0; i < 30; i++) {
        const size = this.rand(0.8, 3.2);
        const box = new THREE.Mesh(new THREE.BoxGeometry(size, size * 0.7, size * 0.6), metal);
        const x = (Math.random() > 0.5 ? 1 : -1) * this.rand(8, 20);
        box.rotation.z = this.rand(-0.5, 0.5);
        this.make(box, x, this.rand(1, 6), this.rand(-220, 40), { metal });
        if (i % 4 === 0) {
          const halo = new THREE.Mesh(new THREE.TorusGeometry(this.rand(0.5, 1.4), 0.04, 8, 28), glowMat);
          halo.rotation.x = Math.PI / 2;
          this.make(halo, x * 0.7, this.rand(0.5, 4), this.rand(-220, 40), { glow: glowMat });
        }
      }
      // central ringed beacon
      const beacon = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.05, 10, 48), glowMat);
      beacon.rotation.x = Math.PI / 2;
      this.make(beacon, 0, 3.5, -90, { glow: glowMat });
    }
  }

  spawnObstacleTheme() {
    const forms = this.theme.obstacleForms;
    const type = forms[Math.floor(Math.random() * forms.length)];
    const lane = LANES[Math.floor(Math.random() * LANES.length)];
    const safeLanes = LANES.filter((l) => l !== lane);
    this.spawnObstacle(type, lane);
    if (Math.random() < 0.45) {
      const other = safeLanes[Math.floor(Math.random() * safeLanes.length)];
      const t2 = forms[Math.floor(Math.random() * forms.length)];
      this.spawnObstacle(t2, other);
    }
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
      new THREE.MeshPhysicalMaterial({
        color,
        emissive,
        emissiveIntensity: 1,
        transparent: op !== undefined,
        opacity: op ?? 1,
        roughness: 0.22,
        metalness: 0.55,
        clearcoat: 0.9,
        clearcoatRoughness: 0.25,
        envMapIntensity: 1.2,
      });

    if (type === 'lava') {
      mesh = new THREE.Group();
      const core = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.05, def.height, 16), mat(0x5a1100, 0xff3d00, 0.9));
      core.position.y = def.height / 2;
      core.castShadow = true;
      mesh.add(core);
      for (let i = 0; i < 4; i++) {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(1.05 + i * 0.05, 0.06, 8, 20),
          new THREE.MeshBasicMaterial({ color: t.secondary, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false })
        );
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.6 + i * 0.7;
        mesh.add(ring);
      }
      mesh.userData.animated = 'lava';
    } else if (type === 'shadow') {
      mesh = new THREE.Group();
      const slab = new THREE.Mesh(new THREE.BoxGeometry(def.width, def.height, 0.6), mat(0x4a2f8a, 0x8f5bff, 0.42));
      slab.position.y = def.height / 2;
      slab.castShadow = true;
      mesh.add(slab);
      for (let i = 0; i < 3; i++) {
        const wisp = new THREE.Mesh(
          new THREE.TorusGeometry(0.9 + i * 0.25, 0.05, 8, 22),
          new THREE.MeshBasicMaterial({ color: 0xb59bff, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false })
        );
        wisp.rotation.x = Math.PI / 2;
        wisp.position.y = 0.8 + i * 0.85;
        mesh.add(wisp);
      }
      mesh.userData.animated = 'shadow';
    } else if (type === 'block') {
      mesh = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(def.width, def.height, def.width * 0.62), mat(t.ground, t.accent, 0.98));
      body.castShadow = true;
      mesh.add(body);
      const edgeMat = new THREE.MeshBasicMaterial({ color: t.accent, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
      for (const y of [-def.height / 2 + 0.08, def.height / 2 - 0.08]) {
        const edge = new THREE.Mesh(new THREE.BoxGeometry(def.width + 0.06, 0.08, def.width * 0.62 + 0.06), edgeMat);
        edge.position.y = y;
        mesh.add(edge);
      }
    } else if (type === 'barrier') {
      mesh = new THREE.Group();
      const bar = new THREE.Mesh(new THREE.BoxGeometry(def.width, def.height, 0.6), mat(0xcfd8ff, t.accent, 0.9));
      bar.position.y = def.height / 2;
      bar.castShadow = true;
      mesh.add(bar);
      for (const x of [-def.width / 2 + 0.2, def.width / 2 - 0.2]) {
        const cap = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), mat(0xffffff, t.accent, 0.95));
        cap.position.set(x, def.height, 0);
        mesh.add(cap);
      }
    } else {
      // beam
      mesh = new THREE.Group();
      const beam = new THREE.Mesh(new THREE.BoxGeometry(def.width, def.height, 0.35), mat(0xffffff, t.secondary, 0.8));
      beam.position.y = (def.bottom + def.top) / 2;
      beam.castShadow = true;
      mesh.add(beam);
      for (const x of [-def.width / 2 + 0.25, def.width / 2 - 0.25]) {
        const emitter = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.4, 12), mat(0xffffff, t.secondary, 0.95));
        emitter.position.set(x, def.bottom + 0.1, 0);
        mesh.add(emitter);
      }
      mesh.userData.animated = 'beam';
    }

    mesh.position.x = laneX;
    mesh.position.z = -52;
    if (type === 'beam') {
      mesh.position.y = 0;
    } else {
      mesh.position.y = 0;
    }
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
    const mat = new THREE.MeshPhysicalMaterial({
      color,
      emissive: color,
      emissiveIntensity: 1.5,
      metalness: 0.2,
      roughness: 0.1,
      transparent: true,
      opacity: 0.95,
      clearcoat: 1,
      envMapIntensity: 1.5,
    });
    const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.34, 1), mat);
    mesh.position.set(laneX, 1.15, z);
    this.scene.add(mesh);
    this.collectibles.push({ mesh, kind, laneX, collected: false, t0: Math.random() * 6 });
  }

  spawnCreature() {
    const t = this.theme;
    const g = new THREE.Group();
    const bodyMat = new THREE.MeshPhysicalMaterial({
      color: t.secondary,
      emissive: t.secondary,
      emissiveIntensity: 1.6,
      roughness: 0.2,
      metalness: 0.3,
      transparent: true,
      opacity: 0.85,
    });
    const body = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.4, 5), bodyMat);
    body.position.y = 0.6;
    g.add(body);
    const wingMat = new THREE.MeshBasicMaterial({ color: t.dust, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const wings = new THREE.Group();
    for (const s of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.0, 4), wingMat);
      wing.rotation.z = s * Math.PI / 2.4;
      wing.position.x = s * 0.4;
      wings.add(wing);
    }
    g.add(wings);
    const x = (Math.random() > 0.5 ? 1 : -1) * this.rand(5, 13);
    g.position.set(x, this.rand(2, 7), -70);
    g.userData.wings = wings;
    this.scene.add(g);
    this.creatures.push(g);
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
    this.creatureTimer -= dt;
    if (this.creatureTimer <= 0) {
      this.spawnCreature();
      this.creatureTimer = this.rand(2.4, 4.5);
    }
    if (this.distance >= this.themeChangeDistance) {
      this.themeChangeDistance += 350;
      this.applyTheme(this.themeIndex + 1);
      this.emit('theme', { index: this.themeIndex, theme: this.theme });
    }

    const dz = this.speed * dt;

    // ground + lane strips
    for (const seg of this.groundSegments) {
      seg.position.z += dz;
      if (seg.position.z > this.groundDepth / 2) seg.position.z -= this.groundDepth;
    }
    for (const strip of this.laneStrips) {
      strip.position.z += dz;
      if (strip.position.z > this.groundDepth / 2) strip.position.z -= this.groundDepth;
    }

    // stars drift slowly
    this.stars.rotation.y -= dt * 0.01;

    // dust
    const dpos = this.dust.geometry.attributes.position;
    for (let i = 0; i < dpos.count; i++) {
      dpos.array[i * 3 + 2] += dz;
      dpos.array[i * 3 + 1] += Math.sin(t * 0.8 + i) * 0.002;
      if (dpos.array[i * 3 + 2] > 22) {
        dpos.array[i * 3 + 2] = this.rand(-115, -80);
        dpos.array[i * 3] = this.rand(-22, 22);
        dpos.array[i * 3 + 1] = this.rand(0.2, 18);
      }
    }
    dpos.needsUpdate = true;

    // scenery
    for (const s of this.scenery) {
      s.position.z += dz;
      s.rotation.y += dt * 0.02;
      if (s.position.z > 42) {
        s.position.z = this.rand(-220, -100);
        s.position.x = (Math.random() > 0.5 ? 1 : -1) * this.rand(8, 19);
      }
    }

    // ambient creatures
    const keep = [];
    for (const c of this.creatures) {
      c.position.z += dz;
      c.position.y += Math.sin(t * 2 + c.position.x) * 0.01;
      if (c.userData.wings) c.userData.wings.rotation.z = Math.sin(t * 9 + c.position.x) * 0.4;
      if (c.position.z < playerState.z - 18) {
        this.scene.remove(c);
        c.traverse((m) => {
          if (m.geometry) m.geometry.dispose();
          if (m.material) m.material.dispose();
        });
      } else {
        keep.push(c);
      }
    }
    this.creatures = keep;

    // collectibles
    for (const c of this.collectibles) {
      c.t0 += dt;
      c.mesh.rotation.y += dt * 2;
      c.mesh.rotation.x += dt * 1.3;
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

    // obstacles
    for (const o of this.obstacles) {
      o.mesh.position.z += dz;
      if (o.mesh.userData.animated === 'lava' || o.mesh.userData.animated === 'shadow' || o.mesh.userData.animated === 'beam') {
        o.mesh.rotation.y += dt * 1.2;
        o.mesh.children.forEach((child, idx) => {
          if (child.material && child.material.emissive && child.material.transparent) {
            child.material.emissiveIntensity = 0.8 + Math.sin(t * 4 + idx) * 0.4;
          }
        });
      }
      if (!o.passed && !o.dead) this.checkHit(o, playerState, t);
      if (!o.dead && !o.passed && o.mesh.position.z - playerState.z > 0.6) {
        o.passed = true;
        const dx = Math.abs(o.laneX - playerState.x);
        if (dx < 1.6) this.emit('near', { type: o.type, z: playerState.z });
      }
    }

    // cleanup obstacles
    const keepObs = [];
    for (const o of this.obstacles) {
      const behind = o.mesh.position.z > playerState.z + 8;
      if (behind && !o.dead) o.dead = true;
      if (!o.dead) {
        keepObs.push(o);
      } else {
        this.scene.remove(o.mesh);
        o.mesh.traverse((m) => {
          if (m.geometry) m.geometry.dispose();
          if (m.material) m.material.dispose();
        });
      }
    }
    this.obstacles = keepObs;

    // cleanup collectibles
    const keepCol = [];
    for (const c of this.collectibles) {
      const dist = Math.hypot(playerState.x - c.mesh.position.x, playerState.z - c.mesh.position.z);
      if (dist < 1.15) {
        this.collect(c);
        continue;
      }
      if (c.mesh.position.z > playerState.z + 10) c.dead = true;
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
        o.passed = true;
        o.dead = true;
        this.scene.remove(o.mesh);
        o.mesh.traverse((m) => {
          if (m.geometry) m.geometry.dispose();
          if (m.material) m.material.dispose();
        });
        this.emit('shift', { type: o.type, pos: o.mesh.position.clone() });
        return;
      }
    }

    if (o.physical === 'high') {
      if (player.sliding && playerTop < o.bottom) return;
    } else if (o.physical === 'low') {
      if (playerBottom > o.top) return;
    }

    if (yOverlap) {
      o.dead = true;
      this.scene.remove(o.mesh);
      o.mesh.traverse((m) => {
        if (m.geometry) m.geometry.dispose();
        if (m.material) m.material.dispose();
      });
      this.emit('hit', { type: o.type, pos: o.mesh.position.clone() });
    }
  }
}
