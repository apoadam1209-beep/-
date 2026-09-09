import { LEVELS, levelState } from "../data/levels";
import { applyPulse } from "./simulate";
import { solve } from "./solver";
import { isWon } from "./state";

function main() {
  let failed = 0;
  for (const def of LEVELS) {
    const start = levelState(def);
    if (isWon(start)) {
      console.log(`L${def.id} ${def.name}: already won?`);
      failed++;
      continue;
    }
    const r = solve(start, 10);
    if (!r.solvable) {
      console.log(`L${def.id} ${def.name}: UNSOLVABLE visited=${r.visited}`);
      failed++;
      continue;
    }
    // replay
    let s = start;
    for (const p of r.path) {
      s = applyPulse(s, p.r, p.c).final;
    }
    const ok = isWon(s);
    const parNote = r.path.length !== def.par ? ` (par listed ${def.par})` : "";
    console.log(
      `L${def.id.toString().padStart(2)} ${def.name.padEnd(14)} opt=${r.path.length}${parNote}  path=${JSON.stringify(r.path)}  visited=${r.visited} ${ok ? "OK" : "REPLAY FAIL"}`
    );
    if (!ok) failed++;
  }
  console.log(failed ? `\n${failed} failed` : "\nall solvable");
  process.exit(failed ? 1 : 0);
}

main();
