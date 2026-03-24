import { ChordVoicing, FretPosition } from "./guitar";

// Standard guitar tab string labels (high to low, display order)
const TAB_STRINGS = ["e", "B", "G", "D", "A", "E"];
// Maps display row index to guitar.ts string index (0=low E, 5=high E)
const DISPLAY_TO_STRING = [5, 4, 3, 2, 1, 0];

export interface TabColumn {
  /** Fret number per string (index 0=high e, 5=low E), null = not played */
  frets: (number | null)[];
  startTime: number;
  endTime: number;
  /** Original voicing this column came from */
  voicing: ChordVoicing;
}

export interface TabMeasure {
  columns: TabColumn[];
}

/**
 * Convert a ChordVoicing into a TabColumn.
 * Maps guitar.ts string indices (0=low E) to display indices (0=high e).
 */
function voicingToColumn(voicing: ChordVoicing): TabColumn {
  const frets: (number | null)[] = [null, null, null, null, null, null];

  for (const pos of voicing.positions) {
    // pos.string: 0=low E, 5=high E
    // display: 0=high e, 5=low E → displayIdx = 5 - pos.string
    const displayIdx = 5 - pos.string;
    frets[displayIdx] = pos.fret;
  }

  return {
    frets,
    startTime: voicing.startTime,
    endTime: voicing.endTime,
    voicing,
  };
}

/**
 * Format a fret number as a fixed-width string for tab alignment.
 * Single digits get padded, double digits don't.
 */
function formatFret(fret: number | null, maxWidth: number): string {
  if (fret === null) return "-".repeat(maxWidth);
  const s = fret.toString();
  // Pad with dashes on the right to match column width
  return s + "-".repeat(maxWidth - s.length);
}

/**
 * Convert voicings into structured tab columns, grouped into measures
 * based on time intervals.
 */
export function voicingsToTabData(
  voicings: ChordVoicing[],
  columnsPerMeasure = 16
): TabMeasure[] {
  if (voicings.length === 0) return [];

  const columns = voicings.map(voicingToColumn);
  const measures: TabMeasure[] = [];

  for (let i = 0; i < columns.length; i += columnsPerMeasure) {
    measures.push({
      columns: columns.slice(i, i + columnsPerMeasure),
    });
  }

  return measures;
}

/**
 * Render tab measures as ASCII text.
 * Each measure is a block of 6 lines (one per string).
 */
export function renderTabAscii(measures: TabMeasure[]): string {
  const lines: string[] = [];

  for (let m = 0; m < measures.length; m++) {
    const measure = measures[m];
    const { columns } = measure;

    // Determine max fret digit width per column for alignment
    const colWidths = columns.map((col) => {
      let maxDigits = 1;
      for (const f of col.frets) {
        if (f !== null && f >= 10) maxDigits = 2;
      }
      return maxDigits;
    });

    // Build each string line
    for (let row = 0; row < 6; row++) {
      let line = TAB_STRINGS[row] + "|";
      for (let c = 0; c < columns.length; c++) {
        line += formatFret(columns[c].frets[row], colWidths[c]) + "-";
      }
      line += "|";
      lines.push(line);
    }

    // Add timing line below
    const timingParts: string[] = [];
    for (let c = 0; c < columns.length; c++) {
      const t = columns[c].startTime.toFixed(1) + "s";
      timingParts.push(t.padEnd(colWidths[c] + 1));
    }
    lines.push("  " + timingParts.join(""));
    lines.push(""); // blank line between measures
  }

  return lines.join("\n");
}

/**
 * Build per-string fret sequences for the tab grid UI component.
 * Returns an array of 6 string rows (high e first), each containing
 * the fret values across all voicings.
 */
export function buildTabGrid(voicings: ChordVoicing[]): {
  strings: { label: string; frets: (number | null)[] }[];
  times: number[];
} {
  const columns = voicings.map(voicingToColumn);

  const strings = TAB_STRINGS.map((label, row) => ({
    label,
    frets: columns.map((col) => col.frets[row]),
  }));

  const times = columns.map((col) => col.startTime);

  return { strings, times };
}
