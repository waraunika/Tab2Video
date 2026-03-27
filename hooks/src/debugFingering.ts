// ============================================================
// debug-fingering.ts
// Run with: tsx src/debug-fingering.ts
// Tests each sub-system in isolation then runs end-to-end
// ============================================================

import { parse } from "./parser";
import { generateCandidates, formatCandidate } from "./candidateGenerator";
import { extractConstraints, formatConstraint } from "./constraintExtractor";
import {
  positionCost,
  transitionCost,
  formatCost,
  formatTransitionCost,
} from "./costFunctions";
import { dijkstra } from "./dijkstra";
import { assignFingerings } from "./fingeringEngine";
import { Candidate } from "@/types/fingeringTypes";

function section(title: string): void {
  console.log("\n" + "=".repeat(60));
  console.log(` ${title}`);
  console.log("=".repeat(60));
}

function sub(title: string): void {
  console.log(`\n--- ${title} ---`);
}

// ============================================================
// TEST 1: Candidate generation — single note
// Single note should yield 4 candidates (one per finger)
// ============================================================

section("TEST 1: Candidate generation — single note (fret 14, string 1)");
const singleNoteCandidates = generateCandidates(0, [{ string: 1, fret: 14 }]);
console.log(
  `Generated ${singleNoteCandidates.length} candidates (expected 4):`,
);
for (const c of singleNoteCandidates) {
  console.log(`  ${formatCandidate(c)}  ${formatCost(c)}`);
}

// ============================================================
// TEST 2: Candidate generation — two-note chord (same fret = barre possible)
// ============================================================

section("TEST 2: Two-note chord — same fret (barre candidate expected)");
const twoNoteSameFret = generateCandidates(0, [
  { string: 3, fret: 7 },
  { string: 4, fret: 7 },
]);
console.log(`Generated ${twoNoteSameFret.length} candidates:`);
for (const c of twoNoteSameFret) {
  console.log(`  ${formatCandidate(c)}  ${formatCost(c)}`);
}

// ============================================================
// TEST 3: Candidate generation — two-note chord (different frets)
// ============================================================

section("TEST 3: Two-note chord — different frets");
const twoNoteDiffFret = generateCandidates(0, [
  { string: 2, fret: 14 },
  { string: 1, fret: 17 },
]);
console.log(`Generated ${twoNoteDiffFret.length} candidates:`);
for (const c of twoNoteDiffFret) {
  console.log(`  ${formatCandidate(c)}  ${formatCost(c)}`);
}

// ============================================================
// TEST 4: Candidate generation — three-note chord
// ============================================================

section("TEST 4: Three-note chord (7.3, 7.4, 5.5)");
const threeNote = generateCandidates(0, [
  { string: 3, fret: 7 },
  { string: 4, fret: 7 },
  { string: 5, fret: 5 },
]);
console.log(`Generated ${threeNote.length} candidates:`);
for (const c of threeNote) {
  console.log(`  ${formatCandidate(c)}  ${formatCost(c)}`);
}

// ============================================================
// TEST 5: Candidate generation — span > 4 should be filtered
// ============================================================

section("TEST 5: Span > 4 frets — should yield 0 or very few valid candidates");
const wideSpan = generateCandidates(0, [
  { string: 1, fret: 5 },
  { string: 2, fret: 10 }, // 5-fret span — invalid
]);
console.log(`Generated ${wideSpan.length} candidates (expected 0):`);
for (const c of wideSpan) {
  console.log(`  ${formatCandidate(c)}`);
}

// ============================================================
// TEST 6: Position cost comparison
// ============================================================

section("TEST 6: Position cost — low fret vs high fret");
const lowFret = generateCandidates(0, [{ string: 1, fret: 1 }]);
const midFret = generateCandidates(0, [{ string: 1, fret: 7 }]);
const highFret = generateCandidates(0, [{ string: 1, fret: 15 }]);
console.log("Single note at different fret positions (F1 = index):");
console.log(
  `  fret 1,  F1: positionCost=${positionCost(lowFret[0]).toFixed(2)}`,
);
console.log(
  `  fret 7,  F1: positionCost=${positionCost(midFret[0]).toFixed(2)}`,
);
console.log(
  `  fret 15, F1: positionCost=${positionCost(highFret[0]).toFixed(2)}`,
);
console.log("Expected: fret 1 costs more than fret 15 (tighter spacing)");

