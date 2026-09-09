/* أدوات التحقّق — يتحقّق من أنّ كل مرحلة قابلة للحلّ فعلاً
 * التشغيل:  node sada/tools/verify.mjs        (أو  npm run verify:sada)
 *
 * ما يفعله:
 *  1) يبني خريطة الموجة لكل مرحلة ويطبعها (لمراجعة التصميم بصرياً).
 *  2) يعدّ *كل* الحلول الممكنة (حلّال تركيبي دقيق).
 *  3) يأخذ حلاًّ من الحلّال ويمرّره على دالة الفحص نفسها التي تستعملها اللعبة.
 *  4) يفشل (رمز خروج ≠ 0) إذا كانت هناك مرحلة مستحيلة أو حلّ لا يُقبل.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const load = (p) => readFileSync(resolve(here, p), "utf8");

for (const f of ["../js/sim.js", "../js/levels.js"]) {
  // eslint-disable-next-line no-eval
  (0, eval)(load(f));
}
const { parseLevel, solve, check, computeDist, ascii, COLORS } = globalThis.SADA;

const only = process.argv[2] ? Number(process.argv[2]) : null;
const showMaps = process.argv.includes("--maps");

let failed = 0;
const rows = [];

for (const raw of globalThis.SADA.RAW_LEVELS) {
  const level = parseLevel(raw);
  if (only && level.id !== only) continue;
  const dist = computeDist(level);
  const sol = solve(level);
  let verdict = "✓";
  let detail = "";

  if (!sol.ok) {
    verdict = "✗ مستحيلة";
    detail = sol.reason || "";
    failed++;
  } else {
    const res = check(level, sol.sample);
    if (!res.ok) {
      verdict = "✗ الحلّ مرفوض";
      detail = `${res.reason}: ${res.message}`;
      failed++;
    }
  }

  // الفوانيس يجب أن تكون قابلة للإضاءة
  for (const [x, y] of level.lanterns) {
    if (dist[y * level.cols + x] < 0) {
      verdict = "✗ فانوس في الظلّ";
      detail = `عند ${x},${y}`;
      failed++;
    }
  }

  const bellsStr = raw.bells || "";
  const beats = level.target
    .map((b) => b.map((c) => COLORS[c].ar.slice(0, 3)).join("+"))
    .join(" ← ");
  rows.push({
    id: level.id,
    ch: level.chapter,
    name: level.name,
    size: `${level.cols}×${level.rows}`,
    bells: bellsStr ? bellsStr.split(/\s+/).length : 0,
    beats,
    solutions: sol.count,
    verdict,
    detail,
  });

  if (showMaps || failed) {
    console.log(`\n── ${level.id}. ${level.name}  [${level.cols}×${level.rows}]  ${verdict} ${detail}`);
    console.log(ascii(level, dist));
    if (sol.sample) {
      const map = ascii(level, dist).split("\n").map((l) => l.split(""));
      for (const b of sol.sample) {
        const line = map[b.y];
        line[b.x * 3 + 1] = "*";
        line[b.x * 3 + 2] = b.c;
      }
      console.log("الحلّ:");
      console.log(map.map((l) => l.join("")).join("\n"));
    }
  }
}

const pad = (s, n) => String(s).padEnd(n, " ");
const lpad = (s, n) => String(s).padStart(n, " ");

console.log(`${lpad("id", 4)}${lpad("ch", 4)}${pad("الاسم", 22)}${pad("الحجم", 8)}${lpad("أجراس", 6)}${lpad("الحلول", 12)}  الحالة`);
console.log("─".repeat(70));
for (const r of rows) {
  console.log(
    `${lpad(r.id, 4)}${lpad(r.ch, 4)}${pad(r.name, 22)}${pad(r.size, 8)}${lpad(r.bells, 6)}${lpad(r.solutions, 12)}  ${r.verdict} ${r.detail}`
  );
  console.log(`        اللحن: ${r.beats}`);
}
const solvable = rows.filter((r) => r.verdict === "✓").length;
console.log("─".repeat(74));
console.log(`المراحل: ${rows.length} · قابلة للحلّ ومُتحقَّق منها: ${solvable} · فاشلة: ${rows.length - solvable}`);
if (failed) {
  console.error("\n❌ تحقّق فاشل");
  process.exit(1);
}
console.log("\n✅ كل المراحل قابلة للحلّ، وكلّ حلّ يمرّ بفحص اللعبة.");
