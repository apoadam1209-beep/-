// All DOM/HUD plumbing lives here so the 3D layer stays clean.
import { BIOMES } from './biomes.js';
import { MUTATIONS } from './mutations.js';

const $ = (id) => document.getElementById(id);

export class UI {
  constructor(handlers) {
    this.h = handlers;
    this.el = {
      hud: $('hud'), score: $('score'), distance: $('distance'), orbs: $('orbs'), combo: $('combo'),
      integrity: $('integrity'), odFill: $('od-fill'), btnPhase: $('btn-phase'), btnOd: $('btn-overdrive'),
      banner: $('biome-banner'), warning: $('reaper-warning'), toast: $('toast-stack'),
      flash: $('phase-flash'), vignette: $('damage-vignette'),
      loading: $('loading'), loadingText: $('loading-text'),
      menu: $('menu'), how: $('how'), worlds: $('worlds'), settings: $('settings'),
      pause: $('pause'), mutation: $('mutation'), mutCards: $('mut-cards'), gameover: $('gameover'),
      tutorial: $('tutorial'),
      bestScore: $('best-score'), bestDist: $('best-dist'),
      goScore: $('go-score'), goDist: $('go-dist'), goOrbs: $('go-orbs'), goCombo: $('go-combo'),
      goWorlds: $('go-worlds'), goNewBest: $('go-new-best'), goTitle: $('go-title'),
    };
    this.pips = [];
    this._wire();
    this._buildWorlds();
  }

  _wire() {
    $('btn-play').onclick = () => this.h.play();
    $('btn-how').onclick = () => this.show('how');
    $('btn-worlds').onclick = () => this.show('worlds');
    $('btn-settings').onclick = () => this.show('settings');
    for (const b of document.querySelectorAll('.back-btn')) b.onclick = () => this.show('menu');
    $('btn-pause').onclick = () => this.h.pause();
    $('btn-resume').onclick = () => this.h.resume();
    $('pause').addEventListener('pointerdown', (e) => { if (e.target === $('pause')) this.h.resume(); });
    $('btn-restart').onclick = () => this.h.play();
    $('btn-quit').onclick = () => this.h.quit();
    $('btn-again').onclick = () => this.h.play();
    $('btn-menu').onclick = () => this.h.quit();

    this.el.btnPhase.addEventListener('pointerdown', (e) => { e.stopPropagation(); this.h.phase(); });
    this.el.btnOd.addEventListener('pointerdown', (e) => { e.stopPropagation(); this.h.overdrive(); });

    const seg = (id, key) => {
      const wrap = $(id);
      for (const b of wrap.querySelectorAll('button')) {
        b.onclick = () => {
          for (const o of wrap.querySelectorAll('button')) o.classList.remove('active');
          b.classList.add('active');
          this.h.setting(key, b.dataset.v);
        };
      }
    };
    seg('seg-quality', 'quality');
    seg('seg-sound', 'sound');
    seg('seg-shake', 'shake');
    seg('seg-hand', 'hand');
  }

  syncSettings(s) {
    const set = (id, v) => {
      const wrap = $(id);
      for (const b of wrap.querySelectorAll('button')) b.classList.toggle('active', b.dataset.v === String(v));
    };
    set('seg-quality', s.quality);
    set('seg-sound', s.sound);
    set('seg-shake', s.shake);
    set('seg-hand', s.hand);
    document.body.classList.toggle('lefty', s.hand === 'on');
  }

  _buildWorlds() {
    const list = $('world-list');
    list.innerHTML = '';
    BIOMES.forEach((b, i) => {
      const card = document.createElement('div');
      card.className = 'world-card';
      const hex = '#' + b.accent.toString(16).padStart(6, '0');
      card.innerHTML = `<div class="world-dot" style="background:${hex};color:${hex}"></div>
        <div><div class="wn">${i + 1}. ${b.name}</div><div class="wt">${b.tag}</div></div>`;
      list.appendChild(card);
    });
  }

  show(name) {
    for (const k of ['loading', 'menu', 'how', 'worlds', 'settings', 'pause', 'mutation', 'gameover']) {
      this.el[k].classList.toggle('hidden', k !== name);
    }
    if (name === null) return;
  }

  hideAll() {
    for (const k of ['loading', 'menu', 'how', 'worlds', 'settings', 'pause', 'mutation', 'gameover']) {
      this.el[k].classList.add('hidden');
    }
  }

  setHud(visible) { this.el.hud.classList.toggle('hidden', !visible); }
  setTutorial(visible) { this.el.tutorial.classList.toggle('hidden', !visible); }

