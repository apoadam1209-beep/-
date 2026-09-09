import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { engine } from "../audio/engine";

export interface PuzzleBoxHandle {
  rotateFocused: (dir: 1 | -1) => void;
  lockToAnswer: (ring: number) => Promise<void>;
}

interface PuzzleBoxProps {
  pools: string[][];
  answer: string[];
  locked: number[];
  celebrating: boolean;
  onCombo: (letters: string[]) => void;
  onStep: () => void;
}

const SIZE = 1000;
const C = 500;
const FRAME_R = 478;
const RING_OUTER = 452;
const MEDAL_R = 168;
const TOP = -90;

const mod = (a: number, n: number) => ((a % n) + n) % n;
const easeOutCubic = (p: number) => 1 - Math.pow(1 - p, 3);
const easeOutBack = (p: number) => 1 + 2.2 * Math.pow(p - 1, 3) + 1.2 * Math.pow(p - 1, 2);

const BAND_COLORS = ["#221a4d", "#1a1442", "#251c55", "#1d1747", "#201a50", "#191340"];

interface DragInfo {
  ring: number;
  lastAng: number;
  lastT: number;
  vel: number; // deg / ms
}

const PuzzleBox = forwardRef<PuzzleBoxHandle, PuzzleBoxProps>(function PuzzleBox(
  { pools, answer, locked, celebrating, onCombo, onStep },
  ref
) {
  const n = pools.length;
  const band = (RING_OUTER - MEDAL_R) / n;

  const svgRef = useRef<SVGSVGElement | null>(null);
  const ringRefs = useRef<Array<SVGGElement | null>>([]);
  const angles = useRef<number[]>([]);
  const selIdx = useRef<number[]>([]);
  const tickIdx = useRef<number[]>([]);
  const rafs = useRef<Array<number | null>>([]);
  const drags = useRef<Map<number, DragInfo>>(new Map());
  const [focus, setFocus] = useState(0);

  // seed per-attempt initial orientation (stable for this pools instance)
  const seed = useMemo(() => {
    return pools.map((pool, i) => {
      const m = pool.length;
      const kAns = pool.indexOf(answer[i]);
      let kInit = Math.floor(Math.random() * m);
      while (kInit === kAns) kInit = Math.floor(Math.random() * m);
      return { kInit, rot: TOP - kInit * (360 / m) };
    });
  }, [pools, answer]);

  const lockedRef = useRef(locked);
  lockedRef.current = locked;
  const poolsRef = useRef(pools);
  poolsRef.current = pools;
  const answerRef = useRef(answer);
  answerRef.current = answer;

  const emitCombo = useCallback(() => {
    const P = poolsRef.current;
    onCombo(P.map((pool, i) => pool[selIdx.current[i]] ?? "؟"));
  }, [onCombo]);

  const applyRot = useCallback((i: number, rot: number) => {
    angles.current[i] = rot;
    ringRefs.current[i]?.setAttribute("transform", `rotate(${rot} ${C} ${C})`);
  }, []);

  const cancelAnim = useCallback((i: number) => {
    const id = rafs.current[i];
    if (id !== null) {
      cancelAnimationFrame(id);
      rafs.current[i] = null;
    }
  }, []);

  const paintGlyph = useCallback((i: number, prev: number, next: number) => {
    const g = ringRefs.current[i];
    if (!g) return;
    const glyphs = g.querySelectorAll<SVGGElement>(".glyph");
    const setState = (k: number, active: boolean) => {
      const gl = glyphs[k];
      if (!gl) return;
      const circle = gl.querySelector("circle");
      const text = gl.querySelector("text");
      if (circle) circle.setAttribute("opacity", active ? "1" : "0");
      if (text) {
        text.setAttribute("fill", active ? "#fff3c9" : "#c9bda0");
        text.setAttribute("class", active ? "sel-letter" : "");
      }
    };
    if (prev >= 0) setState(prev, false);
    setState(next, true);
  }, []);

  const animateRing = useCallback(
    (i: number, to: number, ms: number, ease: (p: number) => number = easeOutCubic) => {
      cancelAnim(i);
      const from = angles.current[i];
      const start = performance.now();
      return new Promise<void>((resolve) => {
        const stepFn = (now: number) => {
          const p = Math.min(1, (now - start) / ms);
          applyRot(i, from + (to - from) * ease(p));
          if (p < 1) rafs.current[i] = requestAnimationFrame(stepFn);
          else {
            rafs.current[i] = null;
            resolve();
          }
        };
        rafs.current[i] = requestAnimationFrame(stepFn);
      });
    },
    [applyRot, cancelAnim]
  );

  const settleRing = useCallback(
    (i: number, countStep: boolean) => {
      const P = poolsRef.current;
      const m = P[i].length;
      const step = 360 / m;
      const rot = angles.current[i];
      const kSel = mod(Math.round((TOP - rot) / step), m);
      const prev = selIdx.current[i];
      if (kSel === prev) return;
      selIdx.current[i] = kSel;
      paintGlyph(i, prev, kSel);
      engine.ringPluck(i);
      try {
        navigator.vibrate?.(8);
      } catch {
        /* noop */
      }
      if (countStep) onStep();
      emitCombo();
    },
    [emitCombo, onStep, paintGlyph]
  );

  /** snap current rotation to nearest letter position */
  const snapRing = useCallback(
    async (i: number, countStep = true) => {
      const P = poolsRef.current;
      const m = P[i].length;
      const step = 360 / m;
      const rot = angles.current[i];
      const kSel = mod(Math.round((TOP - rot) / step), m);
      let target = TOP - kSel * step;
      while (target - rot > 180) target -= 360;
      while (target - rot < -180) target += 360;
      await animateRing(i, target, 240, easeOutBack);
      settleRing(i, countStep);
    },
    [animateRing, settleRing]
  );

  const stepRing = useCallback(
    (i: number, dir: 1 | -1) => {
      if (lockedRef.current.includes(i)) {
        engine.deny();
        return;
      }
      cancelAnim(i);
      const P = poolsRef.current;
      const step = 360 / P[i].length;
      const target = angles.current[i] - dir * step;
      void animateRing(i, target, 200, easeOutCubic).then(() => settleRing(i, true));
    },
    [animateRing, cancelAnim, settleRing]
  );

  const startInertia = useCallback(
    (i: number, v0: number) => {
      cancelAnim(i);
      let v = v0;
      let last = performance.now();
      const fn = (now: number) => {
        const dt = Math.min(50, now - last);
        last = now;
        v *= Math.pow(0.93, dt / 16);
        applyRot(i, angles.current[i] + v * dt);
        if (Math.abs(v) > 0.03) {
          rafs.current[i] = requestAnimationFrame(fn);
        } else {
          rafs.current[i] = null;
          void snapRing(i);
        }
      };
      rafs.current[i] = requestAnimationFrame(fn);
    },
    [applyRot, cancelAnim, snapRing]
  );

  useImperativeHandle(ref, () => ({
    rotateFocused: (dir) => {
      const i = Math.min(focus, n - 1);
      stepRing(i, dir);
    },
    lockToAnswer: async (i: number) => {
      const P = poolsRef.current;
      const m = P[i].length;
      const step = 360 / m;
      const kAns = P[i].indexOf(answerRef.current[i]);
      const rot = angles.current[i];
      let target = TOP - kAns * step;
      // spin at least one dramatic full turn on long hints
      let delta = target - rot;
      while (delta > 180) delta -= 360;
      while (delta < -180) delta += 360;
      target = rot + delta - step * 3;
      cancelAnim(i);
      await animateRing(i, target, 850, easeOutCubic);
      const prev = selIdx.current[i];
      selIdx.current[i] = kAns;
      // force exact angle to avoid float drift
      applyRot(i, TOP - kAns * step);
      paintGlyph(i, prev === kAns ? -1 : prev, kAns);
      engine.ringPluck(i);
      emitCombo();
    },
  }));

  // ---- pointer handling ----

  const toSvg = (e: React.PointerEvent) => {
    const rect = svgRef.current!.getBoundingClientRect();
    const s = SIZE / rect.width;
    return { x: (e.clientX - rect.left) * s, y: (e.clientY - rect.top) * s };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    const p = toSvg(e);
    const dx = p.x - C;
    const dy = p.y - C;
    const dist = Math.hypot(dx, dy);
    if (dist > RING_OUTER + 14 || dist < MEDAL_R) return;
    const i = Math.min(n - 1, Math.max(0, Math.floor((RING_OUTER - dist) / band)));
    setFocus(i);
    e.currentTarget.setPointerCapture(e.pointerId);
    const ang = (Math.atan2(dy, dx) * 180) / Math.PI;
    if (lockedRef.current.includes(i)) {
      engine.deny();
      cancelAnim(i);
      const cur = angles.current[i];
      void animateRing(i, cur + 3, 90)
        .then(() => animateRing(i, cur - 3, 90))
        .then(() => animateRing(i, cur, 90));
      return;
    }
    cancelAnim(i);
    drags.current.set(e.pointerId, { ring: i, lastAng: ang, lastT: performance.now(), vel: 0 });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drags.current.get(e.pointerId);
    if (!d) return;
    const p = toSvg(e);
    const ang = (Math.atan2(p.y - C, p.x - C) * 180) / Math.PI;
    let delta = ang - d.lastAng;
    while (delta > 180) delta -= 360;
    while (delta < -180) delta += 360;
    const now = performance.now();
    const dt = Math.max(1, now - d.lastT);
    d.vel = d.vel * 0.7 + (delta / dt) * 0.3;
    d.lastAng = ang;
    d.lastT = now;
    applyRot(d.ring, angles.current[d.ring] + delta);
    // ratchet tick only when crossing a letter boundary
    const P = poolsRef.current[d.ring];
    const st = 360 / P.length;
    const kNow = mod(Math.round((TOP - angles.current[d.ring]) / st), P.length);
    if (tickIdx.current[d.ring] !== kNow) {
      tickIdx.current[d.ring] = kNow;
      engine.tick();
    }
  };

  const endDrag = (e: React.PointerEvent) => {
    const d = drags.current.get(e.pointerId);
    if (!d) return;
    drags.current.delete(e.pointerId);
    const v = d.vel;
    if (Math.abs(v) > 0.1) startInertia(d.ring, v);
    else void snapRing(d.ring);
  };

  // ---- (re)initialize per level attempt ----

  useEffect(() => {
    const P = poolsRef.current;
    rafs.current.forEach((_, i) => cancelAnim(i));
    angles.current = P.map((_, i) => seed[i].rot);
    P.forEach((_, i) => {
      selIdx.current[i] = seed[i].kInit;
      applyRot(i, seed[i].rot);
    });
    // paint after DOM settles
    const id = requestAnimationFrame(() => {
      P.forEach((_, i) => {
        tickIdx.current[i] = seed[i].kInit;
        paintGlyph(i, -1, seed[i].kInit);
      });
      emitCombo();
    });
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pools, seed]);

  // ---- decorative geometry ----

  const ticks = Array.from({ length: 12 }, (_, i) => i * 30);
  const rivets = Array.from({ length: 8 }, (_, i) => i * 45);
  const medalStarOrbits = [0, 45];

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className={`board-svg h-auto w-full cursor-grab active:cursor-grabbing ${
        celebrating ? "anim-glow-burst" : ""
      }`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <defs>
        <linearGradient id="frameGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f0d98c" />
          <stop offset="45%" stopColor="#b08d26" />
          <stop offset="100%" stopColor="#5d470f" />
        </linearGradient>
        <linearGradient id="beamGrad" gradientUnits="userSpaceOnUse" x1="0" y1="46" x2="0" y2="510">
          <stop offset="0%" stopColor="rgba(255,243,201,0.95)" />
          <stop offset="45%" stopColor="rgba(227,197,102,0.35)" />
          <stop offset="100%" stopColor="rgba(212,175,55,0.02)" />
        </linearGradient>
        <radialGradient id="selGlow">
          <stop offset="0%" stopColor="rgba(255,236,170,0.9)" />
          <stop offset="55%" stopColor="rgba(212,175,55,0.3)" />
          <stop offset="100%" stopColor="rgba(212,175,55,0)" />
        </radialGradient>
        <radialGradient id="medalGrad" cx="0.5" cy="0.38" r="0.75">
          <stop offset="0%" stopColor="#2b2060" />
          <stop offset="100%" stopColor="#120c2b" />
        </radialGradient>
        <filter id="soft5" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
        <filter id="soft2" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="1.6" />
        </filter>
      </defs>

      {/* base disc */}
      <circle cx={C} cy={C} r={RING_OUTER} fill="#120d2c" />
      {ticks.map((a) => {
        const rad = (a * Math.PI) / 180;
        return (
          <line
            key={a}
            x1={C + (MEDAL_R + 6) * Math.cos(rad)}
            y1={C + (MEDAL_R + 6) * Math.sin(rad)}
            x2={C + (RING_OUTER - 6) * Math.cos(rad)}
            y2={C + (RING_OUTER - 6) * Math.sin(rad)}
            stroke="#ffffff"
            strokeOpacity="0.045"
            strokeWidth="2"
          />
        );
      })}

      {/* letter rings */}
      {pools.map((pool, i) => {
        const rOuter = RING_OUTER - band * i;
        const rMid = rOuter - band / 2;
        const m = pool.length;
        const step = 360 / m;
        const fontSize = Math.min(88, band * 0.58);
        const rInner = rOuter - band;
        return (
          <g key={i}>
            <circle
              cx={C}
              cy={C}
              r={rMid}
              fill="none"
              stroke={BAND_COLORS[i % BAND_COLORS.length]}
              strokeWidth={band - 4}
              opacity="0.95"
            />
            <circle cx={C} cy={C} r={rOuter - 2} fill="none" stroke="#d4af37" strokeOpacity="0.55" strokeWidth="1.6" />
            {i === n - 1 && (
              <circle cx={C} cy={C} r={rInner + 2} fill="none" stroke="#d4af37" strokeOpacity="0.55" strokeWidth="1.6" />
            )}
            <g
              ref={(el) => { ringRefs.current[i] = el; }}
              transform={`rotate(${seed[i]?.rot ?? 0} ${C} ${C})`}
            >
              {pool.map((letter, k) => {
                const a = k * step;
                const rad = (a * Math.PI) / 180;
                const x = C + rMid * Math.cos(rad);
                const y = C + rMid * Math.sin(rad);
                return (
                  <g key={k} className="glyph" transform={`translate(${x} ${y}) rotate(${a + 90})`}>
                    <circle className="hl" r={band * 0.31} fill="url(#selGlow)" opacity="0" />
                    <text
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontFamily="'Amiri', serif"
                      fontWeight="700"
                      fontSize={fontSize}
                      fill="#c9bda0"
                    >
                      {letter}
                    </text>
                  </g>
                );
              })}
              {band > 52 &&
                Array.from({ length: m }, (_, k) => {
                  const a = k * step + step / 2;
                  const rad = (a * Math.PI) / 180;
                  return (
                    <circle
                      key={`d${k}`}
                      cx={C + rMid * Math.cos(rad)}
                      cy={C + rMid * Math.sin(rad)}
                      r="2.4"
                      fill="#d4af37"
                      fillOpacity="0.22"
                    />
                  );
                })}
            </g>
            {/* focus indicator */}
            {focus === i && (
              <circle
                cx={C}
                cy={C}
                r={rMid}
                fill="none"
                stroke="#f0d98c"
                strokeOpacity="0.5"
                strokeWidth="2"
                strokeDasharray="7 12"
                pointerEvents="none"
              />
            )}
          </g>
        );
      })}

      {/* locked badges */}
      {locked.map((i) => {
        const rOuter = RING_OUTER - band * i;
        const rMid = rOuter - band / 2;
        const badge = Math.max(13, band * 0.26);
        // offset 30° off the beam so it never covers the engraved letter
        const lbRad = ((-90 + 30) * Math.PI) / 180;
        const lbX = C + rMid * Math.cos(lbRad);
        const lbY = C + rMid * Math.sin(lbRad);
        return (
          <g key={`lk${i}`} transform={`translate(${lbX} ${lbY})`} pointerEvents="none">
            <circle r={badge * 1.15} fill="#120c2b" fillOpacity="0.85" stroke="#d4af37" strokeWidth="1.6" />
            <g transform={`translate(${-badge * 0.5} ${-badge * 0.42})`} stroke="#f0d98c" strokeWidth="2.4" fill="none">
              <rect width={badge} height={badge * 0.82} rx={badge * 0.16} y={badge * 0.25} fill="rgba(212,175,55,0.25)" />
              <path d={`M ${badge * 0.22} ${badge * 0.3} v ${-badge * 0.12} a ${badge * 0.28} ${badge * 0.28} 0 0 1 ${badge * 0.56} 0 v ${badge * 0.12}`} />
            </g>
          </g>
        );
      })}

      {/* beam */}
      <g className="animate-beam" pointerEvents="none">
        <polygon
          points={`${C - 26},42 ${C + 26},42 ${C + 9},${C} ${C - 9},${C}`}
          fill="url(#beamGrad)"
          filter="url(#soft5)"
        />
        <polygon points={`${C - 3.5},46 ${C + 3.5},46 ${C + 2},${C} ${C - 2},${C}`} fill="#ffe9a8" opacity="0.9" filter="url(#soft2)" />
      </g>

      {/* beam pointer notch */}
      <g pointerEvents="none">
        <path
          d={`M ${C - 16},${C - RING_OUTER - 18} L ${C + 16},${C - RING_OUTER - 18} L ${C},${C - RING_OUTER + 6} Z`}
          fill="url(#frameGrad)"
          stroke="#120c2b"
          strokeWidth="2"
        />
      </g>

      {/* center medallion */}
      <g pointerEvents="none">
        <circle cx={C} cy={C} r={MEDAL_R} fill="url(#medalGrad)" stroke="url(#frameGrad)" strokeWidth="5" />
        <circle cx={C} cy={C} r={MEDAL_R - 14} fill="none" stroke="#d4af37" strokeOpacity="0.4" strokeWidth="1.4" strokeDasharray="3 7" />
        {medalStarOrbits.map((rot) => (
          <rect
            key={rot}
            x={C - 74}
            y={C - 74}
            width={148}
            height={148}
            fill="none"
            stroke="#d4af37"
            strokeOpacity="0.75"
            strokeWidth="2.4"
            transform={`rotate(${rot} ${C} ${C})`}
          />
        ))}
        <circle cx={C} cy={C} r={40} fill="none" stroke="#f0d98c" strokeWidth="2" strokeOpacity="0.9" />
        {/* crescent receiver */}
        <circle cx={C} cy={C} r={26} fill="#f0d98c" className="animate-pulse-soft" />
        <circle cx={C + 11} cy={C - 4} r={22} fill="#1a1442" />
        <circle cx={C} cy={C} r={4.5} fill="#ffe9a8" />
      </g>

      {/* outer frame */}
      <g pointerEvents="none">
        <circle cx={C} cy={C} r={FRAME_R} fill="none" stroke="url(#frameGrad)" strokeWidth="12" />
        <circle cx={C} cy={C} r={FRAME_R - 12} fill="none" stroke="#0a0718" strokeWidth="3" />
        <circle
          cx={C}
          cy={C}
          r={466}
          fill="none"
          stroke="#d4af37"
          strokeOpacity="0.4"
          strokeWidth="4"
          strokeDasharray="2 28.18"
        />
        {rivets.map((a) => {
          const rad = (a * Math.PI) / 180;
          return (
            <circle
              key={a}
              cx={C + FRAME_R * Math.cos(rad)}
              cy={C + FRAME_R * Math.sin(rad)}
              r="6"
              fill="#6b5316"
              stroke="#e3c566"
              strokeWidth="1.6"
            />
          );
        })}
        {/* top moon launcher */}
        <g transform={`translate(${C} ${C - FRAME_R - 6})`}>
          <circle r="17" fill="#f0d98c" filter="url(#soft2)" />
          <circle r="14" cx="6" cy="-5" fill="#0a0718" />
        </g>
      </g>
    </svg>
  );
});

export default PuzzleBox;
