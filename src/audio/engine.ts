export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private amb: { stop: () => void } | null = null;
  muted = false;

  async ensure() {
    if (this.muted) return null;
    if (!this.ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.82;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") await this.ctx.resume();
    return this.ctx;
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.82;
    if (m) this.stopShop();
  }

  private env(g: GainNode, t: number, a: number, d: number, peak: number) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  }

  private noise(ctx: AudioContext, dur: number) {
    const buf = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * dur)), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    return src;
  }

  private out(node: AudioNode, g: GainNode) {
    if (!this.master) return;
    node.connect(g);
    g.connect(this.master);
  }

  grab() {
    void this.ensure().then((ctx) => {
      if (!ctx || !this.master || this.muted) return;
      const t = ctx.currentTime;
      const n = this.noise(ctx, 0.08);
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 1800;
      const g = ctx.createGain();
      n.connect(bp);
      bp.connect(g);
      g.connect(this.master);
      this.env(g, t, 0.004, 0.08, 0.05);
      n.start(t);
      n.stop(t + 0.09);
    });
  }

  swap() {
    void this.ensure().then((ctx) => {
      if (!ctx || this.muted) return;
      const t = ctx.currentTime;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "triangle";
      o.frequency.setValueAtTime(520, t);
      o.frequency.exponentialRampToValueAtTime(340, t + 0.07);
      this.env(g, t, 0.005, 0.09, 0.05);
      this.out(o, g);
      o.start(t);
      o.stop(t + 0.1);
    });
  }

  ignite(_size: number) {
    void this.ensure().then((ctx) => {
      if (!ctx || !this.master || this.muted) return;
      const t = ctx.currentTime;
      const n = this.noise(ctx, 0.09);
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 1400;
      bp.Q.value = 3;
      const g = ctx.createGain();
      n.connect(bp);
      bp.connect(g);
      g.connect(this.master);
      this.env(g, t, 0.003, 0.1, 0.12);
      n.start(t);
      n.stop(t + 0.11);
      const o = ctx.createOscillator();
      const og = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(880, t);
      o.frequency.exponentialRampToValueAtTime(420, t + 0.12);
      this.env(og, t, 0.004, 0.14, 0.06);
      this.out(o, og);
      o.start(t);
      o.stop(t + 0.15);
    });
  }

  juice() {
    void this.ensure().then((ctx) => {
      if (!ctx || !this.master || this.muted) return;
      const t = ctx.currentTime;
      const n = this.noise(ctx, 0.55);
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.setValueAtTime(420, t);
      bp.frequency.exponentialRampToValueAtTime(1600, t + 0.22);
      bp.frequency.exponentialRampToValueAtTime(280, t + 0.5);
      bp.Q.value = 1.6;
      const g = ctx.createGain();
      n.connect(bp);
      bp.connect(g);
      g.connect(this.master);
      this.env(g, t, 0.03, 0.52, 0.18);
      n.start(t);
      n.stop(t + 0.55);
      const o = ctx.createOscillator();
      const og = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(180, t);
      o.frequency.exponentialRampToValueAtTime(90, t + 0.4);
      this.env(og, t, 0.04, 0.42, 0.06);
      this.out(o, og);
      o.start(t);
      o.stop(t + 0.45);
    });
  }

  prism() {
    void this.ensure().then((ctx) => {
      if (!ctx || this.muted) return;
      const t = ctx.currentTime;
      [523, 659, 784, 1046, 1318].forEach((f, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "triangle";
        o.frequency.setValueAtTime(f, t + i * 0.045);
        o.frequency.exponentialRampToValueAtTime(f * 1.5, t + 0.28 + i * 0.03);
        this.env(g, t + i * 0.045, 0.01, 0.32, 0.07);
        this.out(o, g);
        o.start(t + i * 0.045);
        o.stop(t + 0.4 + i * 0.03);
      });
      const n = this.noise(ctx, 0.28);
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 2400;
      const ng = ctx.createGain();
      n.connect(hp);
      hp.connect(ng);
      if (this.master) ng.connect(this.master);
      this.env(ng, t, 0.01, 0.26, 0.08);
      n.start(t);
      n.stop(t + 0.28);
    });
  }

  light() {
    void this.ensure().then((ctx) => {
      if (!ctx || !this.master || this.muted) return;
      const t = ctx.currentTime;
      const n = this.noise(ctx, 0.32);
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.setValueAtTime(900, t);
      bp.frequency.exponentialRampToValueAtTime(2400, t + 0.08);
      bp.frequency.exponentialRampToValueAtTime(500, t + 0.28);
      bp.Q.value = 2;
      const g = ctx.createGain();
      n.connect(bp);
      bp.connect(g);
      g.connect(this.master);
      this.env(g, t, 0.015, 0.3, 0.14);
      n.start(t);
      n.stop(t + 0.32);
    });
  }

  ice() {
    void this.ensure().then((ctx) => {
      if (!ctx || !this.master || this.muted) return;
      const t = ctx.currentTime;
      const n = this.noise(ctx, 0.12);
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 3200;
      const g = ctx.createGain();
      n.connect(hp);
      hp.connect(g);
      g.connect(this.master);
      this.env(g, t, 0.002, 0.1, 0.1);
      n.start(t);
      n.stop(t + 0.12);
    });
  }

  daff() {
    void this.ensure().then((ctx) => {
      if (!ctx || this.muted) return;
      const t = ctx.currentTime;
      [784, 988].forEach((f, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sine";
        o.frequency.value = f;
        this.env(g, t + i * 0.05, 0.01, 0.18, 0.05);
        this.out(o, g);
        o.start(t + i * 0.05);
        o.stop(t + 0.22 + i * 0.05);
      });
    });
  }

  fail() {
    void this.ensure().then((ctx) => {
      if (!ctx || this.muted) return;
      const t = ctx.currentTime;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "triangle";
      o.frequency.setValueAtTime(220, t);
      o.frequency.exponentialRampToValueAtTime(90, t + 0.4);
      this.env(g, t, 0.02, 0.45, 0.07);
      this.out(o, g);
      o.start(t);
      o.stop(t + 0.48);
    });
  }

  win() {
    void this.ensure().then((ctx) => {
      if (!ctx || this.muted) return;
      [523, 659, 784, 1046].forEach((f, i) => {
        const t = ctx.currentTime + i * 0.11;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sine";
        o.frequency.value = f;
        this.env(g, t, 0.02, 0.35, 0.07);
        this.out(o, g);
        o.start(t);
        o.stop(t + 0.4);
      });
    });
  }

  startShop() {
    void this.ensure().then((ctx) => {
      if (!ctx || !this.master || this.muted || this.amb) return;
      const pad = ctx.createOscillator();
      const pg = ctx.createGain();
      pad.type = "sine";
      pad.frequency.value = 196;
      pg.gain.value = 0.01;
      pad.connect(pg);
      pg.connect(this.master);
      pad.start();
      const fifth = ctx.createOscillator();
      const fg = ctx.createGain();
      fifth.type = "triangle";
      fifth.frequency.value = 329.63;
      fg.gain.value = 0.006;
      fifth.connect(fg);
      fg.connect(this.master);
      fifth.start();
      const air = ctx.createOscillator();
      const ag = ctx.createGain();
      air.type = "sine";
      air.frequency.value = 523.25;
      ag.gain.value = 0.004;
      air.connect(ag);
      ag.connect(this.master);
      air.start();
      const notes = [392, 440, 493.88, 587.33];
      let step = 0;
      const tick = () => {
        if (this.muted || !this.ctx || !this.master) return;
        const t = this.ctx.currentTime;
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = "sine";
        o.frequency.value = notes[step % notes.length]!;
        step++;
        this.env(g, t, 0.02, 0.28, 0.025);
        o.connect(g);
        g.connect(this.master);
        o.start(t);
        o.stop(t + 0.3);
      };
      const id = window.setInterval(tick, 640);
      this.amb = {
        stop: () => {
          window.clearInterval(id);
          try {
            pad.stop();
            fifth.stop();
            air.stop();
          } catch {
            /* closed */
          }
          pg.disconnect();
          fg.disconnect();
          ag.disconnect();
        },
      };
    });
  }

  startNight() {
    this.startShop();
  }

  stopShop() {
    this.amb?.stop();
    this.amb = null;
  }

  stopNight() {
    this.stopShop();
  }
}

export const audio = new AudioEngine();
