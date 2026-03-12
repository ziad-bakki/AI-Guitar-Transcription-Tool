/**
 * Chroma-based chord detection.
 *
 * Instead of detecting individual notes and guessing the chord,
 * this analyzes the raw audio's frequency spectrum directly:
 *   1. Window the audio into overlapping chunks
 *   2. FFT each chunk to get frequency bins
 *   3. Map frequency bins → 12 pitch classes (chroma vector)
 *   4. Match each chroma vector against chord templates
 *   5. Merge consecutive identical chords
 */

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

// ── Chord templates as chroma profiles ──────────────────────────────

interface ChordProfile {
  name: string;
  chroma: number[]; // 12-element array, 1 = note present
}

function buildChordProfiles(): ChordProfile[] {
  const shapes: { suffix: string; intervals: number[] }[] = [
    { suffix: "",      intervals: [0, 4, 7] },
    { suffix: "m",     intervals: [0, 3, 7] },
    { suffix: "7",     intervals: [0, 4, 7, 10] },
    { suffix: "maj7",  intervals: [0, 4, 7, 11] },
    { suffix: "m7",    intervals: [0, 3, 7, 10] },
    { suffix: "dim",   intervals: [0, 3, 6] },
    { suffix: "aug",   intervals: [0, 4, 8] },
    { suffix: "sus2",  intervals: [0, 2, 7] },
    { suffix: "sus4",  intervals: [0, 5, 7] },
    { suffix: "5",     intervals: [0, 7] },
  ];

  const profiles: ChordProfile[] = [];
  for (let root = 0; root < 12; root++) {
    for (const shape of shapes) {
      const chroma = new Array(12).fill(0);
      for (const interval of shape.intervals) {
        chroma[(root + interval) % 12] = 1;
      }
      profiles.push({
        name: NOTE_NAMES[root] + shape.suffix,
        chroma,
      });
    }
  }
  return profiles;
}

const CHORD_PROFILES = buildChordProfiles();

// ── FFT (radix-2 Cooley-Tukey) ─────────────────────────────────────

function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  // Bit-reversal permutation
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) {
      j ^= bit;
    }
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  // Butterfly
  for (let len = 2; len <= n; len <<= 1) {
    const halfLen = len >> 1;
    const angle = (-2 * Math.PI) / len;
    const wRe = Math.cos(angle);
    const wIm = Math.sin(angle);
    for (let i = 0; i < n; i += len) {
      let curRe = 1, curIm = 0;
      for (let j = 0; j < halfLen; j++) {
        const tRe = curRe * re[i + j + halfLen] - curIm * im[i + j + halfLen];
        const tIm = curRe * im[i + j + halfLen] + curIm * re[i + j + halfLen];
        re[i + j + halfLen] = re[i + j] - tRe;
        im[i + j + halfLen] = im[i + j] - tIm;
        re[i + j] += tRe;
        im[i + j] += tIm;
        const newCurRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = newCurRe;
      }
    }
  }
}

// ── Chroma extraction ───────────────────────────────────────────────

function computeChroma(samples: Float32Array, sampleRate: number, fftSize: number): number[] {
  // Zero-pad to fftSize
  const re = new Float64Array(fftSize);
  const im = new Float64Array(fftSize);

  // Apply Hann window
  const len = Math.min(samples.length, fftSize);
  for (let i = 0; i < len; i++) {
    const window = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (len - 1)));
    re[i] = samples[i] * window;
  }

  fft(re, im);

  // Compute magnitude spectrum
  const magnitudes = new Float64Array(fftSize / 2);
  for (let i = 0; i < fftSize / 2; i++) {
    magnitudes[i] = Math.sqrt(re[i] * re[i] + im[i] * im[i]);
  }

  // Map frequency bins to 12 pitch classes
  // Guitar range: ~80Hz (E2) to ~1200Hz (high frets on high E)
  const chroma = new Array(12).fill(0);
  const minFreq = 70;
  const maxFreq = 2000;

  for (let bin = 1; bin < fftSize / 2; bin++) {
    const freq = (bin * sampleRate) / fftSize;
    if (freq < minFreq || freq > maxFreq) continue;

    // Map frequency to pitch class
    // MIDI note = 69 + 12 * log2(freq / 440)
    const midi = 69 + 12 * Math.log2(freq / 440);
    const pitchClass = Math.round(midi) % 12;
    const pc = ((pitchClass % 12) + 12) % 12;

    chroma[pc] += magnitudes[bin];
  }

  // Normalize
  const max = Math.max(...chroma);
  if (max > 0) {
    for (let i = 0; i < 12; i++) {
      chroma[i] /= max;
    }
  }

  return chroma;
}

