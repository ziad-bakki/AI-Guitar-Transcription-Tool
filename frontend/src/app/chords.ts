// Chord definitions as sets of pitch classes (0=C, 1=C#, ... 11=B)
// We match detected notes against these to identify chords.

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

interface ChordTemplate {
  name: string;
  root: number;       // pitch class 0-11
  intervals: number[]; // semitone intervals from root
}

// Build chord templates for all 12 roots
function buildChordTemplates(): ChordTemplate[] {
  const shapes: { suffix: string; intervals: number[] }[] = [
    { suffix: "",      intervals: [0, 4, 7] },         // major
    { suffix: "m",     intervals: [0, 3, 7] },         // minor
    { suffix: "7",     intervals: [0, 4, 7, 10] },     // dominant 7
    { suffix: "maj7",  intervals: [0, 4, 7, 11] },     // major 7
    { suffix: "m7",    intervals: [0, 3, 7, 10] },     // minor 7
    { suffix: "dim",   intervals: [0, 3, 6] },         // diminished
    { suffix: "aug",   intervals: [0, 4, 8] },         // augmented
    { suffix: "sus2",  intervals: [0, 2, 7] },         // sus2
    { suffix: "sus4",  intervals: [0, 5, 7] },         // sus4
    { suffix: "add9",  intervals: [0, 4, 7, 14] },     // add9
    { suffix: "5",     intervals: [0, 7] },             // power chord
  ];

  const templates: ChordTemplate[] = [];
  for (let root = 0; root < 12; root++) {
    for (const shape of shapes) {
      templates.push({
        name: NOTE_NAMES[root] + shape.suffix,
        root,
        intervals: shape.intervals.map(i => (root + i) % 12),
      });
    }
  }
  return templates;
}

const CHORD_TEMPLATES = buildChordTemplates();

/**
 * Given a set of MIDI note numbers, identify the most likely chord name.
 * Returns the chord name or null if no good match.
 */
export function identifyChord(midiNotes: number[]): string | null {
  if (midiNotes.length === 0) return null;
  if (midiNotes.length === 1) {
    return NOTE_NAMES[midiNotes[0] % 12];
  }

  // Extract unique pitch classes
  const pitchClasses = [...new Set(midiNotes.map(n => n % 12))];

  let bestMatch: string | null = null;
  let bestScore = -1;

  for (const template of CHORD_TEMPLATES) {
    const templateSet = new Set(template.intervals);

    // How many of our detected pitch classes are in this chord?
    const matched = pitchClasses.filter(pc => templateSet.has(pc)).length;
    // How many extra notes does the chord template have that we didn't detect?
    const missing = template.intervals.filter(i => !pitchClasses.includes(i)).length;
    // How many detected notes are NOT in the chord?
    const extra = pitchClasses.filter(pc => !templateSet.has(pc)).length;

    // Score: reward matches, penalize missing and extra
    const score = matched * 3 - missing * 1 - extra * 2;

    // Must match at least 2 pitch classes (or all if single note)
    if (matched >= Math.min(2, pitchClasses.length) && score > bestScore) {
      bestScore = score;
      bestMatch = template.name;
    }
  }

  // Require a reasonable match quality
  if (bestScore < pitchClasses.length) return null;

  return bestMatch;
}

export interface ChordEvent {
  chordName: string | null;
  startTime: number;
  endTime: number;
  midiNotes: number[];
}

/**
 * Takes voicings (with startTime/endTime/midiNotes) and merges consecutive
 * identical chords into single events with combined duration.
 */
export function mergeConsecutiveChords(
  groups: { startTime: number; endTime: number; midiNotes: number[] }[]
): ChordEvent[] {
  if (groups.length === 0) return [];

  const events: ChordEvent[] = [];

  for (const group of groups) {
    const chordName = identifyChord(group.midiNotes);
    const last = events[events.length - 1];

    // Merge if same chord and close in time (within 0.5s gap — covers ringing/sustain)
    if (last && last.chordName === chordName && chordName !== null
        && group.startTime - last.endTime < 0.5) {
      last.endTime = group.endTime;
    } else {
      events.push({
        chordName,
        startTime: group.startTime,
        endTime: group.endTime,
        midiNotes: group.midiNotes,
      });
    }
  }

  return events;
}
