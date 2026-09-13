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
      this.master.gain.value = 0.86;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") await this.ctx.resume();
    return this.ctx;
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.86;
    if (m) this.stopShop();
  }

  private env(g: GainNode, t: number, a: number, d: number, peak: number) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  }

  private noise(ctx: AudioContext, dur: number, kind: "white" | "brown" = "white") {
    const n = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    if (kind === "brown") {
      let last = 0;
      for (let i = 0; i < d.length; i++) {
        last = (last + (Math.random() * 2 - 1) * 0.07) * 0.96;
        d[i] = Math.max(-1, Math.min(1, last * 3.2));
      }
    } else {
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
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
      const n = this.noise(ctx, 0.07);
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 900;
      bp.Q.value = 1.4;
      const g = ctx.createGain();
      n.connect(bp);
      bp.connect(g);
      g.connect(this.master);
      this.env(g, t, 0.004, 0.07, 0.08);
      n.start(t);
      n.stop(t + 0.08);
    });
  }

  swap() {
    void this.ensure().then((ctx) => {
      if (!ctx || !this.master || this.muted) return;
      const t = ctx.currentTime;
      const n = this.noise(ctx, 0.09, "brown");
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.setValueAtTime(700, t);
      lp.frequency.exponentialRampToValueAtTime(280, t + 0.08);
      const g = ctx.createGain();
      n.connect(lp);
      lp.connect(g);
      g.connect(this.master);
      this.env(g, t, 0.004, 0.09, 0.14);
      n.start(t);
      n.stop(t + 0.1);
    });
  }

  ignite(_size: number) {
    void this.ensure().then((ctx) => {
      if (!ctx || !this.master || this.muted) return;
      const t = ctx.currentTime;
      const n = this.noise(ctx, 0.11);
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 1100;
      bp.Q.value = 1.8;
      const g = ctx.createGain();
      n.connect(bp);
      bp.connect(g);
      g.connect(this.master);
      this.env(g, t, 0.002, 0.1, 0.16);
      n.start(t);
      n.stop(t + 0.11);
      const th = this.noise(ctx, 0.08, "brown");
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 220;
      const tg = ctx.createGain();
      th.connect(lp);
      lp.connect(tg);
      tg.connect(this.master);
      this.env(tg, t, 0.003, 0.09, 0.12);
      th.start(t);
      th.stop(t + 0.09);
    });
  }

  juice() {
    void this.ensure().then((ctx) => {
      if (!ctx || !this.master || this.muted) return;
      const t = ctx.currentTime;
      const n = this.noise(ctx, 0.7, "brown");
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.setValueAtTime(380, t);
      lp.frequency.exponentialRampToValueAtTime(1400, t + 0.18);
      lp.frequency.exponentialRampToValueAtTime(420, t + 0.62);
      const g = ctx.createGain();
      n.connect(lp);
      lp.connect(g);
      g.connect(this.master);
      this.env(g, t, 0.04, 0.66, 0.2);
      n.start(t);
      n.stop(t + 0.7);
      for (let i = 0; i < 7; i++) {
        const b = this.noise(ctx, 0.045);
        const bp = ctx.createBiquadFilter();
        bp.type = "bandpass";
        bp.frequency.value = 900 + Math.random() * 900;
        bp.Q.value = 3;
        const bg = ctx.createGain();
        b.connect(bp);
        bp.connect(bg);
        bg.connect(this.master);
        const bt = t + 0.05 + i * 0.08;
        this.env(bg, bt, 0.004, 0.05, 0.07);
        b.start(bt);
        b.stop(bt + 0.06);
      }
    });
  }

  prism() {
    void this.ensure().then((ctx) => {
      if (!ctx || !this.master || this.muted) return;
      const t = ctx.currentTime;
      const n = this.noise(ctx, 0.4);
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.setValueAtTime(1800, t);
      bp.frequency.exponentialRampToValueAtTime(4200, t + 0.22);
      bp.Q.value = 2.2;
      const g = ctx.createGain();
      n.connect(bp);
      bp.connect(g);
      g.connect(this.master);
      this.env(g, t, 0.02, 0.36, 0.1);
      n.start(t);
      n.stop(t + 0.4);
      const glass = ctx.createOscillator();
      const gg = ctx.createGain();
      glass.type = "sine";
      glass.frequency.setValueAtTime(1480, t);
      glass.frequency.exponentialRampToValueAtTime(2100, t + 0.28);
      this.env(gg, t, 0.01, 0.3, 0.04);
      this.out(glass, gg);
      glass.start(t);
      glass.stop(t + 0.32);
    });
  }

  light() {
    void this.ensure().then((ctx) => {
      if (!ctx || !this.master || this.muted) return;
      const t = ctx.currentTime;
      const n = this.noise(ctx, 0.38, "brown");
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.setValueAtTime(700, t);
      bp.frequency.exponentialRampToValueAtTime(1600, t + 0.1);
      bp.frequency.exponentialRampToValueAtTime(500, t + 0.32);
      const g = ctx.createGain();
      n.connect(bp);
      bp.connect(g);
      g.connect(this.master);
      this.env(g, t, 0.02, 0.34, 0.16);
      n.start(t);
      n.stop(t + 0.38);
    });
  }

  ice() {
    void this.ensure().then((ctx) => {
      if (!ctx || !this.master || this.muted) return;
      const t = ctx.currentTime;
      const n = this.noise(ctx, 0.14);
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 2800;
      const g = ctx.createGain();
      n.connect(hp);
      hp.connect(g);
      g.connect(this.master);
      this.env(g, t, 0.002, 0.12, 0.11);
      n.start(t);
      n.stop(t + 0.14);
      const o = ctx.createOscillator();
      const og = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(2400, t);
      o.frequency.exponentialRampToValueAtTime(1600, t + 0.12);
      this.env(og, t, 0.002, 0.12, 0.05);
      this.out(o, og);
      o.start(t);
      o.stop(t + 0.13);
    });
  }

  daff() {
    this.ignite(3);
  }

  fail() {
    void this.ensure().then((ctx) => {
      if (!ctx || !this.master || this.muted) return;
      const t = ctx.currentTime;
      const n = this.noise(ctx, 0.28, "brown");
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.setValueAtTime(240, t);
      lp.frequency.exponentialRampToValueAtTime(80, t + 0.24);
      const g = ctx.createGain();
      n.connect(lp);
      lp.connect(g);
      g.connect(this.master);
      this.env(g, t, 0.01, 0.26, 0.16);
      n.start(t);
      n.stop(t + 0.28);
    });
  }

  win() {
    void this.ensure().then((ctx) => {
      if (!ctx || this.muted) return;
      this.juice();
      const t = (ctx.currentTime || 0) + 0.35;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(980, t);
      o.frequency.exponentialRampToValueAtTime(420, t + 0.22);
      this.env(g, t, 0.004, 0.24, 0.06);
      this.out(o, g);
      o.start(t);
      o.stop(t + 0.26);
    });
  }

  startShop() {
    void this.ensure().then((ctx) => {
      if (!ctx || !this.master || this.muted || this.amb) return;
      const rustle = () => {
        if (this.muted || !this.ctx || !this.master) return;
        const t = this.ctx.currentTime;
        const n = this.noise(this.ctx, 0.22);
        const bp = this.ctx.createBiquadFilter();
        bp.type = "bandpass";
        bp.frequency.value = 2100 + Math.random() * 800;
        bp.Q.value = 0.9;
        const g = this.ctx.createGain();
        n.connect(bp);
        bp.connect(g);
        g.connect(this.master);
        this.env(g, t, 0.04, 0.2, 0.018);
        n.start(t);
        n.stop(t + 0.22);
      };
      const bird = () => {
        if (this.muted || !this.ctx || !this.master) return;
        const t = this.ctx.currentTime;
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = "sine";
        const f = 1800 + Math.random() * 900;
        o.frequency.setValueAtTime(f, t);
        o.frequency.exponentialRampToValueAtTime(f * 0.72, t + 0.07);
        this.env(g, t, 0.008, 0.09, 0.03);
        o.connect(g);
        g.connect(this.master);
        o.start(t);
        o.stop(t + 0.1);
        const o2 = this.ctx.createOscillator();
        const g2 = this.ctx.createGain();
        o2.type = "sine";
        o2.frequency.setValueAtTime(f * 1.12, t + 0.08);
        o2.frequency.exponentialRampToValueAtTime(f * 0.8, t + 0.16);
        this.env(g2, t + 0.08, 0.006, 0.08, 0.024);
        o2.connect(g2);
        g2.connect(this.master);
        o2.start(t + 0.08);
        o2.stop(t + 0.18);
      };
      rustle();
      const rId = window.setInterval(rustle, 1400);
      const bId = window.setInterval(bird, 3200);
      this.amb = {
        stop: () => {
          window.clearInterval(rId);
          window.clearInterval(bId);
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
