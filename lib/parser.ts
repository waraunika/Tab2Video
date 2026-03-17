interface AlphaTexMetadata {
  // Song information (always present)
  songInfo: {
    title?: string;
    artist?: string;
    subtitle?: string;
    copyright?: string;
    tab?: string;
    words?: string;
    music?: string;
    album?: string;
    year?: string;
    genre?: string;
  };
  
  // Global settings
  globalSettings: {
    systemsLayout?: number[];
    bracketExtendMode?: string;
    otherSystemsTrackNameOrientation?: string;
    scoreSystemSpacing?: number;
    pageFormat?: string;
    pageWidth?: number;
    pageHeight?: number;
    scale?: number;
  };
  
  // All tracks in the score
  tracks: AlphaTexTrack[];
  
  // Guitar-specific information
  guitar: {
    hasGuitar: boolean;
    guitarTracks: AlphaTexTrack[];
    totalGuitarTracks: number;
    guitarTechniques: Set<string>;
    guitarTunings: string[];
    guitarInstruments: string[];
  };
  
  // Statistics
  stats: {
    totalTracks: number;
    totalBars: number;
    tempoChanges: { bar: number; tempo: number }[];
    keyChanges: { bar: number; key: string }[];
    timeSignatureChanges: { bar: number; timeSignature: string }[];
  };
}

interface AlphaTexTrack {
  // Basic info
  number: number;
  name: string;
  shortName?: string;
  instrument: string;
  instrumentId?: string;
  
  // Track properties
  color?: string;
  volume?: number;
  balance?: number;
  transpose?: number;
  displayTranspose?: number;
  capo?: number;
  tuning?: string[];
  tuningLabel?: string;
  strings?: number; // Number of strings
  
  // Staff properties
  clef?: string;
  ottava?: string;
  midiChannel?: number;
  midiProgram?: number;
  
  // Musical context
  key?: string;
  tempo?: number;
  timeSignature?: string;
  startBar: number;
  endBar: number;
  
  // Track content
  bars: AlphaTexBar[];
  techniques: Set<string>;
  hasNotation: boolean;
  
  // Track type detection
  type: 'guitar' | 'bass' | 'drums' | 'piano' | 'vocals' | 'other';
}

interface AlphaTexBar {
  number: number;
  timeSignature?: string;
  tempo?: number;
  key?: string;
  content: string[];
  hasNotes: boolean;
  hasRest: boolean;
  techniques: Set<string>;
}

export class AlphaTexParser {
  private lines: string[] = [];
  private currentBar = 1;
  private currentTempo = 120;
  private currentKey = 'c';
  private currentTimeSignature = '4/4';
  private trackCounter = 0;
  
  private metadata: AlphaTexMetadata = {
    songInfo: {},
    globalSettings: {},
    tracks: [],
    guitar: {
      hasGuitar: false,
      guitarTracks: [],
      totalGuitarTracks: 0,
      guitarTechniques: new Set(),
      guitarTunings: [],
      guitarInstruments: [],
    },
    stats: {
      totalTracks: 0,
      totalBars: 0,
      tempoChanges: [],
      keyChanges: [],
      timeSignatureChanges: [],
    },
  };

