// ============================================================
// debug-parser.ts
// Run with: tsx src/debug-parser.ts
// Exercises every layer: tokenizer → parser → output inspection
// ============================================================

import { tokenize, printTokens } from "./tokenizer";
import { parse } from "./parser";
import type { ParsedNote } from "@/types/parserTypes";

// ============================================================
// The AlphaTex sample (first few measures for focused testing)
// ============================================================

const SAMPLE_SIMPLE = `
\\tuning (E4 B3 G3 D3 A2 E2)
\\ts (4 4)
\\tempo 90

  12.2{v}.2{f dy f beam Down}
  14.2{v acc #}.4{f beam Down}
  15.2.8{beam Down}
  17.2.8{beam Down}
|
  14.1{v acc #}.2{beam Down}
  17.2.8{beam Down}
  15.1.8{beam Down}
  14.1{h acc #}.16{tu (3 2) beam Down}
  15.1{h}.16{tu (3 2) beam Down}
  14.1{acc #}.16{tu (3 2) beam Down}
  17.2.8{beam Down}
|
  15.2{v}.4{d beam Down}
  17.2{h}.16{beam Down}
  15.2.16{beam Down}
  14.2{acc #}.8{beam Down}
`;

const SAMPLE_BEND = `
\\tuning (E4 B3 G3 D3 A2 E2)
\\ts (4 4)
\\tempo 90

  14.2{be (bendrelease 0 0 30 4 30 4 60 0)}.4{d beam Down}
  15.2{ss}.8{beam Down}
  17.2.8{beam Down}
|
  14.1{v acc #}.2{beam Down}
  r.8{beam Down}
  14.1{be (prebendrelease 0 2 60 0)}.4{d beam Down}
|
  17.2{v}.2{d beam Down}
  r.4{beam Down}
`;

const SAMPLE_CHORDS = `
\\tuning (E4 B3 G3 D3 A2 E2)
\\ts (4 4)
\\tempo 200

  (7.3 7.4 5.5).4{beam Up}
  5.5{pm}.8{beam Up}
  5.5{pm}.8{beam Up}
  8.2.8{beam Down}
  7.2{acc #}.8{beam Down}
  5.5{pm}.8{beam Up}
  5.5{pm}.8{beam Up}
|
  (4.4{acc #} 4.5{acc #} 2.6{acc #}).4{beam Up}
  2.6{pm acc #}.8{beam Up}
  2.6{pm acc #}.8{beam Up}
  (2.4 2.5 0.6).8{beam Up}
  0.6{pm}.8{beam Up}
  (4.4{acc #} 4.5{acc #} 2.6{acc #}).8{beam Up}
  2.6{pm acc #}.8{beam Up}
|
  (4.3{ss} 5.4{ss}).4{beam Up}
  (6.3{acc #} 7.4).8{beam Up}
`;

// ============================================================
// Helpers
// ============================================================

function formatNote(n: ParsedNote): string {
  const placements = n.isRest
    ? "REST"
    : n.placements.length === 0
      ? "OPEN(filtered)"
      : n.placements.map((p) => `str${p.string}f${p.fret}`).join("+");

  const arts =
    n.selfArticulations.length > 0
      ? ` [${n.selfArticulations.join(", ")}]`
      : "";

  const trans = n.transitionArticulation
    ? ` →${n.transitionArticulation.type}(str${n.transitionArticulation.string},target=${n.transitionArticulation.targetNoteId})`
    : "";

  const timing = `t=${n.timeSeconds.toFixed(3)}s dur=${n.durationSeconds.toFixed(3)}s`;
  const tuplet = n.tuplet ? ` tu(${n.tuplet.actual}:${n.tuplet.normal})` : "";
  const dot = n.dotted ? " dot" : "";

  return `  [${String(n.id).padStart(3)}] m${n.measureIndex} | ${placements.padEnd(20)} ${timing}${dot}${tuplet}${arts}${trans}`;
}

function section(title: string): void {
  console.log("\n" + "=".repeat(60));
  console.log(` ${title}`);
  console.log("=".repeat(60));
}

