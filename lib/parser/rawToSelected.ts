import { alphaTab } from "@coderline/alphatab/vite";

interface ParserConfig {
  verbose?: boolean;
  customKeywords?: string[];
}

interface TrackInfo {
  number: number;
  name: string;
  instrument: string;
}

interface ParsedTrack {
  name: string;
  instrument: string;
  lines: string[];
  startLine: number;
  endLine: number;
}

class AlphaTexGuitarParser {
  private readonly guitarKeywords: string[];
  private config: ParserConfig;

  constructor(config: ParserConfig = {}) {
    this.config = {
      verbose: false, // Default to false for production
      ...config,
    };

    this.guitarKeywords = [
      "guitar", "e-gt", "s-gt", "distortion", "overdriven", "clean",
      "distortionguitar", "electric", "acoustic", "steel", "nylon",
      "jazz", "rock", "metal", "lead", "rhythm", "muted", "harmonics",
      "feedback", "chorus", "funk", "hawaiian", "mid tone", "pinch",
      "overdrive", "bass", "ukulele", "mandolin", "banjo",
      ...(config.customKeywords || []),
    ];
  }

  public listGuitarTracks(alphaTexString: string): TrackInfo[] {
    const tracks = this.parseTracks(alphaTexString);
    const guitarTracks = tracks.filter((track) =>
      this.isGuitarTrack(track.lines),
    );

    return guitarTracks.map((track, idx) => ({
      number: idx + 1,
      name: track.name,
      instrument: track.instrument,
    }));
  }

  public extractGuitarTrack(
    alphaTexString: string,
    selection: number | string,
  ): { success: boolean; content?: string; error?: string; trackName?: string } {
    try {
      const tracks = this.parseTracks(alphaTexString);
      const guitarTracks = tracks.filter((track) =>
        this.isGuitarTrack(track.lines),
      );

      if (guitarTracks.length === 0) {
        return { success: false, error: "No guitar tracks found" };
      }

      let selectedTrack: ParsedTrack | undefined;

      if (typeof selection === "number") {
        if (selection >= 1 && selection <= guitarTracks.length) {
          selectedTrack = guitarTracks[selection - 1];
        }
      } else {
        const lowerSel = selection.toLowerCase();
        selectedTrack = guitarTracks.find(
          (track) =>
            track.name.toLowerCase().includes(lowerSel) ||
            track.instrument.toLowerCase().includes(lowerSel),
        );
      }

      if (!selectedTrack) {
        const availableTracks = guitarTracks
          .map((t, i) => `${i + 1}. ${t.name} (${t.instrument})`)
          .join("\n");
        return {
          success: false,
          error: `Track not found: ${selection}\n\nAvailable tracks:\n${availableTracks}`,
        };
      }

      const header = this.extractHeader(alphaTexString);
      const content = [...header, ...selectedTrack.lines].join("\n");

      return {
        success: true,
        content,
        trackName: selectedTrack.name,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  private parseTracks(alphaTexString: string): ParsedTrack[] {
    const lines = alphaTexString.split("\n");
    const tracks: ParsedTrack[] = [];

    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (!line) {
        i++;
        continue;
      }

      const trimmed = line.trim();

      if (this.isTrackStart(trimmed)) {
        const trackStartLine = i;
        const trackName = this.extractTrackName(line);
        const trackLines: string[] = [line];

        let j = i + 1;
        let nextTrackIndex = -1;

        for (let k = j; k < lines.length; k++) {
          const nextLine = lines[k];
          if (nextLine && this.isTrackStart(nextLine.trim())) {
            nextTrackIndex = k;
            break;
          }
        }

        if (nextTrackIndex !== -1) {
          for (let k = j; k < nextTrackIndex; k++) {
            if (lines[k] !== undefined) {
              trackLines.push(lines[k]);
            }
          }
          i = nextTrackIndex;
        } else {
          for (let k = j; k < lines.length; k++) {
            if (lines[k] !== undefined) {
              trackLines.push(lines[k]);
            }
          }
          i = lines.length;
        }

        tracks.push({
          name: trackName,
          instrument: this.extractInstrumentInfo(trackLines),
          lines: trackLines,
          startLine: trackStartLine,
          endLine: i - 1,
        });
      } else {
        i++;
      }
    }

    return tracks;
  }

  private extractHeader(alphaTexString: string): string[] {
    const lines = alphaTexString.split("\n");
    const header: string[] = [];

    for (const line of lines) {
      if (!line) continue;
      if (this.isTrackStart(line.trim())) {
        break;
      }
      header.push(line);
    }

    return header;
  }

  private isTrackStart(line: string): boolean {
    const lowerLine = line.toLowerCase();
    return (
      lowerLine.startsWith("\\track") ||
      lowerLine.startsWith("[track]") ||
      lowerLine.startsWith("track")
    );
  }

  private isGuitarTrack(trackLines: string[]): boolean {
    return trackLines.some((line) => this.isGuitarInstrument(line));
  }

  private isGuitarInstrument(text: string): boolean {
    const lowerText = text.toLowerCase();

    if (lowerText.includes("guitar") && !lowerText.includes("piano")) {
      return true;
    }

    return this.guitarKeywords.some(
      (keyword) =>
        lowerText.includes(keyword) &&
        !lowerText.includes("piano") &&
        !lowerText.includes("drum") &&
        !lowerText.includes("flute") &&
        !lowerText.includes("violin"),
    );
  }

  private extractTrackName(line: string): string {
    const match = line.match(/\("([^"]+)"\s+"([^"]+)"\)/);
    if (match) {
      return `${match[1]} (${match[2]})`;
    }

    const simpleMatch = line.match(/track\s+"([^"]+)"/i);
    if (simpleMatch) {
      return simpleMatch[1];
    }

    return "Unknown Track";
  }

  private extractInstrumentInfo(trackLines: string[]): string {
    for (const line of trackLines) {
      if (line.toLowerCase().includes("instrument")) {
        const match = line.match(/instrument\s+([^\s{]+)/i);
        if (match) {
          return match[1];
        }
      }
    }
    return "Unknown";
  }
}

/**
 * Main parser function for website use
 * @param text - AlphaTex content string
 * @param name - Track name or number to extract
 * @returns Extracted guitar track content as string
 */
export default function parser(text: string, name: string): string {
  const parser = new AlphaTexGuitarParser({ verbose: false });

  try {
    // Convert name to number if it's a numeric string
    let selection: number | string = name;
    if (!isNaN(Number(name)) && name.trim() !== "") {
      selection = Number(name);
    }

    const result = parser.extractGuitarTrack(text, selection);
    
    if (result.success && result.content) {
      return result.content;
    } else {
      return `Error: ${result.error || "Extraction failed"}`;
    }
  } catch (error) {
    return `Error: ${error instanceof Error ? error.message : "Unknown error"}`;
  }
}

// Export types for TypeScript users
export { AlphaTexGuitarParser, type TrackInfo, type ParserConfig };