"use client";

import { useState, useRef, useCallback } from "react";
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
  const [status, setStatus] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [notes, setNotes] = useState<NoteEventTime[] | null>(null);
  const [noteNames, setNoteNames] = useState<string[] | null>(null);
  const [voicings, setVoicings] = useState<ChordVoicing[] | null>(null);
  const [chords, setChords] = useState<ChromaChordEvent[] | null>(null);
  const [viewMode, setViewMode] = useState<"chords" | "frets" | "tab">("chords");
  const [selectedChord, setSelectedChord] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    setNotes(null);
    setVoicings(null);
    setChords(null);
    setFileName(file.name);
    setProgress(0);
    setStatus("Decoding audio...");

    const arrayBuffer = await file.arrayBuffer();
    const audioCtx = new AudioContext({ sampleRate: 22050 });
    const decoded = await audioCtx.decodeAudioData(arrayBuffer);

    const monoData = new Float32Array(decoded.length);
    for (let ch = 0; ch < decoded.numberOfChannels; ch++) {
      const channelData = decoded.getChannelData(ch);
      for (let i = 0; i < decoded.length; i++) {
        monoData[i] += channelData[i] / decoded.numberOfChannels;
      }
    }
    const audioBuffer = audioCtx.createBuffer(1, monoData.length, 22050);
    audioBuffer.copyToChannel(monoData, 0);

    setStatus("Running model...");

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
        setProgress(Math.round(pct * 100));
        setStatus("Transcribing...");
      }
    );

    const result = noteFramesToTime(
      addPitchBendsToNoteEvents(
        contours,
        outputToNotesPoly(frames, onsets, 0.25, 0.25, 5)
      )
    );

    const filtered = result.filter((note) => {
      return note.amplitude > 0.65 && note.durationSeconds > 0.15;
    });

    const fretVoicings = mapNotesToFretboard(filtered);
    const chromaChords = detectChordsFromAudio(monoData, 22050);

    setNotes(filtered.slice(0, 20));
    setVoicings(fretVoicings);
    setChords(chromaChords);
    setProgress(100);
    setStatus(`${result.length} notes detected, ${filtered.length} after filtering`);
    setNoteNames(midiToNoteName(filtered));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await processFile(file);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const hasResults = voicings || chords;

  const viewTabs: { key: "chords" | "frets" | "tab"; label: string }[] = [
    { key: "chords", label: "Chords" },
    { key: "frets", label: "Fret Details" },
    { key: "tab", label: "Tab" },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
            </div>
            <span className="text-sm font-semibold tracking-tight text-zinc-100">GuitarLens</span>
          </div>
          {fileName && (
            <span className="text-xs text-zinc-500 font-mono truncate max-w-[200px]">
              {fileName}
            </span>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-10">
        {/* Upload area — shown prominently when no results, compact when results exist */}
        {!hasResults ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
            <div className="text-center space-y-3">
              <h1 className="text-3xl font-bold tracking-tight text-zinc-100">
                Transcribe your guitar audio
              </h1>
              <p className="text-zinc-500 text-sm max-w-md">
                Upload a recording and get chords, tablature, and fret positions powered by AI
              </p>
            </div>

            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`
                w-full max-w-lg border-2 border-dashed rounded-xl p-12
                flex flex-col items-center gap-4 cursor-pointer
                transition-all duration-200
                ${isDragging
                  ? "border-violet-500 bg-violet-500/5"
                  : "border-zinc-800 hover:border-zinc-600 bg-zinc-900/50 hover:bg-zinc-900"}
              `}
            >
              <div className={`
                w-12 h-12 rounded-full flex items-center justify-center
                transition-colors duration-200
                ${isDragging ? "bg-violet-500/10 text-violet-400" : "bg-zinc-800 text-zinc-400"}
              `}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm text-zinc-300">
                  Drop your audio file here, or <span className="text-violet-400">browse</span>
                </p>
                <p className="text-xs text-zinc-600 mt-1">MP3, WAV, or M4A</p>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".mp3,.wav,.m4a"
              onChange={handleFileChange}
              className="hidden"
            />

            {status && (
              <div className="flex flex-col items-center gap-3 w-full max-w-lg">
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  {progress < 100 && (
                    <svg className="animate-spin h-3.5 w-3.5 text-violet-400" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                  <span>{status}</span>
                </div>
                {progress > 0 && progress < 100 && (
                  <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-violet-500 h-full rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Compact upload row + status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-violet-400 hover:text-violet-300 transition-colors font-medium"
                >
                  Upload new file
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".mp3,.wav,.m4a"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {status && (
                  <span className="text-xs text-zinc-500">{status}</span>
                )}
              </div>
            </div>

            {/* View mode tabs */}
            <div className="flex gap-1 bg-zinc-900 p-1 rounded-lg w-fit">
              {viewTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setViewMode(tab.key)}
                  className={`
                    px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-150
                    ${viewMode === tab.key
                      ? "bg-zinc-800 text-zinc-100 shadow-sm"
                      : "text-zinc-500 hover:text-zinc-300"}
                  `}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Chords view */}
            {viewMode === "chords" && chords && chords.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {chords.map((c, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedChord(c.chordName)}
                    className="group relative flex flex-col items-center rounded-xl bg-zinc-900 border border-zinc-800/50 px-4 py-5 transition-all duration-150 hover:bg-zinc-800/80 hover:border-zinc-700"
                  >
                    <span className="text-xl font-bold text-zinc-100 group-hover:text-violet-300 transition-colors">
                      {c.chordName}
                    </span>
                    <span className="text-[11px] text-zinc-500 font-mono mt-2">
                      {c.startTime.toFixed(1)}s – {c.endTime.toFixed(1)}s
                    </span>
                    <div className="mt-2 flex items-center gap-1">
                      <div className="h-1 w-8 rounded-full bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-violet-500/70"
                          style={{ width: `${c.confidence * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-zinc-600">
                        {Math.round(c.confidence * 100)}%
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Frets view */}
            {viewMode === "frets" && voicings && voicings.length > 0 && (
              <div className="rounded-xl border border-zinc-800/50 overflow-hidden">
                <div className="overflow-auto max-h-[600px]">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-zinc-900 z-10">
                      <tr className="border-b border-zinc-800">
                        <th className="py-3 px-4 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Time</th>
                        <th className="py-3 px-4 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Notes</th>
                        <th className="py-3 px-4 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Fret Positions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                      {voicings.map((v, i) => (
                        <tr key={i} className="hover:bg-zinc-900/50 transition-colors">
                          <td className="py-2.5 px-4 font-mono text-zinc-400 whitespace-nowrap text-xs">
                            {v.startTime.toFixed(2)}s
                          </td>
                          <td className="py-2.5 px-4 text-zinc-300">
                            {v.positions.map(p => p.noteName).join("  ")}
                          </td>
                          <td className="py-2.5 px-4 font-mono">
                            <div className="flex flex-wrap gap-x-4 gap-y-1">
                              {v.positions.map((p, j) => (
                                <span key={j} className="inline-flex items-center gap-1">
                                  <span className="text-zinc-600 text-xs">{p.stringName}</span>
                                  {p.fret === 0 ? (
                                    <span className="text-emerald-400 text-xs font-medium">open</span>
                                  ) : (
                                    <span className="text-zinc-300 text-xs">fret <span className="text-violet-400 font-medium">{p.fret}</span></span>
                                  )}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab view */}
            {viewMode === "tab" && voicings && voicings.length > 0 && (() => {
              const tabData = buildTabGrid(voicings);
              const LINE_SIZE = 16;
              const totalCols = tabData.times.length;
              const lineCount = Math.ceil(totalCols / LINE_SIZE);

              return (
                <div className="rounded-xl border border-zinc-800/50 bg-zinc-950 overflow-auto max-h-[600px]">
                  <div className="p-5 space-y-6">
                    {Array.from({ length: lineCount }, (_, lineIdx) => {
                      const start = lineIdx * LINE_SIZE;
                      const end = Math.min(start + LINE_SIZE, totalCols);

                      return (
                        <div key={lineIdx}>
                          {/* Time markers */}
                          <div className="flex font-mono text-[10px] text-zinc-600 mb-1">
                            <span className="w-6 shrink-0" />
                            {tabData.times.slice(start, end).map((t, i) => (
                              <span key={i} className="w-10 text-center shrink-0">
                                {t.toFixed(1)}s
                              </span>
                            ))}
                          </div>
                          {/* Tab strings */}
                          {tabData.strings.map((s, row) => (
                            <div key={row} className="flex font-mono leading-snug text-sm">
                              <span className="w-6 text-right pr-1.5 text-zinc-600 shrink-0 font-bold text-xs">
                                {s.label}
                              </span>
                              <span className="text-zinc-700">|</span>
                              {s.frets.slice(start, end).map((fret, col) => (
                                <span
                                  key={col}
                                  className={`w-10 text-center shrink-0 ${
                                    fret === null
                                      ? "text-zinc-800"
                                      : fret === 0
                                        ? "text-emerald-400 font-bold"
                                        : "text-violet-300 font-bold"
                                  }`}
                                >
                                  {fret === null ? "—" : fret}
                                </span>
                              ))}
                              <span className="text-zinc-700">|</span>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </main>

      {selectedChord && (
        <ChordChart chordName={selectedChord} onClose={() => setSelectedChord(null)} />
      )}
    </div>
  );
}
