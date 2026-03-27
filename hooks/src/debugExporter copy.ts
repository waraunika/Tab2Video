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
export default function exporter(alphaString: string) {
  const parsed1 = parse(alphaString);
  const fingered1 = assignFingerings(parsed1);
  console.log(exportToJsonString(fingered1, parsed1));
  return exportToJson(fingered1,parsed1);
}
