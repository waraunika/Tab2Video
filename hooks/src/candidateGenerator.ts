// Given a fixed set of (string, fret) placements for one note/chord,
// generates all physically valid finger assignments.
//
// Rules enforced:
//   1. One finger per string
//   2. Fret span (max-min fretted) <= MAX_FRET_SPAN (4)
//   3. Higher string number = lower-or-equal finger number
//      when sorted by ascending fret (index anchors lowest fret)
//   4. Same finger on multiple strings = barre,
//      only valid when those strings share the same fret AND
//      no lower-fret note sits between them on a skipped string
//   5. Single-note: all 4 fingers are valid candidates

import { Candidate, Finger, FingerAssignment } from "@/types/fingeringTypes";
import { NotePlacement } from "@/types/parserTypes";

const MAX_FRET_SPAN = 4;
const ALL_FINGERS: Finger[] = [1, 2, 3, 4];

export function generateCandidates(
  noteId: number,
  placements: NotePlacement[],
): Candidate[] {
  if (placements.length === 0) return [];

  if (placements.length == 1) {
    return ALL_FINGERS.map((finger) =>
      buildCandidate(noteId, [
        {
          string: placements[0].string,
          fret: placements[0]?.fret,
          finger,
          barre: false,
        },
      ]),
    );
  }

  const rawAssignments = enumerateAssignments(placements);
  const validAssignments = rawAssignments.filter(isValidAssignment);
  return validAssignments.map((a) => buildCandidate(noteId, a));
}

// ============================================================
// Build a Candidate from a validated assignment list
// ============================================================

function buildCandidate(
  noteId: number,
  assignments: FingerAssignment[],
): Candidate {
  const frettedFrets = assignments.map((a) => a.fret);
  const fretSpan =
    frettedFrets.length > 0
      ? Math.max(...frettedFrets) - Math.min(...frettedFrets)
      : 0;

  // hand position: fret - finger for the assignment with the lowest fret
  // this estimates where the wrist sits on the neck
  const anchor = assignments.reduce((a, b) => (a.fret <= b.fret ? a : b));
  const handPosition = anchor.fret - anchor.finger;

  return { noteId, assignments, handPosition, fretSpan };
}

function enumerateAssignments(
  placements: NotePlacement[],
): FingerAssignment[][] {
  // sort placements by ascending fret so we can process low -> high
  const sorted = [...placements].sort((a, b) => a.fret - b.fret);

  const results: FingerAssignment[][] = [];

  // non-barred: assign distinct fingers
  // generate all permutations of k fingers choosen from {1, 2, 3, 4}
  const fingerPerms = permutations(ALL_FINGERS, sorted.length);
  for (const perm of fingerPerms) {
    const assignment: FingerAssignment[] = sorted.map((p, i) => ({
      string: p.string,
      fret: p.fret,
      finger: perm[i],
      barre: false,
    }));
    results.push(assignment);
  }

  // barre variants: groups of placements sharing the same fret
  // find fret groups with 2+ placements
  const fretGroups = groupByFret(sorted);
  for (const [fret, group] of fretGroups) {
    if (group.length < 2) continue;

    // for each possiblel barre finger (1-4), try barring this fret group
    for (const barreFinger of ALL_FINGERS) {
      // remaining placements are those not in this barre group
      const remaining = sorted.filter((p) => p.fret !== fret);

      if (remaining.length === 0) {
        const assignment: FingerAssignment[] = group.map((p) => ({
          string: p.string,
          fret: p.fret,
          finger: barreFinger,
          barre: true,
        }));
        results.push(assignment);
      } else {
        // mixed: barre group + individual fingers for remaining
        const availableFingers = ALL_FINGERS.filter((f) => f !== barreFinger);
        const remainingPerms = permutations(availableFingers, remaining.length);

        for (const perm of remainingPerms) {
          const barreAssignments: FingerAssignment[] = group.map((p) => ({
            string: p.string,
            fret: p.fret,
            finger: barreFinger,
            barre: true,
          }));
          const remainingAssignments: FingerAssignment[] = remaining.map(
            (p, i) => ({
              string: p.string,
              fret: p.fret,
              finger: perm[i],
              barre: false,
            }),
          );
          results.push([...barreAssignments, ...remainingAssignments]);
        }
      }
    }
  }

  return results;
}

