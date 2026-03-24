"use client";

import { useState, useRef } from "react";
import { BasicPitch, noteFramesToTime, addPitchBendsToNoteEvents, outputToNotesPoly, NoteEventTime } from "@spotify/basic-pitch";
import { mapNotesToFretboard, ChordVoicing } from "./guitar";
import { detectChordsFromAudio, ChromaChordEvent } from "./chromaChords";
import { buildTabGrid } from "./tabGenerator";
import ChordChart from "./ChordChart";



function pitchToNoteName(pitch: number): string {
  const noteNames: string[] = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

  const octave: number = Math.floor(pitch / 12) - 1;

  const index = pitch % 12;

  return noteNames[index] + octave as string;

}

function midiToNoteName(midi: NoteEventTime[]): string[] {
  const pitches = midi.map(note => note.pitchMidi);
  const notes = pitches.map(pitch => pitchToNoteName(pitch));
  return notes;
}

export default function Home() {
  const [status, setStatus] = useState("Drop a file to see raw note events...");
  const [notes, setNotes] = useState<NoteEventTime[] | null>(null);
  const [noteNames, setNoteNames] = useState<string[] | null>(null);
  const [voicings, setVoicings] = useState<ChordVoicing[] | null>(null);
  const [chords, setChords] = useState<ChromaChordEvent[] | null>(null);
  const [viewMode, setViewMode] = useState<"chords" | "frets" | "tab">("chords");
  const [selectedChord, setSelectedChord] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setNotes(null);
    setStatus("Decoding audio...");

    const arrayBuffer = await file.arrayBuffer();
    const audioCtx = new AudioContext({ sampleRate: 22050 });
    const decoded = await audioCtx.decodeAudioData(arrayBuffer);

    // Mix down to mono
    const monoData = new Float32Array(decoded.length);
    for (let ch = 0; ch < decoded.numberOfChannels; ch++) {
      const channelData = decoded.getChannelData(ch);
      for (let i = 0; i < decoded.length; i++) {
        monoData[i] += channelData[i] / decoded.numberOfChannels;
      }
    }
    const audioBuffer = audioCtx.createBuffer(1, monoData.length, 22050);
    audioBuffer.copyToChannel(monoData, 0);

    setStatus("Running model (this takes a moment)...");

    const basicPitch = new BasicPitch("https://unpkg.com/@spotify/basic-pitch@1.0.1/model/model.json");
    const frames: number[][] = [];
    const onsets: number[][] = [];
    const contours: number[][] = [];

    await basicPitch.evaluateModel(
      audioBuffer,
      (f: number[][], o: number[][], c: number[][]) => {
        frames.push(...f);
        onsets.push(...o);
        contours.push(...c);
      },
      (pct: number) => {
        setStatus(`Transcribing... ${Math.round(pct * 100)}%`);
      }
    );

    const result = noteFramesToTime(
      addPitchBendsToNoteEvents(
        contours,
        outputToNotesPoly(frames, onsets, 0.25, 0.25, 5)
      )
    );

    const filtered = result.filter((note) => {
      return note.amplitude > 0.65   // drop low-confidence notes
        && note.durationSeconds > 0.15;         // drop tiny blips (< 150ms)
    });

    console.log("Raw notes:", result);
    console.log("First note:", result[0]);
    console.log("Total notes detected:", result.length);
    console.log("Filtered notes:", filtered.length);
    console.log("Type of:", typeof filtered)

    const fretVoicings = mapNotesToFretboard(filtered);
    console.log("Voicings:", fretVoicings);

    // Chroma-based chord detection directly from audio
    const chromaChords = detectChordsFromAudio(monoData, 22050);
    console.log("Chroma chords:", chromaChords);

    setNotes(filtered.slice(0, 20));
    setVoicings(fretVoicings);
    setChords(chromaChords);
    setStatus(`Done — ${result.length} notes detected (${filtered.length} after filtering)`);
    setNoteNames(midiToNoteName(filtered))
  };



  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <main className="flex flex-col items-center gap-6 p-16">
        <h1 className="text-2xl font-semibold text-black dark:text-white">
          basic-pitch experiment
        </h1>
        {/* <button onClick={handlePitchToNote}>Log</button> */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".mp3,.wav,.m4a"
          onChange={handleFileChange}
          className="text-sm text-zinc-600 dark:text-zinc-400"
        />
        {(voicings || chords) && (
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode("chords")}
              className={`px-3 py-1 rounded text-sm ${viewMode === "chords" ? "bg-zinc-800 text-white dark:bg-white dark:text-black" : "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"}`}
            >
              Chords
            </button>
            <button
              onClick={() => setViewMode("frets")}
              className={`px-3 py-1 rounded text-sm ${viewMode === "frets" ? "bg-zinc-800 text-white dark:bg-white dark:text-black" : "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"}`}
            >
              Fret Details
            </button>
            <button
              onClick={() => setViewMode("tab")}
              className={`px-3 py-1 rounded text-sm ${viewMode === "tab" ? "bg-zinc-800 text-white dark:bg-white dark:text-black" : "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"}`}
            >
              Tab
            </button>
          </div>
        )}

        {viewMode === "chords" && chords && chords.length > 0 && (
          <div className="w-full max-w-3xl overflow-auto max-h-[600px] rounded bg-zinc-100 p-4 text-sm text-black dark:bg-zinc-900 dark:text-white">
            <div className="flex flex-wrap gap-3">
              {chords.map((c, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center rounded bg-zinc-200 dark:bg-zinc-800 px-4 py-3 min-w-[80px] cursor-pointer hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
                  onClick={() => setSelectedChord(c.chordName)}
                >
                  <span className="text-lg font-bold">{c.chordName}</span>
                  <span className="text-xs text-zinc-500 font-mono mt-1">
                    {c.startTime.toFixed(1)}s – {c.endTime.toFixed(1)}s
                  </span>
                  <span className="text-xs text-zinc-400 mt-0.5">
                    {Math.round(c.confidence * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {viewMode === "frets" && voicings && voicings.length > 0 && (
          <div className="w-full max-w-3xl overflow-auto max-h-[600px] rounded bg-zinc-100 p-4 text-sm text-black dark:bg-zinc-900 dark:text-white">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-zinc-300 dark:border-zinc-700">
                  <th className="py-1 px-2 text-left">Time</th>
                  <th className="py-1 px-2 text-left">Notes</th>
                  <th className="py-1 px-2 text-left">Fret Positions</th>
                </tr>
              </thead>
              <tbody>
                {voicings.map((v, i) => (
                  <tr key={i} className="border-b border-zinc-200 dark:border-zinc-800">
                    <td className="py-1 px-2 font-mono whitespace-nowrap">
                      {v.startTime.toFixed(2)}s
                    </td>
                    <td className="py-1 px-2">
                      {v.positions.map(p => p.noteName).join(" ")}
                    </td>
                    <td className="py-1 px-2 font-mono">
                      {v.positions.map((p, j) => (
                        <span key={j} className="inline-block mr-3">
                          <span className="text-zinc-500">{p.stringName}</span>
                          {" "}
                          {p.fret === 0 ? (
                            <span className="text-green-600 dark:text-green-400">open</span>
                          ) : (
                            <span>fret {p.fret}</span>
                          )}
                        </span>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {viewMode === "tab" && voicings && voicings.length > 0 && (() => {
          const tabData = buildTabGrid(voicings);
          // Split into lines of 16 columns for readability
          const LINE_SIZE = 16;
          const totalCols = tabData.times.length;
          const lineCount = Math.ceil(totalCols / LINE_SIZE);

          return (
            <div className="w-full max-w-4xl overflow-auto max-h-[600px] rounded bg-zinc-100 p-4 text-sm text-black dark:bg-zinc-900 dark:text-white">
              {Array.from({ length: lineCount }, (_, lineIdx) => {
                const start = lineIdx * LINE_SIZE;
                const end = Math.min(start + LINE_SIZE, totalCols);

                return (
                  <div key={lineIdx} className="mb-6">
                    {/* Time markers */}
                    <div className="flex font-mono text-[10px] text-zinc-400 mb-0.5">
                      <span className="w-5 shrink-0" />
                      {tabData.times.slice(start, end).map((t, i) => (
                        <span key={i} className="w-10 text-center shrink-0">
                          {t.toFixed(1)}s
                        </span>
                      ))}
                    </div>
                    {/* Tab grid */}
                    {tabData.strings.map((s, row) => (
                      <div key={row} className="flex font-mono leading-tight">
                        <span className="w-5 text-right pr-1 text-zinc-500 shrink-0 font-bold">
                          {s.label}
                        </span>
                        <span className="text-zinc-600 dark:text-zinc-500">|</span>
                        {s.frets.slice(start, end).map((fret, col) => (
                          <span
                            key={col}
                            className={`w-10 text-center shrink-0 ${
                              fret === null
                                ? "text-zinc-300 dark:text-zinc-700"
                                : fret === 0
                                  ? "text-green-600 dark:text-green-400 font-bold"
                                  : "text-white dark:text-amber-300 font-bold"
                            }`}
                          >
                            {fret === null ? "—" : fret}
                          </span>
                        ))}
                        <span className="text-zinc-600 dark:text-zinc-500">|</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          );
        })()}
      </main>
      {selectedChord && (
        <ChordChart chordName={selectedChord} onClose={() => setSelectedChord(null)} />
      )}
    </div>
  );
}
