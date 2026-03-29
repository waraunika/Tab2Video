// ============================================================
// enhanced-tokenizer.ts
// Filters out metadata, keeps musical content and essential directives
// ============================================================

export type TokenType =
  | "DIRECTIVE"      // \tempo, \ts, \tuning only
  | "DIRECTIVE_ARG"  // arguments for directives
  | "NOTE"           // fret.string e.g. "12.2"
  | "REST"           // r
  | "CHORD_OPEN"     // (
  | "CHORD_CLOSE"    // )
  | "MOD_BLOCK"      // {contents}
  | "DURATION"       // .N
  | "MEASURE_BAR"    // |

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
  
  // State tracking for skipping metadata
  let inMetadataSection = true;  // Start in metadata section
  let braceDepth = 0;
  let inStringLiteral = false;
  let skipCurrentLine = false;
  
  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];
    let i = 0;
    const ln = lineNum + 1;
    
    // Skip empty lines
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("//")) continue;
    
    // Check if we've found the staff block - this is where tab content starts
    if (line.includes('\\staff')) {
      inMetadataSection = false;
      // Still need to parse the staff block to find when it ends
      // The actual tab content comes after the staff block's closing brace
      continue;
    }
    
    // If we're still in metadata section, skip everything until we find staff
    if (inMetadataSection) {
      continue;
    }
    
    // Now we're in the tab content area, but we need to handle remaining directives
    // and skip any metadata blocks (like the tuning block with label)
    let lineTokens: Token[] = [];
    let localBraceDepth = 0;
    let inBlockToSkip = false;
    let pendingDirective: string | null = null;
    
    i = 0;
    while (i < line.length) {
      const char = line[i];
      
      // Handle string literals - skip them entirely
      if (char === '"' && (i === 0 || line[i-1] !== '\\')) {
        inStringLiteral = !inStringLiteral;
        i++;
        continue;
      }
      
      // Skip everything inside string literals
      if (inStringLiteral) {
        i++;
        continue;
      }
      
      // Track braces for block detection
      if (char === '{') {
        localBraceDepth++;
        
        // If we're not in a pending directive we care about, mark block to skip
        if (!pendingDirective && localBraceDepth === 1) {
          inBlockToSkip = true;
        }
        
        i++;
        continue;
      }
      
      if (char === '}') {
        localBraceDepth--;
        if (localBraceDepth === 0) {
          inBlockToSkip = false;
          pendingDirective = null;
        }
        i++;
        continue;
      }
      
      // Skip content inside blocks we don't care about
      if (inBlockToSkip) {
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
          lineTokens.push({ type: "DIRECTIVE", value: name, line: ln });
          pendingDirective = name;
          
          // Collect the argument for this directive
          // Skip whitespace
          while (i < line.length && /\s/.test(line[i])) {
            i++;
          }
          
          // Handle parenthesized arguments or simple numbers
          let args = "";
          if (i < line.length && line[i] === '(') {
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
            lineTokens.push({ type: "DIRECTIVE_ARG", value: args.trim(), line: ln });
          }
        } else {
          // Skip unrecognized directive - but track if it has a block
          while (i < line.length && !/\s/.test(line[i]) && line[i] !== '{') {
            i++;
          }
          // If this directive is followed by a block, we'll skip it via brace tracking
          if (i < line.length && line[i] === '{') {
            // Don't increment i here - let the next loop iteration handle the brace
          }
        }
        continue;
      }
      
      // Musical content - only process if we're not skipping
      
      // Measure bar
      if (char === '|') {
        lineTokens.push({ type: "MEASURE_BAR", value: "|", line: ln });
        i++;
        continue;
      }
      
      // Chord open
      if (char === '(') {
        lineTokens.push({ type: "CHORD_OPEN", value: "(", line: ln });
        i++;
        continue;
      }
      
      // Chord close
      if (char === ')') {
        lineTokens.push({ type: "CHORD_CLOSE", value: ")", line: ln });
        i++;
        continue;
      }
      
      // Mod block: { ... } - these are the articulation blocks we want
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
        lineTokens.push({ type: "MOD_BLOCK", value: content.trim(), line: ln });
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
          lineTokens.push({ type: "DURATION", value: num, line: ln });
        }
        continue;
      }
      
      // Rest: 'r'
      if (char === 'r' && (i + 1 >= line.length || !/\d/.test(line[i + 1]))) {
        lineTokens.push({ type: "REST", value: "r", line: ln });
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
          lineTokens.push({
            type: "NOTE",
            value: `${fret}.${stringNum}`,
            line: ln,
          });
        }
        continue;
      }
      
      // Skip any other characters
      i++;
    }
    
    // Add tokens from this line if we found any
    if (lineTokens.length > 0) {
      tokens.push(...lineTokens);
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