function isValidAssignment(assignments: FingerAssignment[]): boolean {
  if (assignments.length === 0) return false;

  // Rule 1: one finger per string (no duplicate strings)
  const strings = assignments.map((a) => a.string);
  if (new Set(strings).size !== strings.length) return false;

  // Rule 2: fret span <= MAX_FRET_SPAN
  const frets = assignments.map((a) => a.fret);
  const span = Math.max(...frets) - Math.min(...frets);
  if (span > MAX_FRET_SPAN) return false;

  // Rule 3: non-barred fingers must be distinct
  const nonBarreFingers = assignments
    .filter((a) => !a.barre)
    .map((a) => a.finger);
  if (new Set(nonBarreFingers).size !== nonBarreFingers.length) return false;

  // Rule 4: barre validity
  /**
   * for each barre group, i.e. same finger, barre=true, strings must be contiguous
   * and no non-barre note exists between them at a lower fret
   */
  const barreGroups = groupByFinger(assignments.filter((a) => a.barre));
  for (const [finger, group] of barreGroups) {
    if (group.length < 2) continue;

    const barreStrings = group.map((a) => a.string).sort((a, b) => a - b);
    const barreFret = group[0].fret;

    // check for contiguous. strings must be sequential with no gaps
    for (let i = 1; i < barreStrings.length; i++) {
      if (barreStrings[i] !== barreStrings[i - 1] + 1) return false;
    }

    // no lower fret note on any string with barre range
    const minBarreString = Math.min(...barreStrings);
    const maxBarreString = Math.max(...barreStrings);

    for (const a of assignments) {
      if (a.barre) continue;

      if (
        a.string >= minBarreString &&
        a.string <= maxBarreString &&
        a.fret < barreFret
      ) {
        return false; // note below barre fret sits within barre string range
      }
    }
  }

  // Rule 5: finger order consistency
  /**
   * Same as with chords
   * sort by fret ascending
   * within same fret, order by string descending
   * finger numbers must be non-decreasing as fret increases
   */
  const sorted = [...assignments].sort((a, b) =>
    a.fret !== b.fret ? a.fret - b.fret : b.string - a.string,
  );

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];

    if (curr && prev) {
      if (
        curr.fret > prev.fret &&
        curr.finger < prev.finger &&
        !curr.barre &&
        !prev.barre
      ) {
        return false;
      }
    }
  }

  // Rule 6: adjacent fingers must be within 1 fret of each other
  /**
   * can't have index on fret 5 and middle on fret 9
   */
  // sort by finger number
  const byFinger = [...assignments]
    .filter((a) => !a.barre)
    .sort((a, b) => a.finger - b.finger);
  for (let i = 1; i < byFinger.length; i++) {
    const prev = byFinger[i - 1];
    const curr = byFinger[i];
    if (prev && curr) {
      const fretDiff = Math.abs(curr.fret - prev.fret);
      const fingerDiff = curr.finger - prev.finger;

      // Each finger step allows 1 fret of stretch
      /**
       * index(f5) to middle (f6) okaay,
       * index(f5) to middle(f7) okay,
       * index(f5) to middle (f8) not okay
       */
      if (fretDiff > fingerDiff + 1) return false;
    }
  }

  return true;
}

// generate all permutations of k items choosen from arr without repetition
function permutations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (k > arr.length) return [];

  const result: T[][] = [];

  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const perm of permutations(rest, k - 1)) {
      result.push([arr[i], ...perm]);
    }
  }
  return result;
}

function groupByFret(
  placements: NotePlacement[],
): Map<number, NotePlacement[]> {
  const map = new Map<number, NotePlacement[]>();

  for (const p of placements) {
    if (!map.has(p.fret)) map.set(p.fret, []);
    map.get(p.fret)!.push(p);
  }
  return map;
}

function groupByFinger(
  assignments: FingerAssignment[],
): Map<Finger, FingerAssignment[]> {
  const map = new Map<Finger, FingerAssignment[]>();
  for (const a of assignments) {
    if (!map.has(a.finger)) map.set(a.finger, []);
    map.get(a.finger)!.push(a);
  }
  return map;
}

// Debug helper
export function formatCandidate(c: Candidate): string {
  const parts = c.assignments
    .sort((a, b) => a.string - b.string)
    .map(
      (a) => `str${a.string}f${a.fret}→F${a.finger}${a.barre ? "(barre)" : ""}`,
    );
  return `[${parts.join(", ")}] handPos=${c.handPosition} span=${c.fretSpan}`;
}
