/* e2e لـ«فَرْقِع!» داخل jsdom — يشغّل المتحكّم الحقيقي ويتحقق من اللعب والفوز/الخسارة */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
let JSDOM;
try { ({ JSDOM } = require("jsdom")); } catch { console.error("npm i -D jsdom"); process.exit(2); }

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(resolve(ROOT, p), "utf8");

function mockCtx() {
  const store = {};
  return new Proxy({}, {
    get(t, p) {
      if (p in store) return store[p];
      return (...a) => (p === "measureText" ? { width: 10 } : undefined);
    },
    set(t, p, v) { store[p] = v; return true; },
  });
}
function param(v = 0) { return { value: v, setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {}, setTargetAtTime: () => {} }; }
class MockAC {
  constructor() { this.currentTime = 0; this.sampleRate = 44100; this.state = "running"; this.destination = {}; }
  resume() { return Promise.resolve(); }
  createGain() { return { gain: param(1), connect: () => {} }; }
  createOscillator() { return { type: "s", frequency: param(440), connect: () => {}, start: () => {}, stop: () => {} }; }
  createBuffer(ch, len) { const d = Array.from({ length: ch }, () => new Float32Array(len)); return { getChannelData: (i) => d[i] }; }
  createBufferSource() { return { buffer: null, connect: () => {}, start: () => {}, stop: () => {} }; }
  createBiquadFilter() { return { type: "", frequency: param(), connect: () => {} }; }
}

const html = read("index.html").replace(/<script[\s\S]*?<\/script>/g, "");
const dom = new JSDOM(html, { url: "http://localhost/", pretendToBeVisual: true, runScripts: "outside-only" });
const { window } = dom;
window.HTMLCanvasElement.prototype.getContext = function () { this.__c = this.__c || mockCtx(); return this.__c; };
window.AudioContext = MockAC;
window.scrollTo = () => {};
window.eval(read("pop.js"));
const doc = window.document;
const $ = (s) => doc.querySelector(s);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const P = window.POP;

let pass = 0, fail = 0;
const ok = (c, l, e = "") => { c ? (pass++, console.log("  ✓ " + l)) : (fail++, console.log("  ✗ " + l + " " + e)); };

(async () => {
  ok(!!P, "المحرك POP موجود");
  ok(!$("#ov-start").classList.contains("hidden"), "شاشة البداية ظاهرة");
  ok($("#cv").width > 0, "الكانفاس مهيأ");

  // الضبط في صفحة البداية
  ok(doc.querySelectorAll("#seg-diff button").length === 3, "٣ درجات صعوبة");
  doc.querySelector('#seg-diff [data-d="hard"]').dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  ok(P._.state.diff === "hard", "اختيار «صعب»");
  ok(P.cfg(1, "hard").moves === 16 && P.cfg(1, "easy").moves === 25, "تأثير الصعوبة على الحركات");
  doc.querySelector('#seg-diff [data-d="normal"]').dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  ok(P._.state.diff === "normal", "العودة إلى «عادي»");
  const snd0 = P._.state.sound;
  doc.querySelector("#sw-sound").dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  ok(P._.state.sound === !snd0, "زر الصوت يقلب الحالة");
  doc.querySelector("#sw-sound").dispatchEvent(new window.MouseEvent("click", { bubbles: true }));

  // ابدأ المرحلة
  $("#btn-start").click();
  await wait(30);
  ok($("#ov-start").classList.contains("hidden"), "اختفت شاشة البداية");
  ok(P._.state.mode === "play", "وضع اللعب");
  ok(P._.state.grid.length === 63, "شبكة ٦٣");
  ok(P._.state.moves === 20, "٢٠ حركة");

  // فوز: اجعل الهدف صغيراً ثم فرقِع مجموعة
  P._.state.target = 20;
  let idx = -1;
  for (let i = 0; i < P._.state.grid.length; i++) {
    if (P.groupAt(P._.state.grid, 7, 9, i).length >= 2) { idx = i; break; }
  }
  ok(idx >= 0, "توجد مجموعة قابلة للفرقعة");
  P._.tap(idx);
  await wait(30);
  ok(P._.state.score >= 20, `النقاط ${P._.state.score} ≥ ٢٠`);
  ok(P._.state.mode === "win", "وضع الفوز");
  ok(!$("#ov-win").classList.contains("hidden"), "نافذة الفوز ظاهرة");
  ok($("#hud-score").textContent !== "0", "الـHUD تحدّث");

  // المرحلة التالية
  $("#btn-next").click();
  await wait(20);
  ok(P._.state.level === 2 && P._.state.mode === "play", "انتقلنا للمرحلة ٢");

  // خسارة: حركات=١ وهدف ضخم
  P._.state.moves = 1; P._.state.target = 999999;
  let idx2 = -1;
  for (let i = 0; i < P._.state.grid.length; i++) if (P.groupAt(P._.state.grid, 7, 9, i).length >= 2) { idx2 = i; break; }
  P._.tap(idx2);
  await wait(20);
  ok(P._.state.mode === "lose", "وضع الخسارة عند نفاد الحركات");
  ok(!$("#ov-lose").classList.contains("hidden"), "نافذة الخسارة ظاهرة");
  $("#btn-retry").click();
  await wait(20);
  ok(P._.state.mode === "play" && P._.state.moves === 20, "إعادة المحاولة تضبط الحركات");

  // نقرة على خلية مفردة لا تستهلك حركة
  const before = P._.state.moves;
  // ابحث عن خلية لونها فريد حولها
  let single = -1;
  for (let i = 0; i < P._.state.grid.length; i++) if (P.groupAt(P._.state.grid, 7, 9, i).length === 1) { single = i; break; }
  if (single >= 0) { P._.tap(single); ok(P._.state.moves === before, "الخلية المفردة لا تستهلك حركة"); }
  else ok(true, "لا خلية مفردة (تخطٍّ)");

  console.log("─".repeat(40));
  console.log(`النتيجة: ${pass} نجح · ${fail} فشل`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
