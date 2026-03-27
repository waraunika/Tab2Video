// ============================================================
// tokenizer.ts
// Converts raw AlphaTex text into a flat token stream.
// This is a pure lexer — no semantic meaning assigned here.
// ============================================================

export type TokenType =
  | "DIRECTIVE" // \tempo \ts \tuning \beaming \ks etc.
  | "NOTE" // fret.string  e.g. "12.2"
  | "REST" // r
  | "CHORD_OPEN" // (
  | "CHORD_CLOSE" // )
  | "MOD_BLOCK" // {contents} — already stripped of braces
  | "DURATION" // .N — already stripped of dot, just the number as string
  | "MEASURE_BAR" // |
  | "DIRECTIVE_ARG"; // argument tokens following a directive

export interface Token {
  type: TokenType;
  value: string;
  line: number; // for error reporting
}

// ============================================================
// Main tokenizer function
// Returns flat array of tokens in source order
// ============================================================

export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  const lines = source.split("\n");

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];
    let i = 0;
    const ln = lineNum + 1;

    if (line) {
      const trimmed = line.trim();
      if (trimmed === "" || trimmed.startsWith("//")) continue;

      i = 0;
      while (i < line.length) {
        // Skip whitespace
        if (line[i] === " " || line[i] === "\t" || line[i] === "\r") {
          i++;
          continue;
        }

        // Directive: starts with backslash
        if (line[i] === "\\") {
          const start = i;
          i++; // skip backslash
          let name = "";
          while (i < line.length && /\w/.test(line[i])) {
            name += line[i];
            i++;
          }
          tokens.push({ type: "DIRECTIVE", value: name, line: ln });

          // Consume directive arguments until end of line or a note token starts
          // Directives: \tempo N, \ts N N, \tuning (...), \beaming (...), \ks X, etc.
          // Arguments are the rest of the trimmed line content after the directive name
          // We collect them as a single DIRECTIVE_ARG token for the parser to handle
          let args = "";
          // Handle paren-wrapped args like \tuning (E4 B3 G3 D3 A2 E2)
          let j = i;
          while (j < line.length) {
            args += line[j];
            j++;
          }
          args = args.trim();
          if (args.length > 0) {
            tokens.push({ type: "DIRECTIVE_ARG", value: args, line: ln });
          }
          i = line.length; // directive consumes rest of line
          continue;
        }

        // Measure bar
        if (line[i] === "|") {
          tokens.push({ type: "MEASURE_BAR", value: "|", line: ln });
          i++;
          continue;
        }

        // Chord open
        if (line[i] === "(") {
          tokens.push({ type: "CHORD_OPEN", value: "(", line: ln });
          i++;
          continue;
        }

        // Chord close
        if (line[i] === ")") {
          tokens.push({ type: "CHORD_CLOSE", value: ")", line: ln });
          i++;
          continue;
        }

        // Mod block: { ... } — may contain nested parens for bend params
        if (line[i] === "{") {
          let content = "";
          i++; // skip opening {
          let depth = 0;
          while (i < line.length) {
            if (line[i] === "(") depth++;
            else if (line[i] === ")") depth--;
            else if (line[i] === "}" && depth === 0) {
              i++; // skip closing }
              break;
            }
            content += line[i];
            i++;
          }
          tokens.push({ type: "MOD_BLOCK", value: content.trim(), line: ln });
          continue;
        }

        // Duration: .N (dot followed by digits)
        if (line[i] === ".") {
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

        // Rest: 'r' not followed by digit (so we don't confuse with 'r' in identifiers)
        if (
          line[i] === "r" &&
          (i + 1 >= line.length || !/\d/.test(line[i + 1]))
        ) {
          tokens.push({ type: "REST", value: "r", line: ln });
          i++;
          continue;
        }

        // NOTE: fret.string — starts with digit(s), followed by dot, followed by digit(s)
        // We read the fret number here; the dot+string are consumed as DURATION below
        // BUT we need to distinguish note "12.2" from duration ".4"
        // A NOTE is digits at the start of a token (not preceded by .)
        if (/\d/.test(line[i])) {
          let num = "";
          while (i < line.length && /\d/.test(line[i])) {
            num += line[i];
            i++;
          }
          // Check if followed by .digit — that makes it fret.string
          if (
            i < line.length &&
            line[i] === "." &&
            i + 1 < line.length &&
            /\d/.test(line[i + 1])
          ) {
            i++; // skip the dot
            let stringNum = "";
            while (i < line.length && /\d/.test(line[i])) {
              stringNum += line[i];
              i++;
            }
            tokens.push({
              type: "NOTE",
              value: `${num}.${stringNum}`,
              line: ln,
            });
          } else {
            // Just a number without .string — could be a stray arg, skip
            // (shouldn't happen in well-formed AlphaTex)
          }
          continue;
        }
      }

      // Skip leading whitespace

      // Skip any other character (letters in mod blocks are already consumed above)
      i++;
    }
  }

  return tokens;
}

// ============================================================
// Debug helper: print token stream
// ============================================================

export function printTokens(tokens: Token[]): void {
  for (const t of tokens) {
    console.log(
      `  [${t.line.toString().padStart(3)}] ${t.type.padEnd(14)} ${JSON.stringify(t.value)}`,
    );
  }
}
