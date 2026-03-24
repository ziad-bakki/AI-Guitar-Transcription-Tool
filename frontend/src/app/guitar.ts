import { NoteEventTime } from "@spotify/basic-pitch";

// Standard tuning: string 6 (low E) to string 1 (high E)
const STANDARD_TUNING = [40, 45, 50, 55, 59, 64]; // MIDI values
const STRING_NAMES = ["E2", "A2", "D3", "G3", "B3", "E4"];
const MAX_FRET = 20;
const MAX_HAND_SPAN = 4; // max fret spread in a single chord position

export interface FretPosition {
  string: number;    // 0-5 (0 = low E, 5 = high E)
  stringName: string;
  fret: number;      // 0 = open
  midiNote: number;
  noteName: string;
}

export interface ChordVoicing {
  positions: FretPosition[];
  startTime: number;
  endTime: number;
  score: number;
}

/**
 * Find all possible fret positions for a given MIDI note.
 */
export function getCandidatePositions(midiNote: number): FretPosition[] {
  const candidates: FretPosition[] = [];
  for (let s = 0; s < STANDARD_TUNING.length; s++) {
    const fret = midiNote - STANDARD_TUNING[s];
    if (fret >= 0 && fret <= MAX_FRET) {
      candidates.push({
        string: s,
        stringName: STRING_NAMES[s],
        fret,
        midiNote,
        noteName: pitchToNoteName(midiNote),
      });
    }
  }
  return candidates;
}

function pitchToNoteName(pitch: number): string {
  const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const octave = Math.floor(pitch / 12) - 1;
  return names[pitch % 12] + octave;
}

/**
 * Remove re-detections of notes that are still ringing from a previous onset.
 * BasicPitch often splits a sustained note into multiple shorter events.
 * If a note with the same pitch starts while a prior detection is still
 * sounding (or within a small tolerance), keep only the first occurrence
 * and extend its duration.
 */
function deduplicateSustains(notes: NoteEventTime[]): NoteEventTime[] {
  if (notes.length === 0) return [];

  const sorted = [...notes].sort((a, b) => a.startTimeSeconds - b.startTimeSeconds);

  // Track the latest active note per MIDI pitch
  const activeByPitch = new Map<number, NoteEventTime>();
  const result: NoteEventTime[] = [];

  for (const note of sorted) {
    const active = activeByPitch.get(note.pitchMidi);
    const activeEnd = active
      ? active.startTimeSeconds + active.durationSeconds
      : -Infinity;

    // If a previous detection of this exact pitch is still ringing
    // (or ended within a small tolerance), it's a sustain re-detection —
    // extend the original rather than creating a new note.
    if (active && note.startTimeSeconds <= activeEnd + 0.3) {
      const newEnd = Math.max(
        activeEnd,
        note.startTimeSeconds + note.durationSeconds
      );
      (active as { durationSeconds: number }).durationSeconds =
        newEnd - active.startTimeSeconds;
    } else {
      // Genuine new onset — clone so we can safely mutate duration
      const clone = { ...note };
      result.push(clone);
      activeByPitch.set(note.pitchMidi, clone);
    }
  }

  return result;
}

/**
 * Group notes into chords based on overlapping start times.
 * Notes starting within `threshold` seconds of each other form a group.
 */
export function groupNotesIntoChords(
  notes: NoteEventTime[],
  threshold = 0.25
): NoteEventTime[][] {
  const deduplicated = deduplicateSustains(notes);
  if (deduplicated.length === 0) return [];

  const sorted = [...deduplicated].sort((a, b) => a.startTimeSeconds - b.startTimeSeconds);
  const groups: NoteEventTime[][] = [[sorted[0]]];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const lastGroup = groups[groups.length - 1];
    const groupStart = lastGroup[0].startTimeSeconds;

    if (current.startTimeSeconds - groupStart <= threshold) {
      lastGroup.push(current);
    } else {
      groups.push([current]);
    }
  }

  // Deduplicate: for each pitch class, keep only the loudest note (removes harmonics/overtones)
  // Then cap at 6 notes (max 6 strings)
  return groups.map(g => {
    const sorted = g.sort((a, b) => b.amplitude - a.amplitude);
    const seenPitchClass = new Set<number>();
    const deduped: NoteEventTime[] = [];
    for (const note of sorted) {
      const pc = note.pitchMidi % 12;
      if (!seenPitchClass.has(pc)) {
        seenPitchClass.add(pc);
        deduped.push(note);
      }
    }
    return deduped.slice(0, 6);
  });
}

/**
 * Score a voicing assignment. Higher = better.
 */
