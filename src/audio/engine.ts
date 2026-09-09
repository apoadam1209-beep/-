/**
 * صندوق الأسرار — محرك الصوت
 * Oud plucks synthesized with the Karplus-Strong algorithm (double courses,
 * like a real oud), tuned to Maqam Hijaz on D, plus drone, reverb, drums.
 * Everything is generated in the browser — no audio files.
 */

// Maqam Hijaz on D
export const HIJAZ = {
  D2: 73.42, A2: 110.0,
  D3: 146.83, Eb3: 155.56, Fs3: 185.0, G3: 196.0, A3: 220.0, Bb3: 233.08, C4: 261.63,
  D4: 293.66, Eb4: 311.13, Fs4: 369.99, G4: 392.0, A4: 440.0, Bb4: 466.16, C5: 523.25,
  D5: 587.33, Eb5: 622.25, Fs5: 739.99, G5: 783.99, A5: 880.0,
};

const RING_NOTES = [
  HIJAZ.D4, HIJAZ.Bb3, HIJAZ.A3, HIJAZ.G3, HIJAZ.Fs3, HIJAZ.Eb3, HIJAZ.D3,
];

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private dry!: GainNode;
  private verb!: ConvolverNode;
  private musicGain!: GainNode;
  private sfxGain!: GainNode;
  private droneGain: GainNode | null = null;
  private droneOscs: OscillatorNode[] = [];
  private pluckCache = new Map<number, AudioBuffer>();
  private noiseBuf: AudioBuffer | null = null;
  private ambTimer: number | null = null;
  private nextNoteTime = 0;
  private walkDegree = 4; // position in random walk on scale
  musicOn = true;
  sfxOn = true;

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return;
    }
    const Ctx: typeof AudioContext =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(ctx.destination);

    this.dry = ctx.createGain();
    this.dry.gain.value = 0.85;
    this.dry.connect(this.master);

    this.verb = ctx.createConvolver();
    this.verb.buffer = this.makeImpulse(2.6, 2.4);
    const verbGain = ctx.createGain();
    verbGain.gain.value = 0.5;
    this.verb.connect(verbGain);
    verbGain.connect(this.master);

    this.musicGain = ctx.createGain();
    this.musicGain.gain.value = this.musicOn ? 1 : 0;
    this.musicGain.connect(this.dry);

    this.sfxGain = ctx.createGain();
    this.sfxGain.gain.value = this.sfxOn ? 1 : 0;
    this.sfxGain.connect(this.dry);

    this.noiseBuf = this.makeNoise(0.5);
  }

  get ready() {
    return !!this.ctx;
  }

  setMusic(on: boolean) {
    this.musicOn = on;
    if (!this.ctx) return;
    this.musicGain.gain.setTargetAtTime(on ? 1 : 0, this.ctx.currentTime, 0.15);
    if (on) this.startAmbient();
    else this.stopDrone();
  }

  setSfx(on: boolean) {
    this.sfxOn = on;
    if (!this.ctx) return;
    this.sfxGain.gain.setTargetAtTime(on ? 1 : 0, this.ctx.currentTime, 0.05);
  }

  // ---------- synthesis primitives ----------

  private makeImpulse(seconds: number, decay: number): AudioBuffer {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    return buf;
  }

  private makeNoise(seconds: number): AudioBuffer {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  /** Karplus-Strong plucked string, double course (oud-like). */
  private pluckBuffer(freq: number): AudioBuffer {
    const key = Math.round(freq * 10);
    const cached = this.pluckCache.get(key);
    if (cached) return cached;
    const ctx = this.ctx!;
    const sr = ctx.sampleRate;
    const seconds = 1.5;
    const len = Math.floor(sr * seconds);
    const out = new Float32Array(len);

    const courses: Array<[number, number, number]> = [
      [1.0, 0.95, 0.9962],   // main course
      [1.0028, 0.5, 0.9968], // detuned double course
    ];
    for (const [ratio, gain, damp] of courses) {
      const period = Math.max(2, Math.round(sr / (freq * ratio)));
      const line = new Float32Array(period);
      for (let i = 0; i < period; i++) line[i] = Math.random() * 2 - 1;
      for (let i = 1; i < period; i++) line[i] = (line[i] + line[i - 1]) * 0.5; // soften attack
      let idx = 0;
      for (let t = 0; t < len; t++) {
        const cur = line[idx];
        const nxt = line[(idx + 1) % period];
        line[idx] = damp * 0.5 * (cur + nxt);
        out[t] += cur * gain;
        idx = (idx + 1) % period;
      }
    }
    // gentle body: lowpass-ish smoothing + normalize + tail fade
    let peak = 0;
    for (let t = 1; t < len; t++) {
      out[t] = out[t] * 0.72 + out[t - 1] * 0.28;
      const a = Math.abs(out[t]);
      if (a > peak) peak = a;
    }
    const fadeStart = len - Math.floor(sr * 0.08);
    for (let t = 0; t < len; t++) {
      if (t > fadeStart) out[t] *= 1 - (t - fadeStart) / (len - fadeStart);
      out[t] = (out[t] / (peak || 1)) * 0.9;
    }
    const buf = ctx.createBuffer(1, len, sr);
    buf.getChannelData(0).set(out);
    this.pluckCache.set(key, buf);
    return buf;
  }

  private playPluck(freq: number, vel: number, when = 0, verbSend = 0.5, isMusic = false) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = Math.max(when, ctx.currentTime);
    const src = ctx.createBufferSource();
    src.buffer = this.pluckBuffer(freq);
    const g = ctx.createGain();
    g.gain.value = vel;
    src.connect(g);
    const bus = isMusic ? this.musicGain : this.sfxGain;
    g.connect(bus);
    if (verbSend > 0) {
      const send = ctx.createGain();
      send.gain.value = vel * verbSend;
      g.connect(send);
      send.connect(this.verb);
    }
    src.start(t);
  }

  private playNoise(dur: number, vel: number, freq: number, q = 1.5, when = 0, isMusic = false) {
    if (!this.ctx || !this.noiseBuf) return;
    const ctx = this.ctx;
    const t = Math.max(when, ctx.currentTime);
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = freq;
    bp.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vel, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp).connect(g).connect(isMusic ? this.musicGain : this.sfxGain);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  /** warm low drum (darbuka-ish doum) */
  private drum(vel: number, when = 0, isMusic = false) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = Math.max(when, ctx.currentTime);
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(112, t);
    osc.frequency.exponentialRampToValueAtTime(48, t + 0.22);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vel, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
    osc.connect(g).connect(isMusic ? this.musicGain : this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.4);
    this.playNoise(0.06, vel * 0.4, 900, 1, t, isMusic);
  }

  // ---------- game sounds ----------

  tick() {
    if (!this.ctx) return;
    this.playNoise(0.025, 0.12, 3200, 4);
  }

  /** ring settled on a letter — oud pluck, lower rings lower pitch */
  ringPluck(ringIndex: number) {
    if (!this.ctx) return;
    const f = RING_NOTES[Math.min(ringIndex, RING_NOTES.length - 1)];
    this.playPluck(f, 0.42, 0, 0.55);
    this.playNoise(0.05, 0.1, 1800, 2);
  }

  uiTap() {
    if (!this.ctx) return;
    this.playPluck(HIJAZ.A3, 0.25, 0, 0.4);
  }

  hint() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [HIJAZ.D4, HIJAZ.Fs4, HIJAZ.A4].forEach((f, i) =>
      this.playPluck(f, 0.3, t + i * 0.09, 0.8)
    );
  }

  deny() {
    if (!this.ctx) return;
    this.playPluck(HIJAZ.D3, 0.16, 0, 0.3);
    this.playNoise(0.07, 0.1, 300, 1.2);
  }

  wrong() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.playPluck(HIJAZ.D2, 0.4, t, 0.5);
    this.playPluck(HIJAZ.Eb3 * 0.5, 0.3, t + 0.03, 0.5);
    this.drum(0.4, t + 0.02);
  }

  /** short flourish between riddles within a stage */
  smallWin() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.02;
    this.drum(0.3, t);
    [HIJAZ.D4, HIJAZ.A4, HIJAZ.D5].forEach((f, i) =>
      this.playPluck(f, 0.34, t + i * 0.09, 0.85)
    );
  }

  win() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.05;
    this.drum(0.65, t);
    this.drum(0.35, t + 0.18);
    const seq = [HIJAZ.D4, HIJAZ.Eb4, HIJAZ.Fs4, HIJAZ.G4, HIJAZ.A4, HIJAZ.Bb4, HIJAZ.D5];
    seq.forEach((f, i) => {
      this.playPluck(f, 0.46, t + 0.12 + i * 0.105, 0.85);
    });
    // final strum
    [HIJAZ.D4, HIJAZ.A4, HIJAZ.D5, HIJAZ.Fs5, HIJAZ.A5].forEach((f, i) =>
      this.playPluck(f, 0.34, t + 0.12 + seq.length * 0.105 + 0.08 + i * 0.028, 0.9)
    );
    this.playNoise(0.55, 0.06, 6200, 1.2, t + 0.5);
  }

  star(i: number) {
    if (!this.ctx) return;
    const base = [HIJAZ.D5, HIJAZ.Fs5, HIJAZ.A5][Math.min(i, 2)];
    this.playPluck(base, 0.3, 0, 0.9);
  }

  // ---------- ambient music ----------

  startAmbient() {
    if (!this.ctx || this.ambTimer !== null || !this.musicOn) return;
    const ctx = this.ctx;
    this.nextNoteTime = ctx.currentTime + 0.1;
    this.startDrone();
    const walk = [
      HIJAZ.D3, HIJAZ.Eb3, HIJAZ.Fs3, HIJAZ.G3, HIJAZ.A3, HIJAZ.Bb3, HIJAZ.C4,
      HIJAZ.D4, HIJAZ.Eb4, HIJAZ.Fs4,
    ];
    const step = 0.56;
    const scheduler = () => {
      if (!this.ctx || !this.musicOn) return;
      while (this.nextNoteTime < ctx.currentTime + 0.45) {
        const t = this.nextNoteTime;
        // sparse random walk melody
        if (Math.random() < 0.52) {
          this.walkDegree += Math.floor(Math.random() * 5) - 2;
          this.walkDegree = Math.max(0, Math.min(walk.length - 1, this.walkDegree));
          this.playPluck(walk[this.walkDegree], 0.07 + Math.random() * 0.09, t, 1.1, true);
          if (Math.random() < 0.14) {
            // grace note flourish
            const gi = Math.max(0, Math.min(walk.length - 1, this.walkDegree + (Math.random() < 0.5 ? -1 : 1)));
            this.playPluck(walk[gi], 0.05, t + 0.11, 1.2, true);
          }
        }
        // heartbeat drum every ~4s
        if (Math.random() < 0.1) {
          this.drum(0.1, t, true);
          if (Math.random() < 0.5) this.drum(0.06, t + 0.24, true);
        }
        this.nextNoteTime += step * (Math.random() < 0.25 ? 2 : 1);
      }
    };
    scheduler();
    this.ambTimer = window.setInterval(scheduler, 220);
  }

  private startDrone() {
    if (!this.ctx || this.droneGain) return;
    const ctx = this.ctx;
    const g = ctx.createGain();
    g.gain.value = 0;
    g.connect(this.musicGain);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 420;
    lp.connect(g);
    const oscs: OscillatorNode[] = [];
    [HIJAZ.D2, HIJAZ.A2, HIJAZ.D3 * 1.003].forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = i === 2 ? "triangle" : "sine";
      o.frequency.value = f;
      const og = ctx.createGain();
      og.gain.value = i === 1 ? 0.4 : 0.75;
      o.connect(og).connect(lp);
      o.start();
      oscs.push(o);
    });
    g.gain.setTargetAtTime(0.045, ctx.currentTime, 2.2);
    this.droneGain = g;
    this.droneOscs = oscs;
  }

  private stopDrone() {
    if (!this.ctx || !this.droneGain) return;
    const g = this.droneGain;
    g.gain.setTargetAtTime(0, this.ctx.currentTime, 0.4);
    const oscs = this.droneOscs;
    window.setTimeout(() => oscs.forEach((o) => o.stop()), 1600);
    this.droneGain = null;
    this.droneOscs = [];
  }

  stopAmbient() {
    if (this.ambTimer !== null) {
      clearInterval(this.ambTimer);
      this.ambTimer = null;
    }
    this.stopDrone();
  }
}

export const engine = new AudioEngine();
