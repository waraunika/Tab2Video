import { FingeredPiece } from "@/types/fingeringTypes";
import { ParsedPiece } from "@/types/parserTypes";

export interface OutputFingering {
  string: number;
  fret: number;
  finger: 1 | 2 | 3 | 4;
  is_barre: boolean;
}

export interface OutputTransition {
  type: string;
  target_note_id: number | null;
  string: number;
}

export interface OutputMeasureInfo {
  measure_index: number;
  time_signature: {
    beats: number;
    beat_type: number;
  };
  tempo: number;
}

export interface OutputNote {
  id: number;
  time_seconds: number;
  duration: string;
  /**
   * w = whole
   * h = half
   * q = quarter
   * e = eighth
   * s = sixteenth
   * t = thirtysecond
   * suffix '.' = dotted
   * suffic "+N:M" = tuplet, e.g., e*3:2 would be triplet of eigth
   */

  is_rest: boolean;
  fingering: OutputFingering[];
  articulations: string[];
  transition?: OutputTransition;
  measure_info: OutputMeasureInfo;
}

export interface OutputPiece {
  tuning: string[];
  initial_tempo: number;
  initial_time_signature: { beats: number; beat_type: number };
  notes: OutputNote[];
}

function noteValueToCode(
  noteValue: number,
  dotted: boolean,
  tuplet?: { actual: number; normal: number },
): string {
  const map: Record<number, string> = {
    1: "w",
    2: "h",
    4: "q",
    8: "e",
    16: "s",
    32: "t",
  };

  let code = map[noteValue] ?? `n${noteValue}`;
  if (dotted) code += ".";
  if (tuplet) code += `*${tuplet.actual}:${tuplet.normal}`;

  return code;
}

function resolveTempoAt(noteId: number, piece: ParsedPiece): number {
  let tempo = piece.initialTempo;
  for (const change of piece.tempoChanges) {
    if (change.atNoteId <= noteId) tempo = change.bpm;
    else break;
  }
  return tempo;
}

function resolveTimeSignAt(
  noteId: number,
  piece: ParsedPiece,
): [number, number] {
  let ts = piece.initialTimeSignature;

  for (const change of piece.timeSignatureChanges) {
    if (change.atNoteId <= noteId) ts = [change.numerator, change.denominator];
    else break;
  }
  return ts;
}

export function exportToJson(
  fingeredPiece: FingeredPiece,
  parsedPiece: ParsedPiece,
): OutputPiece {
  const notes: OutputNote[] = [];

  for (const fingeredNote of fingeredPiece.notes) {
    const parsedNote = parsedPiece.notes.find((n) => n.id === fingeredNote.id);

    if (!parsedNote) continue;

    const tempo = resolveTempoAt(fingeredNote.id, parsedPiece);
    const [beats, beatType] = resolveTimeSignAt(fingeredNote.id, parsedPiece);

    const fingering: OutputFingering[] = fingeredNote.assignments.map((a) => ({
      string: a.string,
      fret: a.fret,
      finger: a.finger,
      is_barre: a.barre,
    }));

    let transition: OutputTransition | undefined;
    if (fingeredNote.transitionArticulation) {
      const ta = fingeredNote.transitionArticulation;
      transition = {
        type: ta.type,
        target_note_id: ta.targetNoteId,
        string: ta.string,
      };
    }

    const outputNote: OutputNote = {
      id: fingeredNote.id,
      time_seconds: parseFloat(fingeredNote.timeSeconds.toFixed(4)),
      duration: noteValueToCode(
        parsedNote.noteValue,
        parsedNote.dotted,
        parsedNote.tuplet,
      ),
      is_rest: fingeredNote.isRest,
      fingering,
      articulations: [...fingeredNote.selfArticulations],
      measure_info: {
        measure_index: parsedNote.measureIndex,
        time_signature: { beats, beat_type: beatType },
        tempo,
      },
    };

    notes.push(outputNote);
  }

  return {
    tuning: parsedPiece.tuning,
    initial_tempo: parsedPiece.initialTempo,
    initial_time_signature: {
      beats: parsedPiece.initialTimeSignature[0],
      beat_type: parsedPiece.initialTimeSignature[1],
    },
    notes,
  };
}

export function exportToJsonString(
  fingeredPiece: FingeredPiece,
  parsedPiece: ParsedPiece,
  pretty: boolean = true,
): string {
  return JSON.stringify(
    exportToJson(fingeredPiece, parsedPiece),
    null,
    pretty ? 2 : 0,
  );
}
