// top level script
/**
 * takes parsed piece -> runs candidate generation -> constraints ->
 * Dijstra's Algorithm -> returns FingeredPiece
 */

import { generateCandidates } from "./candidateGenerator";
import { extractConstraints } from "./constraintExtractor";
import { dijkstra } from "./dijkstra";
import { Candidate, FingeredNote, FingeredPiece } from "@/types/fingeringTypes";
import { ParsedPiece } from "@/types/parserTypes";

export function assignFingerings(piece: ParsedPiece): FingeredPiece {
  // 1: Generate candidates for every non-rest note
  const allCandidates = new Map<number, Candidate[]>();

  for (const note of piece.notes) {
    if (note.isRest || note.placements.length === 0) continue;

    const candidates = generateCandidates(note.id, note.placements);
    if (candidates.length > 0) {
      allCandidates.set(note.id, candidates);
    }
  }

  // 2: Extract hard constraints from articulation transitions
  const constraints = extractConstraints(piece);

  // 3: Run Dijsktra's to find globally optimal path
  const result = dijkstra(piece, allCandidates, constraints);

  // 4: Build output
  const fingeredNotes: FingeredNote[] = piece.notes.map((note) => ({
    id: note.id,
    timeSeconds: note.timeSeconds,
    durationSeconds: note.durationSeconds,
    isRest: note.isRest || note.placements.length === 0,
    selfArticulations: note.selfArticulations,
    transitionArticulation: note.transitionArticulation,
    assignments: result.assignments.get(note.id)?.assignments ?? [],
  }));

  return { notes: fingeredNotes };
}