// ============================================================
// Test 1: Tokenizer output
// ============================================================

section("TEST 1: Tokenizer — simple melody");
const tokens = tokenize(SAMPLE_SIMPLE);
printTokens(tokens);

// ============================================================
// Test 2: Parser — simple melody with hammer-ons
// ============================================================

section("TEST 2: Parser — simple melody + hammer-ons");
const piece1 = parse(SAMPLE_SIMPLE);
console.log(`\nTuning: ${piece1.tuning.join(" ")}`);
console.log(`Tempo: ${piece1.initialTempo} BPM`);
console.log(
  `Time sig: ${piece1.initialTimeSignature[0]}/${piece1.initialTimeSignature[1]}`,
);
console.log(`Notes: ${piece1.notes.length}`);
console.log();
for (const n of piece1.notes) {
  console.log(formatNote(n));
}

// ============================================================
// Test 3: Bend and slide parsing
// ============================================================

section("TEST 3: Bends and slides");
const piece2 = parse(SAMPLE_BEND);
for (const n of piece2.notes) {
  console.log(formatNote(n));
}

// ============================================================
// Test 4: Chord parsing + open string filtering
// ============================================================

section("TEST 4: Chords + open string filtering");
const piece3 = parse(SAMPLE_CHORDS);
for (const n of piece3.notes) {
  console.log(formatNote(n));
}

// ============================================================
// Test 5: Tempo change mid-piece
// ============================================================

section("TEST 5: Tempo change");
const SAMPLE_TEMPO_CHANGE = `
\\tuning (E4 B3 G3 D3 A2 E2)
\\ts (4 4)
\\tempo 90
  12.2.4{beam Down}
  14.2.4{beam Down}
|
\\tempo 200
  7.3.4{beam Down}
  9.3.4{beam Down}
|
  7.3.8{beam Down}
  9.3.8{beam Down}
`;
const piece4 = parse(SAMPLE_TEMPO_CHANGE);
console.log(`Tempo changes: ${JSON.stringify(piece4.tempoChanges)}`);
for (const n of piece4.notes) {
  const tempo =
    n.id < (piece4.tempoChanges[0]?.atNoteId ?? Infinity) ? 90 : 200;
  console.log(formatNote(n) + `  (at ${tempo}bpm)`);
}

// ============================================================
// Test 6: Full timing sanity check
// At 90 BPM: quarter=0.667s, eighth=0.333s, dotted-quarter=1.000s
// At 200 BPM: quarter=0.300s, eighth=0.150s
// ============================================================

section("TEST 6: Timing sanity check");
const SAMPLE_TIMING = `
\\tuning (E4 B3 G3 D3 A2 E2)
\\ts (4 4)
\\tempo 120
  12.2.4{beam Down}
  14.2.8{beam Down}
  15.2.16{beam Down}
  12.2.4{d beam Down}
  14.2.8{tu (3 2) beam Down}
  15.2.8{tu (3 2) beam Down}
  16.2.8{tu (3 2) beam Down}
`;
const piece5 = parse(SAMPLE_TIMING);
console.log("\nAt 120 BPM expected:");
console.log("  quarter=0.500s, eighth=0.250s, sixteenth=0.125s");
console.log("  dotted-quarter=0.750s, triplet-eighth=0.167s");
console.log();
for (const n of piece5.notes) {
  console.log(formatNote(n));
}

// ============================================================
// Test 7: Pull-off resolution (hammer-on where target fret < source)
// ============================================================

section("TEST 7: Hammer-on vs pull-off resolution");
const SAMPLE_HOPOS = `
\\tuning (E4 B3 G3 D3 A2 E2)
\\ts (4 4)
\\tempo 120
  14.1{h acc #}.8{beam Down}
  17.1.8{beam Down}
  17.1{h}.8{beam Down}
  14.1{acc #}.8{beam Down}
`;
const piece6 = parse(SAMPLE_HOPOS);
for (const n of piece6.notes) {
  console.log(formatNote(n));
}
console.log(
  "\nExpected: note[0] → hammer-on (14→17), note[2] → pull-off (17→14)",
);
