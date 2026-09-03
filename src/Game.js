import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { Player } from './Player.js';
import { World, LANES } from './World.js';
import { Effects } from './Effects.js';
import { Input } from './Input.js';
import { t, getLang, toggleLang, applyTranslations, setLang } from './i18n.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ui = {};
    this.state = 'menu';
    this.score = 0;
    this.best = Number(localStorage.getItem('nexus-best') || 0);
    this.combo = 1;
    this.dna = 0;
    this.lives = 3;
    this.laneIndex = 1;
    this.targetLaneX = 0;
    this.gravityPulseUntil = 0;
    this.gravityScale = 1;
    this.cameraShake = 0;
    this.invulnerableUntil = 0;
    this.clock = new THREE.Clock();
    this.startTime = 0;
    this.lastScoreDisplay = -1;

    this.initThree();
    this.initUI();
    this.input = new Input(this);
    this.renderer.setAnimationLoop(() => this.loop());
  }

  initThree() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x060a18);
    this.scene.fog = new THREE.Fog(0x0b0e2a, 8, 95);

    this.camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 200);
    this.camera.position.set(0, 4.6, 9.6);
    this.camera.lookAt(0, 1.7, -10);

    // lights
    const hemi = new THREE.HemisphereLight(0xbcd3ff, 0x101020, 1.1);
    this.scene.add(hemi);

    const dir = new THREE.DirectionalLight(0xffffff, 1.7);
    dir.position.set(8, 16, -6);
    dir.castShadow = true;
    dir.shadow.mapSize.set(2048, 2048);
    dir.shadow.camera.left = -18;
    dir.shadow.camera.right = 18;
    dir.shadow.camera.top = 18;
    dir.shadow.camera.bottom = -18;
    dir.shadow.camera.far = 60;
    this.scene.add(dir);

    const playerLight = new THREE.PointLight(0x36e0ff, 12, 12, 2);
    this.playerLight = playerLight;
    this.scene.add(playerLight);

    // postprocessing
    this.composer = new EffectComposer(this.renderer);
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);
    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 0.85, 0.75, 0.34);
    this.composer.addPass(this.bloomPass);

    window.addEventListener('resize', () => this.onResize());

    this.world = new World(this.scene);
    this.player = new Player(this.scene);
    this.effects = new Effects(this.scene);
  }

  initUI() {
    const el = (id) => document.getElementById(id);
    this.ui = {
      menu: el('menu'),
      gameover: el('gameover'),
      hud: el('hud'),
      score: el('score'),
      distance: el('distance'),
      combo: el('combo'),
      dna: el('dna'),
      finalScore: el('final-score'),
      finalDistance: el('final-distance'),
      finalDna: el('final-dna'),
      lives: el('lives'),
      btnStart: el('btn-start'),
      btnRestart: el('btn-restart'),
      btnMenu: el('btn-menu'),
      btnLang: el('btn-lang'),
      toast: el('toast'),
      formPlasma: el('form-plasma'),
      formCrystal: el('form-crystal'),
      formShadow: el('form-shadow'),
    };

    setLang(getLang());
    this.ui.btnLang.textContent = getLang() === 'en' ? 'عربي' : 'EN';
    this.ui.btnLang.addEventListener('click', () => {
      const next = toggleLang();
      this.ui.btnLang.textContent = next === 'en' ? 'عربي' : 'EN';
    });

    this.ui.btnStart.addEventListener('click', () => this.start());
    this.ui.btnRestart.addEventListener('click', () => this.start());
    this.ui.btnMenu.addEventListener('click', () => this.toMenu());

    for (const [id, form] of Object.entries({
      formPlasma: 'plasma',
      formCrystal: 'crystal',
      formShadow: 'shadow',
    })) {
      if (this.ui[id]) {
        this.ui[id].addEventListener('click', (e) => {
          e.stopPropagation();
          if (this.state === 'play') this.setForm(form);
        });
      }
    }

    applyTranslations();
  }

  onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
    this.bloomPass.setSize(w, h);
  }

  start() {
    this.clearWorld();
    this.state = 'play';
    this.score = 0;
    this.combo = 1;
    this.dna = 0;
    this.lives = 3;
    this.laneIndex = 1;
    this.targetLaneX = 0;
    this.player.setForm('crystal');
    this.player.y = this.player.baseY;
    this.player.vy = 0;
    this.world.distance = 0;
    this.world.themeChangeDistance = 350;
    this.world.applyTheme(0, true);
    this.gravityPulseUntil = 0;
    this.gravityScale = 1;
    this.invulnerableUntil = 0;
    this.startTime = performance.now();
    this.ui.menu.classList.add('hidden');
    this.ui.gameover.classList.add('hidden');
    this.ui.hud.classList.remove('hidden');
    this.setForm('crystal', true);
    this.updateUI();
    this.time = 0;
  }

  clearWorld() {
    for (const o of this.world.obstacles) {
      this.scene.remove(o.mesh);
      o.mesh.geometry.dispose();
      o.mesh.material.dispose();
    }
    this.world.obstacles = [];
    for (const c of this.world.collectibles) {
      this.scene.remove(c.mesh);
      c.mesh.geometry.dispose();
      c.mesh.material.dispose();
    }
    this.world.collectibles = [];
  }

  toMenu() {
    this.state = 'menu';
    this.ui.menu.classList.remove('hidden');
    this.ui.gameover.classList.add('hidden');
    this.ui.hud.classList.add('hidden');
    this.player.y = this.player.baseY;
    this.player.vy = 0;
    this.targetLaneX = 0;
  }

  moveLane(dir) {
    if (this.state !== 'play') return;
    this.laneIndex = Math.max(0, Math.min(2, this.laneIndex + dir));
    this.targetLaneX = LANES[this.laneIndex];
  }

  jump() {
    if (this.state !== 'play') return;
    this.player.jump();
  }

  slide(active) {
    if (this.state !== 'play') return;
    this.player.slide(active);
  }

  setForm(form, force = false) {
    if (this.state !== 'play' && !force) return;
    this.player.setForm(form);
    this.ui.formPlasma.classList.toggle('active', form === 'plasma');
    this.ui.formCrystal.classList.toggle('active', form === 'crystal');
    this.ui.formShadow.classList.toggle('active', form === 'shadow');
  }

  addScore(v) {
    this.score += v;
  }

  handleWorldEvents() {
    for (const ev of this.world.consumeEvents()) {
      if (ev.type === 'collect') {
        if (ev.kind === 'dna') {
          this.dna += 1;
          this.addScore(30 * this.combo);
          this.effects.burst(ev.pos, 0x7dff9b, 10, 0.7);
        } else {
          this.addScore(25 * this.combo);
          this.effects.burst(ev.pos, 0x36e0ff, 10, 0.7);
        }
      } else if (ev.type === 'shift') {
        this.addScore(40 * this.combo);
        this.combo = Math.min(9, this.combo + 1);
        this.effects.burst(ev.pos, this.player.mats.glow.emissive.getHex(), 18, 1.1);
        this.updateCombo();
      } else if (ev.type === 'near') {
        this.addScore(15 * this.combo);
        this.combo = Math.min(9, this.combo + 1);
        this.effects.nearMiss(new THREE.Vector3(this.targetLaneX, 1.6, 0), 0xffd166);
        this.toast(t('near_miss'));
        this.updateCombo();
      } else if (ev.type === 'hit') {
        this.onHit(ev.pos);
      } else if (ev.type === 'theme') {
        this.toast(t('levelup') + ': ' + (getLang() === 'en' ? ev.theme.name_en : ev.theme.name_ar));
        if (Math.random() < 0.5) {
          this.gravityPulseUntil = this.time + 3.2;
          this.toast(t('gravity'));
        }
      }
    }
  }

  updateCombo() {
    this.ui.combo.textContent = '×' + this.combo;
    this.ui.combo.classList.remove('pop');
    void this.ui.combo.offsetWidth;
    this.ui.combo.classList.add('pop');
  }

  onHit(pos) {
    if (this.time < this.invulnerableUntil) return;
    if (pos) this.effects.burst(pos, 0xff3d3d, 26, 1.5);
    this.cameraShake = 0.6;
    this.lives -= 1;
    this.combo = 1;
    this.invulnerableUntil = this.time + 1.2;
    this.updateCombo();
    this.updateUI();
    if (this.lives <= 0) {
      this.gameOver();
    } else {
      this.toast(t('hit') + ' · ❤' + this.lives);
    }
  }

  gameOver() {
    this.state = 'over';
    this.gravityPulseUntil = 0;
    this.best = Math.max(this.best, Math.floor(this.score));
    localStorage.setItem('nexus-best', String(this.best));
    this.ui.finalScore.textContent = Math.floor(this.score);
    this.ui.finalDistance.textContent = Math.floor(this.world.distance);
    this.ui.finalDna.textContent = this.dna;
    this.ui.gameover.classList.remove('hidden');
    this.ui.hud.classList.add('hidden');
    this.effects.burst(new THREE.Vector3(this.player.group.position.x, 1.6, 0), 0xff5c3d, 40, 2);
  }

  toast(msg) {
    this.ui.toast.textContent = msg;
    this.ui.toast.classList.add('show');
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => this.ui.toast.classList.remove('show'), 1400);
  }

  updateUI() {
    const s = Math.floor(this.score);
    if (s !== this.lastScoreDisplay) {
      this.ui.score.textContent = s;
      this.lastScoreDisplay = s;
    }
    this.ui.distance.textContent = Math.floor(this.world.distance);
    this.ui.combo.textContent = '×' + this.combo;
    this.ui.dna.textContent = this.dna;
    const hearts = '❤'.repeat(Math.max(0, this.lives)) + '🖤'.repeat(Math.max(0, 3 - this.lives));
    if (this.ui.lives) this.ui.lives.textContent = hearts;
  }

  loop() {
    const dt = Math.min(0.033, this.clock.getDelta());
    this.time += dt;

    const running = this.state === 'play';

    // gravity pulse
    this.gravityScale = this.time < this.gravityPulseUntil ? 0.58 : 1;

    this.player.update(dt, running, this.time, this.gravityScale, this.player.group.position.x, this.targetLaneX);
    const playerState = {
      x: this.player.group.position.x,
      y: this.player.group.position.y,
      z: 0,
      form: this.player.form,
      sliding: this.player.slideActive,
    };

    if (running) {
      this.world.update(dt, playerState, this.time);
      this.handleWorldEvents();
    }

    // effects
    this.effects.update(dt);
    if (running) {
      const trailColor = this.player.mats.glow.emissive.getHex();
      if (Math.random() < 0.8) {
        this.effects.spawnTrail(
          this.player.trailSpawn.getWorldPosition(new THREE.Vector3()),
          trailColor
        );
      }
      this.playerLight.color.setHex(trailColor);
      this.playerLight.position.set(
        this.player.group.position.x,
        this.player.group.position.y + 1,
        this.player.group.position.z
      );
    }

    // camera follow + shake
    const shakeX = this.cameraShake > 0 ? (Math.random() - 0.5) * this.cameraShake : 0;
    const shakeY = this.cameraShake > 0 ? (Math.random() - 0.5) * this.cameraShake : 0;
    if (this.cameraShake > 0) this.cameraShake = Math.max(0, this.cameraShake - dt * 2.2);
    const tilt = this.gravityScale < 1 ? 0.15 : 0;
    this.camera.position.x = THREE.MathUtils.lerp(
      this.camera.position.x,
      this.player.group.position.x * 0.55 + shakeX,
      1 - Math.pow(0.01, dt)
    );
    this.camera.position.y = 4.6 + shakeY;
    this.camera.position.z = 9.6 - Math.sin(this.time * 0.7) * 0.25;
    this.camera.lookAt(this.player.group.position.x * 0.65, 1.75, -10);
    this.camera.rotateZ(tilt);

    if (running) this.updateUI();

    this.composer.render();
  }
}
