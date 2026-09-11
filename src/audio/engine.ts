export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private ambient: { stop: () => void } | null = null;
  muted = false;

  async ensure() {
    if (this.muted) return null;
    if (!this.ctx) {
      const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new C();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.7;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") await this.ctx.resume();
    return this.ctx;
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.7;
    if (m) this.stopAmbient();
  }

  private env(g: GainNode, t: number, a: number, s: number, d: number, peak = 0.2) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak * s), t + a + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  }

  private tone(freq: number, dur: number, type: OscillatorType = "sine", peak = 0.12) {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master || this.muted) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    o.connect(g);
    g.connect(master);
    const t = ctx.currentTime;
    this.env(g, t, 0.02, 0.4, dur, peak);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  lick() {
    void this.ensure().then(() => {
      this.tone(420, 0.12, "sine", 0.1);
      this.tone(640, 0.16, "triangle", 0.06);
    });
  }

  catch() {
    void this.ensure().then((ctx) => {
      if (!ctx) return;
      [523, 659, 784, 1046].forEach((f, i) => {
        setTimeout(() => this.tone(f, 0.16, "triangle", 0.1), i * 70);
      });
    });
  }

  fail() {
    void this.ensure().then(() => {
      this.tone(320, 0.22, "sawtooth", 0.06);
      setTimeout(() => this.tone(220, 0.35, "triangle", 0.08), 120);
    });
  }

  bark() {
    void this.ensure().then((ctx) => {
      if (!ctx || !this.master || this.muted) return;
      const t = ctx.currentTime;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "square";
      o.frequency.setValueAtTime(180, t);
      o.frequency.exponentialRampToValueAtTime(90, t + 0.12);
      o.connect(g);
      g.connect(this.master);
      this.env(g, t, 0.01, 0.3, 0.16, 0.08);
      o.start(t);
      o.stop(t + 0.18);
    });
  }

  horn() {
    void this.ensure().then(() => {
      this.tone(410, 0.18, "square", 0.04);
      this.tone(520, 0.18, "square", 0.03);
    });
  }

  drip() {
    void this.ensure().then(() => this.tone(880, 0.08, "sine", 0.04));
  }

  split() {
    void this.ensure().then(() => {
      this.tone(700, 0.1, "triangle", 0.08);
      this.tone(920, 0.12, "sine", 0.06);
    });
  }

  startAmbient() {
    void this.ensure().then((ctx) => {
      if (!ctx || !this.master || this.muted || this.ambient) return;
      const g = ctx.createGain();
      g.gain.value = 0.03;
      g.connect(this.master);
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = 196;
      o.connect(g);
      o.start();
      const notes = [523, 659, 784, 659, 523, 392];
      let i = 0;
      const id = window.setInterval(() => {
        if (this.muted) return;
        this.tone(notes[i % notes.length]!, 0.22, "triangle", 0.035);
        i++;
      }, 520);
      this.ambient = {
        stop: () => {
          window.clearInterval(id);
          o.stop();
          g.disconnect();
        },
      };
    });
  }

  stopAmbient() {
    this.ambient?.stop();
    this.ambient = null;
  }
}

export const audio = new AudioEngine();
