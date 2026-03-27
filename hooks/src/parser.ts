// ============================================================
// parser.ts
// Converts token stream from tokenizer into ParsedPiece.
// Handles: directives, single notes, chords, rests, timing,
// articulations, tuplets, dotted notes, tempo changes.
// ============================================================

import {
  ParsedNote,
  ParsedPiece,
  NotePlacement,
  SelfArticulation,
  TransitionArticulation,
  ParserState,
  TempoChange,
  TimeSignatureChange,
} from "@/types/parserTypes";
import { Token, tokenize } from "./tokenizer";

// ============================================================
// Duration helpers
// ============================================================

// Returns duration in seconds for a given note value at current BPM
// noteValue: 1=whole, 2=half, 4=quarter, 8=eighth, 16=sixteenth, 32=thirty-second
function noteValueToSeconds(
  noteValue: number,
  bpm: number,
  dotted: boolean,
  tuplet?: { actual: number; normal: number },
): number {
  // A quarter note at BPM = 60/BPM seconds
  const quarterSeconds = 60 / bpm;
  // Duration in quarter-note units
  let durationInQuarters = 4 / noteValue;
  // Dotted adds 50%
  if (dotted) durationInQuarters *= 1.5;
  // Tuplet: actual notes in space of normal notes
  // e.g. triplet (3 in space of 2): each note = (2/3) of face value
  if (tuplet) durationInQuarters *= tuplet.normal / tuplet.actual;
  return durationInQuarters * quarterSeconds;
}

// ============================================================
// Mod block parsers
// ============================================================

interface ParsedNoteMods {
  selfArticulations: SelfArticulation[];
  transitionArticulation?: TransitionArticulation;
  hasBend: boolean;
  isHammerOrPull: boolean; // h — direction resolved later by comparing frets
  isSlide: boolean; // ss
  isTrill: boolean; // t
}

interface ParsedDurMods {
  dotted: boolean;
  tuplet?: { actual: number; normal: number };
}

// Parse the first {} block (note articulations)
function parseNoteMods(content: string): ParsedNoteMods {
  const tokens = content.split(/\s+/).filter(Boolean);
  const self: SelfArticulation[] = [];
  let transitionArticulation: TransitionArticulation | undefined;
  let hasBend = false;
  let isHammerOrPull = false;
  let isSlide = false;
  let isTrill = false;

  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i];

    switch (t) {
      case "v":
        self.push("vibrato");
        break;
      case "h":
        isHammerOrPull = true; // resolved to hammer-on or pull-off later
        break;
      case "ss":
        isSlide = true;
        break;
      case "t":
        isTrill = true;
        break;
      case "pm":
        self.push("palm-mute");
        break;
      case "sod":
        self.push("let-ring");
        break;
      case "g":
        self.push("ghost");
        break;
      case "ah":
        self.push("harmonic-artificial");
        i++; // skip the fret number argument after ah
        break;
      case "be": {
        // Consume the bend type from inside the parens
        // be (bend ...) / be (bendrelease ...) / be (prebend ...) etc.
        // The full paren content is already in tokens as separate words
        // Find the bend type word — it's the first word after "("
        let bendType = "";
        let j = i + 1;
        while (j < tokens.length) {
          const tok = tokens[j];
          if (tok.startsWith("(")) {
            // Next token after ( is the bend type
            const inner = tok.slice(1); // strip leading (
            if (inner.length > 0) bendType = inner;
            else if (j + 1 < tokens.length) {
              bendType = tokens[j + 1];
              j++;
            }
          }
          if (tok.endsWith(")")) {
            i = j;
            break;
          }
          j++;
        }
        hasBend = true;
        // Map bend type string to SelfArticulation
        const bendMap: Record<string, SelfArticulation> = {
          bend: "bend",
          bendrelease: "bend-release",
          prebend: "pre-bend",
          prebendrelease: "pre-bend-release",
          release: "release",
        };
        self.push(bendMap[bendType] ?? "bend");
        break;
      }
      // Ignore: acc, #, f, mf, dy, beam, Up, Down, instrument, <word>, d (in note block)
      default:
        break;
    }
    i++;
  }

  // Resolve transition articulation
  if (isHammerOrPull) transitionArticulation = "hammer-on"; // direction resolved in second pass
  if (isSlide) transitionArticulation = "slide";
  if (isTrill) transitionArticulation = "trill";

  return {
    selfArticulations: self,
    transitionArticulation,
    hasBend,
    isHammerOrPull,
    isSlide,
    isTrill,
  };
}

