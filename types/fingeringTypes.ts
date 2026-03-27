import { SelfArticulation, TransitionArticulation } from "./parserTypes";

export type Finger = 1 | 2 | 3 | 4

export interface FingerAssignment {
  string: number;
  fret: number;
  finger: Finger;
  barre: boolean;
}

export interface Candidate {
  noteId: number
  assignments: FingerAssignment[]
  handPosition: number
  fretSpan: number
}

export type HardConstraint = {
  type: "same-finger"; // slide: finger (N, S) == finger(N+1, S)
  string: number;
  sourceNoteId: number;
  targetNoteId: number;
} | {
  type: "higher-finger"; // hammer on: finger (N+1, S) > finger(N, S)
  string: number
  sourceNoteId: number;
  targetNoteId: number;
} | {
  type: "lower-finger"; // pull-off: finger(N+1, S) < finger (N, S)
  string: number
  sourceNoteId: number;
  targetNoteId: number;
} | {
  type: "adjacent-finger" // trill: |finger(N,S) - finger(N+1, S)| == 1
  string: number
  sourceNoteId: number;
  targetNoteId: number;
} | {
  type: "slide-shift" // slide: hand position shifts by fret delta
  string: number
  sourceNoteId: number
  targetNoteId: number
  fretDelta: number // fret(N+1) - fret(N) on the slide string
}

export interface FingeredNote {
  id: number;
  timeSeconds: number;
  durationSeconds: number;
  isRest: boolean;
  selfArticulations: SelfArticulation[]
  transitionArticulation?: {
    type: TransitionArticulation;
    targetNoteId: number | null;
    string: number;
  }
  assignments: FingerAssignment[]; // empty if rest
}

export interface FingeredPiece {
  notes: FingeredNote[]
}
