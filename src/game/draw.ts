import type { Hazard, Run, Scoop, Theme } from "./types";
import { tongueTip } from "./world";

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function sky(theme: Theme): [string, string] {
  switch (theme) {
    case "night":
      return ["#0b1630", "#2a1d4a"];
    case "mall":
      return ["#d9e7f2", "#f4f0e8"];
    case "beach":
      return ["#6ec7ff", "#ffe7a8"];
    case "noon":
    case "boss":
      return ["#4aa7ff", "#ffe27a"];
    case "grill":
      return ["#ff8a4a", "#ffd27a"];
    case "wedding":
      return ["#f7c1d8", "#fff4d2"];
    case "sewer":
      return ["#6d7c86", "#c5b89a"];
    case "rooftop":
      return ["#5eb0ff", "#ffd9a0"];
    default:
      return ["#7ec8ff", "#ffe9b5"];
  }
}

function hash(n: number) {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

export function draw(ctx: CanvasRenderingContext2D, run: Run) {
  const w = run.viewW;
  const h = run.viewH;
  const g = run.ground;
  const cam = run.camX + (run.shake ? Math.sin(run.time * 54) * run.shake : 0);
  const camY = run.shake ? Math.cos(run.time * 47) * run.shake * 0.4 : 0;

  ctx.clearRect(0, 0, w, h);
  const [c0, c1] = sky(run.stage.theme);
  const grd = ctx.createLinearGradient(0, 0, 0, h);
  grd.addColorStop(0, c0);
  grd.addColorStop(1, c1);
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, w, h);

  drawSun(ctx, run, w);
  drawClouds(ctx, run, cam, w);
  if (run.stage.theme === "beach") drawSea(ctx, run, w, h, g);
  drawCity(ctx, run, cam, g);
  drawGround(ctx, run, cam, w, h, g);

  ctx.save();
  ctx.translate(-cam, camY);

  for (const hz of run.hazards) {
    if (hz.kind === "awning" || hz.kind === "ac" || hz.kind === "drain") {
      drawHazard(ctx, run, hz);
    }
  }
  for (const hz of run.hazards) {
    if (hz.kind !== "awning" && hz.kind !== "ac" && hz.kind !== "drain") {
      drawHazard(ctx, run, hz);
    }
  }

  drawTongue(ctx, run);
  drawCone(ctx, run);
  for (const s of run.scoops) drawScoop(ctx, run, s);
  drawParticles(ctx, run);
  drawCallouts(ctx, run);

  ctx.restore();

  if (run.phase === "intro") {
    ctx.fillStyle = "rgba(20,10,0,0.18)";
    ctx.fillRect(0, 0, w, h);
  }
}

