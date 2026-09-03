import * as THREE from 'three';

const FORM_COLORS = {
  plasma: { body: 0xff7a3d, glow: 0xffb347, emissive: 0xd94b00 },
  crystal: { body: 0x36e0ff, glow: 0x9ff6ff, emissive: 0x00a4cf },
  shadow: { body: 0x8f5bff, glow: 0xd0b3ff, emissive: 0x4b1f9e },
};

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

    this.build();

    // effects attach points
    this.trailSpawn = new THREE.Object3D();
    this.trailSpawn.position.set(0, 0.6, 0.75);
    this.group.add(this.trailSpawn);
    this.setForm(this.form);
  }

  material() {
    return {
      body: new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.25,
        metalness: 0.55,
        emissive: 0x000000,
        emissiveIntensity: 0.5,
      }),
      dark: new THREE.MeshStandardMaterial({
        color: 0x202a3e,
        roughness: 0.4,
        metalness: 0.6,
      }),
      eye: new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0x7df9ff,
        emissiveIntensity: 2.4,
        roughness: 0.1,
      }),
      glow: new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0x7df9ff,
        emissiveIntensity: 1.6,
        roughness: 0.15,
        transparent: true,
        opacity: 0.95,
      }),
    };
  }

  capsule(r, len, mat) {
    const geo = new THREE.CapsuleGeometry(r, len, 6, 12);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    return mesh;
  }

  sphere(r, mat) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 16), mat);
    mesh.castShadow = true;
    return mesh;
  }

  build() {
    const m = this.material();
    this.mats = m;

    // torso
    this.torso = this.capsule(0.34, 0.62, m.body);
    this.torso.position.y = 0;
    this.group.add(this.torso);

    // head
    this.head = new THREE.Group();
    this.head.position.set(0, 0.68, 0.02);
    this.group.add(this.head);

    this.headMesh = this.sphere(0.34, m.body);
    this.headMesh.scale.set(1, 0.92, 1.02);
    this.head.add(this.headMesh);

    // eyes
    for (const x of [-0.13, 0.13]) {
      const eye = this.sphere(0.085, m.eye);
      eye.position.set(x, 0.05, 0.28);
      this.head.add(eye);
    }

    // antennae
    for (const x of [-0.14, 0.14]) {
      const stalk = this.capsule(0.025, 0.28, m.dark);
      stalk.position.set(x, 0.42, -0.02);
      stalk.rotation.z = x < 0 ? 0.18 : -0.18;
      this.head.add(stalk);
      const tip = this.sphere(0.055, m.glow);
      tip.position.set(x * 1.2, 0.62, -0.02);
      this.head.add(tip);
    }

    // chest core
    this.core = this.sphere(0.13, m.glow);
    this.core.position.set(0, 0.02, 0.34);
    this.group.add(this.core);

    // arms
    this.armL = this.limb(0.12, 0.42, m.body, -0.44, 0.32, 0, 0.32);
    this.armR = this.limb(0.12, 0.42, m.body, 0.44, 0.32, 0, -0.32);
    // legs
    this.legL = this.limb(0.14, 0.5, m.body, -0.22, -0.5, 0, 0.22);
    this.legR = this.limb(0.14, 0.5, m.body, 0.22, -0.5, 0, -0.22);

    // tail
    this.tail = new THREE.Group();
    this.tail.position.set(0, 0.1, -0.35);
    this.group.add(this.tail);
    const tailMat = m.body;
    let prev = this.tail;
    for (let i = 0; i < 5; i++) {
      const seg = new THREE.Group();
      seg.position.set(0, 0, -0.26);
      const mesh = this.sphere(0.16 - i * 0.022, tailMat);
      seg.add(mesh);
      if (i === 0 || i === 2 || i === 4) {
        const fin = this.capsule(0.02, 0.16, m.glow);
        fin.position.set(0, 0.14, 0);
        fin.rotation.x = 0.5;
        seg.add(fin);
      }
      prev.add(seg);
      prev = seg;
    }

    // aura ring
    this.auraMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    });
    this.aura = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.04, 8, 40), this.auraMat);
    this.aura.rotation.x = Math.PI / 2;
    this.aura.position.y = 0.05;
    this.group.add(this.aura);
  }

  limb(r, len, mat, x, y, rotX, rotZ) {
    const pivot = new THREE.Group();
    const mesh = this.capsule(r, len, mat);
    mesh.position.y = -len / 2;
    pivot.add(mesh);
    pivot.position.set(x, y, 0);
    pivot.rotation.x = rotX;
    pivot.rotation.z = rotZ;
    this.group.add(pivot);
    return pivot;
  }

  setForm(form) {
    this.form = form;
    const c = FORM_COLORS[form];
    const body = this.mats.body;
    body.color.setHex(c.body);
    body.emissive.setHex(c.emissive);
    body.metalness = form === 'crystal' ? 0.8 : 0.45;
    body.opacity = form === 'shadow' ? 0.72 : 1;
    body.transparent = form === 'shadow';
    this.mats.eye.emissive.setHex(c.glow);
    this.mats.glow.emissive.setHex(c.glow);
    this.auraMat.color.setHex(c.glow);
    const scale = form === 'crystal' ? 1.06 : form === 'shadow' ? 0.94 : 1;
    this.group.scale.setScalar(scale);
  }

  jump() {
    if (this.y <= this.baseY + 0.02) {
      this.vy = 11.2;
      this.jumpHeld = true;
    }
  }

  updateJumpHeld() {
    if (this.jumpHeld && this.vy > 0) {
      this.vy += 18 * 0.016;
    }
  }

  endJump() {
    this.jumpHeld = false;
  }

  slide(active) {
    this.slideActive = active;
  }

  update(dt, running, t, gravityScale = 1, laneX = 0, targetLaneX = 0) {
    // vertical physics
    if (this.jumpHeld && this.vy > 0) {
      this.jumpHeld = false;
    }
    if (this.y > this.baseY || this.vy > 0) {
      this.vy += this.gravity * gravityScale * dt;
      this.y += this.vy * dt;
      if (this.y < this.baseY) {
        this.y = this.baseY;
        this.vy = 0;
      }
    }
    this.group.position.y = this.y;

    // lane movement
    const currentLaneX = laneX;
    const next = THREE.MathUtils.lerp(currentLaneX, targetLaneX, 1 - Math.pow(0.0015, dt));
    this.group.position.x = next;

    // limb animation
    const speed = running ? 1 : 0.35;
    const phase = t * 13 * speed;
    if (this.slideActive) {
      // slide pose
      this.group.position.y = this.baseY - 0.22;
      this.torso.rotation.x = -0.5;
      this.armL.rotation.x = -1.2;
      this.armR.rotation.x = -1.2;
      this.legL.rotation.x = 1.2;
      this.legR.rotation.x = 1.2;
    } else if (this.y > this.baseY + 0.05) {
      // jump pose
      this.torso.rotation.x = 0.14;
      this.armL.rotation.x = -1.4;
      this.armR.rotation.x = -1.4;
      this.legL.rotation.x = 0.7;
      this.legR.rotation.x = -0.3;
    } else {
      this.torso.rotation.x = 0.06 + Math.sin(phase) * 0.04;
      this.armL.rotation.x = Math.sin(phase) * 0.9;
      this.armR.rotation.x = Math.sin(phase + Math.PI) * 0.9;
      this.legL.rotation.x = Math.sin(phase + Math.PI) * 1.1;
      this.legR.rotation.x = Math.sin(phase) * 1.1;
    }

    // idle hover bob for whole group
    const hover = running ? 0 : Math.sin(t * 2.2) * 0.04;
    this.group.position.y = (this.slideActive ? this.baseY - 0.22 : this.y) + hover;

    // tail wave
    let p = this.tail;
    let i = 0;
    while (p && i < 5) {
      p.rotation.y = Math.sin(t * 4 + i * 0.7) * 0.22;
      p.rotation.x = Math.sin(t * 3 + i) * 0.08;
      p = p.children[1];
      i++;
    }

    // aura pulse
    this.aura.rotation.z += dt * 1.4;
    this.aura.scale.setScalar(1 + Math.sin(t * 4) * 0.1);
  }
}
