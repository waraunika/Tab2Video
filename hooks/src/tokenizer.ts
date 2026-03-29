// ============================================================
// enhanced-tokenizer.ts
// Filters out all metadata, only keeps:
// - \tempo, \ts, \tuning directives
// - Notes, chords, rests, measure bars, durations, mod blocks
// ============================================================

export type TokenType =
  | "DIRECTIVE"      // \tempo, \ts, \tuning only
  | "NOTE"           // fret.string e.g. "12.2"
  | "REST"           // r
  | "CHORD_OPEN"     // (
  | "CHORD_CLOSE"    // )
  | "MOD_BLOCK"      // {contents}
  | "DURATION"       // .N
  | "MEASURE_BAR"    // |
  | "DIRECTIVE_ARG"      // \tempo, \ts, \tuning only


export interface Token {
  type: TokenType;
  value: string;
  line: number;
}

// Directives we want to keep
const KEEP_DIRECTIVES = new Set(['tempo', 'ts', 'tuning']);

export function tokenizeEnhanced(source: string): Token[] {
  const tokens: Token[] = [];
  const lines = source.split("\n");
  
  // State for skipping metadata
  let braceDepth = 0;
  let inBlockToSkip = false;
  let inTrackOrStaff = false;
  let inStringLiteral = false;
  let pendingDirective: string | null = null;
  
  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];
    let i = 0;
    const ln = lineNum + 1;
    
    // Skip empty lines
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("//")) continue;
    
    while (i < line.length) {
      const char = line[i];
      
      // Handle string literals (quoted text) - skip entirely
      if (char === '"' && (i === 0 || line[i-1] !== '\\')) {
        inStringLiteral = !inStringLiteral;
        i++;
        continue;
      }
      
      // Skip everything inside string literals (metadata)
      if (inStringLiteral) {
        i++;
        continue;
      }
      
      // Track braces to skip metadata blocks
      if (char === '{') {
        braceDepth++;
        
        // If we're entering a block that's not from a kept directive, skip it
        if (!pendingDirective && braceDepth === 1) {
          inBlockToSkip = true;
        }
        
        i++;
        continue;
      }
      
      if (char === '}') {
        braceDepth--;
        if (braceDepth === 0) {
          inBlockToSkip = false;
          pendingDirective = null;
        }
        i++;
        continue;
      }
      
      // Skip content inside metadata blocks
      if (inBlockToSkip) {
        i++;
        continue;
      }
      
      // Detect track/staff blocks to skip
      if (line.substr(i, 6) === '\\track' || line.substr(i, 6) === '\\staff') {
        inTrackOrStaff = true;
        // Skip the entire line when we see track/staff
        break;
      }
      
      // If we're in track/staff, skip until we exit
      if (inTrackOrStaff) {
        // Check if we're exiting track/staff block
        if (char === '}' && braceDepth === 0) {
          inTrackOrStaff = false;
        }
        i++;
        continue;
      }
      
      // Directive handling
      if (char === '\\') {
        const start = i;
        i++; // skip backslash
        let name = "";
        while (i < line.length && /[\w-]/.test(line[i])) {
          name += line[i];
          i++;
        }
        
        // Only keep tempo, ts, tuning directives
        if (KEEP_DIRECTIVES.has(name)) {
          tokens.push({ type: "DIRECTIVE", value: name, line: ln });
          pendingDirective = name;
          
          // Collect the argument for this directive
          let args = "";
          // Skip whitespace
          while (i < line.length && /\s/.test(line[i])) {
            i++;
          }
          
          // Handle parenthesized arguments or simple numbers
          if (line[i] === '(') {
            args += '(';
            i++;
            let parenDepth = 1;
            while (i < line.length && parenDepth > 0) {
              if (line[i] === '(') parenDepth++;
              if (line[i] === ')') parenDepth--;
              args += line[i];
              i++;
            }
          } else {
            // Collect until whitespace, brace, or end of line
            while (i < line.length && !/\s/.test(line[i]) && line[i] !== '{' && line[i] !== '}') {
              args += line[i];
              i++;
            }
          }
          
          if (args.length > 0) {
            tokens.push({ type: "DIRECTIVE_ARG", value: args.trim(), line: ln });
          }
        } else {
          // Skip unrecognized directive and its content
          // Skip to end of directive (until whitespace, brace, or end)
          while (i < line.length && !/\s/.test(line[i]) && line[i] !== '{' && line[i] !== '}') {
            i++;
          }
        }
        continue;
      }
      
      // Measure bar
      if (char === '|') {
        tokens.push({ type: "MEASURE_BAR", value: "|", line: ln });
        i++;
        continue;
      }
      
      // Chord open
      if (char === '(') {
        tokens.push({ type: "CHORD_OPEN", value: "(", line: ln });
        i++;
        continue;
      }
      
      // Chord close
      if (char === ')') {
        tokens.push({ type: "CHORD_CLOSE", value: ")", line: ln });
        i++;
        continue;
      }
      
      // Mod block: { ... }
      if (char === '{') {
        let content = "";
        i++; // skip opening {
        let depth = 1;
        while (i < line.length && depth > 0) {
          if (line[i] === '{') depth++;
          else if (line[i] === '}') depth--;
          if (depth > 0) content += line[i];
          i++;
        }
        tokens.push({ type: "MOD_BLOCK", value: content.trim(), line: ln });
        continue;
      }
      
      // Duration: .N
      if (char === '.') {
        i++; // skip dot
        let num = "";
        while (i < line.length && /\d/.test(line[i])) {
          num += line[i];
          i++;
        }
        if (num.length > 0) {
          tokens.push({ type: "DURATION", value: num, line: ln });
        }
        continue;
      }
      
      // Rest: 'r'
      if (char === 'r' && (i + 1 >= line.length || !/\d/.test(line[i + 1]))) {
        tokens.push({ type: "REST", value: "r", line: ln });
        i++;
        continue;
      }
      
      // NOTE: fret.string
      if (/\d/.test(char)) {
        let fret = "";
        while (i < line.length && /\d/.test(line[i])) {
          fret += line[i];
          i++;
        }
        
        // Check for .string pattern
        if (i < line.length && line[i] === '.' && i + 1 < line.length && /\d/.test(line[i + 1])) {
          i++; // skip dot
          let stringNum = "";
          while (i < line.length && /\d/.test(line[i])) {
            stringNum += line[i];
            i++;
          }
          tokens.push({
            type: "NOTE",
            value: `${fret}.${stringNum}`,
            line: ln,
          });
        }
        continue;
      }
      
      // Skip any other characters (they're likely metadata we don't care about)
      i++;
    }
    
    // Reset track/staff flag at end of line if we didn't find closing brace
    if (inTrackOrStaff && braceDepth === 0) {
      inTrackOrStaff = false;
    }
  }
  
  return tokens;
}

// Debug helper
export function printTokens(tokens: Token[]): void {
  for (const t of tokens) {
    console.log(
      `  [${t.line.toString().padStart(3)}] ${t.type.padEnd(14)} ${JSON.stringify(t.value)}`,
    );
  }
}