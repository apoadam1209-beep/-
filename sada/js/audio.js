/* صَدَى — الصوت (Web Audio، بلا أي ملفات) */
(function (root) {
  "use strict";
  const SADA = (root.SADA = root.SADA || {});

  let ctx = null;
  let master = null;
  let wet = null;
  let muted = false;
  let noiseBuf = null;

  function makeImpulse(seconds, decay) {
    const rate = ctx.sampleRate;
    const len = Math.floor(rate * seconds);
    const buf = ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    return buf;
  }

  function ensure() {
    if (ctx) return ctx;
    const AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.85;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 6;
    master.connect(comp);
    comp.connect(ctx.destination);
    // صدى خفيف يعطي الأجراس فضاءً
    wet = ctx.createConvolver();
    wet.buffer = makeImpulse(1.9, 2.6);
    const wetGain = ctx.createGain();
    wetGain.gain.value = 0.32;
    wet.connect(wetGain);
    wetGain.connect(master);
    // ضوضاء بيضاء جاهزة للمؤثرات
    const n = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = n.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    noiseBuf = n;
    return ctx;
  }

  function resume() {
    const c = ensure();
    if (c && c.state === "suspended") c.resume();
    return c;
  }

  /** جرس: مركّبات غير توافقية كالأجراس الحقيقية */
  function bell(freq, when, vel) {
    const c = ensure();
    if (!c || muted) return;
    const t = (when == null ? c.currentTime : when) + 0.001;
    const v = vel == null ? 0.5 : vel;
    const out = ctx.createGain();
    out.gain.value = v;
    out.connect(master);
    out.connect(wet);
    const partials = [
      [1, 1, 2.1],
      [2.0, 0.42, 1.5],
      [2.76, 0.28, 1.1],
      [5.42, 0.12, 0.6],
    ];
    for (const [mult, amp, dec] of partials) {
      const o = c.createOscillator();
      o.type = "sine";
      o.frequency.value = freq * mult * (1 + (Math.random() - 0.5) * 0.0016);
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(amp, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
      o.connect(g);
      g.connect(out);
      o.start(t);
      o.stop(t + dec + 0.05);
    }
  }

  /** همسة الموجة */
  function whoosh(vel) {
    const c = ensure();
    if (!c || muted) return;
    const t = c.currentTime;
    const s = c.createBufferSource();
    s.buffer = noiseBuf;
    s.loop = true;
    const bp = c.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 1.1;
    bp.frequency.setValueAtTime(240, t);
    bp.frequency.exponentialRampToValueAtTime(1500, t + 0.5);
    const g = c.createGain();
    const v = (vel == null ? 0.14 : vel);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.06);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    s.connect(bp);
    bp.connect(g);
    g.connect(master);
    s.start(t);
    s.stop(t + 0.65);
  }

  /** نقرة واجهة */
  function click(freq) {
    const c = ensure();
    if (!c || muted) return;
    const t = c.currentTime;
    const o = c.createOscillator();
    o.type = "triangle";
    o.frequency.value = freq || 520;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.07, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    o.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + 0.1);
  }

  function thud() {
    const c = ensure();
    if (!c || muted) return;
    const t = c.currentTime;
    const o = c.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(180, t);
    o.frequency.exponentialRampToValueAtTime(70, t + 0.3);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
    o.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + 0.36);
  }

  /** تألق الفوز */
  function sparkle(freqs) {
    const c = ensure();
    if (!c || muted) return;
    const t0 = c.currentTime + 0.05;
    (freqs || [523.25, 659.25, 783.99, 1046.5]).forEach((f, i) => {
      bell(f, t0 + i * 0.11, 0.32);
    });
    bell(1567.98, t0 + 0.5, 0.18);
  }

  function setMuted(m) {
    muted = !!m;
    if (master) master.gain.setTargetAtTime(muted ? 0 : 0.85, ctx.currentTime, 0.02);
  }
  function isMuted() {
    return muted;
  }

  function now() {
    const c = ensure();
    return c ? c.currentTime : 0;
  }

  SADA.audio = { resume, bell, whoosh, click, thud, sparkle, setMuted, isMuted, now };
})(typeof window !== "undefined" ? window : globalThis);
