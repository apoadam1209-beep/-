/**
 * كهف حي: تقطير، ريح، صدى حجري، زجاج بلوري — كلّه مُصنَّع في المتصفح.
 */

const COLOR_FREQ = [1046.5, 784, 523.25, 1174.7, 659.25];

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private dry!: GainNode;
  private verb!: ConvolverNode;
  private echo!: DelayNode;
  private musicGain!: GainNode;
  private sfxGain!: GainNode;
  private droneGain: GainNode | null = null;
  private droneNodes: AudioNode[] = [];
  private noiseBuf: AudioBuffer | null = null;
  private ambTimer: number | null = null;
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
    this.dry.gain.value = 0.72;
    this.dry.connect(this.master);

    this.verb = ctx.createConvolver();
    this.verb.buffer = this.makeCaveIR(3.6);
    const verbGain = ctx.createGain();
    verbGain.gain.value = 0.62;
    this.verb.connect(verbGain);
    verbGain.connect(this.master);

    this.echo = ctx.createDelay(1.2);
    this.echo.delayTime.value = 0.22;
    const echoFb = ctx.createGain();
    echoFb.gain.value = 0.28;
    const echoFilt = ctx.createBiquadFilter();
    echoFilt.type = "lowpass";
    echoFilt.frequency.value = 2200;
    this.echo.connect(echoFilt);
    echoFilt.connect(echoFb);
    echoFb.connect(this.echo);
    echoFilt.connect(this.master);

    this.musicGain = ctx.createGain();
    this.musicGain.gain.value = this.musicOn ? 1 : 0;
    this.musicGain.connect(this.dry);

    this.sfxGain = ctx.createGain();
    this.sfxGain.gain.value = this.sfxOn ? 1 : 0;
    this.sfxGain.connect(this.dry);

    this.noiseBuf = this.makeNoise(2);
  }

  setMusic(on: boolean) {
    this.musicOn = on;
    if (!this.ctx) return;
    this.musicGain.gain.setTargetAtTime(on ? 1 : 0, this.ctx.currentTime, 0.2);
    if (on) this.startAmbient();
    else this.stopDrone();
  }

  setSfx(on: boolean) {
    this.sfxOn = on;
    if (!this.ctx) return;
    this.sfxGain.gain.setTargetAtTime(on ? 1 : 0, this.ctx.currentTime, 0.05);
  }

  private makeCaveIR(seconds: number): AudioBuffer {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        const t = i / len;
        const early = i < ctx.sampleRate * 0.08 ? 0.55 : 0.18;
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.8) * early;
      }
      for (let k = 0; k < 9; k++) {
        const at = Math.floor((0.018 + k * 0.031 + ch * 0.004) * ctx.sampleRate);
        if (at < len) d[at] += (Math.random() * 2 - 1) * (0.45 / (k + 1));
      }
    }
    return buf;
  }

  private makeNoise(seconds: number): AudioBuffer {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      d[i] = last * 3.2;
    }
    return buf;
  }

  private bus(isMusic: boolean) {
    return isMusic ? this.musicGain : this.sfxGain;
  }

  private sendVerb(node: AudioNode, amt: number) {
    const g = this.ctx!.createGain();
    g.gain.value = amt;
    node.connect(g);
    g.connect(this.verb);
    const e = this.ctx!.createGain();
    e.gain.value = amt * 0.35;
    node.connect(e);
    e.connect(this.echo);
  }

  private tone(
    freq: number,
    dur: number,
    vel: number,
    when = 0,
    type: OscillatorType = "sine",
    isMusic = false,
    verb = 0.5,
  ) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = Math.max(when, ctx.currentTime);
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vel), t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.bus(isMusic));
    if (verb > 0) this.sendVerb(g, vel * verb);
    osc.start(t);
    osc.stop(t + dur + 0.03);
  }

  private noiseBurst(dur: number, vel: number, freq: number, q: number, when = 0, isMusic = false) {
    if (!this.ctx || !this.noiseBuf) return;
    const ctx = this.ctx;
    const t = Math.max(when, ctx.currentTime);
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.setValueAtTime(freq, t);
    bp.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(Math.max(0.0002, vel), t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp).connect(g).connect(this.bus(isMusic));
    this.sendVerb(g, vel * 0.4);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  /** زجاج الكهف: أوضاع غير متناسقة + ذيل طويل */
  private crystal(freq: number, vel: number, when = 0) {
    const ratios = [1, 2.01, 2.76, 4.07, 5.43];
    const gains = [1, 0.28, 0.16, 0.08, 0.05];
    ratios.forEach((r, i) => {
      this.tone(freq * r, 1.6 - i * 0.18, vel * gains[i]!, when, i > 2 ? "triangle" : "sine", false, 0.85);
    });
  }

  pulse() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.tone(42, 0.55, 0.32, t, "sine", false, 0.25);
    this.tone(78, 0.28, 0.14, t, "triangle", false, 0.2);
    this.noiseBurst(0.16, 0.38, 380, 0.7, t);
    this.noiseBurst(0.22, 0.18, 1400, 0.9, t + 0.02);
    this.noiseBurst(0.35, 0.1, 2400, 1.2, t + 0.04);
  }

  slide(colorIndex: number) {
    const f = COLOR_FREQ[colorIndex % COLOR_FREQ.length]!;
    this.crystal(f, 0.14);
    this.noiseBurst(0.14, 0.16, 1800, 1.6);
    this.noiseBurst(0.2, 0.08, 420, 0.8);
  }

  collide(colorIndex: number) {
    const f = COLOR_FREQ[colorIndex % COLOR_FREQ.length]!;
    this.crystal(f * 0.5, 0.24);
    this.noiseBurst(0.07, 0.22, 900, 2.2);
  }

  lock(colorIndex: number) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const f = COLOR_FREQ[colorIndex % COLOR_FREQ.length]!;
    this.crystal(f, 0.3);
    this.tone(f / 2, 1.8, 0.12, t, "sine", false, 0.95);
    this.tone(f * 1.5, 1.2, 0.08, t + 0.05, "sine", false, 0.9);
    this.noiseBurst(0.4, 0.08, 3200, 2, t + 0.04);
  }

  deny() {
    this.tone(70, 0.22, 0.16, 0, "sawtooth", false, 0.15);
    this.noiseBurst(0.1, 0.12, 220, 0.8);
  }

  uiTap() {
    this.tone(620, 0.09, 0.06, 0, "sine", false, 0.25);
    this.noiseBurst(0.04, 0.05, 2800, 3);
  }

  hint() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [523, 659, 784].forEach((f, i) => this.crystal(f, 0.1 + i * 0.02));
    this.tone(1046, 0.7, 0.08, t + 0.2, "sine", false, 0.8);
  }

  win() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.03;
    this.tone(36, 1.4, 0.28, t, "sine", false, 0.4);
    this.noiseBurst(0.5, 0.16, 180, 0.6, t);
    [523, 659, 784, 1046, 1318].forEach((f) => this.crystal(f, 0.16));
    [523, 784, 1046].forEach((f, i) => this.tone(f, 1.6, 0.1, t + 0.45 + i * 0.04, "sine", false, 1));
  }

  startAmbient() {
    if (!this.ctx || this.ambTimer !== null || !this.musicOn) return;
    this.startDrone();
    const tick = () => {
      if (!this.ctx || !this.musicOn) return;
      const t = this.ctx.currentTime + 0.02;
      const roll = Math.random();
      if (roll < 0.45) this.drip(t);
      else if (roll < 0.62) this.noiseBurst(0.5, 0.025, 1600 + Math.random() * 1800, 2.4, t, true);
      else if (roll < 0.78) this.tone(110 + Math.random() * 40, 2.4, 0.02, t, "sine", true, 1.2);
    };
    tick();
    this.ambTimer = window.setInterval(tick, 1400 + Math.random() * 900);
  }

  /** قطرة ماء في الكهف */
  private drip(when: number) {
    const f = 1800 + Math.random() * 1400;
    this.tone(f, 0.18, 0.045, when, "sine", true, 1.3);
    this.tone(f * 0.5, 0.12, 0.02, when, "sine", true, 1);
    this.noiseBurst(0.07, 0.03, f, 4, when, true);
  }

  private startDrone() {
    if (!this.ctx || this.droneGain) return;
    const ctx = this.ctx;
    const g = ctx.createGain();
    g.gain.value = 0;
    g.connect(this.musicGain);

    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 340;
    lp.connect(g);

    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const wind = ctx.createGain();
    wind.gain.value = 0.45;
    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 0.07;
    const lfoG = ctx.createGain();
    lfoG.gain.value = 0.2;
    lfo.connect(lfoG);
    lfoG.connect(wind.gain);
    src.connect(wind).connect(lp);
    src.start();
    lfo.start();

    [46, 69, 92].forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = f;
      const og = ctx.createGain();
      og.gain.value = i === 0 ? 0.5 : 0.22;
      o.connect(og).connect(lp);
      o.start();
      this.droneNodes.push(o);
    });

    this.droneNodes.push(src, lfo);
    g.gain.setTargetAtTime(0.07, ctx.currentTime, 2.8);
    this.droneGain = g;
  }

  private stopDrone() {
    if (!this.ctx || !this.droneGain) return;
    this.droneGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.6);
    const nodes = this.droneNodes;
    window.setTimeout(() => {
      nodes.forEach((n) => {
        try {
          if ("stop" in n) (n as OscillatorNode).stop();
        } catch {
          /* already stopped */
        }
      });
    }, 1800);
    this.droneGain = null;
    this.droneNodes = [];
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