// Parse the second {} block (duration modifiers)
function parseDurMods(content: string): ParsedDurMods {
  const tokens = content.split(/\s+/).filter(Boolean);
  let dotted = false;
  let tuplet: { actual: number; normal: number } | undefined;

  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i];
    if (t === "d") {
      dotted = true;
    } else if (t === "tu") {
      // tu (actual normal)
      // Tokens: "tu", "(3", "2)"  OR  "(3", "2)"
      let actual = 3;
      let normal = 2;
      if (i + 1 < tokens.length) {
        const a = tokens[i + 1].replace(/[()]/g, "");
        if (a.length > 0) actual = parseInt(a, 10);
        i++;
      }
      if (i + 1 < tokens.length) {
        const n = tokens[i + 1].replace(/[()]/g, "");
        if (n.length > 0) normal = parseInt(n, 10);
        i++;
      }
      tuplet = { actual, normal };
    }
    i++;
  }

  return { dotted, tuplet };
}

// ============================================================
// Directive parsers
// ============================================================

function parseTuning(arg: string): string[] {
  // \tuning (E4 B3 G3 D3 A2 E2) or just the note names
  const cleaned = arg.replace(/[()]/g, "").trim();
  return cleaned.split(/\s+/).filter(Boolean);
}

function parseTS(arg: string): [number, number] {
  // \ts 4 4 or \ts (4 4)
  const cleaned = arg.replace(/[()]/g, "").trim();
  const parts = cleaned.split(/\s+/);
  return [parseInt(parts[0], 10), parseInt(parts[1], 10)];
}

// ============================================================
// Token stream cursor
// ============================================================

class TokenCursor {
  private pos = 0;
  constructor(private tokens: Token[]) {}

  peek(): Token | null {
    return this.pos < this.tokens.length ? this.tokens[this.pos] : null;
  }

  consume(): Token {
    if (this.pos >= this.tokens.length)
      throw new Error("Unexpected end of token stream");
    return this.tokens[this.pos++];
  }

  consumeIf(type: string): Token | null {
    if (this.peek()?.type === type) return this.consume();
    return null;
  }

  hasMore(): boolean {
    return this.pos < this.tokens.length;
  }
}

// ============================================================
// Single note/chord parser
// Returns one ParsedNote (or null for open-fret notes that get filtered)
// ============================================================

interface RawNoteEvent {
  placements: NotePlacement[];
  noteBlock?: string; // first {} content (note mods)
  durBlock?: string; // second {} content (duration mods)
  noteValue: number;
  isRest: boolean;
}

// Collect mod blocks and duration following a note or chord
function collectNoteEventTokens(cursor: TokenCursor): {
  noteMod?: string;
  durMod?: string;
  noteValue: number;
} {
  let noteMod: string | undefined;
  let durMod: string | undefined;
  let noteValue = 4; // default: quarter note

  // First optional mod block (note articulations)
  if (cursor.peek()?.type === "MOD_BLOCK") {
    noteMod = cursor.consume().value;
  }

  // Duration .N
  if (cursor.peek()?.type === "DURATION") {
    noteValue = parseInt(cursor.consume().value, 10);
  }

  // Second optional mod block (duration mods: dotted, tuplet, beam direction)
  if (cursor.peek()?.type === "MOD_BLOCK") {
    durMod = cursor.consume().value;
  }

  return { noteMod, durMod, noteValue };
}

// ============================================================
// Main parse function
// ============================================================