// ── Chord matching ──────────────────────────────────────────────────

function matchChord(chroma: number[]): { name: string; confidence: number } | null {
  // Check if there's enough energy (silence detection)
  const energy = chroma.reduce((sum, v) => sum + v, 0);
  if (energy < 0.5) return null;

  let bestName = "";
  let bestScore = -Infinity;

  for (const profile of CHORD_PROFILES) {
    // Cosine similarity between chroma and chord template
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < 12; i++) {
      dot += chroma[i] * profile.chroma[i];
      normA += chroma[i] * chroma[i];
      normB += profile.chroma[i] * profile.chroma[i];
    }
    const similarity = dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-10);

    if (similarity > bestScore) {
      bestScore = similarity;
      bestName = profile.name;
    }
  }

  // Require a minimum confidence
  if (bestScore < 0.5) return null;

  return { name: bestName, confidence: bestScore };
}

// ── Public API ──────────────────────────────────────────────────────

export interface ChromaChordEvent {
  chordName: string;
  confidence: number;
  startTime: number;
  endTime: number;
}

/**
 * Detect chords directly from raw audio using chroma analysis.
 *
 * @param monoSamples - mono audio samples (Float32Array)
 * @param sampleRate - sample rate (e.g. 22050)
 * @param windowSeconds - analysis window size in seconds (default 0.5s)
 * @param hopSeconds - hop between windows (default 0.25s)
 */
export function detectChordsFromAudio(
  monoSamples: Float32Array,
  sampleRate: number,
  windowSeconds = 0.5,
  hopSeconds = 0.25
): ChromaChordEvent[] {
  const windowSamples = Math.round(windowSeconds * sampleRate);
  const hopSamples = Math.round(hopSeconds * sampleRate);

  // FFT size = next power of 2
  let fftSize = 1;
  while (fftSize < windowSamples) fftSize <<= 1;

  const rawEvents: { name: string; confidence: number; time: number }[] = [];

  for (let offset = 0; offset + windowSamples <= monoSamples.length; offset += hopSamples) {
    const chunk = monoSamples.subarray(offset, offset + windowSamples);

    // RMS gate: skip windows that are too quiet (amp feedback, silence)
    let sumSq = 0;
    for (let i = 0; i < chunk.length; i++) sumSq += chunk[i] * chunk[i];
    const rms = Math.sqrt(sumSq / chunk.length);
    if (rms < 0.02) continue;

    const chroma = computeChroma(chunk, sampleRate, fftSize);
    const match = matchChord(chroma);

    if (match) {
      rawEvents.push({
        name: match.name,
        confidence: match.confidence,
        time: offset / sampleRate,
      });
    }
  }

  // Merge consecutive identical chords
  if (rawEvents.length === 0) return [];

  const merged: ChromaChordEvent[] = [];
  let current = rawEvents[0];
  let startTime = current.time;

  for (let i = 1; i < rawEvents.length; i++) {
    const ev = rawEvents[i];
    if (ev.name === current.name) {
      current = ev; // extend
    } else {
      merged.push({
        chordName: current.name,
        confidence: current.confidence,
        startTime,
        endTime: ev.time,
      });
      current = ev;
      startTime = ev.time;
    }
  }

  // Push last chord
  merged.push({
    chordName: current.name,
    confidence: current.confidence,
    startTime,
    endTime: current.time + windowSeconds,
  });

  // Filter out very short detections (< 0.4s — likely transient noise)
  return merged.filter(e => e.endTime - e.startTime >= 0.4);
}
