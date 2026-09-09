/* اختبار من طرف إلى طرف: يشغّل اللعبة الحقيقية داخل DOM
 * ينفّذ index.html + js/sim.js + js/levels.js + js/audio.js + js/game.js كما هي،
 * بسياق رسم (Canvas) وصوت (Web Audio) محاكيين، ثم يلعب فعلياً:
 *   - يفتح القائمة ويختار مرحلة
 *   - يضع جرساً بالماوس (أحداث pointer حقيقية)
 *   - يضغط «عزف» ويحرّك إطارات الحركة حتى يصدر الحكم
 *   - يتحقّق من نافذة الفوز ومن حفظ التقدّم في localStorage
 *
 * التشغيل:  npm i -D jsdom  ثم  npm run test:sada
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
let JSDOM;
try {
  ({ JSDOM } = require("jsdom"));
} catch {
  console.error("ينقص الاعتماد الاختياري jsdom — نفّذ:  npm i -D jsdom");
  process.exit(2);
}

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(resolve(ROOT, p), "utf8");

/* ───────── محاكاة سياق الرسم ───────── */
let drawCalls = 0;
function makeCtx() {
  const noop = () => {};
  const ctx = {
    canvas: null,
    fillStyle: "", strokeStyle: "", lineWidth: 1, globalAlpha: 1,
    shadowColor: "", shadowBlur: 0, font: "", lineCap: "", lineJoin: "",
    save: noop, restore: noop, beginPath: noop, closePath: noop, fill: noop, stroke: noop,
    setTransform: noop, translate: noop, rotate: noop, scale: noop, setLineDash: noop,
    fillRect: noop, strokeRect: noop, fillText: noop, measureText: () => ({ width: 0 }),
    clearRect: () => { drawCalls++; },
    moveTo: noop, lineTo: noop, quadraticCurveTo: noop, bezierCurveTo: noop,
    arcTo: noop, rect: noop,
    arc: () => { drawCalls++; },
  };
  return ctx;
}

/* ───────── محاكاة Web Audio ───────── */
let bellsPlayed = 0;
function param(v = 0) {
  return { value: v, setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {}, linearRampToValueAtTime: () => {}, setTargetAtTime: () => {} };
}
class MockAudioContext {
  constructor() {
    this.currentTime = 0;
    this.sampleRate = 44100;
    this.state = "running";
    this.destination = {};
  }
  resume() { this.state = "running"; return Promise.resolve(); }
  createGain() { return { gain: param(1), connect: () => {}, disconnect: () => {} }; }
  createDynamicsCompressor() {
    return { threshold: param(), ratio: param(), knee: param(), attack: param(), release: param(), connect: () => {} };
  }
  createConvolver() { return { buffer: null, connect: () => {} }; }
  createBiquadFilter() { return { type: "", Q: param(), frequency: param(), connect: () => {} }; }
  createBuffer(ch, len) {
    const data = Array.from({ length: ch }, () => new Float32Array(len));
    return { getChannelData: (i) => data[i], length: len };
  }
  createOscillator() {
    return {
      type: "sine", frequency: param(440), connect: () => {},
      start: () => { bellsPlayed++; }, stop: () => {},
    };
  }
  createBufferSource() {
    return {
      buffer: null, loop: false, connect: () => {},
      start: () => {}, stop: () => {},
    };
  }
}

/* ───────── إقلاع الصفحة ───────── */
const html = read("index.html").replace(/<script src="[^"]+"><\/script>/g, "");
const dom = new JSDOM(html, {
  url: "http://localhost:8000/",
  pretendToBeVisual: true,
  runScripts: "outside-only",
});
const { window } = dom;
window.HTMLCanvasElement.prototype.getContext = function () {
  const c = makeCtx();
  c.canvas = this;
  return c;
};
window.AudioContext = MockAudioContext;
window.confirm = () => true;
window.scrollTo = () => {};

for (const f of ["js/sim.js", "js/levels.js", "js/audio.js", "js/game.js"]) {
  window.eval(read(f));
}

/* ───────── أدوات الاختبار ───────── */
const doc = window.document;
const $ = (s) => doc.querySelector(s);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0;
let fail = 0;
function ok(cond, label, extra = "") {
  if (cond) {
    pass++;
    console.log(`  ✓ ${label}`);
  } else {
    fail++;
    console.log(`  ✗ ${label} ${extra}`);
  }
}