export function parse(source: string): ParsedPiece {
  const tokens = tokenize(source);
  const cursor = new TokenCursor(tokens);

  // Piece-level state
  let tuning: string[] = ["E4", "B3", "G3", "D3", "A2", "E2"];
  let initialTempo = 120;
  let initialTimeSignature: [number, number] = [4, 4];
  const tempoChanges: TempoChange[] = [];
  const timeSignatureChanges: TimeSignatureChange[] = [];

  // Parser state
  const state: ParserState = {
    currentTempo: 120,
    currentTimeSig: [4, 4],
    currentMeasure: 0,
    currentTimeSeconds: 0,
    currentBeatInMeasure: 0,
    noteIdCounter: 0,
  };

  const notes: ParsedNote[] = [];
  let headerParsed = false;

  // --------------------------------------------------------
  // First pass: parse all notes with raw articulation flags
  // --------------------------------------------------------

  while (cursor.hasMore()) {
    const token = cursor.peek()!;

    // -- Directives --
    if (token.type === "DIRECTIVE") {
      cursor.consume();
      const directive = token.value;
      const argToken = cursor.consumeIf("DIRECTIVE_ARG");
      const arg = argToken?.value ?? "";

      switch (directive) {
        case "tuning":
          tuning = parseTuning(arg);
          break;
        case "tempo": {
          const bpm = parseInt(arg.trim().split(/\s+/)[0], 10);
          if (!headerParsed) {
            initialTempo = bpm;
            state.currentTempo = bpm;
          } else {
            state.currentTempo = bpm;
            tempoChanges.push({ atNoteId: state.noteIdCounter, bpm });
          }
          break;
        }
        case "ts": {
          const ts = parseTS(arg);
          if (!headerParsed) {
            initialTimeSignature = ts;
            state.currentTimeSig = ts;
          } else {
            state.currentTimeSig = ts;
            timeSignatureChanges.push({
              atNoteId: state.noteIdCounter,
              numerator: ts[0],
              denominator: ts[1],
            });
          }
          break;
        }
        // Ignore: beaming, accidentals, clef, ottava, simile, ks
        default:
          break;
      }
      continue;
    }

    // -- Measure bar --
    if (token.type === "MEASURE_BAR") {
      cursor.consume();
      state.currentMeasure++;
      state.currentBeatInMeasure = 0;
      headerParsed = true;
      continue;
    }

    headerParsed = true;

    // -- Rest --
    if (token.type === "REST") {
      cursor.consume();
      const { noteMod, durMod, noteValue } = collectNoteEventTokens(cursor);
      const durMods = durMod
        ? parseDurMods(durMod)
        : { dotted: false, tuplet: undefined };

      const durationSeconds = noteValueToSeconds(
        noteValue,
        state.currentTempo,
        durMods.dotted,
        durMods.tuplet,
      );

      const note: ParsedNote = {
        id: state.noteIdCounter++,
        measureIndex: state.currentMeasure,
        beatInMeasure: state.currentBeatInMeasure,
        timeSeconds: state.currentTimeSeconds,
        durationSeconds,
        noteValue,
        dotted: durMods.dotted,
        tuplet: durMods.tuplet,
        isRest: true,
        placements: [],
        selfArticulations: [],
      };
      notes.push(note);

      state.currentTimeSeconds += durationSeconds;
      // Beat tracking in quarter notes
      state.currentBeatInMeasure +=
        (4 / noteValue) *
        (durMods.dotted ? 1.5 : 1) *
        (durMods.tuplet ? durMods.tuplet.normal / durMods.tuplet.actual : 1);
      continue;
    }

    // -- Single note --
    if (token.type === "NOTE") {
      cursor.consume();
      const [fretStr, stringStr] = token.value.split(".");
      const fret = parseInt(fretStr, 10);
      const stringNum = parseInt(stringStr, 10);

      const { noteMod, durMod, noteValue } = collectNoteEventTokens(cursor);
      const noteMods = noteMod
        ? parseNoteMods(noteMod)
        : {
            selfArticulations: [],
            transitionArticulation: undefined,
            hasBend: false,
            isHammerOrPull: false,
            isSlide: false,
            isTrill: false,
          };
      const durMods = durMod
        ? parseDurMods(durMod)
        : { dotted: false, tuplet: undefined };

      const durationSeconds = noteValueToSeconds(
        noteValue,
        state.currentTempo,
        durMods.dotted,
        durMods.tuplet,
      );

      // Filter fret=0 (open string, no left-hand involvement)
      const placements: NotePlacement[] =
        fret === 0 ? [] : [{ string: stringNum, fret }];

      // A fret=0 note is treated as a rest for fingering purposes
      // (open string requires no left-hand finger)
      const isOpenString = fret === 0;

      const note: ParsedNote = {
        id: state.noteIdCounter++,
        measureIndex: state.currentMeasure,
        beatInMeasure: state.currentBeatInMeasure,
        timeSeconds: state.currentTimeSeconds,
        durationSeconds,
        noteValue,
        dotted: durMods.dotted,
        tuplet: durMods.tuplet,
        isRest: isOpenString,
        placements,
        selfArticulations: noteMods.selfArticulations,
        transitionArticulation: noteMods.transitionArticulation
          ? {
              type: noteMods.transitionArticulation,
              targetNoteId: null,
              string: stringNum,
            }
          : undefined,
      };
      notes.push(note);

      state.currentTimeSeconds += durationSeconds;
      state.currentBeatInMeasure +=
        (4 / noteValue) *
        (durMods.dotted ? 1.5 : 1) *
        (durMods.tuplet ? durMods.tuplet.normal / durMods.tuplet.actual : 1);
      continue;
    }

    // -- Chord: ( note note note ).duration{mods} --
    if (token.type === "CHORD_OPEN") {
      cursor.consume(); // consume (

      const chordPlacements: NotePlacement[] = [];
      // Per-note mods inside chord (e.g. {acc #} or {ss} on individual notes)
      const perNoteTransitions: Map<number, TransitionArticulation> = new Map(); // string -> transition

      while (cursor.hasMore() && cursor.peek()?.type !== "CHORD_CLOSE") {
        if (cursor.peek()?.type === "NOTE") {
          const noteToken = cursor.consume();
          const [fretStr, stringStr] = noteToken.value.split(".");
          const fret = parseInt(fretStr, 10);
          const stringNum = parseInt(stringStr, 10);

          // Per-note mod block inside chord
          let perNoteMods: ReturnType<typeof parseNoteMods> | undefined;
          if (cursor.peek()?.type === "MOD_BLOCK") {
            perNoteMods = parseNoteMods(cursor.consume().value);
          }

          if (fret !== 0) {
            chordPlacements.push({ string: stringNum, fret });
          }

          // Capture per-note slide inside chord
          if (perNoteMods?.transitionArticulation) {
            perNoteTransitions.set(
              stringNum,
              perNoteMods.transitionArticulation,
            );
          }
        } else {
          // Skip unexpected tokens inside chord
          cursor.consume();
        }
      }

      cursor.consumeIf("CHORD_CLOSE"); // consume )

      // Chord-level mods and duration come AFTER )
      const { noteMod, durMod, noteValue } = collectNoteEventTokens(cursor);
      const chordNoteMods = noteMod
        ? parseNoteMods(noteMod)
        : {
            selfArticulations: [],
            transitionArticulation: undefined,
            hasBend: false,
            isHammerOrPull: false,
            isSlide: false,
            isTrill: false,
          };
      const durMods = durMod
        ? parseDurMods(durMod)
        : { dotted: false, tuplet: undefined };

      const durationSeconds = noteValueToSeconds(
        noteValue,
        state.currentTempo,
        durMods.dotted,
        durMods.tuplet,
      );

      // Chord-level transition applies to all strings (unless overridden per-note)
      // Per-note transitions take precedence
      let chordTransition = chordNoteMods.transitionArticulation;
      // If there are per-note transitions, we use those — chord-level is fallback
      const resolvedTransition =
        perNoteTransitions.size > 0
          ? undefined // per-note transitions handled separately below
          : chordTransition
            ? {
                type: chordTransition,
                targetNoteId: null,
                string: chordPlacements[0]?.string ?? 0,
              }
            : undefined;

      const note: ParsedNote = {
        id: state.noteIdCounter++,
        measureIndex: state.currentMeasure,
        beatInMeasure: state.currentBeatInMeasure,
        timeSeconds: state.currentTimeSeconds,
        durationSeconds,
        noteValue,
        dotted: durMods.dotted,
        tuplet: durMods.tuplet,
        isRest: chordPlacements.length === 0, // all notes were open strings
        placements: chordPlacements,
        selfArticulations: chordNoteMods.selfArticulations,
        transitionArticulation: resolvedTransition,
      };
      notes.push(note);

      state.currentTimeSeconds += durationSeconds;
      state.currentBeatInMeasure +=
        (4 / noteValue) *
        (durMods.dotted ? 1.5 : 1) *
        (durMods.tuplet ? durMods.tuplet.normal / durMods.tuplet.actual : 1);
      continue;
    }

    // Skip anything else
    cursor.consume();
  }

  // --------------------------------------------------------
  // Second pass: resolve transitionArticulation.targetNoteId
  // For each note with a transition, find the next non-rest
  // note that shares the same string.
  // Also resolve hammer-on vs pull-off by comparing frets.
  // --------------------------------------------------------

  for (let i = 0; i < notes.length; i++) {
    const note = notes[i];
    if (!note.transitionArticulation) continue;

    const transString = note.transitionArticulation.string;

    // Find the next note that has a placement on this string
    for (let j = i + 1; j < notes.length; j++) {
      const candidate = notes[j];
      if (candidate.isRest) continue;

      const matchingPlacement = candidate.placements.find(
        (p) => p.string === transString,
      );
      if (matchingPlacement) {
        note.transitionArticulation.targetNoteId = candidate.id;

        // Resolve hammer-on vs pull-off
        if (note.transitionArticulation.type === "hammer-on") {
          const sourcePlacement = note.placements.find(
            (p) => p.string === transString,
          );
          if (sourcePlacement && matchingPlacement) {
            if (matchingPlacement.fret < sourcePlacement.fret) {
              note.transitionArticulation.type = "pull-off";
            }
            // else stays as hammer-on
          }
        }
        break;
      }
    }
  }

  return {
    tuning,
    initialTempo,
    initialTimeSignature,
    tempoChanges,
    timeSignatureChanges,
    notes,
  };
}
