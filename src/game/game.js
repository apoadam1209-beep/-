// XENO RUN — game orchestrator: loop, physics, collisions, cameras, progression.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

import {
  LANE_X, CEILING_Y, START_SPEED, MAX_SPEED, SPEED_RAMP, GRAVITY, JUMP_VELOCITY,
  DOUBLE_JUMP_VELOCITY, SLIDE_TIME, LANE_CHANGE_SPEED, PLAYER_WIDTH, PLAYER_HEIGHT,
  PLAYER_SLIDE_HEIGHT, PLAYER_DEPTH, MAX_INTEGRITY, INVULN_TIME, OVERDRIVE_MAX,
  OVERDRIVE_TIME, OVERDRIVE_GAIN_PER_ORB, CLOSE_CALL_MARGIN, CLOSE_CALL_POINTS, PHASE_COLORS,
} from '../config.js';
import { BIOMES } from './biomes.js';
import { World } from './world.js';
import { Alien } from './alien.js';
import { EntityPool, HAZARDS, PICKUPS, SMASHABLE } from './entities.js';
import { Spawner } from './spawner.js';
import { Hunter } from './hunter.js';
import { Effects } from './effects.js';
import { AudioEngine } from './audio.js';
import { Input } from './input.js';
import { UI } from './ui.js';
import { clamp, rand } from '../core/noise.js';

