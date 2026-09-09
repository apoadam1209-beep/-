/* اختبار منطق «فَرْقِع!» الخالص — node pop/tools/test.mjs */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
(0, eval)(readFileSync(resolve(here, "../pop.js"), "utf8"));
const P = globalThis.POP;

let pass = 0, fail = 0;
const ok = (c, l, e = "") => { c ? (pass++, console.log("  ✓ " + l)) : (fail++, console.log("  ✗ " + l + " " + e)); };

console.log("— newGrid —");
const g = P.newGrid(7, 9, 4);
ok(g.length === 63, "٦٣ خلية");
ok(g.every((v) => v >= 1 && v <= 4), "القيم ضمن ١..٤");

console.log("— groupAt —");
const grid = [
  1, 1, 2,
  1, 2, 2,
  3, 3, 3,
];
const grp = P.groupAt(grid, 3, 3, 0); // اللون 1: (0,0),(1,0),(0,1)
ok(grp.length === 3, `مجموعة اللون ١ =  (${grp.length})`);
const grp2 = P.groupAt(grid, 3, 3, 8); // اللون 3 صف كامل
ok(grp2.length === 3, `مجموعة اللون ٣ =  (${grp2.length})`);

console.log("— collapse —");
// cols=2 rows=3 : idx = y*2+x
// عمود0: y0=0,y1=1,y2=3  | عمود1: y0=2,y1=0,y2=0
const g2 = [0, 2, 1, 0, 3, 0];
const spawned = P.collapse(g2, 2, 3, 4);
ok(g2[4] === 3 && g2[2] === 1 && g2[0] >= 1, "العمود ٠ هبط وحُفظ");
ok(g2[5] === 2 && g2[3] >= 1 && g2[1] >= 1, "العمود ١ هبط وحُفظ");
ok(spawned.length === 3, `٣ خلايا جديدة (${spawned.length})`);
ok(g2.every((v) => v >= 1), "لا صفر بعد الملء");

console.log("— bombBlast —");
const b = new Array(25).fill(1); b[12] = P.BOMB;
const blast = P.bombBlast(b, 5, 5, 12);
ok(blast.length === 9, `انفجار ٣×٣ = ٩ (${blast.length})`);
// قنبلة متسلسلة
const b2 = new Array(25).fill(1); b2[12] = P.BOMB; b2[13] = P.BOMB;
const blast2 = P.bombBlast(b2, 5, 5, 12);
ok(blast2.length >= 12, `تسلسل قنابل أوسع (${blast2.length})`);

console.log("— pointsFor —");
ok(P.pointsFor(2, 0) === 20, `زوج = ٢٠ (${P.pointsFor(2, 0)})`);
ok(P.pointsFor(5, 0) > P.pointsFor(2, 0), "الأكثر جواهر = أكثر نقاطاً");
ok(P.pointsFor(5, 2) > P.pointsFor(5, 0), "الكومبو يضاعف");

console.log("— hasMove —");
const nm = [1, 2, 1, 2, 1, 2];
ok(P.hasMove(nm, 3, 2) === false, "لا حركة في شبكx متناوبة");
const ym = [1, 2, 1, 2, 1, 1];
ok(P.hasMove(ym, 3, 2) === true, "توجد حركة عند زوج");

console.log("─".repeat(40));
console.log(`النتيجة: ${pass} نجح · ${fail} فشل`);
process.exit(fail ? 1 : 0);
