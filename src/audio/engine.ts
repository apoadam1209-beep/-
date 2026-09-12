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
      this.master.gain.value = 0.85;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") await this.ctx.resume();
    return this.ctx;
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.85;
    if (m) this.stopNight();
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
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "triangle";
      o.frequency.setValueAtTime(620, t);
      o.frequency.exponentialRampToValueAtTime(240, t + 0.09);
      this.env(g, t, 0.008, 0.14, 0.09);
      this.out(o, g);
      o.start(t);
      o.stop(t + 0.16);
      const n = this.noise(ctx, 0.05);
      const ng = ctx.createGain();
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 2400;
      n.connect(bp);
      bp.connect(ng);
      ng.connect(this.master);
      this.env(ng, t, 0.004, 0.05, 0.04);
      n.start(t);
      n.stop(t + 0.06);
    });
  }

  glass(freq = 540, peak = 0.1) {
    void this.ensure().then((ctx) => {
      if (!ctx || this.muted) return;
      const t = ctx.currentTime;
      const ratios = [1, 2.32, 3.14, 4.41];
      for (const r of ratios) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sine";
        o.frequency.value = freq * r;
        this.env(g, t, 0.01, 0.35 / r, peak / r);
        this.out(o, g);
        o.start(t);
        o.stop(t + 0.4);
      }
    });
  }

  swap() {
    this.glass(480, 0.05);
    void this.ensure().then((ctx) => {
      if (!ctx || this.muted) return;
      const t = ctx.currentTime;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(900, t);
      o.frequency.exponentialRampToValueAtTime(420, t + 0.08);
      this.env(g, t, 0.005, 0.1, 0.04);
      this.out(o, g);
      o.start(t);
      o.stop(t + 0.12);
    });
  }

  ignite(size: number) {
    void this.ensure().then((ctx) => {
      if (!ctx || !this.master || this.muted) return;
      const t = ctx.currentTime;
      const n = this.noise(ctx, 0.18);
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 900;
      const ng = ctx.createGain();
      n.connect(hp);
      hp.connect(ng);
      ng.connect(this.master);
      this.env(ng, t, 0.01, 0.16, 0.07);
      n.start(t);
      n.stop(t + 0.2);
      this.glass(420 + Math.min(4, size) * 40, 0.09);
    });
  }

  light() {
    void this.ensure().then((ctx) => {
      if (!ctx || !this.master || this.muted) return;
      const t = ctx.currentTime;
      const n = this.noise(ctx, 0.5);
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.setValueAtTime(400, t);
      lp.frequency.exponentialRampToValueAtTime(1600, t + 0.35);
      const g = ctx.createGain();
      n.connect(lp);
      lp.connect(g);
      g.connect(this.master);
      this.env(g, t, 0.08, 0.5, 0.05);
      n.start(t);
      n.stop(t + 0.52);
      const o = ctx.createOscillator();
      const og = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(196, t);
      o.frequency.exponentialRampToValueAtTime(392, t + 0.4);
      this.env(og, t, 0.05, 0.55, 0.04);
      this.out(o, og);
      o.start(t);
      o.stop(t + 0.56);
    });
  }

  windLine() {
    void this.ensure().then((ctx) => {
      if (!ctx || !this.master || this.muted) return;
      const t = ctx.currentTime;
      const n = this.noise(ctx, 0.55);
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.Q.value = 4;
      bp.frequency.setValueAtTime(500, t);
      bp.frequency.exponentialRampToValueAtTime(1800, t + 0.4);
      const g = ctx.createGain();
      n.connect(bp);
      bp.connect(g);
      g.connect(this.master);
      this.env(g, t, 0.04, 0.5, 0.08);
      n.start(t);
      n.stop(t + 0.55);
    });
  }

  burst() {
    void this.ensure().then((ctx) => {
      if (!ctx || !this.master || this.muted) return;
      const t = ctx.currentTime;
      const n = this.noise(ctx, 0.22);
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 280;
      const g = ctx.createGain();
      n.connect(lp);
      lp.connect(g);
      g.connect(this.master);
      this.env(g, t, 0.005, 0.22, 0.16);
      n.start(t);
      n.stop(t + 0.24);
      const o = ctx.createOscillator();
      const og = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(90, t);
      o.frequency.exponentialRampToValueAtTime(40, t + 0.2);
      this.env(og, t, 0.005, 0.25, 0.12);
      this.out(o, og);
      o.start(t);
      o.stop(t + 0.26);
    });
  }

  moon() {
    this.cannon();
  }

  daff() {
    void this.ensure().then((ctx) => {
      if (!ctx || !this.master || this.muted) return;
      const t = ctx.currentTime;
      const n = this.noise(ctx, 0.12);
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 280;
      bp.Q.value = 2.2;
      const g = ctx.createGain();
      n.connect(bp);
      bp.connect(g);
      g.connect(this.master);
      this.env(g, t, 0.002, 0.14, 0.16);
      n.start(t);
      n.stop(t + 0.14);
      const o = ctx.createOscillator();
      const og = ctx.createGain();
      o.type = "triangle";
      o.frequency.setValueAtTime(140, t);
      o.frequency.exponentialRampToValueAtTime(70, t + 0.12);
      this.env(og, t, 0.002, 0.16, 0.1);
      this.out(o, og);
      o.start(t);
      o.stop(t + 0.18);
    });
  }

  dynamite() {
    void this.ensure().then((ctx) => {
      if (!ctx || !this.master || this.muted) return;
      const t = ctx.currentTime;
      const fuse = this.noise(ctx, 0.16);
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 2500;
      const fg = ctx.createGain();
      fuse.connect(hp);
      hp.connect(fg);
      fg.connect(this.master);
      this.env(fg, t, 0.01, 0.16, 0.07);
      fuse.start(t);
      fuse.stop(t + 0.18);
      const boomT = t + 0.14;
      const n = this.noise(ctx, 0.35);
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.setValueAtTime(900, boomT);
      lp.frequency.exponentialRampToValueAtTime(80, boomT + 0.3);
      const g = ctx.createGain();
      n.connect(lp);
      lp.connect(g);
      g.connect(this.master);
      this.env(g, boomT, 0.004, 0.38, 0.22);
      n.start(boomT);
      n.stop(boomT + 0.4);
      const o = ctx.createOscillator();
      const og = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(70, boomT);
      o.frequency.exponentialRampToValueAtTime(28, boomT + 0.32);
      this.env(og, boomT, 0.004, 0.4, 0.18);
      this.out(o, og);
      o.start(boomT);
      o.stop(boomT + 0.42);
    });
  }

  cannon() {
    void this.ensure().then((ctx) => {
      if (!ctx || !this.master || this.muted) return;
      const t = ctx.currentTime;
      const n = this.noise(ctx, 0.55);
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.setValueAtTime(220, t);
      lp.frequency.exponentialRampToValueAtTime(55, t + 0.5);
      const g = ctx.createGain();
      n.connect(lp);
      lp.connect(g);
      g.connect(this.master);
      this.env(g, t, 0.006, 0.55, 0.28);
      n.start(t);
      n.stop(t + 0.56);
      const o = ctx.createOscillator();
      const og = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(48, t);
      o.frequency.exponentialRampToValueAtTime(22, t + 0.5);
      this.env(og, t, 0.008, 0.6, 0.22);
      this.out(o, og);
      o.start(t);
      o.stop(t + 0.62);
      [392, 415, 494].forEach((f, i) => {
        const ot = t + 0.12 + i * 0.09;
        const h = ctx.createOscillator();
        const hg = ctx.createGain();
        h.type = "sine";
        h.frequency.value = f;
        this.env(hg, ot, 0.02, 0.35, 0.045);
        this.out(h, hg);
        h.start(ot);
        h.stop(ot + 0.38);
      });
    });
  }

  cat() {
    void this.ensure().then((ctx) => {
      if (!ctx || this.muted) return;
      const t = ctx.currentTime;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(780, t);
      o.frequency.exponentialRampToValueAtTime(420, t + 0.18);
      this.env(g, t, 0.02, 0.22, 0.04);
      this.out(o, g);
      o.start(t);
      o.stop(t + 0.24);
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
      o.frequency.exponentialRampToValueAtTime(90, t + 0.5);
      this.env(g, t, 0.02, 0.55, 0.08);
      this.out(o, g);
      o.start(t);
      o.stop(t + 0.56);
    });
  }

  win() {
    void this.ensure().then((ctx) => {
      if (!ctx || !this.master || this.muted) return;
      const hijaz = [392, 415, 494, 587, 622];
      hijaz.forEach((f, i) => {
        const t = ctx.currentTime + i * 0.16;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sine";
        o.frequency.value = f;
        this.env(g, t, 0.04, 0.7, 0.07);
        this.out(o, g);
        o.start(t);
        o.stop(t + 0.72);
      });
      const t = ctx.currentTime + 0.9;
      const n = this.noise(ctx, 0.15);
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 900;
      const g = ctx.createGain();
      n.connect(bp);
      bp.connect(g);
      g.connect(this.master);
      this.env(g, t, 0.01, 0.14, 0.05);
      n.start(t);
      n.stop(t + 0.16);
    });
  }

  startNight() {
    void this.ensure().then((ctx) => {
      if (!ctx || !this.master || this.muted || this.amb) return;
      const windSrc = this.noise(ctx, 4);
      windSrc.loop = true;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 280;
      const wg = ctx.createGain();
      wg.gain.value = 0.018;
      windSrc.connect(lp);
      lp.connect(wg);
      wg.connect(this.master);
      windSrc.start();

      const chirp = () => {
        if (this.muted || !this.ctx || !this.master) return;
        const t = this.ctx.currentTime;
        const n = this.noise(this.ctx, 0.04);
        const bp = this.ctx.createBiquadFilter();
        bp.type = "bandpass";
        bp.frequency.value = 4200 + Math.random() * 800;
        bp.Q.value = 8;
        const g = this.ctx.createGain();
        n.connect(bp);
        bp.connect(g);
        g.connect(this.master);
        this.env(g, t, 0.004, 0.045, 0.03);
        n.start(t);
        n.stop(t + 0.05);
      };
      const id = window.setInterval(chirp, 1400 + Math.random() * 800);

      const pad = ctx.createOscillator();
      const pg = ctx.createGain();
      pad.type = "sine";
      pad.frequency.value = 98;
      pg.gain.value = 0.012;
      pad.connect(pg);
      pg.connect(this.master);
      pad.start();

      const hijaz = ctx.createOscillator();
      const hg = ctx.createGain();
      hijaz.type = "sine";
      hijaz.frequency.value = 146.8;
      hg.gain.value = 0.008;
      hijaz.connect(hg);
      hg.connect(this.master);
      hijaz.start();

      const crackle = () => {
        if (this.muted || !this.ctx || !this.master) return;
        const t = this.ctx.currentTime;
        const n = this.noise(this.ctx, 0.08);
        const hp = this.ctx.createBiquadFilter();
        hp.type = "highpass";
        hp.frequency.value = 1800;
        const g = this.ctx.createGain();
        n.connect(hp);
        hp.connect(g);
        g.connect(this.master);
        this.env(g, t, 0.004, 0.08, 0.02);
        n.start(t);
        n.stop(t + 0.09);
      };
      const crackId = window.setInterval(crackle, 900 + Math.random() * 700);

      this.amb = {
        stop: () => {
          window.clearInterval(id);
          window.clearInterval(crackId);
          try {
            windSrc.stop();
            pad.stop();
            hijaz.stop();
          } catch {
            /* closed */
          }
          wg.disconnect();
          pg.disconnect();
          hg.disconnect();
        },
      };
    });
  }

  stopNight() {
    this.amb?.stop();
    this.amb = null;
  }
}

export const audio = new AudioEngine();
