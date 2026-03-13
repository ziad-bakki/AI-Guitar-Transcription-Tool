// Standard open chord fingerings for svguitar
// fingers: [string, fret] where string 1 = high e, string 6 = low E
// 'x' = muted string, 0 = open string

export interface ChordDiagram {
  fingers: [number, number | "x"][];
  barres: { fromString: number; toString: number; fret: number }[];
  position: number;
  title: string;
}

const CHORD_DIAGRAMS: Record<string, ChordDiagram> = {
  // Major chords
  "C":    { fingers: [[6, "x"], [5, 3], [4, 2], [3, 0], [2, 1], [1, 0]], barres: [], position: 1, title: "C" },
  "D":    { fingers: [[6, "x"], [5, "x"], [4, 0], [3, 2], [2, 3], [1, 2]], barres: [], position: 1, title: "D" },
  "E":    { fingers: [[6, 0], [5, 2], [4, 2], [3, 1], [2, 0], [1, 0]], barres: [], position: 1, title: "E" },
  "F":    { fingers: [[6, 1], [5, 3], [4, 3], [3, 2], [2, 1], [1, 1]], barres: [{ fromString: 6, toString: 1, fret: 1 }], position: 1, title: "F" },
  "G":    { fingers: [[6, 3], [5, 2], [4, 0], [3, 0], [2, 0], [1, 3]], barres: [], position: 1, title: "G" },
  "A":    { fingers: [[6, "x"], [5, 0], [4, 2], [3, 2], [2, 2], [1, 0]], barres: [], position: 1, title: "A" },
  "B":    { fingers: [[6, "x"], [5, 2], [4, 4], [3, 4], [2, 4], [1, 2]], barres: [{ fromString: 5, toString: 1, fret: 2 }], position: 1, title: "B" },

  // Sharp/flat major chords
  "C#":   { fingers: [[6, "x"], [5, 4], [4, 3], [3, 1], [2, 2], [1, 1]], barres: [{ fromString: 5, toString: 1, fret: 1 }], position: 1, title: "C#" },
  "D#":   { fingers: [[6, "x"], [5, 6], [4, 5], [3, 3], [2, 4], [1, 3]], barres: [{ fromString: 5, toString: 1, fret: 3 }], position: 3, title: "D#" },
  "F#":   { fingers: [[6, 2], [5, 4], [4, 4], [3, 3], [2, 2], [1, 2]], barres: [{ fromString: 6, toString: 1, fret: 2 }], position: 1, title: "F#" },
  "G#":   { fingers: [[6, 4], [5, 6], [4, 6], [3, 5], [2, 4], [1, 4]], barres: [{ fromString: 6, toString: 1, fret: 4 }], position: 3, title: "G#" },
  "A#":   { fingers: [[6, "x"], [5, 1], [4, 3], [3, 3], [2, 3], [1, 1]], barres: [{ fromString: 5, toString: 1, fret: 1 }], position: 1, title: "A#" },

  // Minor chords
  "Cm":   { fingers: [[6, "x"], [5, 3], [4, 5], [3, 5], [2, 4], [1, 3]], barres: [{ fromString: 5, toString: 1, fret: 3 }], position: 3, title: "Cm" },
  "Dm":   { fingers: [[6, "x"], [5, "x"], [4, 0], [3, 2], [2, 3], [1, 1]], barres: [], position: 1, title: "Dm" },
  "Em":   { fingers: [[6, 0], [5, 2], [4, 2], [3, 0], [2, 0], [1, 0]], barres: [], position: 1, title: "Em" },
  "Fm":   { fingers: [[6, 1], [5, 3], [4, 3], [3, 1], [2, 1], [1, 1]], barres: [{ fromString: 6, toString: 1, fret: 1 }], position: 1, title: "Fm" },
  "Gm":   { fingers: [[6, 3], [5, 5], [4, 5], [3, 3], [2, 3], [1, 3]], barres: [{ fromString: 6, toString: 1, fret: 3 }], position: 3, title: "Gm" },
  "Am":   { fingers: [[6, "x"], [5, 0], [4, 2], [3, 2], [2, 1], [1, 0]], barres: [], position: 1, title: "Am" },
  "Bm":   { fingers: [[6, "x"], [5, 2], [4, 4], [3, 4], [2, 3], [1, 2]], barres: [{ fromString: 5, toString: 1, fret: 2 }], position: 1, title: "Bm" },

  // Sharp/flat minor chords
  "C#m":  { fingers: [[6, "x"], [5, 4], [4, 6], [3, 6], [2, 5], [1, 4]], barres: [{ fromString: 5, toString: 1, fret: 4 }], position: 4, title: "C#m" },
  "D#m":  { fingers: [[6, "x"], [5, 6], [4, 8], [3, 8], [2, 7], [1, 6]], barres: [{ fromString: 5, toString: 1, fret: 6 }], position: 6, title: "D#m" },
  "F#m":  { fingers: [[6, 2], [5, 4], [4, 4], [3, 2], [2, 2], [1, 2]], barres: [{ fromString: 6, toString: 1, fret: 2 }], position: 1, title: "F#m" },
  "G#m":  { fingers: [[6, 4], [5, 6], [4, 6], [3, 4], [2, 4], [1, 4]], barres: [{ fromString: 6, toString: 1, fret: 4 }], position: 3, title: "G#m" },
  "A#m":  { fingers: [[6, "x"], [5, 1], [4, 3], [3, 3], [2, 2], [1, 1]], barres: [{ fromString: 5, toString: 1, fret: 1 }], position: 1, title: "A#m" },

  // Dominant 7th chords
  "C7":   { fingers: [[6, "x"], [5, 3], [4, 2], [3, 3], [2, 1], [1, 0]], barres: [], position: 1, title: "C7" },
  "D7":   { fingers: [[6, "x"], [5, "x"], [4, 0], [3, 2], [2, 1], [1, 2]], barres: [], position: 1, title: "D7" },
  "E7":   { fingers: [[6, 0], [5, 2], [4, 0], [3, 1], [2, 0], [1, 0]], barres: [], position: 1, title: "E7" },
  "F7":   { fingers: [[6, 1], [5, 3], [4, 1], [3, 2], [2, 1], [1, 1]], barres: [{ fromString: 6, toString: 1, fret: 1 }], position: 1, title: "F7" },
  "G7":   { fingers: [[6, 3], [5, 2], [4, 0], [3, 0], [2, 0], [1, 1]], barres: [], position: 1, title: "G7" },
  "A7":   { fingers: [[6, "x"], [5, 0], [4, 2], [3, 0], [2, 2], [1, 0]], barres: [], position: 1, title: "A7" },
  "B7":   { fingers: [[6, "x"], [5, 2], [4, 1], [3, 2], [2, 0], [1, 2]], barres: [], position: 1, title: "B7" },
  "C#7":  { fingers: [[6, "x"], [5, 4], [4, 3], [3, 4], [2, 2], [1, "x"]], barres: [], position: 1, title: "C#7" },
  "D#7":  { fingers: [[6, "x"], [5, 6], [4, 5], [3, 6], [2, 4], [1, "x"]], barres: [], position: 4, title: "D#7" },
  "F#7":  { fingers: [[6, 2], [5, 4], [4, 2], [3, 3], [2, 2], [1, 2]], barres: [{ fromString: 6, toString: 1, fret: 2 }], position: 1, title: "F#7" },
  "G#7":  { fingers: [[6, 4], [5, 6], [4, 4], [3, 5], [2, 4], [1, 4]], barres: [{ fromString: 6, toString: 1, fret: 4 }], position: 3, title: "G#7" },
  "A#7":  { fingers: [[6, "x"], [5, 1], [4, 3], [3, 1], [2, 3], [1, 1]], barres: [{ fromString: 5, toString: 1, fret: 1 }], position: 1, title: "A#7" },

  // Major 7th chords
  "Cmaj7": { fingers: [[6, "x"], [5, 3], [4, 2], [3, 0], [2, 0], [1, 0]], barres: [], position: 1, title: "Cmaj7" },
  "Dmaj7": { fingers: [[6, "x"], [5, "x"], [4, 0], [3, 2], [2, 2], [1, 2]], barres: [], position: 1, title: "Dmaj7" },
  "Emaj7": { fingers: [[6, 0], [5, 2], [4, 1], [3, 1], [2, 0], [1, 0]], barres: [], position: 1, title: "Emaj7" },
  "Gmaj7": { fingers: [[6, 3], [5, 2], [4, 0], [3, 0], [2, 0], [1, 2]], barres: [], position: 1, title: "Gmaj7" },
  "Fmaj7": { fingers: [[6, "x"], [5, "x"], [4, 3], [3, 2], [2, 1], [1, 0]], barres: [], position: 1, title: "Fmaj7" },
  "Amaj7": { fingers: [[6, "x"], [5, 0], [4, 2], [3, 1], [2, 2], [1, 0]], barres: [], position: 1, title: "Amaj7" },
  "Bmaj7": { fingers: [[6, "x"], [5, 2], [4, 4], [3, 3], [2, 4], [1, 2]], barres: [{ fromString: 5, toString: 1, fret: 2 }], position: 1, title: "Bmaj7" },
  "C#maj7": { fingers: [[6, "x"], [5, 4], [4, 3], [3, 1], [2, 1], [1, 1]], barres: [{ fromString: 3, toString: 1, fret: 1 }], position: 1, title: "C#maj7" },
  "D#maj7": { fingers: [[6, "x"], [5, 6], [4, 5], [3, 3], [2, 3], [1, 3]], barres: [{ fromString: 3, toString: 1, fret: 3 }], position: 3, title: "D#maj7" },
  "F#maj7": { fingers: [[6, 2], [5, 4], [4, 3], [3, 3], [2, 2], [1, 2]], barres: [{ fromString: 6, toString: 1, fret: 2 }], position: 1, title: "F#maj7" },
  "G#maj7": { fingers: [[6, 4], [5, 6], [4, 5], [3, 5], [2, 4], [1, 4]], barres: [{ fromString: 6, toString: 1, fret: 4 }], position: 3, title: "G#maj7" },
  "A#maj7": { fingers: [[6, "x"], [5, 1], [4, 3], [3, 2], [2, 3], [1, 1]], barres: [{ fromString: 5, toString: 1, fret: 1 }], position: 1, title: "A#maj7" },

  // Minor 7th chords
  "Cm7":  { fingers: [[6, "x"], [5, 3], [4, 5], [3, 3], [2, 4], [1, 3]], barres: [{ fromString: 5, toString: 1, fret: 3 }], position: 3, title: "Cm7" },
  "Dm7":  { fingers: [[6, "x"], [5, "x"], [4, 0], [3, 2], [2, 1], [1, 1]], barres: [], position: 1, title: "Dm7" },
  "Em7":  { fingers: [[6, 0], [5, 2], [4, 0], [3, 0], [2, 0], [1, 0]], barres: [], position: 1, title: "Em7" },
  "Am7":  { fingers: [[6, "x"], [5, 0], [4, 2], [3, 0], [2, 1], [1, 0]], barres: [], position: 1, title: "Am7" },
  "Fm7":  { fingers: [[6, 1], [5, 3], [4, 1], [3, 1], [2, 1], [1, 1]], barres: [{ fromString: 6, toString: 1, fret: 1 }], position: 1, title: "Fm7" },
  "Gm7":  { fingers: [[6, 3], [5, 5], [4, 3], [3, 3], [2, 3], [1, 3]], barres: [{ fromString: 6, toString: 1, fret: 3 }], position: 3, title: "Gm7" },
  "Bm7":  { fingers: [[6, "x"], [5, 2], [4, 0], [3, 2], [2, 0], [1, 2]], barres: [], position: 1, title: "Bm7" },
  "C#m7": { fingers: [[6, "x"], [5, 4], [4, 6], [3, 4], [2, 5], [1, 4]], barres: [{ fromString: 5, toString: 1, fret: 4 }], position: 4, title: "C#m7" },
  "F#m7": { fingers: [[6, 2], [5, 4], [4, 2], [3, 2], [2, 2], [1, 2]], barres: [{ fromString: 6, toString: 1, fret: 2 }], position: 1, title: "F#m7" },
  "G#m7": { fingers: [[6, 4], [5, 6], [4, 4], [3, 4], [2, 4], [1, 4]], barres: [{ fromString: 6, toString: 1, fret: 4 }], position: 3, title: "G#m7" },
  "A#m7": { fingers: [[6, "x"], [5, 1], [4, 3], [3, 1], [2, 2], [1, 1]], barres: [{ fromString: 5, toString: 1, fret: 1 }], position: 1, title: "A#m7" },
  "D#m7": { fingers: [[6, "x"], [5, 6], [4, 8], [3, 6], [2, 7], [1, 6]], barres: [{ fromString: 5, toString: 1, fret: 6 }], position: 6, title: "D#m7" },

  // Sus chords
  "Dsus2": { fingers: [[6, "x"], [5, "x"], [4, 0], [3, 2], [2, 3], [1, 0]], barres: [], position: 1, title: "Dsus2" },
  "Dsus4": { fingers: [[6, "x"], [5, "x"], [4, 0], [3, 2], [2, 3], [1, 3]], barres: [], position: 1, title: "Dsus4" },
  "Asus2": { fingers: [[6, "x"], [5, 0], [4, 2], [3, 2], [2, 0], [1, 0]], barres: [], position: 1, title: "Asus2" },
  "Asus4": { fingers: [[6, "x"], [5, 0], [4, 2], [3, 2], [2, 3], [1, 0]], barres: [], position: 1, title: "Asus4" },
  "Esus4": { fingers: [[6, 0], [5, 2], [4, 2], [3, 2], [2, 0], [1, 0]], barres: [], position: 1, title: "Esus4" },

  // Power chords
  "E5":   { fingers: [[6, 0], [5, 2], [4, 2], [3, "x"], [2, "x"], [1, "x"]], barres: [], position: 1, title: "E5" },
  "A5":   { fingers: [[6, "x"], [5, 0], [4, 2], [3, "x"], [2, "x"], [1, "x"]], barres: [], position: 1, title: "A5" },
  "G5":   { fingers: [[6, 3], [5, 5], [4, 5], [3, "x"], [2, "x"], [1, "x"]], barres: [], position: 3, title: "G5" },
  "D5":   { fingers: [[6, "x"], [5, 5], [4, 7], [3, "x"], [2, "x"], [1, "x"]], barres: [], position: 5, title: "D5" },

  // Diminished
  "Bdim": { fingers: [[6, "x"], [5, 2], [4, 3], [3, 4], [2, 3], [1, "x"]], barres: [], position: 1, title: "Bdim" },

  // Augmented
  "Caug": { fingers: [[6, "x"], [5, 3], [4, 2], [3, 1], [2, 1], [1, 0]], barres: [], position: 1, title: "Caug" },
  "Eaug": { fingers: [[6, 0], [5, 3], [4, 2], [3, 1], [2, 0], [1, "x"]], barres: [], position: 1, title: "Eaug" },
};

export function getChordDiagram(chordName: string): ChordDiagram | null {
  return CHORD_DIAGRAMS[chordName] ?? null;
}
