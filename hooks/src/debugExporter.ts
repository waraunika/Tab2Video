// ============================================================
// debug-exporter.ts
// Run with: tsx src/debug-exporter.ts
// ============================================================

import { parse } from "./parser";
import { assignFingerings } from "./fingeringEngine";
import { exportToJsonString, exportToJson } from "./jsonExporter";

function section(title: string): void {
  console.log("\n" + "=".repeat(60));
  console.log(` ${title}`);
  console.log("=".repeat(60));
}

// ============================================================
// TEST 1: Full JSON output — real AlphaTex excerpt
// ============================================================

section("TEST 1: Full JSON output");

const SIMPLE = `
\\tuning (E4 B3 G3 D3 A2 E2)
\\ts (4 4)
\\tempo 90
  12.2{v}.2{beam Down}
  14.2{v}.4{beam Down}
  15.2.8{beam Down}
  17.2.8{beam Down}
|
  14.1{v}.2{beam Down}
  17.2.8{beam Down}
  15.1.8{beam Down}
  14.1{h}.16{tu (3 2) beam Down}
  15.1{h}.16{tu (3 2) beam Down}
  14.1.16{tu (3 2) beam Down}
  17.2.8{beam Down}
|
  15.2{v}.4{d beam Down}
  17.2{h}.16{beam Down}
  15.2.16{beam Down}
  14.2.8{beam Down}
  14.1.8{beam Down}
  17.1.8{beam Down}
  19.1.8{beam Down}
`;
const parsed1 = parse(SIMPLE);
const fingered1 = assignFingerings(parsed1);
console.log(exportToJsonString(fingered1, parsed1));

// ============================================================
// TEST 2: Duration codes
// ============================================================

section("TEST 2: Duration codes");

const DURATIONS = `
\\tuning (E4 B3 G3 D3 A2 E2)
\\ts (4 4)
\\tempo 120
  12.2.1{beam Down}
  12.2.2{beam Down}
  12.2.4{beam Down}
  12.2.8{beam Down}
  12.2.16{beam Down}
  12.2.32{beam Down}
  12.2.4{d beam Down}
  12.2.8{tu (3 2) beam Down}
  12.2.8{tu (3 2) beam Down}
  12.2.8{tu (3 2) beam Down}
`;
const parsed2 = parse(DURATIONS);
const fingered2 = assignFingerings(parsed2);
const output2 = exportToJson(fingered2, parsed2);
console.log("Expected: w h q e s t q. e*3:2 e*3:2 e*3:2");
for (const n of output2.notes) {
  if (!n.is_rest) console.log(`  [${n.id}] ${n.duration}`);
}

// ============================================================
// TEST 3: Tempo change
// ============================================================

section("TEST 3: Tempo change mid-piece");

const TEMPO_CHANGE = `
\\tuning (E4 B3 G3 D3 A2 E2)
\\ts (4 4)
\\tempo 90
  12.2.4{beam Down}
  14.2.4{beam Down}
|
\\tempo 200
  7.3.4{beam Down}
  9.3.4{beam Down}
`;
const parsed3 = parse(TEMPO_CHANGE);
const fingered3 = assignFingerings(parsed3);
const output3 = exportToJson(fingered3, parsed3);
console.log("Expected tempos: 90 90 200 200");
for (const n of output3.notes) {
  if (!n.is_rest) console.log(`  [${n.id}] tempo=${n.measure_info.tempo}`);
}

// ============================================================
// TEST 4: Articulations and transitions
// ============================================================

section("TEST 4: Articulations + transitions");

const ARTICULATIONS = `
\\tuning (E4 B3 G3 D3 A2 E2)
\\ts (4 4)
\\tempo 120
  14.2{be (bend 0 0 60 4)}.4{beam Down}
  14.1{h}.8{beam Down}
  17.1.8{beam Down}
  15.2{ss}.4{beam Down}
  17.2.4{beam Down}
  16.2{v}.4{beam Down}
`;
const parsed4 = parse(ARTICULATIONS);
const fingered4 = assignFingerings(parsed4);
const output4 = exportToJson(fingered4, parsed4);
for (const n of output4.notes) {
  if (n.is_rest) continue;
  const arts =
    n.articulations.length > 0 ? ` [${n.articulations.join(",")}]` : "";
  const trans = n.transition
    ? ` →${n.transition.type}(str${n.transition.string} target=${n.transition.target_note_id})`
    : "";
  const fing = n.fingering
    .map(
      (f) => `str${f.string}f${f.fret}F${f.finger}${f.is_barre ? "(B)" : ""}`,
    )
    .join("+");
  console.log(`  [${n.id}] ${fing}${arts}${trans}`);
}

// ============================================================
// TEST 5: Rests
// ============================================================

section("TEST 5: Rests in output");

const WITH_RESTS = `
\\tuning (E4 B3 G3 D3 A2 E2)
\\ts (4 4)
\\tempo 120
  14.1.4{beam Down}
  r.4{beam Down}
  17.1.4{beam Down}
  r.4{beam Down}
`;
const parsed5 = parse(WITH_RESTS);
const fingered5 = assignFingerings(parsed5);
const output5 = exportToJson(fingered5, parsed5);
for (const n of output5.notes) {
  const desc = n.is_rest
    ? "REST  fingering=[]"
    : `NOTE  ${n.fingering.map((f) => `str${f.string}f${f.fret}F${f.finger}`).join("+")}`;
  console.log(`  [${n.id}] t=${n.time_seconds}s ${n.duration}  ${desc}`);
}

// ============================================================
// TEST 6: Barre in output
// ============================================================

section("TEST 6: Barre chord is_barre field");

const BARRE = `
\\tuning (E4 B3 G3 D3 A2 E2)
\\ts (4 4)
\\tempo 120
  (7.3 7.4 5.5).4{beam Up}
`;
const parsed6 = parse(BARRE);
const fingered6 = assignFingerings(parsed6);
const output6 = exportToJson(fingered6, parsed6);
for (const n of output6.notes) {
  if (n.is_rest) continue;
  for (const f of n.fingering) {
    console.log(
      `  str${f.string} f${f.fret} F${f.finger} is_barre=${f.is_barre}`,
    );
  }
}