  buildIntegrity(max) {
    this.el.integrity.innerHTML = '';
    this.pips = [];
    for (let i = 0; i < max; i++) {
      const p = document.createElement('div');
      p.className = 'core-pip';
      this.el.integrity.appendChild(p);
      this.pips.push(p);
    }
  }

  setIntegrity(v) {
    this.pips.forEach((p, i) => p.classList.toggle('dead', i >= v));
  }

  update(s) {
    this.el.score.textContent = Math.floor(s.score).toLocaleString('en-US');
    this.el.distance.textContent = `${Math.floor(s.distance)} m`;
    this.el.orbs.textContent = `◆ ${s.orbs}`;
    const showCombo = s.combo > 1;
    this.el.combo.classList.toggle('hidden', !showCombo);
    if (showCombo) this.el.combo.textContent = `x${s.combo}`;
    this.el.odFill.style.width = `${s.overdrive}%`;
    const ready = s.overdrive >= 100 && !s.inOverdrive;
    this.el.btnOd.classList.toggle('disabled', !ready && !s.inOverdrive);
    this.el.btnOd.classList.toggle('ready', ready);
  }

  setPhase(hex) {
    const css = '#' + hex.toString(16).padStart(6, '0');
    this.el.btnPhase.style.setProperty('--phase-glow', css);
    this.el.btnPhase.querySelector('.btn-glyph').style.color = css;
  }

  flash() {
    this.el.flash.classList.remove('fire');
    void this.el.flash.offsetWidth;
    this.el.flash.classList.add('fire');
  }

  hurt(on) { this.el.vignette.classList.toggle('hurt', on); }

  banner(biome) {
    const b = this.el.banner;
    const hex = '#' + biome.accent.toString(16).padStart(6, '0');
    b.querySelector('.banner-name').textContent = biome.name;
    b.querySelector('.banner-name').style.color = hex;
    b.querySelector('.banner-tag').textContent = biome.tag;
    b.classList.add('show');
    clearTimeout(this._bt);
    this._bt = setTimeout(() => b.classList.remove('show'), 2600);
  }

  toast(text, color = '#ffffff') {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = text;
    t.style.color = color;
    this.el.toast.appendChild(t);
    setTimeout(() => t.remove(), 1100);
  }

  warning(on) { this.el.warning.classList.toggle('show', on); }

  offerMutations(owned, onPick) {
    const pool = MUTATIONS.filter((m) => !owned.has(m.id) || m.repeatable);
    const picks = [];
    const bag = [...pool];
    while (picks.length < 3 && bag.length) {
      picks.push(bag.splice((Math.random() * bag.length) | 0, 1)[0]);
    }
    if (!picks.length) return false; // deck exhausted — caller keeps running
    this.el.mutCards.innerHTML = '';
    for (const m of picks) {
      const card = document.createElement('div');
      card.className = 'mut-card';
      card.innerHTML = `<div class="mut-icon" style="color:${m.color}">${m.icon}</div>
        <div><div class="mut-name" style="color:${m.color}">${m.name}</div><div class="mut-desc">${m.desc}</div></div>`;
      const choose = () => onPick(m);
      card.onclick = choose;
      card.addEventListener('touchend', (e) => { e.preventDefault(); choose(); }, { passive: false });
      this.el.mutCards.appendChild(card);
    }
    const skip = document.createElement('button');
    skip.className = 'ghost-btn wide';
    skip.textContent = 'SKIP — KEEP RUNNING';
    const doSkip = () => onPick(null);
    skip.onclick = doSkip;
    skip.addEventListener('touchend', (e) => { e.preventDefault(); doSkip(); }, { passive: false });
    this.el.mutCards.appendChild(skip);
    this.show('mutation');
    return true;
  }

  showGameOver(s, best, caught) {
    this.el.goTitle.textContent = caught ? 'CAPTURED BY THE REAPER' : 'RUN TERMINATED';
    this.el.goScore.textContent = Math.floor(s.score).toLocaleString('en-US');
    this.el.goDist.textContent = `${Math.floor(s.distance)} m`;
    this.el.goOrbs.textContent = s.orbs;
    this.el.goCombo.textContent = `x${s.bestCombo}`;
    this.el.goWorlds.textContent = s.worlds;
    this.el.goNewBest.classList.toggle('hidden', !best);
    this.show('gameover');
  }

  setBest(score, dist) {
    this.el.bestScore.textContent = Math.floor(score).toLocaleString('en-US');
    this.el.bestDist.textContent = `${Math.floor(dist)} m`;
  }
}