function drawSun(ctx: CanvasRenderingContext2D, run: Run, w: number) {
  if (run.stage.theme === "mall" || run.stage.theme === "night") return;
  const boss = run.stage.boss ? Math.min(1, run.time / 28) : 0;
  const x = w * 0.82;
  const y = 54 + boss * 70;
  const r = 36 + run.stage.sun * 18 + boss * 22;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(run.time * 0.15);
  ctx.strokeStyle = "rgba(255,210,70,0.55)";
  ctx.lineWidth = 3;
  for (let i = 0; i < 12; i++) {
    ctx.rotate(Math.PI / 6);
    ctx.beginPath();
    ctx.moveTo(r + 6, 0);
    ctx.lineTo(r + 18 + run.stage.sun * 10, 0);
    ctx.stroke();
  }
  ctx.restore();
  const g = ctx.createRadialGradient(x, y, 4, x, y, r);
  g.addColorStop(0, "#fff6c2");
  g.addColorStop(1, "#ffb02e");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function drawClouds(
  ctx: CanvasRenderingContext2D,
  run: Run,
  cam: number,
  w: number
) {
  if (run.stage.theme === "mall") return;
  ctx.fillStyle =
    run.stage.theme === "night" ? "rgba(200,210,255,0.12)" : "rgba(255,255,255,0.78)";
  for (let i = 0; i < 6; i++) {
    const x = ((i * 420 - cam * 0.25) % (w + 400)) - 80;
    const y = 40 + hash(i + 3) * 50;
    blob(ctx, x, y, 34);
    blob(ctx, x + 28, y + 6, 24);
    blob(ctx, x - 22, y + 8, 20);
  }
}

function blob(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function drawSea(
  ctx: CanvasRenderingContext2D,
  run: Run,
  w: number,
  h: number,
  g: number
) {
  const sea = ctx.createLinearGradient(0, g - 40, 0, h);
  sea.addColorStop(0, "#3db7e0");
  sea.addColorStop(1, "#0e6e9a");
  ctx.fillStyle = sea;
  ctx.fillRect(0, g - 8, w, h - g + 8);
  ctx.strokeStyle = "rgba(255,255,255,0.45)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 0; x <= w; x += 12) {
    const y = g - 10 + Math.sin(x * 0.04 + run.time * 3) * 4;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function drawCity(
  ctx: CanvasRenderingContext2D,
  run: Run,
  cam: number,
  g: number
) {
  const theme = run.stage.theme;
  if (theme === "beach") return;
  const pal =
    theme === "night"
      ? ["#1b2248", "#2a1f55", "#123048"]
      : theme === "wedding"
        ? ["#f7d6e6", "#ffe9c4", "#f4c6d8"]
        : theme === "mall"
          ? ["#e8eef4", "#d5dde6", "#f0e6d8"]
          : ["#f28b6b", "#efd27a", "#7ec8a3", "#e8c4a2", "#87b7e0"];

  for (let i = 0; i < 18; i++) {
    const bw = 90 + hash(i) * 70;
    const bh = 90 + hash(i + 9) * 140;
    const x = i * 130 - ((cam * 0.45) % 130) - 40;
    const y = g - bh - 18;
    ctx.fillStyle = pal[i % pal.length]!;
    roundRect(ctx, x, y, bw, bh, 8);
    ctx.fill();
    ctx.fillStyle =
      theme === "night" ? "rgba(255,220,120,0.75)" : "rgba(255,255,255,0.35)";
    for (let wy = y + 16; wy < y + bh - 20; wy += 22) {
      for (let wx = x + 12; wx < x + bw - 14; wx += 18) {
        if (hash(wx + wy) > 0.18) ctx.fillRect(wx, wy, 10, 12);
      }
    }
    if (theme === "market" || theme === "grill" || theme === "noon") {
      ctx.fillStyle = i % 2 ? "#d94f4f" : "#f3d15b";
      ctx.beginPath();
      ctx.moveTo(x - 6, y + 28);
      ctx.lineTo(x + bw / 2, y + 8);
      ctx.lineTo(x + bw + 6, y + 28);
      ctx.closePath();
      ctx.fill();
    }
  }
}

function drawGround(
  ctx: CanvasRenderingContext2D,
  run: Run,
  cam: number,
  w: number,
  h: number,
  g: number
) {
  const theme = run.stage.theme;
  if (theme === "beach") {
    ctx.fillStyle = "#f2d39a";
    ctx.fillRect(0, g, w, h - g);
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    for (let i = 0; i < 20; i++) {
      ctx.beginPath();
      ctx.arc(
        ((i * 90 - cam) % (w + 40)) - 10,
        g + 18 + hash(i) * 30,
        2,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
    return;
  }
  if (theme === "mall") {
    ctx.fillStyle = "#cfd8e3";
    ctx.fillRect(0, g, w, h - g);
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 2;
    for (let x = -((cam * 1) % 70); x < w; x += 70) {
      ctx.beginPath();
      ctx.moveTo(x, g);
      ctx.lineTo(x + 40, h);
      ctx.stroke();
    }
    return;
  }
  ctx.fillStyle = theme === "night" ? "#2a2e38" : "#5c616c";
  ctx.fillRect(0, g, w, h - g);
  ctx.fillStyle = theme === "night" ? "#3a3f4c" : "#6d7380";
  ctx.fillRect(0, g, w, 10);
  ctx.strokeStyle = "#f0d36a";
  ctx.setLineDash([18, 16]);
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-((cam * 1) % 34), g + 28);
  ctx.lineTo(w, g + 28);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = theme === "night" ? "#1c2028" : "#8a909c";
  ctx.fillRect(0, g - 16, w, 16);
}

function drawHazard(ctx: CanvasRenderingContext2D, run: Run, h: Hazard) {
  const g = run.ground;
  ctx.save();
  ctx.translate(h.x, h.y);
  if (h.kind === "awning") {
    ctx.fillStyle = "#ff5a5a";
    ctx.fillRect(-h.w / 2, 0, h.w, 10);
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = i % 2 ? "#fff4d6" : "#ff5a5a";
      ctx.fillRect(-h.w / 2 + i * (h.w / 6), 0, h.w / 6, 16);
    }
    ctx.strokeStyle = "rgba(0,0,0,0.2)";
    ctx.beginPath();
    ctx.moveTo(-h.w / 2, 16);
    ctx.lineTo(-h.w / 2, g - h.y);
    ctx.moveTo(h.w / 2, 16);
    ctx.lineTo(h.w / 2, g - h.y);
    ctx.stroke();
  } else if (h.kind === "ac") {
    ctx.fillStyle = "#d7e4ee";
    roundRect(ctx, -22, -14, 44, 28, 4);
    ctx.fill();
    ctx.strokeStyle = "#8aa";
    ctx.stroke();
    ctx.strokeStyle = "rgba(160,220,255,0.5)";
    ctx.beginPath();
    ctx.arc(0, 28, 10 + (h.phase % 1) * 10, 0, Math.PI * 2);
    ctx.stroke();
  } else if (h.kind === "drain") {
    ctx.fillStyle = "#1a1c22";
    ctx.beginPath();
    ctx.ellipse(0, 4, 24, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#555";
    ctx.lineWidth = 2;
    for (let i = -16; i <= 16; i += 8) {
      ctx.beginPath();
      ctx.moveTo(i, -2);
      ctx.lineTo(i, 10);
      ctx.stroke();
    }
  } else if (h.kind === "dog") {
    drawDog(ctx, h);
  } else if (h.kind === "cat") {
    drawCat(ctx, h);
  } else if (h.kind === "kid") {
    drawKid(ctx, h);
  } else if (h.kind === "bus") {
    drawBus(ctx);
  } else if (h.kind === "fan") {
    ctx.fillStyle = "#789";
    ctx.fillRect(-4, 0, 8, 70);
    ctx.save();
    ctx.rotate(h.phase * 8);
    ctx.fillStyle = "rgba(200,230,255,0.75)";
    for (let i = 0; i < 3; i++) {
      ctx.rotate((Math.PI * 2) / 3);
      ctx.beginPath();
      ctx.ellipse(16, 0, 16, 6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle = "#445";
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fill();
  } else if (h.kind === "seagull") {
    ctx.strokeStyle = "#f4f4f4";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-16, 0);
    ctx.quadraticCurveTo(-6, -10 - Math.sin(h.phase * 10) * 6, 0, 0);
    ctx.quadraticCurveTo(6, -10 - Math.sin(h.phase * 10) * 6, 16, 0);
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(0, 2, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f5a623";
    ctx.beginPath();
    ctx.moveTo(4, 2);
    ctx.lineTo(12, 4);
    ctx.lineTo(4, 6);
    ctx.fill();
  }
  ctx.restore();
}

function drawDog(ctx: CanvasRenderingContext2D, h: Hazard) {
  const dir = Math.sign(h.vx || 1);
  ctx.scale(dir, 1);
  ctx.fillStyle = "#c47a3a";
  ctx.beginPath();
  ctx.ellipse(0, -10, 22, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(18, -16, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#5b3a22";
  ctx.beginPath();
  ctx.ellipse(22, -22, 5, 8, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#111";
  ctx.beginPath();
  ctx.arc(21, -17, 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#c47a3a";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-18, -10);
  ctx.quadraticCurveTo(-28, -24 - Math.sin(h.phase * 10) * 6, -16, -6);
  ctx.stroke();
  ctx.strokeStyle = "#3a2a1a";
  ctx.lineWidth = 3;
  const w = Math.sin(h.phase * 12);
  ctx.beginPath();
  ctx.moveTo(-10, 0);
  ctx.lineTo(-12, 10 + w * 2);
  ctx.moveTo(8, 0);
  ctx.lineTo(10, 10 - w * 2);
  ctx.stroke();
  ctx.fillStyle = "#ff8aa8";
  ctx.beginPath();
  ctx.ellipse(28, -10, 7, 3, 0.2, 0, Math.PI * 2);
  ctx.fill();
}

function drawCat(ctx: CanvasRenderingContext2D, h: Hazard) {
  const dir = Math.sign(h.vx || 1);
  ctx.scale(dir, 1);
  ctx.fillStyle = "#3b3b44";
  ctx.beginPath();
  ctx.ellipse(0, -8, 16, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(14, -14, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(10, -20);
  ctx.lineTo(12, -28);
  ctx.lineTo(16, -18);
  ctx.fill();
  ctx.fillStyle = "#f5d76e";
  ctx.beginPath();
  ctx.arc(16, -14, 1.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#3b3b44";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-14, -8);
  ctx.quadraticCurveTo(-22, -22, -8, -4);
  ctx.stroke();
}

function drawKid(ctx: CanvasRenderingContext2D, h: Hazard) {
  ctx.fillStyle = "#ffdbac";
  ctx.beginPath();
  ctx.arc(0, -38, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#3aa0ff";
  roundRect(ctx, -9, -28, 18, 22, 6);
  ctx.fill();
  ctx.fillStyle = "#2b2b2b";
  ctx.fillRect(-8, -48, 16, 8);
  ctx.strokeStyle = "#c0c8d0";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(8, -22);
  ctx.lineTo(22, -34 - Math.sin(h.phase * 8) * 6);
  ctx.stroke();
  ctx.fillStyle = "#eee";
  ctx.beginPath();
  ctx.ellipse(24, -36 - Math.sin(h.phase * 8) * 6, 7, 3, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#333";
  ctx.fillRect(-8, -8, 6, 12);
  ctx.fillRect(2, -8, 6, 12);
}

function drawBus(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#f4f1ea";
  roundRect(ctx, -70, -64, 140, 64, 10);
  ctx.fill();
  ctx.fillStyle = "#e4572e";
  ctx.fillRect(-70, -40, 140, 12);
  ctx.fillStyle = "#8fd3ff";
  roundRect(ctx, -50, -58, 28, 16, 3);
  ctx.fill();
  roundRect(ctx, -14, -58, 28, 16, 3);
  ctx.fill();
  roundRect(ctx, 22, -58, 28, 16, 3);
  ctx.fill();
  ctx.fillStyle = "#222";
  ctx.beginPath();
  ctx.arc(-40, 2, 10, 0, Math.PI * 2);
  ctx.arc(42, 2, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#111";
  ctx.font = "700 11px Cairo, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("ميكروباص", 0, -16);
}

function drawCone(ctx: CanvasRenderingContext2D, run: Run) {
  const c = run.cone;
  const wob = Math.sin(c.legs) * 5;
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(wob * 0.012);

  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.beginPath();
  ctx.ellipse(0, 4, 22, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#5b3416";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  const a = Math.sin(c.legs) * 8;
  ctx.beginPath();
  ctx.moveTo(-8, 0);
  ctx.lineTo(-10, 10 + a);
  ctx.moveTo(8, 0);
  ctx.lineTo(10, 10 - a);
  ctx.stroke();

  ctx.fillStyle = "#e39b3a";
  ctx.beginPath();
  ctx.moveTo(-22, -52);
  ctx.lineTo(22, -52);
  ctx.lineTo(0, 8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#b56a18";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = "rgba(90,50,10,0.35)";
  ctx.lineWidth = 2;
  for (let i = -40; i < 20; i += 8) {
    ctx.beginPath();
    ctx.moveTo(-24, i);
    ctx.lineTo(24, i + 36);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(24, i);
    ctx.lineTo(-24, i + 36);
    ctx.stroke();
  }
  ctx.restore();

  ctx.fillStyle = "#fff8e8";
  ctx.beginPath();
  ctx.ellipse(0, -56, 20, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(-7, -58, 5, 0, Math.PI * 2);
  ctx.arc(7, -58, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1a120c";
  const look = run.scoops[0] ? Math.sign(run.scoops[0].x - c.x) * 1.4 : 0;
  ctx.beginPath();
  ctx.arc(-7 + look, -58, 2.2, 0, Math.PI * 2);
  ctx.arc(7 + look, -58, 2.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawTongue(ctx: CanvasRenderingContext2D, run: Run) {
  const tip = tongueTip(run);
  if (!tip.on) return;
  const x0 = run.cone.x;
  const y0 = run.cone.y - 58;
  const mx = (x0 + tip.x) / 2;
  const my = (y0 + tip.y) / 2 + 10;
  ctx.strokeStyle = "#ff6b8a";
  ctx.lineWidth = 10;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo(mx, my, tip.x, tip.y);
  ctx.stroke();
  ctx.strokeStyle = "#ff9db4";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo(mx, my - 2, tip.x, tip.y);
  ctx.stroke();
  ctx.fillStyle = "#ff4e78";
  ctx.beginPath();
  ctx.arc(tip.x, tip.y, 7, 0, Math.PI * 2);
  ctx.fill();
}

function drawScoop(ctx: CanvasRenderingContext2D, run: Run, s: Scoop) {
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.scale(1 + s.squish, 1 - s.squish);

  ctx.fillStyle = "rgba(0,0,0,0.16)";
  ctx.beginPath();
  ctx.ellipse(0, s.r + 6, s.r * 0.8, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  if (s.y >= run.ground - s.r - 2) {
    ctx.strokeStyle = run.flavor.dark;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    const a = Math.sin(s.legs) * 6;
    ctx.beginPath();
    ctx.moveTo(-8, s.r - 2);
    ctx.lineTo(-10, s.r + 8 + a);
    ctx.moveTo(8, s.r - 2);
    ctx.lineTo(10, s.r + 8 - a);
    ctx.stroke();
  }

  const g = ctx.createRadialGradient(-s.r * 0.3, -s.r * 0.35, 4, 0, 0, s.r);
  g.addColorStop(0, "#fff");
  g.addColorStop(0.18, run.flavor.color);
  g.addColorStop(1, run.flavor.dark);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, s.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.12)";
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath();
  ctx.ellipse(-s.r * 0.28, -s.r * 0.32, s.r * 0.22, s.r * 0.14, -0.5, 0, Math.PI * 2);
  ctx.fill();

  const lookX = Math.sign(run.cone.x - s.x) * 2;
  if (s.blink > 0) {
    ctx.strokeStyle = "#1a120c";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-8, -4);
    ctx.lineTo(-2, -4);
    ctx.moveTo(2, -4);
    ctx.lineTo(8, -4);
    ctx.stroke();
  } else {
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(-6, -4, 5, 0, Math.PI * 2);
    ctx.arc(6, -4, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1a120c";
    ctx.beginPath();
    ctx.arc(-6 + lookX, -3, 2.3, 0, Math.PI * 2);
    ctx.arc(6 + lookX, -3, 2.3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = "#1a120c";
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (s.melt < 0.4) {
    ctx.arc(0, 8, 5, 0.15, Math.PI - 0.15);
  } else {
    ctx.arc(0, 6, 6, 0.2, Math.PI - 0.2, true);
  }
  ctx.stroke();

  ctx.restore();
}

function drawParticles(ctx: CanvasRenderingContext2D, run: Run) {
  for (const p of run.particles) {
    const a = Math.max(0, p.life / p.max);
    ctx.globalAlpha = a;
    if (p.kind === "drip") {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.s * 0.5, p.s, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.kind === "sprinkle") {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.x);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.s, -p.s * 0.35, p.s * 2, p.s * 0.7);
      ctx.restore();
    } else if (p.kind === "sweat") {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.s * a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

function drawCallouts(ctx: CanvasRenderingContext2D, run: Run) {
  ctx.textAlign = "center";
  ctx.font = "800 22px Cairo, Lemonada, sans-serif";
  for (const c of run.callouts) {
    ctx.globalAlpha = Math.min(1, c.life * 2);
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillText(c.text, c.x + 2, c.y - (1 - c.life) * 28 + 2);
    ctx.fillStyle = c.color;
    ctx.fillText(c.text, c.x, c.y - (1 - c.life) * 28);
    ctx.globalAlpha = 1;
  }
}
