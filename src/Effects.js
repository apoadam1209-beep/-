import * as THREE from 'three';

export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
    this.group = new THREE.Group();
    this.scene.add(this.group);
  }

  spawnTrail(pos, color = 0x36e0ff, quantity = 2) {
    this.spawn(pos, color, quantity, {
      life: 0.55,
      speed: new THREE.Vector3(0, 0.6, 5.5),
      spread: 0.5,
      size: 0.09,
      gravity: -2,
      additive: true,
      drag: 0.92,
    });
  }

  burst(pos, color, count = 14, intensity = 1) {
    this.spawn(pos, color, count, {
      life: 0.7,
      speed: new THREE.Vector3(0, 2.2, -1),
      direction: 'sphere',
      spread: 4.2 * intensity,
      size: 0.11,
      gravity: -7,
      additive: true,
      drag: 0.9,
    });
  }

  nearMiss(pos, color) {
    this.spawn(pos, color, 10, {
      life: 0.4,
      speed: new THREE.Vector3(0, 0, 8),
      direction: 'side',
      spread: 1.4,
      size: 0.08,
      gravity: 0,
      additive: true,
      drag: 0.92,
    });
  }

  spawn(pos, color, count, opts) {
    const positions = new Float32Array(count * 3);
    const velocities = [];
    const geo = new THREE.BufferGeometry();
    for (let i = 0; i < count; i++) {
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = pos.z;
      let v = opts.speed.clone();
      if (opts.direction === 'sphere') {
        v = new THREE.Vector3(
          (Math.random() - 0.5) * opts.spread,
          (Math.random() - 0.5) * opts.spread,
          (Math.random() - 0.5) * opts.spread
        );
        v.y += opts.speed.y;
      } else if (opts.direction === 'side') {
        v.x = (Math.random() - 0.5) * opts.spread;
        v.z = opts.speed.z;
      } else {
        v.x += (Math.random() - 0.5) * opts.spread;
        v.y += (Math.random() - 0.5) * opts.spread;
      }
      velocities.push(v);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color,
      size: opts.size,
      transparent: true,
      opacity: 1,
      blending: opts.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      depthWrite: false,
    });
    const points = new THREE.Points(geo, mat);
    this.group.add(points);
    this.particles.push({
      points,
      velocities,
      life: opts.life,
      maxLife: opts.life,
      opts,
    });
  }

  update(dt) {
    const toRemove = [];
    for (const p of this.particles) {
      p.life -= dt;
      const posAttr = p.points.geometry.attributes.position;
      for (let i = 0; i < p.velocities.length; i++) {
        const v = p.velocities[i];
        v.multiplyScalar(p.opts.drag);
        v.y += (p.opts.gravity || 0) * dt;
        posAttr.array[i * 3] += v.x * dt;
        posAttr.array[i * 3 + 1] += v.y * dt;
        posAttr.array[i * 3 + 2] += v.z * dt;
      }
      posAttr.needsUpdate = true;
      const ratio = Math.max(0, p.life / p.maxLife);
      p.points.material.opacity = ratio;
      if (p.life <= 0) toRemove.push(p);
    }
    for (const p of toRemove) {
      this.group.remove(p.points);
      p.points.geometry.dispose();
      p.points.material.dispose();
      this.particles.splice(this.particles.indexOf(p), 1);
    }
  }
}
