// Fully synthesised audio (no files): adaptive per-biome music bed with a
// pulse the visuals lock onto, plus reactive SFX.
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.beat = 0;
    this.bpm = 128;
    this._step = 0;
    this._nextNoteTime = 0;
    this.scaleName = 'crystal';
    this.intensity = 0;
  }

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { this.enabled = false; return; }
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.55;
    this.master.connect(this.ctx.destination);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.0;
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 8;
    this.musicGain.connect(comp);
    comp.connect(this.master);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.85;
    this.sfxGain.connect(this.master);

    // reusable noise buffer
    const len = this.ctx.sampleRate * 1.2;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  resume() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  setMuted(m) {
    this.enabled = !m;
    if (this.master) this.master.gain.value = m ? 0 : 0.55;
  }

  startMusic(scaleName) {
    this.resume();
    if (!this.ctx) return;
    this.scaleName = scaleName || this.scaleName;
    this._nextNoteTime = this.ctx.currentTime + 0.1;
    this._step = 0;
    this.musicGain.gain.cancelScheduledValues(this.ctx.currentTime);
    this.musicGain.gain.setTargetAtTime(0.5, this.ctx.currentTime, 0.6);
    this.playing = true;
  }

  stopMusic() {
    if (!this.ctx) return;
    this.playing = false;
    this.musicGain.gain.setTargetAtTime(0.0, this.ctx.currentTime, 0.25);
  }

  setBiome(name) { this.scaleName = name; }
  setIntensity(v) { this.intensity = v; this.bpm = 122 + v * 34; }

  _scale() {
    const scales = {
      crystal: [0, 3, 5, 7, 10, 12, 15, 14],
      city: [0, 2, 3, 7, 9, 10, 12, 14],
      jungle: [0, 2, 4, 7, 9, 12, 14, 16],
      magma: [0, 1, 5, 6, 8, 12, 13, 17],
      ice: [0, 4, 7, 11, 12, 14, 16, 19],
    };
    return scales[this.scaleName] || scales.crystal;
  }

  _root() {
    const roots = { crystal: 55, city: 49, jungle: 58, magma: 46, ice: 62 };
    return roots[this.scaleName] || 55;
  }

  _note(midi, time, dur, type, gain, detune = 0) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = 440 * Math.pow(2, (midi - 69) / 12);
    o.detune.value = detune;
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(gain, time + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    o.connect(g);
    g.connect(this.musicGain);
    o.start(time);
    o.stop(time + dur + 0.05);
  }

  _kick(time) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(150, time);
    o.frequency.exponentialRampToValueAtTime(42, time + 0.13);
    g.gain.setValueAtTime(0.9, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.24);
    o.connect(g); g.connect(this.musicGain);
    o.start(time); o.stop(time + 0.3);
  }

  _hat(time, open = false) {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 7200;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(open ? 0.16 : 0.09, time);
    g.gain.exponentialRampToValueAtTime(0.0005, time + (open ? 0.18 : 0.05));
    s.connect(f); f.connect(g); g.connect(this.musicGain);
    s.start(time); s.stop(time + 0.25);
  }

  /** call every frame */
  update(dt) {
    if (!this.ctx || !this.playing) { this.beat *= Math.max(0, 1 - dt * 4); return; }
    const spb = 60 / this.bpm / 2; // 8th notes
    while (this._nextNoteTime < this.ctx.currentTime + 0.15) {
      const t = this._nextNoteTime;
      const s = this._step;
      const scale = this._scale();
      const root = this._root();

      if (s % 4 === 0) this._kick(t);
      this._hat(t, s % 8 === 6);
      if (s % 8 === 0) this._note(root - 12, t, 0.55, 'sawtooth', 0.13, -6);
      if (s % 2 === 0) {
        const n = scale[(s / 2 + (s % 16 === 0 ? 2 : 0)) % scale.length];
        this._note(root + 12 + n, t, 0.22, 'square', 0.055 + this.intensity * 0.03, 5);
      }
      if (s % 16 === 8) {
        const n = scale[(s / 3) % scale.length];
        this._note(root + 24 + n, t, 0.7, 'triangle', 0.05);
      }
      this._step = (s + 1) % 64;
      this._nextNoteTime += spb;
      this.beat = 1;
    }
    this.beat = Math.max(0, this.beat - dt * 5.5);
  }

  /* --------------------------------------------------------------- SFX */
  _blip(freqA, freqB, dur, type = 'square', gain = 0.22) {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freqA, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, freqB), t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(this.sfxGain);
    o.start(t); o.stop(t + dur + 0.02);
  }

  _noise(dur, freq, gain = 0.3, type = 'bandpass') {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    const s = this.ctx.createBufferSource();
    s.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(80, freq * 0.25), t + dur);
    f.Q.value = 1.2;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    s.connect(f); f.connect(g); g.connect(this.sfxGain);
    s.start(t); s.stop(t + dur + 0.02);
  }

  jump() { this._blip(320, 720, 0.16, 'triangle', 0.22); this._noise(0.12, 900, 0.12); }
  land() { this._noise(0.12, 320, 0.16, 'lowpass'); }
  slide() { this._noise(0.32, 1800, 0.2, 'bandpass'); }
  orb() { this._blip(880, 1620, 0.09, 'square', 0.11); }
  power() { this._blip(420, 1400, 0.35, 'sawtooth', 0.16); this._blip(620, 1900, 0.4, 'triangle', 0.1); }
  phase() { this._blip(1200, 340, 0.22, 'sine', 0.2); this._noise(0.18, 2600, 0.14); }
  hit() { this._noise(0.42, 420, 0.42, 'lowpass'); this._blip(180, 48, 0.4, 'sawtooth', 0.28); }
  smash() { this._noise(0.28, 1400, 0.3); this._blip(260, 70, 0.25, 'square', 0.2); }
  overdrive() { this._blip(160, 900, 0.7, 'sawtooth', 0.26); this._blip(320, 1800, 0.75, 'square', 0.12); }
  warp() { this._blip(220, 1600, 0.9, 'sine', 0.22); this._noise(0.8, 3000, 0.16); }
  flip() { this._blip(900, 220, 0.5, 'triangle', 0.22); }
  gameover() {
    this._blip(420, 60, 1.1, 'sawtooth', 0.3);
    this._noise(1.0, 600, 0.3, 'lowpass');
  }
  closeCall() { this._blip(1500, 2400, 0.07, 'sine', 0.1); }
}