  // Comprehensive pattern matching
  private patterns = {
    // Song info
    songInfo: {
      title: /^\s*\\(?:title|Title)\s+"([^"]+)"/i,
      artist: /^\s*\\(?:artist|Artist|composer)\s+"([^"]+)"/i,
      subtitle: /^\s*\\(?:subtitle|Subtitle)\s+"([^"]+)"/i,
      copyright: /^\s*\\(?:copyright|Copyright)\s+"([^"]+)"/i,
      tab: /^\s*\\(?:tab|Tab|tabulature)\s+"([^"]+)"/i,
      words: /^\s*\\(?:words|Words|lyrics)\s+"([^"]+)"/i,
      music: /^\s*\\(?:music|Music)\s+"([^"]+)"/i,
      album: /^\s*\\(?:album|Album)\s+"([^"]+)"/i,
      year: /^\s*\\(?:year|Year)\s+"([^"]+)"/i,
      genre: /^\s*\\(?:genre|Genre)\s+"([^"]+)"/i,
    },

    // Global settings
    global: {
      systemsLayout: /^\s*\\(?:systemsLayout|layout)\s+\(([^)]+)\)/i,
      bracketExtendMode: /^\s*\\(?:bracketExtendMode|bracketMode)\s+(\w+)/i,
      otherSystemsTrackNameOrientation: /^\s*\\(?:otherSystemsTrackNameOrientation|trackNameOrientation)\s+(\w+)/i,
      scoreSystemSpacing: /^\s*\\(?:scoreSystemSpacing|systemSpacing)\s+(\d+)/i,
      pageFormat: /^\s*\\(?:pageFormat|pageSize)\s+"([^"]+)"/i,
      pageWidth: /^\s*\\(?:pageWidth|width)\s+(\d+)/i,
      pageHeight: /^\s*\\(?:pageHeight|height)\s+(\d+)/i,
      scale: /^\s*\\(?:scale|scaling)\s+([\d.]+)/i,
    },

    // Track definition - multiple formats
    track: {
      // Standard format: \track ("Name" "Instrument") {
      standard: /^\s*\\(?:track|Track|instrument)\s+\(\s*"([^"]*)"\s+"([^"]*)"\s*\)\s*{/i,
      
      // Format with short name: \track ("Name" "Short" "Instrument") {
      withShort: /^\s*\\(?:track|Track)\s+\(\s*"([^"]*)"\s+"([^"]*)"\s+"([^"]*)"\s*\)\s*{/i,
      
      // Simple format: \track Name Instrument {
      simple: /^\s*\\(?:track|Track)\s+(\w+)\s+(\w+)\s*{/i,
      
      // Numbered track: \track 1: "Name" "Instrument" {
      numbered: /^\s*\\(?:track|Track)\s+(\d+)\s*:\s*"([^"]*)"\s+"([^"]*)"\s*{/i,
    },

    // Track properties
    trackProps: {
      color: /^\s*color\s+"?#?([A-Fa-f0-9]{6})"?/i,
      volume: /^\s*volume\s+(\d+)/i,
      balance: /^\s*balance\s+([-\d]+)/i,
      transpose: /^\s*transpose\s+([-\d]+)/i,
      displayTranspose: /^\s*displaytranspose\s+(\d+)/i,
      capo: /^\s*capo\s+(\d+)/i,
      midiChannel: /^\s*midichannel\s+(\d+)/i,
      midiProgram: /^\s*midiprogram\s+(\d+)/i,
      instrument: /^\s*instrument\s+(\w+)/i,
      systemsLayout: /^\s*systemsLayout\s+\(([^)]+)\)/i,
    },

    // Staff and tuning
    staff: {
      tuning: /^\s*\\(?:tuning|Tuning)\s+\(([^)]+)\)\s*{?/i,
      tuningLabel: /^\s*label\s+"([^"]+)"/i,
      strings: /^\s*strings\s+(\d+)/i,
      clef: /^\s*\\(?:clef|Clef)\s+(\w+\d*)/i,
      ottava: /^\s*\\(?:ottava|Ottava)\s+(\w+)/i,
      beaming: /^\s*\\(?:beaming|Beaming)\s+\(([^)]+)\)/i,
    },

    // Musical directives
    directives: {
      tempo: /^\s*\\(?:tempo|Tempo)\s+(\d+)/i,
      ts: /^\s*\\(?:ts|time|TimeSignature)\s+\(\s*(\d+)\s+(\d+)\s*\)/i,
      ks: /^\s*\\(?:ks|key|KeySignature)\s+(\w+)/i,
      barline: /^\s*\|/,
      repeat: /^\s*\\(?:repeat|Repeat)\s+(\d+)/i,
      volta: /^\s*\\(?:volta|Volta)\s+(\d+)/i,
      coda: /^\s*\\(?:coda|Coda)/i,
      segno: /^\s*\\(?:segno|Segno)/i,
      fine: /^\s*\\(?:fine|Fine)/i,
    },

    // Note patterns
    note: {
      // Detect various techniques in curly braces
      techniques: /\{([^}]*)\}/g,
      
      // Individual technique patterns
      bend: /\b(?:bend|prebend|release|bendrelease|prebendrelease)\b/i,
      vibrato: /\b(?:vibrato|vib|~)\b/i,
      hammer: /\b(?:hammer-?on|h|ho)\b/i,
      pull: /\b(?:pull-?off|p|po)\b/i,
      slide: /\b(?:slide|s|glissando)\b/i,
      tap: /\b(?:tap|tapping|t)\b/i,
      harmonic: /\b(?:harmonic|harm|artificial|ah)\b/i,
      trill: /\b(?:trill|tr)\b/i,
      tremolo: /\b(?:tremolo|trem)\b/i,
      palmMute: /\b(?:palm\s*mute|pm|mute)\b/i,
      letRing: /\b(?:let\s*ring|lr|ring)\b/i,
      staccato: /\b(?:staccato|stac)\b/i,
      accent: /\b(?:accent|acc|>)\b/i,
      ghost: /\b(?:ghost|gh|note\s*in\s*parentheses)\b/i,
      tuplet: /\btu\s*\(\s*\d+\s+\d+\s*\)/i,
      dynamics: /\b(?:f|ff|fff|p|pp|ppp|mf|mp|sfz|rfz|fp)\b/i,
      beam: /\b(?:beam|beaming)\s+(?:up|down)/i,
    },

    // Instrument detection
    instruments: {
      guitar: [
        /\b(?:guitar|gtr)\b/i,
        /\b(?:distortion|overdrive|drive)\b/i,
        /\b(?:acoustic|electric)\s+guitar\b/i,
        /\b(?:lead|rhythm)\s+guitar\b/i,
        /\b(?:clean|crunch|metal)\s+guitar\b/i,
        /\b(?:e-gt|a-gt|guit)\b/i,
      ],
      bass: [
        /\b(?:bass|bass\s*guitar|e-bass|a-bass)\b/i,
        /\b(?:fretless|slap|bass)\b/i,
      ],
      drums: [
        /\b(?:drums|drum\s*set|percussion|drum)\b/i,
        /\b(?:cymbals|hi-hat|kick|snare|tom)\b/i,
      ],
      piano: [
        /\b(?:piano|keys|keyboard|synth|organ)\b/i,
        /\b(?:grand|electric\s*piano|ep)\b/i,
      ],
      vocals: [
        /\b(?:vocal|voice|singer|lyrics)\b/i,
        /\b(?:lead\s*vocal|backing\s*vocal)\b/i,
      ],
    },
  };

  constructor(alphaTex: string) {
    this.lines = alphaTex.split('\n');
  }

  // Main parsing method
  public parse(): AlphaTexMetadata {
    let currentTrack: Partial<AlphaTexTrack> | null = null;
    let inTrack = false;
    let inStaff = false;
    let inGuitarTrack = false;

    this.lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      // Skip empty lines
      if (!trimmedLine) return;

      // Parse song info (always at top)
      this.parseSongInfo(trimmedLine);

      // Parse global settings
      this.parseGlobalSettings(trimmedLine);

      // Check for track start
      const trackStart = this.parseTrackStart(trimmedLine, index);
      if (trackStart) {
        if (currentTrack) {
          // Save previous track
          this.finalizeTrack(currentTrack as AlphaTexTrack);
        }
        
        currentTrack = trackStart;
        inTrack = true;
        inStaff = false;
        
        // Detect if this is a guitar track
        inGuitarTrack = this.isGuitarTrack(currentTrack);
        if (inGuitarTrack) {
          this.metadata.guitar.hasGuitar = true;
          this.metadata.guitar.guitarInstruments.push(currentTrack.instrument);
        }
        
        return;
      }

      // Check for staff start
      if (trimmedLine === '\\staff {' || trimmedLine === '\\staff{') {
        inStaff = true;
        return;
      }

      // Check for track end
      if (trimmedLine === '}' && inTrack) {
        if (currentTrack) {
          currentTrack.endBar = this.currentBar - 1;
          this.finalizeTrack(currentTrack as AlphaTexTrack);
        }
        inTrack = false;
        inStaff = false;
        currentTrack = null;
        inGuitarTrack = false;
        return;
      }

      // Parse track properties if in a track
      if (inTrack && currentTrack) {
        this.parseTrackProperties(trimmedLine, currentTrack);
      }

      // Parse staff properties
      if (inStaff && currentTrack) {
        this.parseStaffProperties(trimmedLine, currentTrack);
      }

      // Parse musical directives (global or track-specific)
      this.parseDirectives(trimmedLine, inTrack, currentTrack);

      // Handle bar lines and note content
      if (inTrack && currentTrack) {
        this.handleBarContent(trimmedLine, currentTrack, inGuitarTrack);
      } else if (this.patterns.directives.barline.test(trimmedLine)) {
        // Still count bars even if not in a track
        this.currentBar++;
        this.metadata.stats.totalBars = Math.max(this.metadata.stats.totalBars, this.currentBar);
      }
    });

    // Finalize last track if needed
    if (currentTrack) {
      currentTrack.endBar = this.currentBar - 1;
      this.finalizeTrack(currentTrack as AlphaTexTrack);
    }

    // Update guitar-specific metadata
    this.metadata.guitar.guitarTracks = this.metadata.tracks.filter(t => t.type === 'guitar');
    this.metadata.guitar.totalGuitarTracks = this.metadata.guitar.guitarTracks.length;
    
    // Collect all guitar techniques
    this.metadata.guitar.guitarTracks.forEach(track => {
      track.techniques.forEach(tech => this.metadata.guitar.guitarTechniques.add(tech));
    });

    // Collect all guitar tunings
    this.metadata.guitar.guitarTunings = this.metadata.guitar.guitarTracks
      .map(t => t.tuning?.join(' '))
      .filter((t): t is string => !!t);

    return this.metadata;
  }

  private parseSongInfo(line: string): void {
    for (const [key, pattern] of Object.entries(this.patterns.songInfo)) {
      const match = line.match(pattern);
      if (match) {
        this.metadata.songInfo[key as keyof typeof this.metadata.songInfo] = match[1];
        break;
      }
    }
  }

  private parseGlobalSettings(line: string): void {
    for (const [key, pattern] of Object.entries(this.patterns.global)) {
      const match = line.match(pattern);
      if (match) {
        if (key === 'systemsLayout') {
          this.metadata.globalSettings[key] = match[1].split(/\s+/).map(Number);
        } else if (key === 'scale') {
          this.metadata.globalSettings[key] = parseFloat(match[1]);
        } else if (key === 'pageWidth' || key === 'pageHeight') {
          this.metadata.globalSettings[key] = parseInt(match[1], 10);
        } else {
          this.metadata.globalSettings[key as keyof typeof this.metadata.globalSettings] = match[1] as any;
        }
        break;
      }
    }
  }

  private parseTrackStart(line: string, index: number): Partial<AlphaTexTrack> | null {
    // Try different track formats
    const formats = [
      { pattern: this.patterns.track.standard, handler: (m: RegExpMatchArray) => ({
        name: m[1],
        instrument: m[2],
      })},
      { pattern: this.patterns.track.withShort, handler: (m: RegExpMatchArray) => ({
        name: m[1],
        shortName: m[2],
        instrument: m[3],
      })},
      { pattern: this.patterns.track.simple, handler: (m: RegExpMatchArray) => ({
        name: m[1],
        instrument: m[2],
      })},
      { pattern: this.patterns.track.numbered, handler: (m: RegExpMatchArray) => ({
        number: parseInt(m[1], 10),
        name: m[2],
        instrument: m[3],
      })},
    ];

    for (const format of formats) {
      const match = line.match(format.pattern);
      if (match) {
        this.trackCounter++;
        
        const trackData = format.handler(match);
        
        return {
          number: trackData.number || this.trackCounter,
          name: trackData.name || `Track ${this.trackCounter}`,
          shortName: trackData.shortName,
          instrument: trackData.instrument || 'Unknown',
          startBar: this.currentBar,
          bars: [],
          techniques: new Set(),
          type: this.detectInstrumentType(trackData.instrument || ''),
          ...trackData,
        };
      }
    }

    return null;
  }

  private parseTrackProperties(line: string, track: Partial<AlphaTexTrack>): void {
    for (const [key, pattern] of Object.entries(this.patterns.trackProps)) {
      const match = line.match(pattern);
      if (match) {
        switch (key) {
          case 'color':
            track.color = `#${match[1]}`;
            break;
          case 'volume':
          case 'balance':
          case 'transpose':
          case 'displayTranspose':
          case 'capo':
          case 'midiChannel':
          case 'midiProgram':
            track[key] = parseInt(match[1], 10);
            break;
          case 'systemsLayout':
            // Handle if needed
            break;
          case 'instrument':
            track.instrument = match[1];
            // Re-detect type if instrument changes
            track.type = this.detectInstrumentType(match[1]);
            break;
        }
        break;
      }
    }
  }

  private parseStaffProperties(line: string, track: Partial<AlphaTexTrack>): void {
    // Parse tuning
    const tuningMatch = line.match(this.patterns.staff.tuning);
    if (tuningMatch) {
      track.tuning = tuningMatch[1].split(/\s+/).map(note => note.trim());
      return;
    }

    // Parse tuning label
    const labelMatch = line.match(this.patterns.staff.tuningLabel);
    if (labelMatch) {
      track.tuningLabel = labelMatch[1];
      return;
    }

    // Parse strings count
    const stringsMatch = line.match(this.patterns.staff.strings);
    if (stringsMatch) {
      track.strings = parseInt(stringsMatch[1], 10);
      return;
    }

    // Parse clef
    const clefMatch = line.match(this.patterns.staff.clef);
    if (clefMatch) {
      track.clef = clefMatch[1];
      return;
    }

    // Parse ottava
    const ottavaMatch = line.match(this.patterns.staff.ottava);
    if (ottavaMatch) {
      track.ottava = ottavaMatch[1];
      return;
    }
  }

  private parseDirectives(line: string, inTrack: boolean, track: Partial<AlphaTexTrack> | null): void {
    // Tempo changes
    const tempoMatch = line.match(this.patterns.directives.tempo);
    if (tempoMatch) {
      const newTempo = parseInt(tempoMatch[1], 10);
      this.currentTempo = newTempo;
      this.metadata.stats.tempoChanges.push({
        bar: this.currentBar,
        tempo: newTempo,
      });
      
      if (inTrack && track) {
        track.tempo = newTempo;
      }
      return;
    }

    // Time signature changes
    const tsMatch = line.match(this.patterns.directives.ts);
    if (tsMatch) {
      const newTs = `${tsMatch[1]}/${tsMatch[2]}`;
      this.currentTimeSignature = newTs;
      this.metadata.stats.timeSignatureChanges.push({
        bar: this.currentBar,
        timeSignature: newTs,
      });
      
      if (inTrack && track) {
        track.timeSignature = newTs;
      }
      return;
    }

    // Key signature changes
    const ksMatch = line.match(this.patterns.directives.ks);
    if (ksMatch) {
      const newKey = ksMatch[1];
      this.currentKey = newKey;
      this.metadata.stats.keyChanges.push({
        bar: this.currentBar,
        key: newKey,
      });
      
      if (inTrack && track) {
        track.key = newKey;
      }
      return;
    }
  }

  private handleBarContent(line: string, track: Partial<AlphaTexTrack>, isGuitar: boolean): void {
    // Check for bar line
    if (this.patterns.directives.barline.test(line)) {
      this.currentBar++;
      this.metadata.stats.totalBars = Math.max(this.metadata.stats.totalBars, this.currentBar);
      return;
    }

    // Skip directive lines
    if (line.startsWith('\\')) return;

    // Process note lines
    if (line.trim()) {
      if (!track.bars) track.bars = [];
      
      const hasNotes = /[\d.]+/.test(line);
      const hasRest = /r\b/i.test(line);
      
      // Extract techniques
      const techniques = this.extractTechniques(line);
      
      // Add to current bar
      const lastBar = track.bars[track.bars.length - 1];
      if (lastBar && lastBar.number === this.currentBar) {
        lastBar.content.push(line);
        techniques.forEach(t => lastBar.techniques.add(t));
      } else {
        track.bars.push({
          number: this.currentBar,
          timeSignature: this.currentTimeSignature,
          tempo: this.currentTempo,
          key: this.currentKey,
          content: [line],
          hasNotes,
          hasRest,
          techniques,
        });
      }
      
      // Add techniques to track
      techniques.forEach(t => track.techniques?.add(t));
    }
  }

  private extractTechniques(line: string): Set<string> {
    const techniques = new Set<string>();
    let match;

    // Extract all technique blocks
    const techniqueBlocks = line.match(this.patterns.note.techniques) || [];
    techniqueBlocks.forEach(block => {
      // Check each technique type
      for (const [tech, pattern] of Object.entries(this.patterns.note)) {
        if (tech === 'techniques') continue;
        if (pattern.test(block)) {
          techniques.add(tech);
        }
      }
    });

    return techniques;
  }

  private detectInstrumentType(instrument: string): AlphaTexTrack['type'] {
    const lowerInst = instrument.toLowerCase();
    
    for (const [type, patterns] of Object.entries(this.patterns.instruments)) {
      if (patterns.some(p => p.test(lowerInst))) {
        return type as AlphaTexTrack['type'];
      }
    }
    
    return 'other';
  }

  private isGuitarTrack(track: Partial<AlphaTexTrack>): boolean {
    if (!track) return false;
    
    // Check instrument name
    if (track.instrument && this.detectInstrumentType(track.instrument) === 'guitar') {
      return true;
    }
    
    // Check track name
    if (track.name && this.detectInstrumentType(track.name) === 'guitar') {
      return true;
    }
    
    // Check tuning (guitar standard tuning)
    if (track.tuning) {
      const tuningStr = track.tuning.join(' ');
      if (/E[24]?\s+B[23]?\s+G[23]?\s+D[23]?\s+A[12]?\s+E[12]?/i.test(tuningStr)) {
        return true;
      }
    }
    
    return false;
  }

  private finalizeTrack(track: AlphaTexTrack): void {
    // Set musical context if not set
    if (!track.key) track.key = this.currentKey;
    if (!track.tempo) track.tempo = this.currentTempo;
    if (!track.timeSignature) track.timeSignature = this.currentTimeSignature;
    
    // Set hasNotation flag
    track.hasNotation = track.bars?.some(bar => bar.hasNotes) || false;
    
    // Add to tracks list
    this.metadata.tracks.push(track);
    this.metadata.stats.totalTracks++;
  }

  // Utility method to extract only guitar parts as a new string
  public extractGuitarParts(): string {
    const guitarTracks = this.metadata.tracks.filter(t => t.type === 'guitar');
    const guitarTrackNumbers = new Set(guitarTracks.map(t => t.number));
    
    let result: string[] = [];
    let inGuitarTrack = false;
    
    this.lines.forEach(line => {
      const trimmedLine = line.trim();
      
      // Check for track start
      const trackMatch = trimmedLine.match(this.patterns.track.standard) ||
                        trimmedLine.match(this.patterns.track.withShort) ||
                        trimmedLine.match(this.patterns.track.simple);
      
      if (trackMatch) {
        // Determine if this is a guitar track
        const instrument = trackMatch[trackMatch.length - 1]; // Last capture is usually instrument
        const isGuitar = this.detectInstrumentType(instrument) === 'guitar';
        
        if (isGuitar) {
          inGuitarTrack = true;
          result.push(line);
        } else {
          inGuitarTrack = false;
        }
        return;
      }
      
      // Check for track end
      if (trimmedLine === '}' && inGuitarTrack) {
        inGuitarTrack = false;
        result.push(line);
        return;
      }
      
      // Include song info and global settings (always)
      if (!inGuitarTrack && this.isGlobalContent(line)) {
        result.push(line);
      }
      
      // Include guitar track content
      if (inGuitarTrack) {
        result.push(line);
      }
    });
    
    return result.join('\n');
  }

  private isGlobalContent(line: string): boolean {
    const trimmed = line.trim();
    
    // Song info
    if (Object.values(this.patterns.songInfo).some(p => p.test(trimmed))) {
      return true;
    }
    
    // Global settings
    if (Object.values(this.patterns.global).some(p => p.test(trimmed))) {
      return true;
    }
    
    // Don't include track content
    if (trimmed.startsWith('\\track') || trimmed === '}' || trimmed.startsWith('\\staff')) {
      return false;
    }
    
    // Include empty lines and comments
    return !trimmed || trimmed.startsWith('#');
  }
}

// Usage example:
export function parseAnyAlphaTex(alphaTex: string) {
  const parser = new AlphaTexParser(alphaTex);
  const metadata = parser.parse();
  const guitarOnly = parser.extractGuitarParts();
  
  return {
    metadata,
    guitarOnly,
    summary: {
      title: metadata.songInfo.title || 'Untitled',
      artist: metadata.songInfo.artist || 'Unknown',
      totalTracks: metadata.stats.totalTracks,
      guitarTracks: metadata.guitar.totalGuitarTracks,
      hasGuitar: metadata.guitar.hasGuitar,
      totalBars: metadata.stats.totalBars,
      guitarTechniques: Array.from(metadata.guitar.guitarTechniques),
    }
  };
}