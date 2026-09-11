import { FLAVORS } from "./data";
import type {
  FailReason,
  Flavor,
  Hazard,
  Input,
  Particle,
  Run,
  Scoop,
  Stage,
} from "./types";

export type { Input } from "./types";

function mulberry(seed: number) {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function dist(ax: number, ay: number, bx: number, by: number) {
  return Math.hypot(ax - bx, ay - by);
}

function addParticle(run: Run, p: Particle) {
  run.particles.push(p);
  if (run.particles.length > 90) run.particles.splice(0, run.particles.length - 90);
}

function shout(run: Run, text: string, x: number, y: number, color = "#fff") {
  run.callouts.push({ text, x, y, life: 1.15, color });
  if (run.callouts.length > 6) run.callouts.shift();
}

function makeScoop(x: number, y: number, vx: number): Scoop {
  return {
    x,
    y,
    vx,
    vy: -80,
    r: 28,
    melt: 1,
    squish: 0,
    blink: 0,
    legs: 0,
  };
}

function spread(
  n: number,
  start: number,
  end: number,
  rng: () => number
): number[] {
  if (n <= 0) return [];
  const xs: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i + 0.25 + rng() * 0.5) / n;
    xs.push(start + (end - start) * t);
  }
  return xs;
}

function spawnHazards(run: Run, stage: Stage) {
  const rng = run.rng;
  const g = run.ground;
  const a = 520;
  const b = run.worldW - 360;
  const put = (kind: Hazard["kind"], x: number, extra?: Partial<Hazard>) => {
    const h: Hazard = {
      kind,
      x,
      y: g,
      vx: 0,
      minX: x - 180,
      maxX: x + 180,
      phase: rng() * Math.PI * 2,
      w: 48,
      h: 40,
      ...extra,
    };
    run.hazards.push(h);
  };

  for (const x of spread(stage.dogs, a, b, rng)) {
    put("dog", x, { vx: 70 + rng() * 40, w: 54, h: 34 });
  }
  for (const x of spread(stage.kids, a, b, rng)) {
    put("kid", x, { vx: 40 + rng() * 20, w: 36, h: 52 });
  }
  for (const x of spread(stage.buses, a, b, rng)) {
    put("bus", x, { vx: -160 - rng() * 40, w: 150, h: 70, minX: 0, maxX: run.worldW });
  }
  for (const x of spread(stage.drains, a, b, rng)) {
    put("drain", x, { w: 46, h: 18 });
  }
  for (const x of spread(stage.fans, a, b, rng)) {
    put("fan", x, { y: g - 90, w: 40, h: 40 });
  }
  for (const x of spread(stage.awnings, a, b, rng)) {
    put("awning", x, { y: g - 150, w: 160, h: 24 });
  }
  for (const x of spread(stage.acs, a, b, rng)) {
    put("ac", x, { y: g - 120, w: 44, h: 28 });
  }
  for (const x of spread(stage.seagulls, a, b, rng)) {
    put("seagull", x, { y: g - 180, vx: 50, w: 40, h: 20 });
  }
  for (const x of spread(stage.cats, a, b, rng)) {
    put("cat", x, { vx: 90 + rng() * 30, w: 44, h: 28 });
  }
}

export function createRun(opts: {
  stage: Stage;
  endless?: boolean;
  viewW: number;
  viewH: number;
  seed?: number;
}): Run {
  const stage = opts.stage;
  const flavor: Flavor = { ...FLAVORS[stage.flavor] };
  if (stage.tutorial) flavor.flee *= 0.62;
  const rng = mulberry(opts.seed ?? stage.id * 997 + 13);
  const ground = opts.viewH * 0.78;
  const run: Run = {
    stage,
    flavor,
    endless: !!opts.endless,
    wave: 1,
    score: 0,
    catches: 0,
    viewW: opts.viewW,
    viewH: opts.viewH,
    ground,
    worldW: opts.endless ? 5000 : stage.length,
    camX: 0,
    shake: 0,
    time: 0,
    intro: 1.6,
    phase: "intro",
    phaseT: 0,
    fail: null,
    tongue: 0,
    tongueMax: 168,
    didTongueCatch: false,
    missArmed: false,
    cone: { x: 140, y: ground, vx: 0, legs: 0 },
    hooked: null,
    scoops: [makeScoop(420, ground - 90, 90)],
    hazards: [],
    particles: [],
    callouts: [],
    rng,
    stars: 0,
  };
  spawnHazards(run, stage);
  shout(run, stage.blurb, 420, ground - 160, "#fff7d6");
  return run;
}