function scoreVoicing(
  positions: FretPosition[],
  prevVoicing: FretPosition[] | null
): number {
  let score = 0;

  // Reward open strings
  for (const p of positions) {
    if (p.fret === 0) score += 3;
  }

  // Penalize wide hand span
  const fretted = positions.filter(p => p.fret > 0);
  if (fretted.length > 1) {
    const frets = fretted.map(p => p.fret);
    const span = Math.max(...frets) - Math.min(...frets);
    if (span > MAX_HAND_SPAN) {
      score -= 50; // heavily penalize impossible stretches
    } else {
      score -= span * 2; // mild penalty for wider spans
    }
  }

  // Prefer lower fret positions (closer to nut)
  const avgFret = positions.reduce((sum, p) => sum + p.fret, 0) / positions.length;
  score -= avgFret * 0.5;

  // Reward proximity to previous voicing (minimize hand movement)
  if (prevVoicing && prevVoicing.length > 0) {
    const prevFretted = prevVoicing.filter(p => p.fret > 0);
    if (prevFretted.length > 0 && fretted.length > 0) {
      const prevCenter = prevFretted.reduce((s, p) => s + p.fret, 0) / prevFretted.length;
      const curCenter = fretted.reduce((s, p) => s + p.fret, 0) / fretted.length;
      score -= Math.abs(prevCenter - curCenter) * 1.5;
    }
  }

  return score;
}

/**
 * Find the optimal fret assignment for a group of simultaneous notes.
 * Uses backtracking to try all valid string assignments, then picks the best.
 */
export function findOptimalVoicing(
  midiNotes: number[],
  prevVoicing: FretPosition[] | null
): FretPosition[] {
  // For each note, get candidate positions
  const allCandidates = midiNotes.map(midi => getCandidatePositions(midi));

  // If any note has no candidates, it's out of guitar range — skip it
  const validIndices = allCandidates
    .map((c, i) => (c.length > 0 ? i : -1))
    .filter(i => i >= 0);

  if (validIndices.length === 0) return [];

  const filteredCandidates = validIndices.map(i => allCandidates[i]);

  let bestAssignment: FretPosition[] = [];
  let bestScore = -Infinity;

  // Backtracking: assign each note to a string, no two notes on same string
  function backtrack(noteIdx: number, current: FretPosition[], usedStrings: Set<number>) {
    if (noteIdx === filteredCandidates.length) {
      const s = scoreVoicing(current, prevVoicing);
      if (s > bestScore) {
        bestScore = s;
        bestAssignment = [...current];
      }
      return;
    }

    for (const candidate of filteredCandidates[noteIdx]) {
      if (usedStrings.has(candidate.string)) continue;

      usedStrings.add(candidate.string);
      current.push(candidate);
      backtrack(noteIdx + 1, current, usedStrings);
      current.pop();
      usedStrings.delete(candidate.string);
    }
  }

  backtrack(0, [], new Set());
  return bestAssignment;
}

/**
 * Main entry: takes detected notes and returns optimized chord voicings.
 */
/**
 * Get the sorted pitch class set for a voicing (used to detect duplicates).
 */
function getPitchClassKey(positions: FretPosition[]): string {
  return positions
    .map(p => p.midiNote % 12)
    .sort((a, b) => a - b)
    .join(",");
}

/**
 * Merge consecutive voicings that share the same pitch classes.
 * A ringing chord produces repeated detections — collapse them into one
 * voicing with an extended time range. Allows a small gap between
 * consecutive detections to account for detection jitter.
 */
function mergeConsecutiveVoicings(
  voicings: ChordVoicing[],
  maxGap = 0.5
): ChordVoicing[] {
  if (voicings.length === 0) return [];

  const merged: ChordVoicing[] = [voicings[0]];

  for (let i = 1; i < voicings.length; i++) {
    const prev = merged[merged.length - 1];
    const cur = voicings[i];

    const prevKey = getPitchClassKey(prev.positions);
    const curKey = getPitchClassKey(cur.positions);
    const gap = cur.startTime - prev.endTime;

    if (prevKey === curKey && gap <= maxGap) {
      // Same pitch classes, extend the previous voicing
      prev.endTime = Math.max(prev.endTime, cur.endTime);
    } else {
      merged.push(cur);
    }
  }

  return merged;
}

/**
 * Main entry: takes detected notes and returns optimized chord voicings.
 */
export function mapNotesToFretboard(notes: NoteEventTime[]): ChordVoicing[] {
  const groups = groupNotesIntoChords(notes);
  const voicings: ChordVoicing[] = [];
  let prevPositions: FretPosition[] | null = null;

  for (const group of groups) {
    const midiNotes = group.map(n => n.pitchMidi);
    const positions = findOptimalVoicing(midiNotes, prevPositions);

    // Sort by string for consistent display
    positions.sort((a, b) => a.string - b.string);

    const startTime = Math.min(...group.map(n => n.startTimeSeconds));
    const endTime = Math.max(...group.map(n => n.startTimeSeconds + n.durationSeconds));

    voicings.push({
      positions,
      startTime,
      endTime,
      score: 0,
    });

    prevPositions = positions;
  }

  return mergeConsecutiveVoicings(voicings);
}