// ============================================================
// TEST 7: Transition cost — time pressure
// ============================================================

section("TEST 7: Transition cost — time pressure scaling");
// Moving from str1f14/F1 to str1f17/F1 (same string, 3 fret shift)
const fromCandidate = generateCandidates(0, [{ string: 1, fret: 14 }]).find(
  (c) => c.assignments[0].finger === 1,
)!;
const toCandidate = generateCandidates(1, [{ string: 1, fret: 17 }]).find(
  (c) => c.assignments[0].finger === 1,
)!;

console.log(`From: ${formatCandidate(fromCandidate)}`);
console.log(`To:   ${formatCandidate(toCandidate)}`);
console.log();
for (const timeDelta of [0.05, 0.1, 0.25, 0.5, 1.0, 2.0]) {
  console.log(
    `  timeDelta=${timeDelta.toFixed(2)}s: ${formatTransitionCost(fromCandidate, toCandidate, timeDelta)}`,
  );
}

// ============================================================
// TEST 8: Constraint extraction
// ============================================================

section("TEST 8: Constraint extraction from hammer-ons and slides");
const HOPOS_SOURCE = `
\\tuning (E4 B3 G3 D3 A2 E2)
\\ts (4 4)
\\tempo 120
  14.1{h acc #}.8{beam Down}
  17.1.8{beam Down}
  17.1{h}.8{beam Down}
  14.1{acc #}.8{beam Down}
  15.2{ss}.8{beam Down}
  17.2.8{beam Down}
`;
const parsed = parse(HOPOS_SOURCE);
const constraints = extractConstraints(parsed);
console.log(`Extracted ${constraints.length} constraints:`);
for (const c of constraints) {
  console.log(`  ${formatConstraint(c)}`);
}

// ============================================================
// TEST 9: Constraint filtering in candidates
// Hammer-on 14→17 on str1: target must have higher finger than source
// ============================================================

section("TEST 9: Constraint filtering — hammer-on forces higher finger");
const sourceNote = parsed.notes.find((n) => n.id === 0)!;
const targetNote = parsed.notes.find((n) => n.id === 1)!;
console.log(
  `Source: ${sourceNote.placements.map((p) => `str${p.string}f${p.fret}`).join("+")}`,
);
console.log(
  `Target: ${targetNote.placements.map((p) => `str${p.string}f${p.fret}`).join("+")}`,
);

const sourceCands = generateCandidates(sourceNote.id, sourceNote.placements);
const targetCands = generateCandidates(targetNote.id, targetNote.placements);

import { edgeSatisfiesConstraints } from "./constraint-extractor";

console.log("\nValid (source, target) finger pairs for hammer-on:");
let validPairs = 0;
for (const sc of sourceCands) {
  for (const tc of targetCands) {
    const ok = edgeSatisfiesConstraints(
      0,
      1,
      sc.assignments,
      tc.assignments,
      constraints,
    );
    if (ok) {
      const sf = sc.assignments[0].finger;
      const tf = tc.assignments[0].finger;
      console.log(`  source F${sf} → target F${tf}  ✓`);
      validPairs++;
    }
  }
}
console.log(
  `Total valid pairs: ${validPairs} (expected: only pairs where tf > sf)`,
);

// ============================================================
// TEST 10: End-to-end — simple melody
// ============================================================

section("TEST 10: End-to-end — simple melody");
const SIMPLE = `
\\tuning (E4 B3 G3 D3 A2 E2)
\\ts (4 4)
\\tempo 90
  12.2.4{beam Down}
  14.2.4{beam Down}
  15.2.4{beam Down}
  17.2.4{beam Down}
|
  14.1.4{beam Down}
  15.1.4{beam Down}
  17.1.4{beam Down}
  19.1.4{beam Down}
`;
const piece1 = parse(SIMPLE);
const result1 = assignFingerings(piece1);
console.log("Fingering assignments:");
for (const n of result1.notes) {
  if (n.isRest || n.assignments.length === 0) continue;
  const assigns = n.assignments
    .sort((a, b) => a.string - b.string)
    .map((a) => `str${a.string}f${a.fret}→F${a.finger}`)
    .join(", ");
  console.log(`  [${n.id}] t=${n.timeSeconds.toFixed(3)}s: ${assigns}`);
}