export function makeEndlessStage(wave: number): Stage {
  const flavors: Flavor["id"][] = [
    "vanilla",
    "chocolate",
    "mango",
    "pistachio",
    "strawberry",
  ];
  const id = flavors[(wave - 1) % flavors.length]!;
  const t = Math.min(wave, 12);
  return {
    id: 0,
    name: `موجة ${wave}`,
    blurb: wave === 1 ? "إلحقها… ومفيش نهاية" : "كمان واحدة!",
    flavor: id,
    theme: (["market", "noon", "beach", "night", "bus", "grill"] as const)[
      (wave - 1) % 6
    ]!,
    length: 2800 + wave * 180,
    melt: 0.05 + t * 0.006,
    sun: 0.3 + (t % 5) * 0.12,
    wind: wave > 6 ? 40 : 0,
    dogs: Math.min(1 + Math.floor(wave / 3), 4),
    kids: wave > 2 ? Math.min(Math.floor(wave / 4), 3) : 0,
    buses: wave > 5 ? 1 : 0,
    drains: wave > 4 ? Math.min(Math.floor(wave / 4), 3) : 0,
    fans: wave > 3 ? 1 : 0,
    awnings: 2,
    acs: wave % 2,
    seagulls: wave > 7 ? 1 : 0,
    cats: wave > 8 ? 2 : 0,
  };
}

function underShade(run: Run, x: number): boolean {
  return run.hazards.some(
    (h) =>
      (h.kind === "awning" || h.kind === "ac") &&
      Math.abs(h.x - x) < h.w * 0.55
  );
}

function inSun(run: Run, x: number): boolean {
  if (run.stage.theme === "mall" || run.stage.theme === "night") return false;
  return !underShade(run, x);
}

function fail(run: Run, reason: FailReason, scoop: Scoop) {
  if (run.phase !== "play") return;
  run.phase = "fail";
  run.phaseT = 0;
  run.fail = reason;
  run.shake = 10;
  shout(
    run,
    pick(run.rng, {
      melt: ["ذابت!", "موية!"],
      dog: ["الكلب!"],
      kid: ["الملعقة!"],
      drain: ["بلوب!"],
      bus: ["الأوتوبيس!"],
      seagull: ["النورس!"],
      cat: ["مياو!"],
    }[reason]),
    scoop.x,
    scoop.y - 50,
    "#ffe082"
  );
  for (let i = 0; i < 18; i++) {
    addParticle(run, {
      x: scoop.x,
      y: scoop.y,
      vx: (run.rng() - 0.5) * 220,
      vy: -80 - run.rng() * 180,
      life: 0.7 + run.rng() * 0.4,
      max: 1,
      kind: reason === "melt" ? "drip" : "puff",
      color: run.flavor.color,
      s: 4 + run.rng() * 6,
    });
  }
}

function startCatch(run: Run, scoop: Scoop, withTongue: boolean) {
  if (run.phase !== "play") return;
  run.phase = "catch";
  run.phaseT = 0;
  run.hooked = scoop;
  run.didTongueCatch = run.didTongueCatch || withTongue;
  run.shake = 6;
  shout(run, pick(run.rng, ["لحس!", "في البق!", "ثبّت!"]), scoop.x, scoop.y - 46, "#fff");
  for (let i = 0; i < 22; i++) {
    addParticle(run, {
      x: scoop.x,
      y: scoop.y,
      vx: (run.rng() - 0.5) * 260,
      vy: -60 - run.rng() * 220,
      life: 0.6 + run.rng() * 0.5,
      max: 1,
      kind: "sprinkle",
      color: pick(run.rng, ["#ff5b7a", "#ffd447", "#7dffce", "#82cfff", "#fff"]),
      s: 3 + run.rng() * 4,
    });
  }
}

function nextEndless(run: Run) {
  run.catches += 1;
  run.score += 100 + Math.floor(run.scoops[0]?.melt ?? 0.5) * 80 + run.wave * 10;
  run.wave += 1;
  const stage = makeEndlessStage(run.wave);
  run.stage = stage;
  run.flavor = { ...FLAVORS[stage.flavor] };
  run.worldW = stage.length;
  run.hazards = [];
  spawnHazards(run, stage);
  const x = run.cone.x + 380;
  run.scoops = [makeScoop(x, run.ground - 80, 110)];
  run.phase = "play";
  run.phaseT = 0;
  run.tongue = 0;
  shout(run, `موجة ${run.wave} — ${run.flavor.name}`, x, run.ground - 150, "#fff7d6");
}

