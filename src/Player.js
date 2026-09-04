import * as THREE from 'three';

const FORM_COLORS = {
  plasma: { body: 0xff7a3d, glow: 0xffc35c, emissive: 0xd94b00, shell: 0xff9d3d, crest: 0xff3d00 },
  crystal: { body: 0x8fefff, glow: 0xc9ffff, emissive: 0x00a4cf, shell: 0xa9f2ff, crest: 0x0088b8 },
  shadow: { body: 0x8f5bff, glow: 0xefe1ff, emissive: 0x4b1f9e, shell: 0x7c49e6, crest: 0x2c115f },
};

function makeNoiseTexture() {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 14000; i++) {
    const g = 90 + Math.random() * 120;
    ctx.fillStyle = `rgba(${g},${g},${g},${0.08 + Math.random() * 0.25})`;
    const r = Math.random() * 2.4 + 0.4;
    ctx.beginPath();
    ctx.arc(Math.random() * size, Math.random() * size, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

export class Player {
  constructor(scene) {
    this.scene = scene;
    this.form = 'crystal';
    this.baseY = 0.85;
    this.y = this.baseY;
    this.vy = 0;
    this.gravity = -26;
    this.slideActive = false;
    this.jumpHeld = false;
    this.jumpBoost = 0;
    this.group = new THREE.Group();
    this.group.position.set(0, this.baseY, 0);
    scene.add(this.group);

    this.noiseTex = makeNoiseTexture();
    this.build();
    this.buildCompanion();

    this.trailSpawn = new THREE.Object3D();
    this.trailSpawn.position.set(0, 0.7, 0.85);
    this.group.add(this.trailSpawn);
    this.setForm(this.form);
  }

  material() {
    const skin = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.32,
      metalness: 0.42,
      clearcoat: 0.85,
      clearcoatRoughness: 0.35,
      emissive: 0x000000,
      emissiveIntensity: 0.6,
      bumpMap: this.noiseTex,
      bumpScale: 0.045,
      envMapIntensity: 1.2,
    });
    const shell = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.18,
      metalness: 0.72,
      clearcoat: 1.0,
      clearcoatRoughness: 0.18,
      transparent: true,
      opacity: 0.96,
      emissive: 0x000000,
      emissiveIntensity: 0.5,
      envMapIntensity: 1.5,
    });
    const dark = new THREE.MeshPhysicalMaterial({
      color: 0x1b2130,
      roughness: 0.32,
      metalness: 0.75,
      clearcoat: 0.7,
      clearcoatRoughness: 0.3,
      envMapIntensity: 1.0,
    });
    const eye = new THREE.MeshPhysicalMaterial({
      color: 0x06121a,
      roughness: 0.05,
      metalness: 0.35,
      clearcoat: 1,
      emissive: 0x7df9ff,
      emissiveIntensity: 3.4,
    });
    const glow = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      emissive: 0x7df9ff,
      emissiveIntensity: 2.6,
      roughness: 0.12,
      metalness: 0,
      transparent: true,
      opacity: 0.95,
    });
    const seam = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95,
      toneMapped: false,
    });
    return { skin, shell, dark, eye, glow, seam };
  }

  capsule(r, len, mat, segs = 14) {
    const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 12, segs), mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  sphere(r, mat, segs = 22) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, segs, Math.floor(segs * 0.8)), mat);
    mesh.castShadow = true;
    return mesh;
  }

  box(w, h, d, mat) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.castShadow = true;
    return mesh;
  }

  ring(r, tube, mat) {
    const mesh = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 8, 28), mat);
    mesh.castShadow = true;
    return mesh;
  }

  limbPivot(x, y, z) {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, z);
    this.group.add(pivot);
    return pivot;
  }

  build() {
    const m = this.material();
    this.mats = m;

    // pelvis & spine
    this.pelvis = this.sphere(0.3, m.skin);
    this.pelvis.position.set(0, -0.32, 0);
    this.pelvis.scale.set(1.25, 0.85, 0.95);
    this.group.add(this.pelvis);

    this.torso = this.capsule(0.31, 0.46, m.skin, 16);
    this.torso.position.set(0, 0.05, 0);
    this.torso.scale.set(1.18, 1, 0.92);
    this.group.add(this.torso);

    // rib / chest armor
    this.chestPlate = this.capsule(0.33, 0.28, m.shell, 16);
    this.chestPlate.position.set(0, 0.25, 0.12);
    this.chestPlate.scale.set(1.18, 0.9, 0.85);
    this.group.add(this.chestPlate);

    this.neck = this.capsule(0.12, 0.12, m.dark, 10);
    this.neck.position.set(0, 0.5, 0.02);
    this.group.add(this.neck);

    // head
    this.head = new THREE.Group();
    this.head.position.set(0, 0.8, 0.03);
    this.group.add(this.head);

    this.headMesh = this.sphere(0.26, m.skin, 28);
    this.headMesh.scale.set(0.92, 1.05, 1.08);
    this.headMesh.position.y = 0.03;
    this.head.add(this.headMesh);

    // brow / crest
    const crestMat = this.mats.shell;
    const crest = this.capsule(0.09, 0.16, crestMat, 8);
    crest.position.set(0, 0.22, 0);
    crest.scale.set(1.5, 0.6, 1.6);
    crest.rotation.z = 0;
    this.head.add(crest);

    // side head fins
    for (const x of [-1, 1]) {
      const fin = this.capsule(0.04, 0.18, m.dark, 6);
      fin.position.set(x * 0.28, 0.04, -0.02);
      fin.rotation.z = x * Math.PI / 2.6;
      this.head.add(fin);
      const finGlow = this.ring(0.07, 0.018, m.seam);
      finGlow.position.set(x * 0.28, 0.04, 0.04);
      this.head.add(finGlow);
    }

    // big eyes (almond)
    for (const x of [-0.12, 0.12]) {
      const eye = this.sphere(0.09, m.eye, 18);
      eye.scale.set(0.78, 1.2, 0.55);
      eye.position.set(x, 0.08, 0.21);
      this.head.add(eye);
      const lens = this.sphere(0.035, m.glow, 12);
      lens.position.set(x, 0.09, 0.27);
      this.head.add(lens);
    }

    // lower eye dots
    for (const x of [-0.18, 0, 0.18]) {
      const dot = this.sphere(0.018, m.seam, 8);
      dot.position.set(x, -0.04, 0.23);
      this.head.add(dot);
    }

    // mouth slit
    const mouth = this.box(0.16, 0.018, 0.03, m.dark);
    mouth.position.set(0, -0.12, 0.215);
    this.head.add(mouth);

    // antennae
    for (const x of [-0.13, 0.13]) {
      const stalk = this.capsule(0.018, 0.24, m.dark, 6);
      stalk.position.set(x, 0.34, -0.02);
      stalk.rotation.z = x < 0 ? 0.24 : -0.24;
      this.head.add(stalk);
      const tip = this.sphere(0.05, m.glow, 10);
      tip.position.set(x * 1.25, 0.5, -0.02);
      this.head.add(tip);
    }

    // chest core gem
    this.core = this.sphere(0.12, m.glow, 16);
    this.core.position.set(0, 0.22, 0.36);
    this.group.add(this.core);
    const coreRing = this.ring(0.18, 0.025, m.shell);
    coreRing.position.set(0, 0.22, 0.34);
    this.group.add(coreRing);

    // glowing body seams
    this.seams = [];
    const lineFront = this.capsule(0.018, 0.5, m.seam, 6);
    lineFront.position.set(0, 0.05, 0.36);
    lineFront.scale.set(0.5, 1, 0.5);
    this.group.add(lineFront);
    this.seams.push(lineFront);
    const lineBack = this.capsule(0.018, 0.5, m.seam, 6);
    lineBack.position.set(0, 0.05, -0.36);
    lineBack.scale.set(0.5, 1, 0.5);
    this.group.add(lineBack);
    this.seams.push(lineBack);

    // shoulders + arms
    this.shoulderL = this.sphere(0.15, m.shell, 14);
    this.shoulderL.position.set(-0.43, 0.38, 0);
    this.group.add(this.shoulderL);
    this.shoulderR = this.sphere(0.15, m.shell, 14);
    this.shoulderR.position.set(0.43, 0.38, 0);
    this.group.add(this.shoulderR);

    this.armL = this.buildArm(-1);
    this.armR = this.buildArm(1);

    // legs
    this.legL = this.buildLeg(-1);
    this.legR = this.buildLeg(1);

    // back energy wings
    this.wingMat = new THREE.MeshBasicMaterial({
      color: m.glow.emissive.getHex(),
      transparent: true,
      opacity: 0.32,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    this.wings = new THREE.Group();
    this.wings.position.set(0, 0.35, -0.3);
    this.group.add(this.wings);
    for (const x of [-1, 1]) {
      const tri = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.9, 4), this.wingMat);
      tri.rotation.z = x * Math.PI / 2;
      tri.scale.set(0.6, 1, 0.12);
      tri.position.set(x * 0.22, 0, 0);
      this.wings.add(tri);
    }

    // tail
    this.tail = new THREE.Group();
    this.tail.position.set(0, -0.05, -0.34);
    this.group.add(this.tail);
    let prev = this.tail;
    for (let i = 0; i < 5; i++) {
      const seg = new THREE.Group();
      seg.position.set(0, 0, -0.26);
      const mesh = this.sphere(0.15 - i * 0.019, m.skin, 14);
      seg.add(mesh);
      if (i === 0 || i === 2 || i === 4) {
        const fin = this.capsule(0.018, 0.16, m.seam, 6);
        fin.position.set(0, 0.15, 0);
        fin.rotation.x = 0.55;
        seg.add(fin);
      }
      prev.add(seg);
      prev = seg;
    }

    // aura ring
    this.auraMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    this.aura = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.035, 10, 44), this.auraMat);
    this.aura.rotation.x = Math.PI / 2;
    this.aura.position.y = 0.05;
    this.group.add(this.aura);
  }

  buildArm(side) {
    const pivot = this.limbPivot(side * 0.43, 0.36, 0);
    pivot.rotation.z = side * -0.16;

    const upper = this.capsule(0.1, 0.34, this.mats.skin, 12);
    upper.position.y = -0.24;
    pivot.add(upper);
    const elbowRing = this.ring(0.115, 0.02, this.mats.shell);
    elbowRing.rotation.x = Math.PI / 2;
    elbowRing.position.y = -0.46;
    pivot.add(elbowRing);

    const fore = this.capsule(0.085, 0.32, this.mats.skin, 12);
    fore.position.y = -0.72;
    pivot.add(fore);

    const hand = this.sphere(0.1, this.mats.skin, 12);
    hand.scale.set(1.1, 0.8, 1.1);
    hand.position.y = -0.98;
    pivot.add(hand);
    for (let i = -1; i <= 1; i++) {
      const finger = this.capsule(0.026, 0.12, this.mats.skin, 6);
      finger.position.set(i * 0.04, -1.12, 0.03 + Math.abs(i) * 0.01);
      finger.rotation.x = 0.15 + Math.abs(i) * 0.1;
      pivot.add(finger);
    }
    return pivot;
  }

  buildLeg(side) {
    const pivot = this.limbPivot(side * 0.18, -0.3, 0);
    pivot.rotation.z = side * 0.06;

    const thigh = this.capsule(0.12, 0.36, this.mats.skin, 12);
    thigh.position.y = -0.24;
    pivot.add(thigh);
    const kneeRing = this.ring(0.135, 0.02, this.mats.shell);
    kneeRing.rotation.x = Math.PI / 2;
    kneeRing.position.y = -0.5;
    pivot.add(kneeRing);

    const shin = this.capsule(0.095, 0.34, this.mats.skin, 12);
    shin.position.y = -0.76;
    pivot.add(shin);
    const ankleRing = this.ring(0.105, 0.018, this.mats.shell);
    ankleRing.rotation.x = Math.PI / 2;
    ankleRing.position.y = -1.0;
    pivot.add(ankleRing);

    const foot = this.capsule(0.11, 0.2, this.mats.dark, 10);
    foot.position.set(0, -1.12, 0.1);
    foot.rotation.x = Math.PI / 2.3;
    pivot.add(foot);
    return pivot;
  }

  buildCompanion() {
    this.companion = new THREE.Group();
    const mat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      emissive: 0x7df9ff,
      emissiveIntensity: 2,
      transparent: true,
      opacity: 0.82,
      roughness: 0.12,
      metalness: 0,
      clearcoat: 1,
    });
    this.companionMat = mat;
    const body = this.sphere(0.08, mat, 10);
    this.companion.add(body);
    this.companionEye = this.sphere(0.045, mat, 8);
    this.companionEye.position.set(0, 0.03, 0.08);
    this.companion.add(this.companionEye);
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const tent = this.capsule(0.02, 0.13, mat, 6);
      tent.position.set(Math.cos(angle) * 0.08, -0.06, Math.sin(angle) * 0.08);
      tent.rotation.x = 0.5 + Math.sin(angle) * 0.25;
      tent.rotation.z = Math.cos(angle) * 0.25;
      this.companion.add(tent);
    }
    this.scene.add(this.companion);
  }

  setForm(form) {
    this.form = form;
    const c = FORM_COLORS[form];
    const skin = this.mats.skin;
    skin.color.setHex(c.body);
    skin.emissive.setHex(c.emissive);
    skin.emissiveIntensity = form === 'shadow' ? 0.35 : 0.7;
    skin.metalness = form === 'crystal' ? 0.6 : form === 'plasma' ? 0.35 : 0.5;
    skin.opacity = form === 'shadow' ? 0.78 : 1;
    skin.transparent = form === 'shadow';

    const shell = this.mats.shell;
    shell.color.setHex(c.shell);
    shell.emissive.setHex(c.emissive);
    shell.envMapIntensity = form === 'crystal' ? 1.8 : 1.2;
    shell.opacity = form === 'shadow' ? 0.55 : 0.96;

    const eye = this.mats.eye;
    eye.emissive.setHex(c.glow);
    const glow = this.mats.glow;
    glow.emissive.setHex(c.glow);
    glow.color.setHex(c.glow);
    this.mats.seam.color.setHex(c.glow);
    this.auraMat.color.setHex(c.glow);
    this.wingMat.color.setHex(c.glow);
    this.companionMat.color.setHex(c.glow);
    this.companionMat.emissive.setHex(c.glow);

    const scale = form === 'crystal' ? 1.08 : form === 'shadow' ? 0.92 : 1.02;
    this.group.scale.setScalar(scale);
  }

  jump() {
    if (this.y <= this.baseY + 0.02) {
      this.vy = 11.2;
      this.jumpHeld = true;
    }
  }

  updateJumpHeld() {
    if (this.jumpHeld && this.vy > 0) this.vy += 18 * 0.016;
  }

  endJump() {
    this.jumpHeld = false;
  }

  slide(active) {
    this.slideActive = active;
  }

  update(dt, running, t, gravityScale = 1, laneX = 0, targetLaneX = 0) {
    if (this.jumpHeld && this.vy > 0) this.jumpHeld = false;
    if (this.y > this.baseY || this.vy > 0) {
      this.vy += this.gravity * gravityScale * dt;
      this.y += this.vy * dt;
      if (this.y < this.baseY) {
        this.y = this.baseY;
        this.vy = 0;
      }
    }
    this.group.position.y = this.y;

    const next = THREE.MathUtils.lerp(laneX, targetLaneX, 1 - Math.pow(0.0015, dt));
    this.group.position.x = next;

    const speed = running ? 1 : 0.35;
    const phase = t * 13 * speed;
    if (this.slideActive) {
      this.group.position.y = this.baseY - 0.22;
      this.torso.rotation.x = -0.5;
      this.armL.rotation.x = -1.2;
      this.armR.rotation.x = -1.2;
      this.legL.rotation.x = 1.35;
      this.legR.rotation.x = 1.35;
    } else if (this.y > this.baseY + 0.05) {
      this.torso.rotation.x = 0.14;
      this.armL.rotation.x = -1.4;
      this.armR.rotation.x = -1.4;
      this.legL.rotation.x = 0.7;
      this.legR.rotation.x = -0.3;
    } else {
      this.torso.rotation.x = 0.06 + Math.sin(phase) * 0.045;
      this.armL.rotation.x = Math.sin(phase) * 0.9;
      this.armR.rotation.x = Math.sin(phase + Math.PI) * 0.9;
      this.legL.rotation.x = Math.sin(phase + Math.PI) * 1.1;
      this.legR.rotation.x = Math.sin(phase) * 1.1;
    }

    const hover = running ? 0 : Math.sin(t * 2.2) * 0.04;
    this.group.position.y = (this.slideActive ? this.baseY - 0.22 : this.y) + hover;

    // head / crest sway
    this.head.rotation.y = Math.sin(t * 1.8) * 0.08;
    this.head.rotation.x = Math.sin(t * 2.6) * 0.05;

    // tail wave
    let p = this.tail;
    let i = 0;
    while (p && i < 5) {
      p.rotation.y = Math.sin(t * 4 + i * 0.7) * 0.24;
      p.rotation.x = Math.sin(t * 3 + i) * 0.08;
      p = p.children[1];
      i++;
    }

    // aura + core pulse
    this.aura.rotation.z += dt * 1.6;
    this.aura.scale.setScalar(1 + Math.sin(t * 4) * 0.1);
    this.core.scale.setScalar(1 + Math.sin(t * 5) * 0.14);
    const pulse = 2 + Math.sin(t * 5) * 0.9;
    this.mats.glow.emissiveIntensity = pulse;

    // wing flutter
    this.wings.rotation.y = 0.12 + Math.sin(t * 6) * (running ? 0.5 : 0.14);

    // companion orbit + bob
    const rad = 0.95;
    const ox = Math.cos(t * 1.7) * rad;
    const oz = Math.sin(t * 1.7) * rad;
    this.companion.position.set(
      this.group.position.x + ox,
      this.group.position.y + 0.9 + Math.sin(t * 3) * 0.12,
      this.group.position.z + oz
    );
    this.companion.rotation.y = t * 3;
  }
}
