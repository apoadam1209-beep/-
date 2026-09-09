/* يلتقط صوراً للوحة اللعبة الحقيقية (نفس drawBoard التي يعمل بها المتصفح)
 * يستعمل jsdom لتشغيل اللعبة و @napi-rs/canvas للرسم الفعلي.
 * التشغيل:  npm i -D jsdom @napi-rs/canvas  ثم  node sada/tools/shot.mjs [مخرجات]
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { JSDOM } = require("jsdom");
const { createCanvas } = require("@napi-rs/canvas");

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(resolve(ROOT, p), "utf8");
const OUT = process.argv[2] || "/home/user/.cache/sada-shots";
mkdirSync(OUT, { recursive: true });

const html = read("index.html").replace(/<script src="[^"]+"><\/script>/g, "");
const dom = new JSDOM(html, { url: "http://localhost:8000/", pretendToBeVisual: true, runScripts: "outside-only" });
const { window } = dom;
Object.defineProperty(window, "devicePixelRatio", { value: 2, configurable: true });

const back = new WeakMap();
window.HTMLCanvasElement.prototype.getContext = function () {
  let nc = back.get(this);
  if (!nc || nc.width !== this.width || nc.height !== this.height) {
    nc = createCanvas(this.width || 300, this.height || 150);
    back.set(this, nc);
  }
  return nc.getContext("2d");
};
// لا صوت في بيئة الالتقاط
window.AudioContext = undefined;
window.scrollTo = () => {};
window.eval(read("js/sim.js"));
window.eval(read("js/levels.js"));
// افتح كل المراحل لأغراض الالتقاط
window.localStorage.setItem(
  "sada.progress.v1",
  JSON.stringify({ done: Object.fromEntries(window.SADA.RAW_LEVELS.map((l) => [l.id, { stars: 3, attempts: 1 }])), sound: true, auto: true })
);
window.eval(read("js/audio.js"));
window.eval(read("js/game.js"));

const doc = window.document;
const $ = (s) => doc.querySelector(s);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const S = window.SADA;

function view(level) {
  const maxW = 688, maxH = 384;
  const cell = Math.max(20, Math.min(62, Math.floor(Math.min((maxW - 20) / level.cols, (maxH - 20) / level.rows))));
  return { cell, pad: 10, w: cell * level.cols + 20, h: cell * level.rows + 20 };
}

async function shootLevel(idx, name) {
  const level = S.parseLevel(S.RAW_LEVELS[idx]);
  // افتح المرحلة مباشرة عبر بطاقتها (نتجاوز القفل لأغراض الالتقاط)
  window.eval(`(function(){ document.querySelectorAll('.lv')[${idx}].click(); })()`);
  await wait(60);
  const canvas = $("#board");
  const v = view(level);
  canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: v.w, height: v.h, right: v.w, bottom: v.h, x: 0, y: 0 });
  $("#chk-auto").checked = false;

  // ضع الحلّ الصحيح
  const sol = S.solve(level).sample || [];
  for (const b of sol) {
    if (level.fixed.some((f) => f.x === b.x && f.y === b.y)) continue;
    const chip = [...doc.querySelectorAll("#tray .chip")].find((c) => c.dataset.c === b.c);
    if (chip) chip.dispatchEvent(new window.MouseEvent("pointerdown", { bubbles: true }));
    await wait(4);
    canvas.dispatchEvent(new window.MouseEvent("pointerdown", {
      bubbles: true,
      clientX: v.pad + b.x * v.cell + v.cell / 2,
      clientY: v.pad + b.y * v.cell + v.cell / 2,
    }));
    await wait(4);
  }
  await wait(120);
  const nc = back.get(canvas);
  writeFileSync(resolve(OUT, name + "-solved.png"), nc.toBuffer("image/png"));

  // لقطة أثناء انتشار الموجة
  $("#btn-play-wave").click();
  await wait(520);
  writeFileSync(resolve(OUT, name + "-wave.png"), nc.toBuffer("image/png"));
  console.log(`  ✓ ${name}  (${v.w}×${v.h}) — ${sol.length} جرس`);
  await wait(2400);
}

(async () => {
  $("#btn-play").click();
  await wait(60);
  for (const [i, n] of [[0, "L01"], [8, "L09"], [12, "L13"], [17, "L18"], [22, "L23-spiral"], [23, "L24-finale"]]) {
    await shootLevel(i, n);
  }
  console.log("\nالصور في:", OUT);
  process.exit(0);
})();