function maybeSplit(run: Run, scoop: Scoop) {
  if (!run.flavor.split) return;
  if (scoop.melt > 0.46) return;
  if (run.scoops.length > 1) return;
  const twin = makeScoop(scoop.x + 16, scoop.y - 10, -scoop.vx - 80);
  twin.melt = scoop.melt;
  twin.r = scoop.r;
  scoop.vx += 90;
  run.scoops.push(twin);
  shout(run, "اتقسّمت!", scoop.x, scoop.y - 54, "#ffd0e0");
}

export function step(run: Run, dt: number, input: Input) {
  const t = clamp(dt, 0, 0.05);
  run.viewH = Math.max(run.viewH, 1);
  run.ground = run.viewH * 0.78;
  run.time += t;
  run.shake *= Math.pow(0.04, t);

  if (input.paused && run.phase === "play") {
    tickFx(run, t);
    return;
  }

  if (run.phase === "intro") {
    run.intro -= t;
    updateCone(run, t, input, true);
    tickFx(run, t);
    updateCam(run);
    if (run.intro <= 0) {
      run.phase = "play";
      shout(run, "هَرَبَت!", run.scoops[0]?.x ?? 400, run.ground - 140, "#fff");
    }
    return;
  }

  if (run.phase === "catch") {
    run.phaseT += t;
    const scoop = run.hooked;
    if (scoop) {
      const tx = run.cone.x;
      const ty = run.cone.y - 62;
      scoop.x += (tx - scoop.x) * 8 * t;
      scoop.y += (ty - scoop.y) * 8 * t;
      scoop.r += (18 - scoop.r) * 5 * t;
      scoop.squish = Math.sin(run.phaseT * 22) * 0.12;
    }
    run.tongue = Math.max(0, run.tongue - 600 * t);
    tickFx(run, t);
    updateCam(run);
    if (run.phaseT > 0.55) {
      if (scoop) run.scoops = run.scoops.filter((s) => s !== scoop);
      run.hooked = null;
      run.catches += 1;
      if (run.endless) {
        nextEndless(run);
      } else if (run.scoops.length === 0) {
        const leftover = scoop?.melt ?? 0.4;
        run.score = Math.floor(leftover * 120 + (run.didTongueCatch ? 30 : 0));
        run.stars =
          leftover > 0.55 && run.didTongueCatch ? 3 : leftover > 0.32 ? 2 : 1;
        run.phase = "won";
        run.phaseT = 0;
        shout(run, pick(run.rng, ["في البق!", "يا حلاوة"]), run.cone.x, run.cone.y - 120, "#fff");
      } else {
        run.phase = "play";
        run.phaseT = 0;
        shout(run, "كمان واحدة!", run.cone.x, run.cone.y - 110, "#ffd0e0");
      }
    }
    return;
  }

  if (run.phase === "won" || run.phase === "fail") {
    run.phaseT += t;
    if (run.phase === "fail") {
      for (const s of run.scoops) {
        if (run.fail === "melt") {
          s.r = Math.max(6, s.r - 18 * t);
          s.y += 10 * t;
          s.squish = 0.6;
        } else {
          s.x += s.vx * t;
          s.y += s.vy * t;
        }
      }
    }
    tickFx(run, t);
    updateCam(run);
    return;
  }

  updateCone(run, t, input, false);
  updateTongue(run, t, input);
  updateScoops(run, t);
  updateHazards(run, t);
  collisions(run);
  tickFx(run, t);
  updateCam(run);
}

function updateCone(run: Run, t: number, input: Input, intro: boolean) {
  const cone = run.cone;
  cone.y = run.ground;
  const speed = (intro ? 380 : 460) * (input.licking ? 0.58 : 1);
  if (input.pointerX != null) {
    const diff = input.pointerX - cone.x;
    const max = speed * t;
    const stepX = clamp(diff, -max, max);
    cone.vx = stepX / Math.max(t, 0.0001);
    cone.x += stepX;
  } else {
    cone.vx *= Math.pow(0.02, t);
    cone.x += cone.vx * t;
  }
  cone.x = clamp(cone.x, 50, run.worldW - 50);
  cone.legs += Math.abs(cone.vx) * t * 0.08;
}