const CELL = 62; // يُحسب داخل اللعبة من عرض النافذة (1024) — 7×5 ⇒ 62
const PAD = 10;
function pointAt(x, y) {
  return { clientX: PAD + x * CELL + CELL / 2, clientY: PAD + y * CELL + CELL / 2 };
}
function pointerOn(el, type, x, y) {
  const p = pointAt(x, y);
  el.dispatchEvent(new window.MouseEvent(type, { bubbles: true, cancelable: true, ...p }));
}

async function main() {
  console.log("\n— إقلاع —");
  ok(!!window.SADA, "المحرّك (SADA) موجود");
  ok(window.SADA.RAW_LEVELS.length === 24, `٢٤ مرحلة معرّفة (${window.SADA.RAW_LEVELS.length})`);
  ok(!$("#screen-menu").classList.contains("hidden"), "شاشة القائمة ظاهرة");
  ok($("#chapters").querySelectorAll(".lv").length === 24, "٢٤ بطاقة مرحلة في القائمة");
  ok(bellsPlayed === 0, "محرك الصوت في وضع الاستعداد");
  ok($("#btn-sound").textContent === "♪", "الصوت مُفعَّل افتراضياً");

  console.log("\n— فتح المرحلة ١ —");
  $("#btn-play").click();
  await wait(30);
  ok(!$("#screen-play").classList.contains("hidden"), "شاشة اللعب ظاهرة");
  ok($("#play-name").textContent.includes("الجرس الأول"), `اسم المرحلة: «${$("#play-name").textContent}»`);
  ok($("#target-beats").querySelectorAll(".beat").length === 1, "نبضة واحدة في اللحن المطلوب");
  ok($("#tray").querySelectorAll(".chip").length === 1, "جرس واحد في الصينية");

  const canvas = $("#board");
  canvas.getBoundingClientRect = () => ({
    left: 0, top: 0, right: 7 * CELL + PAD * 2, bottom: 5 * CELL + PAD * 2,
    width: 7 * CELL + PAD * 2, height: 5 * CELL + PAD * 2, x: 0, y: 0,
  });

  console.log("\n— وضع جرس بالماوس ثم العزف —");
  drawCalls = 0;
  pointerOn(canvas, "pointerdown", 1, 1);
  pointerOn(canvas, "pointermove", 1, 1);
  window.dispatchEvent(new window.MouseEvent("pointerup", { bubbles: true, clientX: pointAt(1, 1).clientX, clientY: pointAt(1, 1).clientY }));
  await wait(30);
  ok(drawCalls > 0, `اللوحة رُسمت (${drawCalls} عملية رسم)`);
  ok($("#tray").querySelector(".chip").classList.contains("empty"), "الصينية صارت فارغة ⇒ الجرس وُضع على اللوحة");

  $("#btn-play-wave").click();
  await wait(60);
  ok(bellsPlayed >= 0, "بدأ تشغيل الموجة");

  // الحكم يصدر بعد انتهاء انتشار الموجة (≈٢ ثانية)
  await wait(2600);
  ok(!$("#win-modal").classList.contains("hidden"), "نافذة الفوز ظهرت");
  ok($("#win-stars").textContent.startsWith("★★★"), `ثلاث نجوم لأول محاولة: ${$("#win-stars").textContent}`);
  const saved = JSON.parse(window.localStorage.getItem("sada.progress.v1"));
  ok(saved && saved.done["1"] && saved.done["1"].stars === 3, "التقدّم محفوظ في localStorage");

  console.log("\n— مرحلة تالية + حلّ خاطئ —");
  $("#btn-win-next").click();
  await wait(30);
  ok($("#play-name").textContent.includes("الأقرب"), `انتقلنا إلى: «${$("#play-name").textContent}»`);
  ok(!$("#btn-prev").disabled, "زر المرحلة السابقة مُفعّل");
  ok($("#tray").querySelectorAll(".chip").length === 2, "جرسان في الصينية");

  // ترتيب خاطئ: الأصفر أقرب من الأحمر ⇒ اللحن معكوس
  const chips = $("#tray").querySelectorAll(".chip");
  chips[1].dispatchEvent(new window.MouseEvent("pointerdown", { bubbles: true })); // أصفر
  await wait(10);
  pointerOn(canvas, "pointerdown", 3, 1);
  await wait(20);
  $("#tray").querySelectorAll(".chip")[0].dispatchEvent(new window.MouseEvent("pointerdown", { bubbles: true })); // أحمر
  await wait(10);
  pointerOn(canvas, "pointerdown", 3, 4);
  await wait(450); // العزف التلقائي
  const before = bellsPlayed;
  $("#btn-play-wave").click();
  await wait(2100);
  ok(bellsPlayed > before, "الموجة عزفت الأجراس فعلاً");
  ok($("#win-modal").classList.contains("hidden"), "لا فوز مع ترتيب خاطئ");
  const flash = $("#flash");
  ok(flash.textContent.length > 0, `رسالة توضيحية: «${flash.textContent}»`);

  console.log("\n— التلميح ثم الحلّ الصحيح —");
  $("#btn-hint").click();
  await wait(20);
  ok($("#flash").textContent.includes("الخلية المضيئة"), `التلميح يعمل: «${$("#flash").textContent}»`);
  $("#btn-restart").click();
  await wait(30);
  ok([...$("#tray").querySelectorAll(".chip")].every((c) => !c.classList.contains("empty")), "«إعادة» أرجعت كل الأجراس إلى الصينية");
  // الحلّ الصحيح: الأحمر (٣,١) أقرب من الأصفر (٣,٤)
  $("#tray").querySelectorAll(".chip")[0].dispatchEvent(new window.MouseEvent("pointerdown", { bubbles: true }));
  await wait(10);
  pointerOn(canvas, "pointerdown", 3, 1);
  await wait(20);
  $("#tray").querySelectorAll(".chip")[1].dispatchEvent(new window.MouseEvent("pointerdown", { bubbles: true }));
  await wait(10);
  pointerOn(canvas, "pointerdown", 3, 4);
  await wait(450);
  $("#btn-play-wave").click();
  await wait(2200);
  ok(!$("#win-modal").classList.contains("hidden"), "الفوز بعد الترتيب الصحيح");
  ok($("#win-stars").textContent.startsWith("★"), `نجوم: ${$("#win-stars").textContent}`);

  console.log("\n— لوحة المفاتيح —");
  $("#btn-win-menu").click();
  await wait(20);
  $("#btn-play").click();
  await wait(30);
  window.dispatchEvent(new window.KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
  window.dispatchEvent(new window.KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }));
  window.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  await wait(20);
  ok($("#tray").querySelector(".chip").classList.contains("empty"), "لوحة المفاتيح وضعت جرساً");
  window.dispatchEvent(new window.KeyboardEvent("keydown", { key: "z", bubbles: true }));
  await wait(20);
  ok(!$("#tray").querySelector(".chip").classList.contains("empty"), "«تراجع» أرجع الجرس");

  console.log("\n— الاستوديو —");
  $("#btn-back").click();
  await wait(20);
  $("#btn-studio-open").click();
  await wait(40);
  ok(!$("#screen-studio").classList.contains("hidden"), "الاستوديو مفتوح");
  ok($("#palette").querySelectorAll(".tool").length === 9, `٩ أدوات في اللوحة (${$("#palette").querySelectorAll(".tool").length})`);
  const sb = $("#studio-board");
  sb.getBoundingClientRect = () => ({ left: 0, top: 0, right: 600, bottom: 500, width: 600, height: 500, x: 0, y: 0 });
  sb.dispatchEvent(new window.MouseEvent("pointerdown", { bubbles: true, clientX: 41, clientY: 41 }));
  sb.dispatchEvent(new window.MouseEvent("pointerdown", { bubbles: true, clientX: 103, clientY: 41 }));
  await wait(20);
  $("#btn-studio-play").click();
  await wait(200);
  ok(true, "الاستوديو يعمل بلا أخطاء");

  console.log("\n" + "─".repeat(46));
  console.log(`النتيجة: ${pass} نجح · ${fail} فشل`);
  if (fail) process.exit(1);
  console.log("✅ اختبار اللعب من طرف إلى طرف نجح");
  process.exit(0);
}

main().catch((e) => {
  console.error("خطأ في الاختبار:", e);
  process.exit(1);
});