// ============================================================
// TEST 11: End-to-end — hammer-on sequence
// ============================================================

section("TEST 11: End-to-end — hammer-on + pull-off");
const HOPOS = `
\\tuning (E4 B3 G3 D3 A2 E2)
\\ts (4 4)
\\tempo 120
  14.1{h acc #}.16{tu (3 2) beam Down}
  15.1{h}.16{tu (3 2) beam Down}
  14.1{acc #}.16{tu (3 2) beam Down}
`;
const piece2 = parse(HOPOS);
const result2 = assignFingerings(piece2);
console.log("Expected: finger(note0) < finger(note1) (hammer-on)");
console.log("Expected: finger(note1) > finger(note2) (pull-off)");
for (const n of result2.notes) {
  if (n.isRest || n.assignments.length === 0) continue;
  const a = n.assignments[0];
  const trans = n.transitionArticulation
    ? ` →${n.transitionArticulation.type}`
    : "";
  console.log(`  [${n.id}] str${a.string}f${a.fret} → F${a.finger}${trans}`);
}

// ============================================================
// TEST 12: End-to-end — three-note chord
// ============================================================

section("TEST 12: End-to-end — three-note power chord");
const CHORD = `
\\tuning (E4 B3 G3 D3 A2 E2)
\\ts (4 4)
\\tempo 200
  (7.3 7.4 5.5).4{beam Up}
  (7.3 7.4 5.5).4{beam Up}
  5.5.4{beam Up}
  8.2.4{beam Down}
`;
const piece3 = parse(CHORD);
const result3 = assignFingerings(piece3);
console.log(
  "Expected: chord barre on str3+str4 f7, separate finger on str5 f5",
);
for (const n of result3.notes) {
  if (n.isRest || n.assignments.length === 0) continue;
  const assigns = n.assignments
    .sort((a, b) => a.string - b.string)
    .map((a) => `str${a.string}f${a.fret}→F${a.finger}${a.barre ? "(B)" : ""}`)
    .join(", ");
  console.log(`  [${n.id}] t=${n.timeSeconds.toFixed(3)}s: ${assigns}`);
}

// ============================================================
// TEST 13: End-to-end — slide with hand shift
// ============================================================

section("TEST 13: End-to-end — slide (hand position recalculation)");
const SLIDE = `
\\tuning (E4 B3 G3 D3 A2 E2)
\\ts (4 4)
\\tempo 90
  7.2{ss}.4{beam Down}
  14.2.4{beam Down}
  15.2.4{beam Down}
`;
const piece4 = parse(SLIDE);
const result4 = assignFingerings(piece4);
console.log(
  "Expected: note[0] and note[1] share same finger (slide constraint)",
);
for (const n of result4.notes) {
  if (n.isRest || n.assignments.length === 0) continue;
  const a = n.assignments[0];
  const trans = n.transitionArticulation
    ? ` →${n.transitionArticulation.type}`
    : "";
  console.log(`  [${n.id}] str${a.string}f${a.fret} → F${a.finger}${trans}`);
}

// ============================================================
// TEST 14: End-to-end — full sample excerpt
// ============================================================

section("TEST 14: End-to-end — real AlphaTex excerpt");
const REAL = `
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
const piece5 = parse(REAL);
const result5 = assignFingerings(piece5);
console.log(`\nNotes: ${result5.notes.filter((n) => !n.isRest).length}`);
for (const n of result5.notes) {
  if (n.isRest || n.assignments.length === 0) continue;
  const assigns = n.assignments
    .sort((a, b) => a.string - b.string)
    .map((a) => `str${a.string}f${a.fret}→F${a.finger}${a.barre ? "(B)" : ""}`)
    .join(", ");
  const trans = n.transitionArticulation
    ? ` [→${n.transitionArticulation.type}]`
    : "";
  console.log(
    `  [${String(n.id).padStart(2)}] t=${n.timeSeconds.toFixed(3)}s: ${assigns}${trans}`,
  );
}
