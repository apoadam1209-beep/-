// Fully procedural alien athlete "NYX-7": a jointed, animated creature built
// from ~40 primitives — head crest, big compound eyes, gill flaps, chest core,
// dorsal fins, three-fingered hands, digitigrade legs and a five-segment tail.
import * as THREE from 'three';
import { alienSkin } from '../core/textures.js';

export class Alien {
  constructor() {
    this.root = new THREE.Group();
    // the model is authored facing +Z; the rig turns it to face down-track (-Z)
    this.rig = new THREE.Group();
    this.rig.rotation.y = Math.PI;
    this.root.add(this.rig);
    this.phaseColor = new THREE.Color(0x2ff5ff);
    this.runPhase = 0;
    this.breath = 0;
    this._build();
  }

  _mat() {
    const skin = alienSkin();
    return new THREE.MeshStandardMaterial({
      map: skin.map,
      normalMap: skin.normalMap,
      normalScale: new THREE.Vector2(0.9, 0.9),
      emissiveMap: skin.emissiveMap,
      emissive: new THREE.Color(0x1effc9),
      emissiveIntensity: 0.85,
      roughness: 0.52,
      metalness: 0.08,
    });
  }

  _build() {
    const skinMat = this._mat();
    this.skinMat = skinMat;

    const plateMat = new THREE.MeshStandardMaterial({
      color: 0x1c2733,
      roughness: 0.35,
      metalness: 0.75,
      emissive: new THREE.Color(0x0a2a36),
      emissiveIntensity: 0.4,
    });
    this.plateMat = plateMat;

    const glowMat = new THREE.MeshStandardMaterial({
      color: 0x081014,
      emissive: this.phaseColor.clone(),
      emissiveIntensity: 3.2,
      roughness: 0.2,
    });
    this.glowMat = glowMat;

    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0x05070a,
      roughness: 0.05,
      metalness: 0.4,
      emissive: new THREE.Color(0x0e3a44),
      emissiveIntensity: 0.6,
    });
    const irisMat = new THREE.MeshBasicMaterial({ color: 0x7cffea });
    this.irisMat = irisMat;

    const g = (o) => { o.castShadow = true; o.receiveShadow = false; return o; };

    // ---------------------------------------------------------------- pelvis
    this.hips = new THREE.Group();
    this.hips.position.y = 0.88;
    this.rig.add(this.hips);

    const pelvis = g(new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), skinMat));
    pelvis.scale.set(1.35, 0.85, 1.0);
    this.hips.add(pelvis);

    const pelvisPlate = g(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.34), plateMat));
    pelvisPlate.position.set(0, -0.02, 0.02);
    this.hips.add(pelvisPlate);

    // ----------------------------------------------------------------- torso
    this.torso = new THREE.Group();
    this.torso.position.y = 0.12;
    this.hips.add(this.torso);

    const abdomen = g(new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.22, 6, 14), skinMat));
    abdomen.scale.set(1.2, 1.0, 0.85);
    abdomen.position.y = 0.17;
    this.torso.add(abdomen);

    const chest = g(new THREE.Mesh(new THREE.SphereGeometry(0.31, 18, 14), skinMat));
    chest.scale.set(1.15, 0.95, 0.78);
    chest.position.y = 0.46;
    this.torso.add(chest);

    // ribbed chest plates
    for (let i = 0; i < 3; i++) {
      const rib = g(new THREE.Mesh(new THREE.TorusGeometry(0.2 - i * 0.025, 0.028, 6, 14, Math.PI * 1.1), plateMat));
      rib.rotation.set(Math.PI / 2, 0, Math.PI * 0.95);
      rib.position.set(0, 0.28 + i * 0.12, 0.12);
      this.torso.add(rib);
    }

    // glowing chest core (phase indicator)
    this.core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.11, 1), glowMat);
    this.core.position.set(0, 0.46, 0.21);
    this.torso.add(this.core);
    this.coreHalo = new THREE.Mesh(
      new THREE.SphereGeometry(0.19, 14, 10),
      new THREE.MeshBasicMaterial({ color: this.phaseColor.clone(), transparent: true, opacity: 0.28, depthWrite: false })
    );
    this.coreHalo.position.copy(this.core.position);
    this.torso.add(this.coreHalo);

    this.coreLight = new THREE.PointLight(this.phaseColor.getHex(), 2.2, 6, 2);
    this.coreLight.position.copy(this.core.position);
    this.torso.add(this.coreLight);

    // dorsal fins
    this.fins = [];
    for (let i = 0; i < 4; i++) {
      const fin = g(new THREE.Mesh(new THREE.ConeGeometry(0.11 - i * 0.015, 0.34 - i * 0.05, 4), plateMat));
      fin.position.set(0, 0.6 - i * 0.15, -0.18 - i * 0.01);
      fin.rotation.x = -0.9 - i * 0.1;
      this.torso.add(fin);
      this.fins.push(fin);
    }

    // shoulder pauldrons
    for (const s of [-1, 1]) {
      const pa = g(new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.6), plateMat));
      pa.position.set(s * 0.3, 0.6, 0);
      pa.rotation.z = -s * 0.5;
      this.torso.add(pa);
    }

    // ------------------------------------------------------------------ neck
    this.neck = new THREE.Group();
    this.neck.position.y = 0.66;
    this.torso.add(this.neck);
    const neckMesh = g(new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.12, 0.2, 10), skinMat));
    neckMesh.position.y = 0.09;
    this.neck.add(neckMesh);

    // ------------------------------------------------------------------ head
    this.head = new THREE.Group();
    this.head.position.y = 0.2;
    this.neck.add(this.head);

    const cranium = g(new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 16), skinMat));
    cranium.scale.set(0.95, 1.05, 1.45);
    cranium.position.set(0, 0.1, -0.05);
    this.head.add(cranium);

    // elongated back crest
    const crest = g(new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.42, 6), skinMat));
    crest.position.set(0, 0.14, -0.28);
    crest.rotation.x = 1.9;
    this.head.add(crest);
    const crestFin = g(new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.3, 4), plateMat));
    crestFin.position.set(0, 0.26, -0.2);
    crestFin.rotation.x = 2.2;
    this.head.add(crestFin);

    // tapered jaw / muzzle
    const jaw = g(new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.3, 8), skinMat));
    jaw.rotation.x = -Math.PI / 2;
    jaw.scale.set(1, 1, 0.8);
    jaw.position.set(0, 0.03, 0.17);
    this.head.add(jaw);

    const mandible = g(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.2), plateMat));
    mandible.position.set(0, -0.04, 0.16);
    this.head.add(mandible);

    // big compound eyes + glowing irises
    this.irises = [];
    for (const s of [-1, 1]) {
      const eye = g(new THREE.Mesh(new THREE.SphereGeometry(0.088, 16, 12), eyeMat));
      eye.scale.set(1.15, 0.9, 1.25);
      eye.position.set(s * 0.11, 0.1, 0.11);
      eye.rotation.y = s * 0.35;
      this.head.add(eye);

      const iris = new THREE.Mesh(new THREE.SphereGeometry(0.036, 10, 8), irisMat);
      iris.position.set(s * 0.125, 0.1, 0.185);
      this.head.add(iris);
      this.irises.push(iris);

      // brow plate
      const brow = g(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.1), plateMat));
      brow.position.set(s * 0.11, 0.18, 0.1);
      brow.rotation.z = -s * 0.3;
      this.head.add(brow);

      // gill flaps on the neck sides
      for (let i = 0; i < 3; i++) {
        const gill = g(new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.05, 0.07), plateMat));
        gill.position.set(s * 0.16, -0.02 - i * 0.05, -0.06);
        this.head.add(gill);
      }
    }

    // antennae
    this.antennae = [];
    for (const s of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(s * 0.1, 0.24, -0.02);
      pivot.rotation.z = -s * 0.45;
      const stalk = g(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.02, 0.36, 6), skinMat));
      stalk.position.y = 0.18;
      pivot.add(stalk);
      const tipPivot = new THREE.Group();
      tipPivot.position.y = 0.36;
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), glowMat);
      tipPivot.add(tip);
      const stalk2 = g(new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, 0.16, 6), skinMat));
      stalk2.position.y = -0.08;
      tipPivot.add(stalk2);
      pivot.add(tipPivot);
      this.head.add(pivot);
      this.antennae.push({ pivot, tipPivot, side: s });
    }

    // ------------------------------------------------------------------ arms
    this.arms = [];
    for (const s of [-1, 1]) {
      const shoulder = new THREE.Group();
      shoulder.position.set(s * 0.3, 0.56, 0);
      this.torso.add(shoulder);

      const upper = g(new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.2, 5, 10), skinMat));
      upper.position.y = -0.14;
      shoulder.add(upper);

      const elbow = new THREE.Group();
      elbow.position.y = -0.28;
      shoulder.add(elbow);

      const fore = g(new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.18, 5, 10), skinMat));
      fore.position.y = -0.13;
      elbow.add(fore);

      const forearmPlate = g(new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.16, 0.07), plateMat));
      forearmPlate.position.set(0, -0.14, 0.02);
      elbow.add(forearmPlate);

      const wrist = new THREE.Group();
      wrist.position.y = -0.25;
      elbow.add(wrist);

      const palm = g(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, 0.05), skinMat));
      palm.position.y = -0.04;
      wrist.add(palm);
      for (let f = 0; f < 3; f++) {
        const finger = g(new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.07, 3, 6), skinMat));
        finger.position.set((f - 1) * 0.026, -0.11, 0.005);
        finger.rotation.z = (f - 1) * 0.18;
        wrist.add(finger);
      }
      this.arms.push({ shoulder, elbow, wrist, side: s });
    }

    // ------------------------------------------------------------------ legs
    this.legs = [];
    for (const s of [-1, 1]) {
      const hip = new THREE.Group();
      hip.position.set(s * 0.16, -0.05, 0);
      this.hips.add(hip);

      const thigh = g(new THREE.Mesh(new THREE.CapsuleGeometry(0.082, 0.24, 6, 12), skinMat));
      thigh.position.y = -0.17;
      hip.add(thigh);

      const knee = new THREE.Group();
      knee.position.y = -0.34;
      hip.add(knee);

      const shin = g(new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.24, 6, 12), skinMat));
      shin.position.y = -0.16;
      knee.add(shin);

      const shinPlate = g(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.07), plateMat));
      shinPlate.position.set(0, -0.16, 0.04);
      knee.add(shinPlate);

      const ankle = new THREE.Group();
      ankle.position.y = -0.32;
      knee.add(ankle);

      // digitigrade foot: heel spur + long pad + claws
      const pad = g(new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.06, 0.24), skinMat));
      pad.position.set(0, -0.04, 0.06);
      ankle.add(pad);
      const spur = g(new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.12, 5), plateMat));
      spur.position.set(0, -0.02, -0.09);
      spur.rotation.x = 2.4;
      ankle.add(spur);
      for (let c = 0; c < 3; c++) {
        const claw = g(new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.08, 5), plateMat));
        claw.position.set((c - 1) * 0.035, -0.05, 0.19);
        claw.rotation.x = Math.PI / 2;
        ankle.add(claw);
      }
      this.legs.push({ hip, knee, ankle, side: s });
    }

    // -------------------------------------------------------------- tail
    this.tail = [];
    let parent = this.hips;
    for (let i = 0; i < 6; i++) {
      const seg = new THREE.Group();
      seg.position.set(0, i === 0 ? -0.02 : 0, i === 0 ? -0.2 : -0.19);
      const r = 0.075 - i * 0.009;
      const mesh = g(new THREE.Mesh(new THREE.CapsuleGeometry(r, 0.14, 5, 10), skinMat));
      mesh.rotation.x = Math.PI / 2;
      mesh.position.z = -0.08;
      seg.add(mesh);
      if (i > 1) {
        const spine = g(new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.1, 4), this.plateMat));
        spine.position.set(0, r + 0.03, -0.08);
        spine.rotation.x = -0.4;
        seg.add(spine);
      }
      parent.add(seg);
      parent = seg;
      this.tail.push(seg);
    }
    const tailTip = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.2, 8), glowMat);
    tailTip.rotation.x = -Math.PI / 2;
    tailTip.position.z = -0.16;
    parent.add(tailTip);
    this.tailTip = tailTip;

    // ------------------------------------------------- energy trail ribbons
    this.trail = new THREE.Group();
    this.rig.add(this.trail);
    this.trailPlanes = [];
    for (let i = 0; i < 5; i++) {
      const p = new THREE.Mesh(
        new THREE.PlaneGeometry(0.5, 1.6),
        new THREE.MeshBasicMaterial({
          color: this.phaseColor.clone(),
          transparent: true,
          opacity: 0.0,
          side: THREE.DoubleSide,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      );
      p.position.set(0, 0.9, -(0.4 + i * 0.45));
      p.rotation.y = Math.PI / 2;
      this.trail.add(p);
      this.trailPlanes.push(p);
    }

    this.root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  }

  setPhaseColor(hex) {
    this.phaseColor.setHex(hex);
    this.glowMat.emissive.setHex(hex);
    this.coreHalo.material.color.setHex(hex);
    this.coreLight.color.setHex(hex);
    this.irisMat.color.setHex(hex).lerp(new THREE.Color(0xffffff), 0.35);
    this.skinMat.emissive.setHex(hex).multiplyScalar(0.55);
    for (const p of this.trailPlanes) p.material.color.setHex(hex);
  }

  setOverdrive(on) {
    this.skinMat.emissiveIntensity = on ? 2.4 : 0.85;
    this.glowMat.emissiveIntensity = on ? 6 : 3.2;
    this.coreLight.intensity = on ? 6 : 2.2;
  }

  /**
   * @param {number} dt
   * @param {object} s state { speed, grounded, sliding, airTime, vy, hurt, boost }
   */
  update(dt, s) {
    const cadence = 1.6 + s.speed * 0.135;
    if (s.grounded && !s.sliding) this.runPhase += dt * cadence;
    this.breath += dt;
    const p = this.runPhase;
    const swing = s.grounded ? 1 : 0.25;

    // --- legs -------------------------------------------------------------
    for (let i = 0; i < 2; i++) {
      const leg = this.legs[i];
      const off = i === 0 ? 0 : Math.PI;
      const a = p * 2 + off;
      if (s.sliding) {
        leg.hip.rotation.x = -0.15 + Math.sin(a) * 0.08;
        leg.knee.rotation.x = 1.35;
        leg.ankle.rotation.x = -0.6;
      } else if (!s.grounded) {
        const tuck = s.vy > 0 ? 1 : 0.4;
        leg.hip.rotation.x = -0.7 * tuck + i * 0.25;
        leg.knee.rotation.x = 1.5 * tuck + 0.2;
        leg.ankle.rotation.x = -0.5;
      } else {
        const hipA = Math.sin(a) * 0.92 * swing;
        leg.hip.rotation.x = hipA - 0.12;
        const bend = Math.max(0, -Math.sin(a - 0.9)) * 1.55 + 0.14;
        leg.knee.rotation.x = bend;
        leg.ankle.rotation.x = -0.25 + Math.sin(a + 1.2) * 0.42;
      }
      leg.hip.rotation.z = leg.side * 0.06;
    }

    // --- arms -------------------------------------------------------------
    for (let i = 0; i < 2; i++) {
      const arm = this.arms[i];
      const off = i === 0 ? Math.PI : 0;
      const a = p * 2 + off;
      if (s.sliding) {
        arm.shoulder.rotation.x = -2.2;
        arm.shoulder.rotation.z = arm.side * 0.25;
        arm.elbow.rotation.x = 0.5;
      } else if (!s.grounded) {
        arm.shoulder.rotation.x = -1.9 + Math.sin(this.breath * 8 + i) * 0.15;
        arm.shoulder.rotation.z = arm.side * 0.55;
        arm.elbow.rotation.x = 0.9;
      } else {
        arm.shoulder.rotation.x = Math.sin(a) * 0.85 * swing - 0.15;
        arm.shoulder.rotation.z = arm.side * (0.2 + Math.abs(Math.sin(a)) * 0.1);
        arm.elbow.rotation.x = 0.75 + Math.max(0, Math.sin(a + 1.0)) * 0.65;
      }
      arm.wrist.rotation.x = Math.sin(a + 0.5) * 0.2;
    }

    // --- torso / hips ------------------------------------------------------
    const bob = s.grounded && !s.sliding ? Math.abs(Math.sin(p * 2)) * 0.055 : 0;
    this.hips.position.y = 0.88 + bob - (s.sliding ? 0.42 : 0);
    this.hips.rotation.x = s.sliding ? 1.05 : 0.18 + Math.sin(p * 2) * 0.03 + Math.min(0.12, s.speed * 0.003);
    this.hips.rotation.z = Math.sin(p) * 0.06;
    this.hips.rotation.y = Math.sin(p) * 0.09 + (s.lean || 0) * 0.25;
    this.torso.rotation.y = -Math.sin(p) * 0.12;
    this.torso.rotation.x = s.sliding ? -0.35 : 0.05;

    // --- head --------------------------------------------------------------
    this.neck.rotation.x = s.sliding ? -0.9 : -0.24 - Math.sin(p * 2) * 0.04;
    this.head.rotation.y = Math.sin(this.breath * 0.9) * 0.09 + (s.lean || 0) * 0.4;
    this.head.rotation.z = -(s.lean || 0) * 0.18;

    // --- antennae (secondary motion) --------------------------------------
    for (const a of this.antennae) {
      a.pivot.rotation.x = -0.25 + Math.sin(this.breath * 3.2 + a.side) * 0.16 - Math.min(0.5, s.speed * 0.012);
      a.tipPivot.rotation.x = Math.sin(this.breath * 4.6 + a.side * 1.7) * 0.35;
      a.tipPivot.rotation.z = Math.cos(this.breath * 3.9 + a.side) * 0.25;
    }

    // --- tail wave ---------------------------------------------------------
    for (let i = 0; i < this.tail.length; i++) {
      const seg = this.tail[i];
      const w = this.breath * 5.2 - i * 0.55;
      seg.rotation.y = Math.sin(w) * (0.16 + i * 0.02);
      seg.rotation.x = (i === 0 ? 0.35 : 0.06) + Math.cos(w * 0.8) * 0.07 - (s.sliding ? 0.12 : 0) + (!s.grounded ? -0.06 : 0);
    }

    // --- fins flare with speed ---------------------------------------------
    const flare = Math.min(1, s.speed / 40);
    for (let i = 0; i < this.fins.length; i++) {
      this.fins[i].rotation.x = -0.9 - i * 0.1 - flare * 0.4 + Math.sin(this.breath * 2 + i) * 0.05;
    }

    // --- core pulse ---------------------------------------------------------
    const pulse = 1 + Math.sin(this.breath * 6) * 0.12;
    this.core.scale.setScalar(pulse);
    this.coreHalo.scale.setScalar(pulse * (s.boost ? 1.5 : 1));
    this.coreHalo.material.opacity = 0.22 + Math.sin(this.breath * 6) * 0.08 + (s.boost ? 0.25 : 0);

    // --- speed ribbons ------------------------------------------------------
    const trailAmt = Math.max(0, (s.speed - 24) / 26) * (s.boost ? 1 : 0.55);
    for (let i = 0; i < this.trailPlanes.length; i++) {
      const pl = this.trailPlanes[i];
      pl.material.opacity = trailAmt * (0.35 - i * 0.06);
      pl.scale.y = 1 + trailAmt * 2;
      pl.position.y = 0.9 + Math.sin(this.breath * 9 - i) * 0.05;
    }

    // hurt flash
    if (s.hurt > 0) {
      const f = Math.sin(s.hurt * 40) > 0;
      this.root.visible = f;
    } else {
      this.root.visible = true;
    }
  }
}
