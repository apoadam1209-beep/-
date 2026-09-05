// "THE REAPER" — a hunter-killer drone that closes the gap every time you are
// hit and slowly falls behind while you run clean. Pure pressure mechanic.
import * as THREE from 'three';
import { glowSprite } from '../core/textures.js';
import { HUNTER_START_DIST, HUNTER_MIN_DIST, HUNTER_HIT_PENALTY, HUNTER_RECOVER } from '../config.js';

export class Hunter {
  constructor(scene) {
    this.group = new THREE.Group();
    scene.add(this.group);
    this.gap = HUNTER_START_DIST;
    this.t = 0;

    // metalness 0.9 on a near-black colour means the hull has almost no diffuse
    // response and nothing but reflections to show — against these dim skies it
    // rendered as a pure black hole hanging over the track. A machine reads as
    // a machine through its panels and running lights, not its raw metal.
    const shell = new THREE.MeshStandardMaterial({ color: 0x4a525f, roughness: 0.42, metalness: 0.55 });
    const plate = new THREE.MeshStandardMaterial({ color: 0x767f8d, roughness: 0.5, metalness: 0.45, flatShading: true });
    const trim = new THREE.MeshStandardMaterial({ color: 0x14161c, emissive: new THREE.Color(0xff3a2a), emissiveIntensity: 1.6, roughness: 0.5 });
    const hot = new THREE.MeshStandardMaterial({ color: 0x120404, emissive: new THREE.Color(0xff2a2a), emissiveIntensity: 3.5, roughness: 0.3 });

    const body = new THREE.Mesh(new THREE.IcosahedronGeometry(1.15, 1), shell);
    body.scale.set(1.3, 0.8, 1.5);
    this.group.add(body);

    // dorsal armour plates catch the light and break the silhouette
    for (let i = 0; i < 3; i++) {
      const plateM = new THREE.Mesh(new THREE.BoxGeometry(1.5 - i * 0.28, 0.16, 0.55), plate);
      plateM.position.set(0, 0.62 - i * 0.06, -0.7 + i * 0.72);
      plateM.rotation.x = -0.12;
      this.group.add(plateM);
    }
    for (const s2 of [-1, 1]) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 1.5), plate);
      fin.position.set(s2 * 1.28, 0.18, 0.35);
      fin.rotation.z = s2 * 0.35;
      this.group.add(fin);
      const light = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.9), trim);
      light.position.set(s2 * 1.34, 0.02, 0.2);
      this.group.add(light);
    }
    const spine = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 2.4), trim);
    spine.position.set(0, 0.72, 0.1);
    this.group.add(spine);

    const jaw = new THREE.Mesh(new THREE.ConeGeometry(0.75, 1.6, 8), shell);
    jaw.rotation.x = -Math.PI / 2;
    jaw.position.z = -1.5;
    this.group.add(jaw);

    this.eye = new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 12), hot);
    this.eye.position.set(0, 0.1, -1.05);
    this.group.add(this.eye);

    this.eyeLight = new THREE.PointLight(0xff2a2a, 3, 26, 2);
    this.eyeLight.position.copy(this.eye.position);
    this.group.add(this.eyeLight);

    this.legs = [];
    for (let i = 0; i < 6; i++) {
      const s = i % 2 === 0 ? -1 : 1;
      const row = Math.floor(i / 2);
      const leg = new THREE.Group();
      leg.position.set(s * 0.9, -0.1, -0.6 + row * 0.8);
      const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.7, 4, 8), shell);
      upper.position.set(s * 0.35, -0.15, 0);
      upper.rotation.z = s * 1.0;
      leg.add(upper);
      const lower = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.8, 4, 8), shell);
      lower.position.set(s * 0.8, -0.7, 0);
      lower.rotation.z = -s * 0.35;
      leg.add(lower);
      this.group.add(leg);
      this.legs.push({ leg, s, row });
    }

    for (const s of [-1, 1]) {
      const thruster = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.34, 0.7, 10), shell);
      thruster.rotation.x = Math.PI / 2;
      thruster.position.set(s * 0.95, 0.25, 1.2);
      this.group.add(thruster);
      const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowSprite(0xff5a2a), transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
      flame.scale.setScalar(1.5);
      flame.position.set(s * 0.95, 0.25, 1.9);
      this.group.add(flame);
    }

    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowSprite(0xff2a2a), transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
    halo.scale.setScalar(6);
    this.group.add(halo);
    this.halo = halo;
  }

  reset() {
    this.gap = HUNTER_START_DIST;
  }

  penalise(amount = HUNTER_HIT_PENALTY) {
    this.gap = Math.max(HUNTER_MIN_DIST - 2, this.gap - amount);
  }

  reward(amount) {
    this.gap = Math.min(HUNTER_START_DIST, this.gap + amount);
  }

  update(dt, player, speed, camera) {
    this.t += dt;
    this.gap = Math.min(HUNTER_START_DIST, this.gap + HUNTER_RECOVER * dt);
    const danger = 1 - Math.min(1, (this.gap - HUNTER_MIN_DIST) / (HUNTER_START_DIST - HUNTER_MIN_DIST));

    // The literal gap is a gameplay number; on screen we compress it against
    // the camera so the Reaper always looms overhead and swoops in as it gains.
    const camZ = camera ? camera.position.z : player.z + 9;
    // It used to sit 3 to 5.6 units off the lens, which is close enough that a
    // 2 m drone covered the whole top of the frame and blocked the road ahead.
    // It now hangs back and high while you are safe, and dives in close and
    // low as it gains — the same escalation, read as a chase instead of a smear.
    const visZ = camZ - (22 + (1 - danger) * 12);
    const visLocalY = 3.0 + (1 - danger) * 9.0;
    const targetX = player.x * 0.7;
    this.group.position.x += (targetX - this.group.position.x) * Math.min(1, dt * 3.2);
    this.group.position.z = visZ; // anchored to the camera so it is always framed
    const dir = player.flip ? -1 : 1;
    const targetY = player.floorY + dir * (visLocalY + Math.sin(this.t * 2.4) * 0.28);
    this.group.position.y += (targetY - this.group.position.y) * Math.min(1, dt * 4);
    this.group.rotation.z = (player.flip ? Math.PI : 0) + Math.sin(this.t * 1.7) * 0.12;
    this.group.rotation.x = -0.12 - danger * 0.18 + Math.sin(this.t * 2.9) * 0.05;
    this.group.scale.setScalar(1.7 + danger * 2.2); // further away, so scaled up to keep its presence
    this.eye.material.emissiveIntensity = 2.5 + danger * 6 + Math.sin(this.t * 12) * danger * 2;
    this.eyeLight.intensity = 4 + danger * 14;
    this.halo.material.opacity = 0.16 + danger * 0.3;
    this.halo.scale.setScalar(3.2 + danger * 2.6);

    for (const l of this.legs) {
      l.leg.rotation.x = Math.sin(this.t * 6 + l.row * 1.1 + (l.s > 0 ? 1.5 : 0)) * 0.18;
    }
    return danger;
  }

  caught() {
    return this.gap <= HUNTER_MIN_DIST;
  }
}
