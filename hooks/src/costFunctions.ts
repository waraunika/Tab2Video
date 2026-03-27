// computes position cost and transition cost for fingering candidates
/**
 * position cost : how hard a single chord / note fingering is to hold
 * transitio cost: how hard is it to move from one finger to another
 * transition cost is weighted by tempo
 * fast passages amplify movement cost
 */

import { Candidate, FingerAssignment, Finger } from "./fingering-types";

const COSTS = {
  /**
   * String gap between fingers difficulty:
   * (lower, high) -> number.
   * higher number -> harder to stretch between those 2 fingers.
   */
  STRING_GAP: new Map<string, number>([
    ["1,2", 2.0],
    ["1,3", 1.0],
    ["1,4", 1.0],
    ["2,3", 2.0],
    ["2,4", 1.0],
    ["3,4", 2.5],
  ]),

  // penalty per pret of hand positions
  /**
   * lower fret = tighter spacing = harder fretting
   * fret 1 costs more than fret 12 to hold
   */
  HAND_POSITION_FACTOR: 0.3,

  // extra penalty if fret span > 2 (mild stretch starts here)
  FRET_SPAN_THRESHOLD: 2,
  FRET_SPAN_PENALTY: 1.5, // per fret above threshold

  // Barre bonu per barred string
  /**
   * barring is efficient
   * one finger - multiple strings
   */
  BARRE_BONUS: 0.8,

  // Transition costs
  FINGER_TRAVEL_PER_STRING: 1.0, // cost per string of travel for same finger
  HAND_SHIFT_FACTOR: 3.0, // cost per fret of wrist shift between positions
  NEW_FINGER_COST: 2.0, // cost per new finger introduced
  SAME_POSITION_BONUS: 3.0, // bonus when assignment is identical to previous

  // Time weighting: fast passages amplify transition cost
  /**
   * transitionCost *= timingPressure(timeDelta)
   * At 0.5s gap: pressure = 1.0 (baseline)
   * At 0.1s gap: pressure = 5.0 (very fast, transitions very expensive)
   * At 2.0s gap: pressure = 0.25 (slow and cheap transition)
   */
  TIMING_PRESSURE_REFERENCE: 0.5, // seconds, neutral time between notes
  TIMING_PRESSURE_MIN: 0.2, // floor: very slow passages still have some cost
  TIMING_PRESSURE_MAX: 8.0, // ceiling: extremely fast passages capped
};

// Position cost
export function positionCost(candidate: Candidate): number {
  const { assignments, fretSpan } = candidate;

  if (assignments.length === 0) return 0;

  let cost = 0;

  // 1. string gap difficulty between each pair of non-barre fingers
  const nonBarre = assignments.filter((a) => !a.barre);
  for (let i = 0; i < nonBarre.length; i++) {
    for (let j = 1 + i; j < nonBarre.length; j++) {
      const fi = Math.min(nonBarre[i].finger, nonBarre[j].finger) as Finger;
      const fj = Math.max(nonBarre[i].finger, nonBarre[j].finger) as Finger;
      const key = `${fi},${fj}`;
      const gapFactor = COSTS.STRING_GAP.get(key) ?? 1.0;
      const stringGap = Math.abs(nonBarre[i].string - nonBarre[j].string);
      cost += gapFactor * stringGap;
    }
  }

  // 2. Fret span penalty (beyond comfortable stretch)
  if (fretSpan > COSTS.FRET_SPAN_THRESHOLD) {
    cost += (fretSpan - COSTS.FRET_SPAN_THRESHOLD) * COSTS.FRET_SPAN_PENALTY;
  }

  // 3. Hand positino difficulty
  /**
   * lower = harder
   * a hand position is fret-finger combo for the anchor note
   * hand position of 0 means index at fret 1  - very tight
   */
  const handPos = candidate.handPosition;
  if (handPos >= 0) {
    // diminishing difficulty, frets 1-5 hard, 5-12 medium, 12+ easy
    cost += COSTS.HAND_POSITION_FACTOR * Math.max(0, 7 - handPos);
  }

  // 4. Barre bonus (subtract cost for efficiency)
  const barreAssignments = assignments.filter((a) => a.barre);
  const barreFingers = new Set(barreAssignments.flatMap((a) => a.finger));
  for (const bf of barreFingers) {
    const barred = barreAssignments.filter((a) => a.finger === bf);
    if (barred.length > 1) {
      cost -= COSTS.BARRE_BONUS * (barred.length - 1);
    }
  }

  return Math.max(0, cost);
}

// Transition Cost
/**
 * timeDelta: seconds between the two notes (from parser timing)
 * slideShift: first delta from a slide constraint (0 if no slide)
 */

export function transitionCost(
  from: Candidate,
  to: Candidate,
  timeDelta: number,
  slideShift: number = 0,
): number {
  const { assignments: fromA } = from;
  const { assignments: toA } = to;

  if (assignmentsEqual(fromA, toA)) return -COSTS.SAME_POSITION_BONUS;

  let cost = 0;

  // 1. Finger travel: for each finger used in both, sum string distances
  for (const toAssign of toA) {
    const fromAssign = fromA.find((a) => a.finger === toAssign.finger);
    if (fromAssign) {
      const travel = Math.abs(toAssign.string - fromAssign.string);
      cost += travel * COSTS.FINGER_TRAVEL_PER_STRING;
    } else {
      // new finger introduced in target not present in source
      if (!toAssign.barre) {
        cost += COSTS.NEW_FINGER_COST;
      }
    }
  }

  // 2. Hand shift: adjust source hand position if there's a slide shift
  const adjustedFromHandPos = from.handPosition + slideShift;
  const handShift = Math.abs(to.handPosition - adjustedFromHandPos);
  cost += handShift * COSTS.HAND_SHIFT_FACTOR;

  // 3. Time pressure weighting: fast = expensive
  const pressure = timingPressure(timeDelta);
  cost *= pressure;

  return cost;
}

// Timing pressure multiplier
function timingPressure(timeDelta: number): number {
  if (timeDelta <= 0) return COSTS.TIMING_PRESSURE_MAX;
  const pressure = COSTS.TIMING_PRESSURE_REFERENCE / timeDelta;
  return Math.min(
    COSTS.TIMING_PRESSURE_MAX,
    Math.max(COSTS.TIMING_PRESSURE_MIN, pressure),
  );
}

// UTILITIES

function assignmentsEqual(
  a: FingerAssignment[],
  b: FingerAssignment[],
): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort((x, y) => x.string - y.string);
  const sortedB = [...b].sort((x, y) => x.string - y.string);
  return sortedA.every(
    (x, i) =>
      x.string === sortedB[i].string &&
      x.fret === sortedB[i].fret &&
      x.finger === sortedB[i].finger &&
      x.barre === sortedB[i].barre,
  );
}

// Debug helper

export function formatCost(candidate: Candidate): string {
  return `positionCost=${positionCost(candidate).toFixed(2)}`;
}

export function formatTransitionCost(
  from: Candidate,
  to: Candidate,
  timeDelta: number,
  slideShift: number = 0,
): string {
  const cost = transitionCost(from, to, timeDelta, slideShift);
  const pressure = Math.min(
    COSTS.TIMING_PRESSURE_MAX,
    Math.max(
      COSTS.TIMING_PRESSURE_MIN,
      COSTS.TIMING_PRESSURE_REFERENCE / Math.max(timeDelta, 0.001),
    ),
  );
  return `transitionCost=${cost.toFixed(2)} (timeDelta=${timeDelta.toFixed(3)}s pressure=${pressure.toFixed(2)}x)`;
}
