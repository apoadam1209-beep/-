// GPU-light VFX: particle bursts, shock rings, speed streaks, phase flash.
import * as THREE from 'three';
import { glowSprite } from '../core/textures.js';

const MAX_P = 900;

export class Effects {
  constructor(scene) {
    this.scene = scene;
    const pos = new Float32Array(MAX_P * 3);
    const col = new Float32Array(MAX_P * 3);
    for (let i = 0; i < MAX_P; i++) pos[i * 3 + 1] = -999;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.mat = new THREE.PointsMaterial({
      size: 0.42,
      map: glowSprite(0xffffff),
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(geo, this.mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
    this.vel = new Float32Array(MAX_P * 3);
    this.life = new Float32Array(MAX_P);
    this.maxLife = new Float32Array(MAX_P);
    this.cursor = 0;

    // shock rings
    this.rings = [];
    const ringGeo = new THREE.RingGeometry(0.6, 0.78, 40);
    for (let i = 0; i < 8; i++) {
      const m = new THREE.Mesh(
        ringGeo,
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })
      );
      m.visible = false;
      scene.add(m);
      this.rings.push({ mesh: m, t: 0, dur: 1, scale: 6 });
    }
    this.ringCursor = 0;
  }

  burst(x, y, z, colorHex, count = 22, power = 7, spread = 1) {
    const c = new THREE.Color(colorHex);
    const pos = this.points.geometry.attributes.position.array;
    const col = this.points.geometry.attributes.color.array;
    for (let i = 0; i < count; i++) {
      const idx = this.cursor;
      this.cursor = (this.cursor + 1) % MAX_P;
      const i3 = idx * 3;
      pos[i3] = x; pos[i3 + 1] = y; pos[i3 + 2] = z;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const sp = power * (0.35 + Math.random() * 0.9);
      this.vel[i3] = Math.sin(phi) * Math.cos(theta) * sp * spread;
      this.vel[i3 + 1] = Math.abs(Math.cos(phi)) * sp * 0.8 + 1.5;
      this.vel[i3 + 2] = Math.sin(phi) * Math.sin(theta) * sp * spread;
      const tint = 0.75 + Math.random() * 0.5;
      col[i3] = c.r * tint; col[i3 + 1] = c.g * tint; col[i3 + 2] = c.b * tint;
      this.life[idx] = this.maxLife[idx] = 0.45 + Math.random() * 0.55;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
  }

  ring(x, y, z, colorHex, scale = 7, dur = 0.55) {
    const r = this.rings[this.ringCursor];
    this.ringCursor = (this.ringCursor + 1) % this.rings.length;
    r.mesh.position.set(x, y, z);
    r.mesh.material.color.setHex(colorHex);
    r.mesh.visible = true;
    r.t = 0;
    r.dur = dur;
    r.scale = scale;
    r.mesh.scale.setScalar(0.2);
    r.mesh.material.opacity = 0.9;
    r.mesh.rotation.set(0, 0, Math.random() * 3);
  }

  update(dt) {
    const pos = this.points.geometry.attributes.position.array;
    for (let i = 0; i < MAX_P; i++) {
      if (this.life[i] <= 0) continue;
      const i3 = i * 3;
      this.life[i] -= dt;
      if (this.life[i] <= 0) { pos[i3 + 1] = -999; continue; }
      this.vel[i3 + 1] -= 16 * dt;
      pos[i3] += this.vel[i3] * dt;
      pos[i3 + 1] += this.vel[i3 + 1] * dt;
      pos[i3 + 2] += this.vel[i3 + 2] * dt;
      this.vel[i3] *= 1 - dt * 1.4;
      this.vel[i3 + 2] *= 1 - dt * 1.4;
    }
    this.points.geometry.attributes.position.needsUpdate = true;

    for (const r of this.rings) {
      if (!r.mesh.visible) continue;
      r.t += dt;
      const k = r.t / r.dur;
      if (k >= 1) { r.mesh.visible = false; continue; }
      r.mesh.scale.setScalar(0.2 + k * r.scale);
      r.mesh.material.opacity = 0.9 * (1 - k);
    }
  }
}