function scoopTarget(run: Run): Scoop | null {
  let best: Scoop | null = null;
  let bestD = Infinity;
  for (const s of run.scoops) {
    const d = dist(run.cone.x, run.cone.y - 50, s.x, s.y);
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return best;
}

function updateTongue(run: Run, t: number, input: Input) {
  if (input.licking) {
    run.tongue = Math.min(run.tongueMax, run.tongue + 920 * t);
    if (run.tongue > run.tongueMax * 0.72) run.missArmed = true;
  } else {
    if (run.missArmed && run.tongue > 40) {
      shout(run, "إوعي!", run.cone.x + 40, run.cone.y - 90, "#ffe082");
    }
    run.missArmed = false;
    run.tongue = Math.max(0, run.tongue - 1500 * t);
  }

  const scoop = scoopTarget(run);
  if (!scoop || run.tongue < 18) return;
  const topX = run.cone.x;
  const topY = run.cone.y - 58;
  const d = dist(topX, topY, scoop.x, scoop.y);
  if (d < 1) return;
  const ux = (scoop.x - topX) / d;
  const uy = (scoop.y - topY) / d;
  const len = Math.min(run.tongue, d);
  const tipX = topX + ux * len;
  const tipY = topY + uy * len;
  if (dist(tipX, tipY, scoop.x, scoop.y) < scoop.r + 12) {
    run.missArmed = false;
    startCatch(run, scoop, true);
  }
}

function updateScoops(run: Run, t: number) {
  const g = 980;
  for (const s of run.scoops) {
    const dx = s.x - run.cone.x;
    const dy = s.y - (run.cone.y - 50);
    const d = Math.hypot(dx, dy) || 1;

    if (d < 300) {
      s.vx += (dx / d) * 240 * run.flavor.flee * t;
      s.vy += (dy / d) * 40 * t;
    }
    s.vx += Math.sin(run.time * 3.1 + s.x * 0.01) * 70 * t;
    s.vx += run.stage.wind * t;
    s.vx *= Math.pow(1 - run.flavor.sticky * 0.9, t * 4);

    // curiosity toward nearest "fun" hazard
    let attract: Hazard | null = null;
    let ad = 220;
    for (const h of run.hazards) {
      if (h.kind === "awning" || h.kind === "ac") continue;
      const hd = Math.abs(h.x - s.x);
      if (hd < ad && d > 140) {
        ad = hd;
        attract = h;
      }
    }
    if (attract) s.vx += Math.sign(attract.x - s.x) * 50 * t;

    if (s.y >= run.ground - s.r - 1 && Math.abs(s.vy) < 30 && run.rng() < 0.012) {
      s.vy = -340 * run.flavor.jump;
    }

    s.vy += g * t;
    s.x += s.vx * t;
    s.y += s.vy * t;

    const maxV = 280 * run.flavor.flee + 40;
    s.vx = clamp(s.vx, -maxV, maxV);

    if (s.y > run.ground - s.r) {
      s.y = run.ground - s.r;
      if (s.vy > 0) {
        s.vy *= -0.42 * run.flavor.bounce;
        s.squish = 0.28;
        if (Math.abs(s.vy) < 50) s.vy = 0;
        addParticle(run, {
          x: s.x,
          y: run.ground - 4,
          vx: 0,
          vy: 0,
          life: 0.25,
          max: 0.25,
          kind: "puff",
          color: "rgba(0,0,0,0.12)",
          s: 16,
        });
      }
    }
    if (s.x < 80) {
      s.x = 80;
      s.vx = Math.abs(s.vx) * 0.8;
    }
    if (s.x > run.worldW - 80) {
      s.x = run.worldW - 80;
      s.vx = -Math.abs(s.vx) * 0.8;
    }

    s.squish *= Math.pow(0.04, t);
    s.legs += Math.abs(s.vx) * t * 0.1;
    if (s.blink > 0) s.blink -= t;
    else if (run.rng() < 0.008) s.blink = 0.12;

    const hot = inSun(run, s.x);
    const ac = run.hazards.some(
      (h) => h.kind === "ac" && Math.abs(h.x - s.x) < 70
    );
    let melt =
      run.stage.melt *
      run.flavor.melt *
      (hot ? 1 + run.stage.sun * 0.9 : 0.55) *
      (ac ? 0.35 : 1);
    if (run.stage.boss && hot) melt *= 1.35;
    s.melt -= melt * t;
    s.r = 16 + 14 * Math.max(0, s.melt);

    if (run.rng() < 0.35 * t * 8 + (1 - s.melt) * 0.2) {
      addParticle(run, {
        x: s.x + (run.rng() - 0.5) * s.r,
        y: s.y + s.r * 0.4,
        vx: (run.rng() - 0.5) * 20,
        vy: 40 + run.rng() * 40,
        life: 0.5,
        max: 0.5,
        kind: "drip",
        color: run.flavor.color,
        s: 3 + run.rng() * 3,
      });
    }
    if (hot && run.rng() < 0.08) {
      addParticle(run, {
        x: s.x + 12,
        y: s.y - 16,
        vx: 10,
        vy: -20,
        life: 0.5,
        max: 0.5,
        kind: "sweat",
        color: "#cfefff",
        s: 3,
      });
    }

    if (s.melt <= 0) fail(run, "melt", s);
    maybeSplit(run, s);

    // direct seat catch
    if (d < s.r + 22 && s.y > run.cone.y - 90) {
      startCatch(run, s, false);
    }
  }
}

function updateHazards(run: Run, t: number) {
  const scoop = scoopTarget(run);
  for (const h of run.hazards) {
    h.phase += t;
    if (h.kind === "dog" || h.kind === "kid" || h.kind === "cat") {
      if (scoop && Math.abs(scoop.x - h.x) < 260) {
        h.vx = Math.sign(scoop.x - h.x) * Math.abs(h.vx || 70);
      }
      h.x += h.vx * t;
      if (h.x < h.minX || h.x > h.maxX) h.vx *= -1;
    }
    if (h.kind === "bus") {
      h.x += h.vx * t;
      if (h.x < -120) h.x = run.worldW + 80;
    }
    if (h.kind === "seagull") {
      h.x += h.vx * t + Math.sin(h.phase * 2) * 10 * t;
      h.y = run.ground - 160 + Math.sin(h.phase * 3) * 28;
      if (scoop) h.vx += Math.sign(scoop.x - h.x) * 30 * t;
      h.vx = clamp(h.vx, -90, 90);
    }
    if (h.kind === "fan" && scoop && Math.abs(scoop.x - h.x) < 70 && scoop.y > h.y - 20) {
      scoop.vy -= 420 * t;
      scoop.vx += 30 * t;
    }
  }
}

function collisions(run: Run) {
  if (run.phase !== "play") return;
  for (const s of run.scoops) {
    for (const h of run.hazards) {
      const dx = Math.abs(s.x - h.x);
      if (h.kind === "dog" && dx < 36 && s.y > run.ground - s.r - 24) {
        fail(run, "dog", s);
        return;
      }
      if (h.kind === "kid" && dx < 42 && s.y > run.ground - 80) {
        fail(run, "kid", s);
        return;
      }
      if (h.kind === "cat" && dx < 34 && s.y > run.ground - s.r - 20) {
        fail(run, "cat", s);
        return;
      }
      if (h.kind === "drain" && dx < 22 && s.y >= run.ground - s.r - 2) {
        fail(run, "drain", s);
        return;
      }
      if (h.kind === "bus" && dx < 28 && s.y > run.ground - 70) {
        fail(run, "bus", s);
        return;
      }
      if (h.kind === "seagull" && dist(s.x, s.y, h.x, h.y) < 28) {
        fail(run, "seagull", s);
        return;
      }
    }
  }
}

function tickFx(run: Run, t: number) {
  for (const p of run.particles) {
    p.life -= t;
    p.x += p.vx * t;
    p.y += p.vy * t;
    p.vy += (p.kind === "drip" || p.kind === "sprinkle" ? 420 : 80) * t;
  }
  run.particles = run.particles.filter((p) => p.life > 0);
  for (const c of run.callouts) c.life -= t;
  run.callouts = run.callouts.filter((c) => c.life > 0);
}

function updateCam(run: Run) {
  const focus = run.scoops[0]?.x ?? run.cone.x;
  const target = clamp(
    focus - run.viewW * 0.38,
    0,
    Math.max(0, run.worldW - run.viewW)
  );
  run.camX += (target - run.camX) * 0.08;
}

export function tongueTip(run: Run): { x: number; y: number; on: boolean } {
  const scoop = scoopTarget(run);
  const topX = run.cone.x;
  const topY = run.cone.y - 58;
  if (!scoop || run.tongue < 4) return { x: topX, y: topY, on: false };
  const d = dist(topX, topY, scoop.x, scoop.y) || 1;
  const len = Math.min(run.tongue, d);
  return {
    x: topX + ((scoop.x - topX) / d) * len,
    y: topY + ((scoop.y - topY) / d) * len,
    on: true,
  };
}
