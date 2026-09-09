import { useEffect, useRef } from "react";

interface Particle {
  x: number; y: number; vx: number; vy: number;
  size: number; rot: number; vr: number;
  color: string; shape: number; life: number; ttl: number;
}

/** golden geometric ember burst on win */
export default function Confetti({ active }: { active: boolean }) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!active) return;
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;

    const colors = ["#f0d98c", "#d4af37", "#fff3c9", "#b08d26", "#f7e7b4", "#e3c566"];
    const parts: Particle[] = [];
    const cx = canvas.width / 2;
    const cy = canvas.height * 0.4;
    for (let i = 0; i < 170; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = (3 + Math.random() * 11) * dpr;
      parts.push({
        x: cx, y: cy,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp * 0.85 - 6.5 * dpr,
        size: (2.5 + Math.random() * 6.5) * dpr,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        color: colors[i % colors.length],
        shape: i % 4,
        life: 0,
        ttl: 120 + Math.random() * 110,
      });
    }

    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(3, (now - last) / 16.7);
      last = now;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of parts) {
        if (p.life >= p.ttl) continue;
        p.life += dt;
        p.vy += 0.16 * dt * dpr;
        p.vx *= Math.pow(0.986, dt);
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        const fade = 1 - p.life / p.ttl;
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, fade * 1.6));
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        if (p.shape === 0) ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        else if (p.shape === 1) {
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.38, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.shape === 2) {
          ctx.beginPath();
          ctx.moveTo(0, -p.size / 2);
          ctx.lineTo(p.size / 2, 0);
          ctx.lineTo(0, p.size / 2);
          ctx.lineTo(-p.size / 2, 0);
          ctx.fill();
        } else {
          ctx.fillRect(-p.size, -p.size * 0.12, p.size * 2, p.size * 0.24);
        }
        ctx.restore();
      }
      if (parts.some((p) => p.life < p.ttl)) raf = requestAnimationFrame(loop);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active]);

  if (!active) return null;
  return <canvas ref={ref} className="pointer-events-none fixed inset-0 z-40 h-full w-full" />;
}