const SAVE_KEY = 'xenorun.save.v1';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.state = 'loading';
    this.clock = new THREE.Clock();
    this.timeScale = 1;
    this.slowmo = 0;
    this.shake = 0;
    this.settings = { quality: 'medium', sound: 'on', shake: 'on', hand: 'off' };
    this.save = { best: 0, bestDist: 0, seen: false };
    this._loadSave();

    this._initRenderer();
    this._initScene();

    this.audio = new AudioEngine();
    this.input = new Input(canvas);
    this.input.on((a) => this.onAction(a));

    this.ui = new UI({
      play: () => this.startRun(),
      pause: () => this.pauseGame(),
      resume: () => this.resumeGame(),
      quit: () => this.toMenu(),
      phase: () => this.onAction('phase'),
      overdrive: () => this.onAction('overdrive'),
      setting: (k, v) => this.applySetting(k, v),
    });

    // detect a sensible default quality
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || window.innerWidth < 820;
    this.settings.quality = isMobile ? 'medium' : 'high';
    this.applySetting('quality', this.settings.quality, true);
    this.ui.syncSettings(this.settings);
    this.ui.setBest(this.save.best, this.save.bestDist);

    window.addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state === 'running') this.pauseGame();
    });

    this.resize();
    this._readyToPlay();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  /* ------------------------------------------------------------ setup */
  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false,
      powerPreference: 'high-performance',
      stencil: false,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  _initScene() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(72, 1, 0.3, 700);
    this.camera.position.set(0, 3.4, 8);

    this.world = new World(this.scene, this.renderer);
    this.effects = new Effects(this.scene);
    this.pool = new EntityPool(this.scene);
    this.spawner = new Spawner(this.pool);
    this.hunter = new Hunter(this.scene);

    this.alien = new Alien();
    this.scene.add(this.alien.root);

    // shield bubble
    this.shieldBubble = new THREE.Mesh(
      new THREE.SphereGeometry(1.35, 20, 14),
      new THREE.MeshBasicMaterial({ color: 0x39c6ff, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending })
    );
    this.shieldBubble.visible = false;
    this.scene.add(this.shieldBubble);

    // ground blob shadow (cheap, always on)
    this.blob = new THREE.Mesh(
      new THREE.CircleGeometry(0.7, 20),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.42, depthWrite: false })
    );
    this.blob.rotation.x = -Math.PI / 2;
    this.scene.add(this.blob);
  }

  _initComposer(bloom) {
    if (this.composer) { this.composer.dispose?.(); this.composer = null; }
    if (!bloom) return;
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.62, 0.72, 0.72);
    this.composer.addPass(this.bloom);
    this.composer.setSize(window.innerWidth, window.innerHeight);
  }

  applySetting(key, value, silent = false) {
    this.settings[key] = value;
    if (key === 'quality') {
      const q = value;
      const dpr = window.devicePixelRatio || 1;
      if (q === 'high') {
        this.renderer.setPixelRatio(Math.min(dpr, 2));
        this.renderer.shadowMap.enabled = true;
        this._initComposer(true);
      } else if (q === 'medium') {
        this.renderer.setPixelRatio(Math.min(dpr, 1.5));
        this.renderer.shadowMap.enabled = false;
        this._initComposer(true);
      } else {
        this.renderer.setPixelRatio(1);
        this.renderer.shadowMap.enabled = false;
        this._initComposer(false);
      }
      this.world.sun.castShadow = this.renderer.shadowMap.enabled;
      this.resize();
    } else if (key === 'sound') {
      this.audio.setMuted(value === 'off');
    } else if (key === 'hand') {
      document.body.classList.toggle('lefty', value === 'on');
    }
    if (!silent) this._writeSave();
  }

  _loadSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) Object.assign(this.save, JSON.parse(raw));
      if (this.save.settings) Object.assign(this.settings, this.save.settings);
    } catch (e) { /* ignore */ }
  }

  _writeSave() {
    try {
      this.save.settings = this.settings;
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.save));
    } catch (e) { /* ignore */ }
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
    if (this.composer) this.composer.setSize(w, h);
  }

  _readyToPlay() {
    this.state = 'menu';
    this.ui.show('menu');
    this.ui.setHud(false);
    // idle demo camera
    this.demoT = 0;
    this._resetRunState(true);
  }

  /* ------------------------------------------------------------ run */
  _resetRunState(idle = false) {
    this.pool.clear();
    this.spawner.reset();
    this.hunter.reset();

    this.p = {
      lane: 1, x: 0, z: 0, localY: 0, vy: 0, grounded: true, sliding: false, slideT: 0,
      jumps: 0, flip: false, floorY: 0, dir: 1, phase: 0, lean: 0,
    };
    this.speed = START_SPEED;
    this.runTime = 0;
    this.distance = 0;
    this.score = 0;
    this.orbs = 0;
    this.comboCount = 0;
    this.multiplier = 1;
    this.bestCombo = 1;
    this.worldsCleared = 1;
    this.integrity = MAX_INTEGRITY;
    this.maxIntegrity = MAX_INTEGRITY;
    this.invuln = 0;
    this.overdrive = 0;
    this.inOverdrive = false;
    this.odTimer = 0;
    this.shieldT = 0;
    this.magnetT = 0;
    this.x2T = 0;
    this.phaseGrace = 0;
    this.flipRoll = 0;
    this.ownedMutations = new Set();
    this.mods = {
      doubleJump: false, magnetRadius: 0, orbValue: 1, phaseGrace: 0, hunterRecover: 0,
      odGain: 1, odTime: 0, closeCallMargin: 0, closeCallMult: 1, worldShield: false,
      slowmoBonus: 0, closeCallCharge: 0,
    };

    this.alien.root.position.set(0, 0, 0);
    this.alien.setPhaseColor(PHASE_COLORS[0]);
    this.alien.setOverdrive(false);
    this.ui.setPhase(PHASE_COLORS[0]);
    this.ui.buildIntegrity(this.maxIntegrity);
    this.ui.setIntegrity(this.integrity);
    this.ui.hurt(false);
    this.ui.warning(false);

    this.spawner.biomeIndex = 0;
    this.world.applyBiome(BIOMES[0], true);
    this.audio.setBiome(BIOMES[0].music);

    this.camera.up.set(0, 1, 0);
    this.camera.position.set(0, 3.4, 8);
    this.camera.lookAt(0, 1.4, -8);
  }

  _goFullscreen() {
    try {
      const el = document.documentElement;
      if (!document.fullscreenElement && el.requestFullscreen) {
        el.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
      }
      if (screen.orientation && screen.orientation.lock) screen.orientation.lock('portrait').catch(() => {});
    } catch (e) { /* unsupported — the layout already handles it */ }
  }

  startRun() {
    clearTimeout(this._overTimer);
    this._goFullscreen();
    this._resetRunState();
    this.ui.hideAll();
    this.ui.setHud(true);
    this.audio.resume();
    this.audio.startMusic(BIOMES[0].music);
    this.ui.banner(BIOMES[0]);
    if (!this.save.seen) {
      this.state = 'ready';
      this.ui.setTutorial(true);
    } else {
      this.state = 'running';
    }
  }

  beginAfterTutorial() {
    this.save.seen = true;
    this._writeSave();
    this.ui.setTutorial(false);
    this.state = 'running';
  }

  pauseGame() {
    if (this.state !== 'running') return;
    this.state = 'paused';
    this.ui.show('pause');
    this.audio.stopMusic();
  }

  resumeGame() {
    if (this.state !== 'paused') return;
    this.ui.hideAll();
    this.state = 'running';
    this.audio.startMusic(this.world.biome.music);
  }

  toMenu() {
    this.state = 'menu';
    this.audio.stopMusic();
    this.ui.setHud(false);
    this.ui.setTutorial(false);
    this.ui.show('menu');
    this._resetRunState(true);
  }

  gameOver(caught = false) {
    if (this.state === 'over') return;
    this.state = 'over';
    this.audio.stopMusic();
    this.audio.gameover();
    this.effects.burst(this.alien.root.position.x, this.p.floorY + this.p.dir * 1.1, this.p.z, this.p.flip ? 0xb44bff : 0xff3b3b, 60, 12);
    this.shake = 1.2;
    const isBest = this.score > this.save.best;
    if (isBest) this.save.best = this.score;
    if (this.distance > this.save.bestDist) this.save.bestDist = this.distance;
    this._writeSave();
    this.ui.setBest(this.save.best, this.save.bestDist);
    clearTimeout(this._overTimer);
    this._overTimer = setTimeout(() => {
      if (this.state !== 'over') return;
      this.ui.showGameOver(
        { score: this.score, distance: this.distance, orbs: this.orbs, bestCombo: this.bestCombo, worlds: this.worldsCleared },
        isBest, caught
      );
      this.ui.setHud(false);
    }, 900);
  }

  /* --------------------------------------------------------- actions */
  onAction(a) {
    if (this.state === 'ready') {
      if (a !== 'pause') this.beginAfterTutorial();
      return;
    }
    if (this.state === 'menu') {
      if (a === 'confirm' || a === 'jump') this.startRun();
      return;
    }
    if (this.state === 'over') {
      if (a === 'confirm' || a === 'jump') this.startRun();
      return;
    }
    if (this.state === 'paused') {
      if (a === 'pause' || a === 'confirm') this.resumeGame();
      return;
    }
    if (this.state !== 'running') return;

    const p = this.p;
    switch (a) {
      case 'left':
      case 'right': {
        // when inverted the camera is rolled, so screen-space stays intuitive
        let dir = a === 'left' ? -1 : 1;
        if (p.flip) dir *= -1;
        const next = clamp(p.lane + dir, 0, 2);
        if (next !== p.lane) {
          p.lane = next;
          p.lean = dir * (p.flip ? -1 : 1);
          this.audio.slide();
        }
        break;
      }
      case 'jump': {
        if (p.grounded) {
          p.vy = JUMP_VELOCITY;
          p.grounded = false;
          p.jumps = 1;
          p.sliding = false;
          this.audio.jump();
          this.effects.ring(p.x, p.floorY + p.dir * 0.1, p.z, this.world.biome.laneGlow, 4, 0.4);
        } else if (this.mods.doubleJump && p.jumps === 1) {
          p.vy = DOUBLE_JUMP_VELOCITY;
          p.jumps = 2;
          this.audio.jump();
          this.effects.burst(p.x, p.floorY + p.dir * (p.localY + 0.6), p.z, 0x7affd4, 16, 6);
        }
        break;
      }
      case 'slide': {
        if (!p.sliding) {
          p.sliding = true;
          p.slideT = SLIDE_TIME;
          if (!p.grounded) { p.vy = -JUMP_VELOCITY * 0.9; }
          this.audio.slide();
        }
        break;
      }
      case 'phase': this.togglePhase(); break;
      case 'overdrive': this.triggerOverdrive(); break;
      case 'pause': this.pauseGame(); break;
    }
  }

  togglePhase() {
    const p = this.p;
    p.phase = p.phase === 0 ? 1 : 0;
    const c = PHASE_COLORS[p.phase];
    this.alien.setPhaseColor(c);
    this.ui.setPhase(c);
    this.ui.flash();
    this.audio.phase();
    this.phaseGrace = this.mods.phaseGrace;
    this.effects.ring(p.x, p.floorY + p.dir * 1.0, p.z, c, 6, 0.45);
    this.effects.burst(p.x, p.floorY + p.dir * 1.0, p.z, c, 18, 6);
  }

  triggerOverdrive() {
    if (this.inOverdrive || this.overdrive < OVERDRIVE_MAX) return;
    this.inOverdrive = true;
    this.odTimer = OVERDRIVE_TIME + this.mods.odTime;
    this.overdrive = 0;
    this.alien.setOverdrive(true);
    this.audio.overdrive();
    this.ui.toast('TITAN OVERDRIVE', '#b44bff');
    this.shake = 0.6;
    this.effects.ring(this.p.x, this.p.floorY + this.p.dir * 1.1, this.p.z, 0xb44bff, 14, 0.7);
  }

  giveShield(t = 8) {
    this.shieldT = Math.max(this.shieldT, t);
  }

  /* ------------------------------------------------------------ loop */
  loop() {
    requestAnimationFrame(this.loop);
    let dt = Math.min(0.05, this.clock.getDelta());
    this._watchPerformance(dt);

    // slow-motion easing
    const targetScale = this.slowmo > 0 ? 0.45 : 1;
    this.timeScale += (targetScale - this.timeScale) * Math.min(1, dt * 9);
    if (this.slowmo > 0) this.slowmo -= dt;
    const sdt = dt * this.timeScale;

    this.audio.update(dt);

    if (this.state === 'running') this.updateRun(sdt);
    else if (this.state === 'ready') this.updateIdle(sdt, true);
    else if (this.state === 'menu') this.updateIdle(sdt, false);
    else if (this.state === 'over') this.updateDeath(sdt);

    this.effects.update(sdt);
    this.world.update(sdt, this.p ? this.p.z : 0, this.p ? this.p.x : 0, this.audio.beat);

    this.render();
  }

  /** Drops a quality tier automatically if the phone can't hold ~40fps. */
  _watchPerformance(dt) {
    if (dt <= 0) return;
    this._fps = this._fps === undefined ? 60 : this._fps + (1 / dt - this._fps) * 0.05;
    this._fpsTimer = (this._fpsTimer || 0) + dt;
    if (this.state !== 'running' || this._fpsTimer < 5) return;
    this._fpsTimer = 0;
    if (this._fps < 38 && this.settings.quality !== 'low') {
      const next = this.settings.quality === 'high' ? 'medium' : 'low';
      this.applySetting('quality', next);
      this.ui.syncSettings(this.settings);
      this.ui.toast(`GRAPHICS → ${next.toUpperCase()}`, '#8fa6c8');
    }
  }

  updateIdle(dt, tutorial) {
    // slow hero shot orbiting the alien
    this.demoT += dt;
    const p = this.p;
    p.z -= dt * 6;
    this.distance = 0;
    this.alien.root.position.set(p.x, 0, p.z);
    this.alien.root.rotation.y = 0;
    this.alien.update(dt, { speed: 12, grounded: true, sliding: false, vy: 0, hurt: 0, boost: false, lean: 0 });
    const a = tutorial ? 0 : Math.sin(this.demoT * 0.25) * 0.9;
    this.camera.up.set(0, 1, 0);
    this.camera.position.set(p.x + Math.sin(a) * 5.5, 2.6 + Math.sin(this.demoT * 0.5) * 0.4, p.z + Math.cos(a) * 6.5);
    this.camera.lookAt(p.x, 1.25, p.z - 1.2);
    this.blob.position.set(p.x, 0.03, p.z);
    this.blob.scale.setScalar(1);
    if (tutorial) this.spawner.update(p.z, 18, 0, this); // menu shot stays clean
    this.pool.cullBehind(p.z + 30);
    this.hunter.group.visible = false;
  }

  updateDeath(dt) {
    const p = this.p;
    this.alien.update(dt, { speed: 4, grounded: false, sliding: false, vy: -3, hurt: 0, boost: false, lean: 0 });
    this.camera.position.z += dt * 3;
    this.shake = Math.max(0, this.shake - dt * 1.6);
    this.applyShake();
  }

  updateRun(dt) {
    const p = this.p;
    this.runTime += dt;

    // ------------------------------------------------------------- speed
    const base = Math.min(MAX_SPEED, START_SPEED + SPEED_RAMP * this.runTime);
    const target = base * (this.inOverdrive ? 1.32 : 1);
    this.speed += (target - this.speed) * Math.min(1, dt * 2.4);
    this.audio.setIntensity(clamp((this.speed - START_SPEED) / (MAX_SPEED - START_SPEED), 0, 1));

    const advance = this.speed * dt;
    p.z -= advance;
    this.distance += advance;
    this.score += advance * 1.0 * this.multiplier * (this.x2T > 0 ? 2 : 1);

    // ------------------------------------------------------- lateral move
    const tx = LANE_X[p.lane];
    const dx = tx - p.x;
    p.x += clamp(dx, -LANE_CHANGE_SPEED * dt, LANE_CHANGE_SPEED * dt);
    p.lean += ((Math.abs(dx) > 0.05 ? Math.sign(dx) : 0) - p.lean) * Math.min(1, dt * 8);

    // ------------------------------------------------------------ vertical
    if (!p.grounded) {
      p.vy -= GRAVITY * dt;
      p.localY += p.vy * dt;
      if (p.localY <= 0) {
        p.localY = 0;
        p.vy = 0;
        if (!p.grounded) {
          this.audio.land();
          this.effects.burst(p.x, p.floorY, p.z, this.world.biome.laneGlow, 10, 4, 1.4);
        }
        p.grounded = true;
        p.jumps = 0;
      }
    }
    if (p.sliding) {
      p.slideT -= dt;
      if (p.slideT <= 0) p.sliding = false;
    }

    // -------------------------------------------------------- power timers
    if (this.shieldT > 0) this.shieldT -= dt;
    if (this.magnetT > 0) this.magnetT -= dt;
    if (this.x2T > 0) this.x2T -= dt;
    if (this.invuln > 0) this.invuln -= dt;
    if (this.phaseGrace > 0) this.phaseGrace -= dt;
    if (this.inOverdrive) {
      this.odTimer -= dt;
      if (this.odTimer <= 0) {
        this.inOverdrive = false;
        this.alien.setOverdrive(false);
        this.ui.toast('OVERDRIVE DEPLETED', '#8fa6c8');
      }
    }
    this.ui.hurt(this.invuln > 0);

    // --------------------------------------------------------- generation
    this.spawner.update(p.z, this.speed, this.distance, this);
    this.pool.cullBehind(p.z + 24);

    // ------------------------------------------------------------ entities
    this.updateEntities(dt);

    // -------------------------------------------------------------- hunter
    this.hunter.group.visible = true;
    const danger = this.hunter.update(dt, p, this.speed, this.camera);
    if (this.mods.hunterRecover) this.hunter.reward(this.mods.hunterRecover * dt);
    this.ui.warning(danger > 0.62);
    if (this.hunter.caught()) { this.gameOver(true); return; }

    // ------------------------------------------------------------- visuals
    const absY = p.floorY + p.dir * p.localY;
    this.alien.root.position.set(p.x, absY, p.z);
    this.alien.root.rotation.z = p.flip ? Math.PI : 0;
    this.alien.root.rotation.y = p.flip ? Math.PI * 0 : 0;
    this.alien.root.scale.set(1, 1, 1);
    this.alien.update(dt, {
      speed: this.speed, grounded: p.grounded, sliding: p.sliding, vy: p.vy,
      hurt: this.invuln > 0 ? this.invuln : 0, boost: this.inOverdrive, lean: p.lean,
    });

    this.shieldBubble.visible = this.shieldT > 0 || this.inOverdrive;
    if (this.shieldBubble.visible) {
      this.shieldBubble.position.set(p.x, absY + p.dir * 0.95, p.z);
      this.shieldBubble.material.color.setHex(this.inOverdrive ? 0xb44bff : 0x39c6ff);
      const s = 1 + Math.sin(this.runTime * 8) * 0.05;
      this.shieldBubble.scale.setScalar(s);
      this.shieldBubble.material.opacity = 0.18 + Math.sin(this.runTime * 7) * 0.06;
    }

    this.blob.position.set(p.x, p.floorY + p.dir * 0.04, p.z);
    this.blob.rotation.x = p.dir > 0 ? -Math.PI / 2 : Math.PI / 2;
    const shadowFade = clamp(1 - p.localY / 5, 0.12, 1);
    this.blob.material.opacity = 0.42 * shadowFade;
    this.blob.scale.setScalar(0.8 + (1 - shadowFade) * 0.5);

    this.updateCamera(dt);

    // --------------------------------------------------------------- combo
    this.multiplier = clamp(1 + Math.floor(this.comboCount / 12), 1, 8);
    this.bestCombo = Math.max(this.bestCombo, this.multiplier);

    this.ui.update({
      score: this.score, distance: this.distance, orbs: this.orbs, combo: this.multiplier,
      overdrive: (this.overdrive / OVERDRIVE_MAX) * 100, inOverdrive: this.inOverdrive,
    });
  }

  /* -------------------------------------------------------- entity pass */
  updateEntities(dt) {
    const p = this.p;
    const absY = p.floorY + p.dir * p.localY;
    const ph = (p.sliding ? PLAYER_SLIDE_HEIGHT : PLAYER_HEIGHT);
    const pcy = absY + p.dir * ph * 0.5;
    const phw = PLAYER_WIDTH * 0.5;
    const phh = ph * 0.5;
    const phd = PLAYER_DEPTH * 0.5;
    const magnetR = this.magnetT > 0 ? 7 : this.mods.magnetRadius;

    for (const e of this.pool.active) {
      if (e.dead) continue;
      const ez = e.mesh.position.z;
      const dz = ez - p.z;

      // -- animated behaviours -------------------------------------------
      switch (e.type) {
        case 'drone': {
          const o = e.data.osc;
          if (o) {
            e.mesh.position.x = o.base + Math.sin(this.runTime * o.speed + o.phase) * o.amp;
            e.mesh.rotation.y = Math.sin(this.runTime * o.speed + o.phase) * 0.4;
          }
          e.mesh.userData.rotors.rotation.y += dt * 26;
          break;
        }
        case 'phasewall': {
          const passable = e.phase === p.phase || this.phaseGrace > 0 || this.inOverdrive;
          const f = e.mesh.userData.field;
          const g = e.mesh.userData.grid;
          const targetOp = passable ? 0.08 : 0.45;
          f.material.opacity += (targetOp - f.material.opacity) * Math.min(1, dt * 8);
          g.material.opacity += ((passable ? 0.18 : 0.9) - g.material.opacity) * Math.min(1, dt * 8);
          g.rotation.z = Math.sin(this.runTime * 1.5 + ez) * 0.02;
          break;
        }
        case 'orb': {
          e.mesh.rotation.y += dt * 3;
          e.mesh.position.y += Math.sin(this.runTime * 4 + ez) * dt * 0.4;
          break;
        }
        case 'shield': case 'magnet': case 'x2': case 'core': {
          e.mesh.rotation.y += dt * 1.8;
          e.mesh.userData.shell.rotation.x += dt * 1.1;
          break;
        }
        case 'pad': {
          e.mesh.userData.ring.scale.setScalar(1 + Math.sin(this.runTime * 5 + ez) * 0.08);
          break;
        }
        case 'warp': {
          e.mesh.userData.ring.rotation.z += dt * 0.8;
          e.mesh.userData.swirl.rotation.z -= dt * 2.2;
          e.mesh.userData.inner.material.opacity = 0.18 + Math.sin(this.runTime * 4) * 0.08;
          break;
        }
        case 'flip': {
          e.mesh.userData.frame.rotation.z += dt * 1.4;
          break;
        }
      }

      if (dz > 6 || dz < -90) continue;

      // -- magnet ---------------------------------------------------------
      if (magnetR > 0 && PICKUPS.has(e.type) && dz > -22 && dz < 3) {
        const d = Math.hypot(e.mesh.position.x - p.x, e.mesh.position.y - (absY + p.dir * 1.0));
        if (d < magnetR) {
          e.mesh.position.x += (p.x - e.mesh.position.x) * Math.min(1, dt * 6);
          e.mesh.position.y += (absY + p.dir * 1.0 - e.mesh.position.y) * Math.min(1, dt * 6);
        }
      }

      if (!e.box) continue;
      const ecy = e.mesh.position.y + (e.flip ? -e.box.cy : e.box.cy);
      const overlapX = Math.abs(e.mesh.position.x - p.x) < phw + e.box.hw;
      const overlapY = Math.abs(ecy - pcy) < phh + e.box.hh;
      const overlapZ = Math.abs(dz) < phd + e.box.hd;
      const hit = overlapX && overlapY && overlapZ;

      // -- triggers -------------------------------------------------------
      if (e.type === 'warp') {
        if (!e.hit && dz > -0.5) {
          e.hit = true;
          this.enterBiome(e.data.biome);
        }
        continue;
      }
      if (e.type === 'flip') {
        if (!e.hit && dz > -0.5 && Math.abs(e.mesh.position.x - p.x) < 6) {
          e.hit = true;
          this.setFlip(e.data.flip);
        }
        continue;
      }
      if (e.type === 'pad') {
        if (!e.hit && hit) {
          e.hit = true;
          p.vy = JUMP_VELOCITY * 1.45;
          p.grounded = false;
          p.jumps = 1;
          this.audio.power();
          this.effects.ring(e.mesh.position.x, e.mesh.position.y, ez, 0x39ff9e, 9, 0.5);
          this.ui.toast('LAUNCH', '#39ff9e');
        }
        continue;
      }

      // -- pickups ---------------------------------------------------------
      if (PICKUPS.has(e.type)) {
        if (!e.hit && hit) {
          e.hit = true;
          this.collect(e);
        }
        continue;
      }

      // -- hazards ----------------------------------------------------------
      if (HAZARDS.has(e.type)) {
        let solid = true;
        if (e.type === 'phasewall') solid = !(e.phase === p.phase || this.phaseGrace > 0);
        if (this.inOverdrive) solid = false; // Titan form ignores everything

        if (hit && !e.hit) {
          e.hit = true;
          if (this.inOverdrive && SMASHABLE.has(e.type)) {
            this.smash(e);
          } else if (!solid) {
            this.registerCloseCall(e, true);
          } else {
            this.damage(e);
          }
        } else if (!hit && !e.hit && dz > 0.6) {
          // passed cleanly — check for a skim
          e.hit = true;
          const lateral = Math.abs(e.mesh.position.x - p.x) - (phw + e.box.hw);
          const vertical = Math.abs(ecy - pcy) - (phh + e.box.hh);
          const margin = CLOSE_CALL_MARGIN + this.mods.closeCallMargin;
          if ((lateral > 0 && lateral < margin) || (vertical > 0 && vertical < margin)) {
            this.registerCloseCall(e, false);
          }
        }
      }
    }
  }

  collect(e) {
    const p = this.p;
    const pos = e.mesh.position;
    switch (e.type) {
      case 'orb': {
        this.orbs++;
        this.comboCount++;
        const val = 12 * this.mods.orbValue * this.multiplier * (this.x2T > 0 ? 2 : 1);
        this.score += val;
        this.overdrive = Math.min(OVERDRIVE_MAX, this.overdrive + OVERDRIVE_GAIN_PER_ORB * this.mods.odGain);
        this.audio.orb();
        this.effects.burst(pos.x, pos.y, pos.z, 0xffd23f, 6, 4, 0.7);
        break;
      }
      case 'shield':
        this.giveShield(9);
        this.ui.toast('SHIELD ONLINE', '#39c6ff');
        this.audio.power();
        break;
      case 'magnet':
        this.magnetT = 10;
        this.ui.toast('ORB MAGNET', '#ff8a3d');
        this.audio.power();
        break;
      case 'x2':
        this.x2T = 12;
        this.ui.toast('DOUBLE SCORE', '#b44bff');
        this.audio.power();
        break;
      case 'core':
        this.overdrive = Math.min(OVERDRIVE_MAX, this.overdrive + 34 * this.mods.odGain);
        this.score += 150 * this.multiplier;
        this.ui.toast('POWER CORE +150', '#39ff9e');
        this.audio.power();
        break;
    }
    if (e.type !== 'orb') this.effects.ring(pos.x, pos.y, pos.z, 0xffffff, 5, 0.4);
    this.pool.release(e);
  }

  smash(e) {
    const pos = e.mesh.position;
    this.effects.burst(pos.x, pos.y + 1, pos.z, 0xb44bff, 26, 10);
    this.effects.ring(pos.x, pos.y + 1, pos.z, 0xff3ea5, 7, 0.4);
    this.audio.smash();
    this.score += 45 * this.multiplier;
    this.comboCount += 2;
    this.shake = Math.max(this.shake, 0.28);
    this.ui.toast('SMASH +45', '#ff3ea5');
    this.pool.release(e);
  }

  registerCloseCall(e, throughPhase) {
    const pts = (throughPhase ? 40 : CLOSE_CALL_POINTS) * this.mods.closeCallMult * this.multiplier;
    this.score += pts;
    this.comboCount += 1;
    this.overdrive = Math.min(OVERDRIVE_MAX, this.overdrive + (throughPhase ? 2.5 : 4) * this.mods.odGain + this.mods.closeCallCharge);
    this.slowmo = Math.max(this.slowmo, (throughPhase ? 0.12 : 0.2) + this.mods.slowmoBonus);
    this.audio.closeCall();
    this.ui.toast(throughPhase ? `PHASE THROUGH +${Math.round(pts)}` : `CLOSE CALL +${Math.round(pts)}`,
      throughPhase ? '#2ff5ff' : '#39ff9e');
  }

  damage(e) {
    const p = this.p;
    if (this.invuln > 0) return;
    if (this.shieldT > 0) {
      this.shieldT = 0;
      this.invuln = 0.9;
      this.audio.smash();
      this.effects.ring(p.x, p.floorY + p.dir * 1.1, p.z, 0x39c6ff, 8, 0.4);
      this.ui.toast('SHIELD ABSORBED', '#39c6ff');
      this.pool.release(e);
      return;
    }
    this.integrity--;
    this.invuln = INVULN_TIME;
    this.comboCount = 0;
    this.speed *= 0.62;
    this.hunter.penalise();
    this.shake = 0.9;
    this.audio.hit();
    this.effects.burst(p.x, p.floorY + p.dir * 1.1, p.z, 0xff3b3b, 30, 9);
    this.ui.setIntegrity(this.integrity);
    this.ui.toast('CORE DAMAGED', '#ff3b3b');
    if (navigator.vibrate) navigator.vibrate(60);
    if (this.integrity <= 0) this.gameOver(false);
  }

  /* ------------------------------------------------------- transitions */
  enterBiome(index) {
    const b = BIOMES[index];
    this.world.applyBiome(b);
    this.audio.setBiome(b.music);
    this.audio.warp();
    this.ui.flash();
    this.ui.banner(b);
    this.effects.ring(this.p.x, this.p.floorY + 2, this.p.z - 2, b.accent, 22, 0.9);
    this.worldsCleared++;
    this.score += 500 * this.multiplier;
    this.ui.toast('WORLD CLEARED +500', '#ffd23f');
    if (this.mods.worldShield) this.giveShield(6);
    this.offerMutation();
  }

  offerMutation() {
    this.state = 'mutation';
    this.audio.stopMusic();
    this.ui.offerMutations(this.ownedMutations, (m) => {
      this.ownedMutations.add(m.id);
      m.apply(this);
      this.ui.hideAll();
      this.state = 'running';
      this.audio.startMusic(this.world.biome.music);
      this.ui.toast(`${m.name} ACQUIRED`, m.color);
      this.audio.power();
    });
  }

  setFlip(on) {
    const p = this.p;
    if (p.flip === on) return;
    const absY = p.floorY + p.dir * p.localY;
    p.flip = on;
    p.dir = on ? -1 : 1;
    p.floorY = on ? CEILING_Y : 0;
    p.localY = Math.max(0, p.dir * (absY - p.floorY));
    p.vy = 0;
    p.grounded = false;
    p.jumps = 1;
    this.audio.flip();
    this.ui.toast(on ? 'GRAVITY INVERTED' : 'GRAVITY RESTORED', '#b44bff');
    this.effects.ring(p.x, absY, p.z, 0xb44bff, 12, 0.6);
    this.shake = 0.4;
  }

  /* ------------------------------------------------------------ camera */
  updateCamera(dt) {
    const p = this.p;
    this.flipRoll += ((p.flip ? Math.PI : 0) - this.flipRoll) * Math.min(1, dt * 4.5);
    const roll = this.flipRoll;
    this.camera.up.set(Math.sin(roll), Math.cos(roll), 0);

    const dir = p.dir;
    const planeY = p.floorY;
    const heightOffset = 3.15 + Math.min(1.1, p.localY * 0.22);
    const targetY = planeY + dir * heightOffset;
    const targetX = p.x * 0.62;
    const targetZ = p.z + 7.4 + this.speed * 0.045;

    const k = Math.min(1, dt * 7.5);
    this.camera.position.x += (targetX - this.camera.position.x) * k;
    this.camera.position.y += (targetY - this.camera.position.y) * Math.min(1, dt * 5.2);
    this.camera.position.z += (targetZ - this.camera.position.z) * Math.min(1, dt * 12);

    const lookY = planeY + dir * (1.4 + Math.min(1.4, p.localY * 0.4));
    this.camera.lookAt(p.x * 0.8, lookY, p.z - 10);

    const fovTarget = 68 + clamp((this.speed - START_SPEED) / (MAX_SPEED - START_SPEED), 0, 1) * 14 + (this.inOverdrive ? 6 : 0);
    this.camera.fov += (fovTarget - this.camera.fov) * Math.min(1, dt * 3);
    this.camera.updateProjectionMatrix();

    this.shake = Math.max(0, this.shake - dt * 2.2);
    this.applyShake();
  }

  applyShake() {
    if (this.settings.shake === 'off' || this.shake <= 0) return;
    const s = this.shake * this.shake * 0.55;
    this.camera.position.x += rand(-s, s);
    this.camera.position.y += rand(-s, s);
    this.camera.rotation.z += rand(-s, s) * 0.12;
  }

  render() {
    if (this.bloom) {
      const boost = this.inOverdrive ? 1.15 : 0.62;
      this.bloom.strength += (boost - this.bloom.strength) * 0.08;
    }
    if (this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }
}
