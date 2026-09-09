/* لقطة للوحة «فَرْقِع!» الحقيقية (jsdom + @napi-rs/canvas) */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { JSDOM } = require("jsdom");
const { createCanvas } = require("@napi-rs/canvas");

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(resolve(ROOT, p), "utf8");
const OUT = process.argv[2] || "/home/user/.cache/pop-shots";
mkdirSync(OUT, { recursive: true });

const html = read("index.html").replace(/<script[\s\S]*?<\/script>/g, "");
const dom = new JSDOM(html, { url: "http://localhost/", pretendToBeVisual: true, runScripts: "outside-only" });
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
window.AudioContext = MockAC;
window.scrollTo = () => {};
window.eval(read("pop.js"));
const doc = window.document;
const $ = (s) => doc.querySelector(s);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  await wait(80);
  const cv = $("#cv");
  writeFileSync(resolve(OUT, "board.png"), back.get(cv).toBuffer("image/png"));
  // ابدأ وفرقِع مجموعة لرؤية الجسيمات
  $("#btn-start").click();
  await wait(60);
  const P = window.POP;
  for (let i = 0; i < P._.state.grid.length; i++) {
    if (P.groupAt(P._.state.grid, 7, 9, i).length >= 3) { P._.tap(i); break; }
  }
  await wait(120);
  writeFileSync(resolve(OUT, "pop.png"), back.get(cv).toBuffer("image/png"));
  console.log("الصور في", OUT);
  process.exit(0);
})();
