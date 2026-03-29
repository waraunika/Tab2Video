// ============================================================
// types.ts
// All shared types for the AlphaTex parser and fingering engine
// ============================================================

// ------------------------------------------------------------
// Articulations
// Transition articulations link note N to note N+1 on same string
// Self articulations describe the note itself
// ------------------------------------------------------------

export type TransitionArticulation =
  | "hammer-on"         // next fret higher on same string, finger stays
  | "pull-off"          // next fret lower on same string, target finger pre-planted
  | "slide"             // same finger slides to next note on same string
  | "trill"             // rapid alternation with adjacent note (marks both notes)

export type SelfArticulation =
  | "bend"              // fret pushed up (semitones flagged)
  | "bend-release"      // push up then return
  | "pre-bend"          // already bent before pick
  | "pre-bend-release"  // already bent, release after pick
  | "release"           // release from a previous bend
  | "vibrato"           // finger oscillation, no constraint on next note
  | "harmonic-natural"  // open string harmonic
  | "harmonic-artificial" // fretted harmonic (ah N)
  | "palm-mute"         // right hand only, ignored by fingering engine
  | "let-ring"          // sustain, no fingering constraint
  | "ghost"             // ghost note

export type Articulation = TransitionArticulation | SelfArticulation

// ------------------------------------------------------------
// Raw placement — what the tab tells us
// ------------------------------------------------------------

export interface NotePlacement {
  string: number        // 1 = high e, 6 = low E (standard guitar)
  fret: number          // 1-24+, 0 already filtered out by parser
}

// ------------------------------------------------------------
// A single parsed event (note, chord, or rest)
// rests are included for timing accuracy but have empty placements
// ------------------------------------------------------------

export interface ParsedNote {
  id: number                          // sequential index across full piece
  measureIndex: number                // which measure (bar) this note falls in
  beatInMeasure: number               // beat position within measure (0-indexed, in quarter notes)
  timeSeconds: number                 // absolute time from piece start
  durationSeconds: number             // how long this note lasts
  noteValue: number                   // face value: 1=whole 2=half 4=quarter 8=eighth 16=sixteenth 32=thirty-second
  dotted: boolean                     // true if duration *= 1.5
  tuplet?: { actual: number; normal: number }  // e.g. {actual:3, normal:2} for triplet
  isRest: boolean

  placements: NotePlacement[]         // empty if rest; 1 element if single note; N if chord

  // Articulations on this note itself
  selfArticulations: SelfArticulation[]

  // Articulation linking THIS note to the NEXT note on same string
  // Only present when h/ss/t appears on this note
  transitionArticulation?: {
    type: TransitionArticulation
    targetNoteId: number | null       // filled in second pass once all notes are indexed
    string: number                    // which string the transition applies to
  }
}

// ------------------------------------------------------------
// Piece-level metadata
// ------------------------------------------------------------

export interface TempoChange {
  atNoteId: number
  bpm: number
}

export interface TimeSignatureChange {
  atNoteId: number
  numerator: number
  denominator: number
}

export interface ParsedPiece {
  tuning: string[]                    // ["E4","B3","G3","D3","A2","E2"] high to low
  initialTempo: number                // BPM at start
  initialTimeSignature: [number, number]
  tempoChanges: TempoChange[]         // mid-piece tempo changes
  timeSignatureChanges: TimeSignatureChange[]
  notes: ParsedNote[]                 // full sequence including rests
}

// ------------------------------------------------------------
// Internal parser state (not exported, used within parser only)
// ------------------------------------------------------------

export interface ParserState {
  currentTempo: number
  currentTimeSig: [number, number]
  currentMeasure: number
  currentTimeSeconds: number
  currentBeatInMeasure: number
  noteIdCounter: number
}
