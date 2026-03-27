// Derives hard constraints from articulation transitions in ParsedPiece.
/**
 * These constraints are applied as edge filters in the Dijkstra graph
 * an edge (candidateA → candidateB) is only valid if it satisfies
 * all constraints between noteA and noteB.
 */

import { ParsedNote, ParsedPiece } from "@/types/parserTypes";
import { HardConstraint } from "@/types/fingeringTypes";

// Extract all hard constraints from a parsed piece
export function extractConstraints(piece: ParsedPiece): HardConstraint[] {
  const constraints: HardConstraint[] = [];

  for (const note of piece.notes) {
    if (!note.transitionArticulation) continue;

    const trans = note.transitionArticulation;
    if (trans.targetNoteId === null) continue;

    const targetNote = piece.notes.find((n) => n.id === trans.targetNoteId);
    if (!targetNote) continue;

    switch (trans.type) {
      case "hammer-on":
        constraints.push({
          type: "higher-finger",
          string: trans.string,
          sourceNoteId: note.id,
          targetNoteId: trans.targetNoteId,
        });
        break;

      case "pull-off":
        constraints.push({
          type: "lower-finger",
          string: trans.string,
          sourceNoteId: note.id,
          targetNoteId: trans.targetNoteId,
        });
        break;

      case "slide": {
        // same finger continues, but hand position is recalculated
        const sourcePlacement = note.placements.find(
          (p) => p.string === trans.string,
        );
        const targetPlacement = targetNote.placements.find(
          (p) => p.string === trans.string,
        );

        constraints.push({
          type: "same-finger",
          string: trans.string,
          sourceNoteId: note.id,
          targetNoteId: trans.targetNoteId,
        });

        if (sourcePlacement && targetPlacement) {
          constraints.push({
            type: "slide-shift",
            string: trans.string,
            sourceNoteId: note.id,
            targetNoteId: trans.targetNoteId,
            fretDelta: targetPlacement.fret - sourcePlacement.fret,
          });
        }
        break;
      }

      case "trill":
        constraints.push({
          type: "adjacent-finger",
          string: trans.string,
          sourceNoteId: note.id,
          targetNoteId: trans.targetNoteId,
        });
        break;
    }
  }

  return constraints;
}

// check for specific (sourceCandidate, targetCandidate)
/**
 * it satisfies all constraints between those 2 notes
 * returns true if the edge is valid
 */

export function edgeSatisfiesConstraints(
  sourceNoteId: number,
  targetNoteId: number,
  sourceAssignments: Array<{ string: number; finger: number }>,
  targetAssignments: Array<{ string: number; finger: number }>,
  constraints: HardConstraint[],
): boolean {
  // only check constraints that apply to this specific pair
  const relevant = constraints.filter(
    (c) => c.sourceNoteId === sourceNoteId && c.targetNoteId === targetNoteId,
  );

  for (const constraint of relevant) {
    const sourceFinger = sourceAssignments.find(
      (a) => a.string === constraint.string,
    )?.finger;
    const targetFinger = targetAssignments.find(
      (a) => a.string === constraint.string,
    )?.finger;

    // if either note doesn't haave an assigment on this string, constraint is vacuously satisfied
    /**
     * here, for P -> Q, aand if P is false, then Q has to be true, for the statement to be true
     * so this property is vacuously true statement.
     * in our case, if the base condition itself is false, then the following constraint is satisfied.
     */
    /**
     * lets say the note might be a rest, or string isn't plaayed
     * this won't technically happen, but we deal with it anyway
     */
    if (sourceFinger === undefined || targetFinger === undefined) continue;

    switch (constraint.type) {
      case "same-finger":
        if (sourceFinger !== targetFinger) return false;
        break;

      case "higher-finger":
        if (targetFinger <= sourceFinger) return false;
        break;

      case "lower-finger":
        if (targetFinger >= sourceFinger) return false;
        break;

      case "adjacent-finger":
        if (Math.abs(targetFinger - sourceFinger) !== 1) return false;
        break;

      case "slide-shift":
        break;
    }
  }
  return true;
}

// get the slide shift (fret delta) between two notes if one exists
// used for cost function to adjust hand position for slide transitions

export function getSlideShift(
  sourceNoteId: number,
  targetNoteId: number,
  constraints: HardConstraint[],
): number {
  const slideShift = constraints.find(
    (c) =>
      c.type === "slide-shift" &&
      c.sourceNoteId === sourceNoteId &&
      c.targetNoteId === targetNoteId,
  );

  return slideShift?.type === "slide-shift" ? slideShift.fretDelta : 0;
}

export function formatConstraint(c: HardConstraint): string {
  const base = `note[${c.sourceNoteId}]→note[${c.targetNoteId}] str${c.string}`;
  switch (c.type) {
    case "same-finger":
      return `${base}: same finger (slide)`;
    case "higher-finger":
      return `${base}: higher finger (hammer-on)`;
    case "lower-finger":
      return `${base}: lower finger (pull-off)`;
    case "adjacent-finger":
      return `${base}: adjacent finger (trill)`;
    case "slide-shift":
      return `${base}: slide shift fretDelta=${c.fretDelta}`;
  }
}
