/**
 * رنين البلّور — crystal cave audio, synthesized in-browser.
 * Glass partials, cave drone, drip noise. No audio files.
 */

const NOTES: Record<string, number> = {
  C3: 130.81, E3: 164.81, G3: 196.0, A3: 220.0,
  C4: 261.63, D4: 293.66, E4: 329.63, G4: 392.0, A4: 440.0, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880.0, C6: 1046.5,
};

const COLOR_FREQ = [NOTES.E5, NOTES.A4, NOTES.G4, NOTES.C5, NOTES.D5];

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private dry!: GainNode;
  private verb!: ConvolverNode;
  private musicGain!: GainNode;
  private sfxGain!: GainNode;
  private droneGain: GainNode | null = null;
  private droneOscs: OscillatorNode[] = [];
  private noiseBuf: AudioBuffer | null = null;
  private ambTimer: number | null = null;
  private nextNoteTime = 0;
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
    this.master.gain.value = 0.85;
    this.master.connect(ctx.destination);

    this.dry = ctx.createGain();
    this.dry.gain.value = 0.8;
    this.dry.connect(this.master);

    this.verb = ctx.createConvolver();
    this.verb.buffer = this.makeImpulse(2.8, 2.2);
    const verbGain = ctx.createGain();
    verbGain.gain.value = 0.55;
    this.verb.connect(verbGain);
    verbGain.connect(this.master);

    this.musicGain = ctx.createGain();
    this.musicGain.gain.value = this.musicOn ? 1 : 0;
    this.musicGain.connect(this.dry);

    this.sfxGain = ctx.createGain();
    this.sfxGain.gain.value = this.sfxOn ? 1 : 0;
    this.sfxGain.connect(this.dry);

    this.noiseBuf = this.makeNoise(1);
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

  private tone(
    freq: number,
    dur: number,
    vel: number,
    when = 0,
    type: OscillatorType = "sine",
    isMusic = false,
    verbSend = 0.45,
  ) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = Math.max(when, ctx.currentTime);
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vel, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const bus = isMusic ? this.musicGain : this.sfxGain;
    osc.connect(g);
    g.connect(bus);
    if (verbSend > 0) {
      const send = ctx.createGain();
      send.gain.value = vel * verbSend;
      g.connect(send);
      send.connect(this.verb);
    }
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private glass(freq: number, vel: number, when = 0) {
    this.tone(freq, 1.1, vel, when, "sine", false, 0.7);
    this.tone(freq * 2.01, 0.45, vel * 0.22, when, "sine", false, 0.5);
    this.tone(freq * 2.76, 0.28, vel * 0.12, when, "triangle", false, 0.4);
  }

  private noise(dur: number, vel: number, freq: number, q = 1.4, when = 0, isMusic = false) {
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

  pulse() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.noise(0.18, 0.22, 900, 0.8, t);
    this.tone(90, 0.28, 0.2, t, "sine", false, 0.3);
    this.tone(NOTES.E4, 0.35, 0.08, t, "sine", false, 0.6);
  }

  slide(colorIndex: number) {
    const f = COLOR_FREQ[colorIndex % COLOR_FREQ.length];
    this.glass(f, 0.16);
    this.noise(0.08, 0.08, 2400, 2);
  }

  collide(colorIndex: number) {
    const f = COLOR_FREQ[colorIndex % COLOR_FREQ.length];
    this.glass(f * 0.5, 0.22);
    this.noise(0.05, 0.12, 1800, 3);
  }

  lock(colorIndex: number) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const f = COLOR_FREQ[colorIndex % COLOR_FREQ.length];
    this.glass(f, 0.28);
    this.tone(f * 1.5, 0.7, 0.12, t + 0.06, "sine", false, 0.8);
    this.tone(f * 2, 0.5, 0.08, t + 0.12, "sine", false, 0.8);
  }

  deny() {
    this.tone(110, 0.18, 0.12, 0, "triangle", false, 0.2);
    this.noise(0.06, 0.08, 280, 1);
  }

  uiTap() {
    this.tone(NOTES.A4, 0.12, 0.08, 0, "sine", false, 0.3);
  }

  hint() {
    if (!this.ctx) return;
    [NOTES.E4, NOTES.G4, NOTES.B4].forEach((f, i) => this.glass(f, 0.14 + i * 0.02));
    this.tone(NOTES.E5, 0.4, 0.1, this.ctx.currentTime + 0.18, "sine", false, 0.7);
  }

  win() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.04;
    const seq = [NOTES.E4, NOTES.G4, NOTES.A4, NOTES.B4, NOTES.E5, NOTES.G5];
    seq.forEach((f) => this.glass(f, 0.2));
    [NOTES.E4, NOTES.B4, NOTES.E5, NOTES.G5].forEach((f, i) =>
      this.tone(f, 1.2, 0.12, t + 0.55 + i * 0.03, "sine", false, 0.9),
    );
    this.noise(0.4, 0.06, 4200, 1.1, t + 0.4);
  }

  star(i: number) {
    const f = [NOTES.E5, NOTES.G5, NOTES.C6][Math.min(i, 2)];
    this.glass(f, 0.22);
  }

  startAmbient() {
    if (!this.ctx || this.ambTimer !== null || !this.musicOn) return;
    const ctx = this.ctx;
    this.nextNoteTime = ctx.currentTime + 0.2;
    this.startDrone();
    const pool = [NOTES.E3, NOTES.G3, NOTES.A3, NOTES.C4, NOTES.E4, NOTES.G4, NOTES.A4];
    const scheduler = () => {
      if (!this.ctx || !this.musicOn) return;
      while (this.nextNoteTime < ctx.currentTime + 0.5) {
        const t = this.nextNoteTime;
        if (Math.random() < 0.38) {
          const f = pool[Math.floor(Math.random() * pool.length)];
          this.tone(f, 1.8, 0.035 + Math.random() * 0.04, t, "sine", true, 1.1);
        }
        if (Math.random() < 0.12) {
          this.noise(0.18, 0.03, 1800 + Math.random() * 2200, 2.5, t, true);
        }
        this.nextNoteTime += 0.7 + Math.random() * 0.9;
      }
    };
    scheduler();
    this.ambTimer = window.setInterval(scheduler, 240);
  }

  private startDrone() {
    if (!this.ctx || this.droneGain) return;
    const ctx = this.ctx;
    const g = ctx.createGain();
    g.gain.value = 0;
    g.connect(this.musicGain);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 380;
    lp.connect(g);
    const oscs: OscillatorNode[] = [];
    [55, 82.4, 164.9].forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = i === 2 ? "triangle" : "sine";
      o.frequency.value = f;
      const og = ctx.createGain();
      og.gain.value = i === 0 ? 0.7 : 0.35;
      o.connect(og).connect(lp);
      o.start();
      oscs.push(o);
    });
    g.gain.setTargetAtTime(0.05, ctx.currentTime, 2.4);
    this.droneGain = g;
    this.droneOscs = oscs;
  }

  private stopDrone() {
    if (!this.ctx || !this.droneGain) return;
    const g = this.droneGain;
    g.gain.setTargetAtTime(0, this.ctx.currentTime, 0.5);
    const oscs = this.droneOscs;
    window.setTimeout(() => oscs.forEach((o) => o.stop()), 1800);
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
