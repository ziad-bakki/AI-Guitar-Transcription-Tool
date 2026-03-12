"use client";

import { useState, useRef } from "react";
import { BasicPitch, noteFramesToTime, addPitchBendsToNoteEvents, outputToNotesPoly, NoteEventTime } from "@spotify/basic-pitch";
import { mapNotesToFretboard, ChordVoicing, groupNotesIntoChords } from "./guitar";
import { mergeConsecutiveChords, ChordEvent } from "./chords";



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
  const [chords, setChords] = useState<ChordEvent[] | null>(null);
  const [viewMode, setViewMode] = useState<"chords" | "frets">("chords");
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

    // Build chord events from note groups
    const groups = groupNotesIntoChords(filtered);
    const chordGroups = groups.map(g => ({
      startTime: Math.min(...g.map(n => n.startTimeSeconds)),
      endTime: Math.max(...g.map(n => n.startTimeSeconds + n.durationSeconds)),
      midiNotes: g.map(n => n.pitchMidi),
    }));
    const chordEvents = mergeConsecutiveChords(chordGroups);
    console.log("Chords:", chordEvents);

    setNotes(filtered.slice(0, 20));
    setVoicings(fretVoicings);
    setChords(chordEvents);
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
          </div>
        )}

        {viewMode === "chords" && chords && chords.length > 0 && (
          <div className="w-full max-w-3xl overflow-auto max-h-[600px] rounded bg-zinc-100 p-4 text-sm text-black dark:bg-zinc-900 dark:text-white">
            <div className="flex flex-wrap gap-3">
              {chords.filter(c => c.chordName).map((c, i) => (
                <div key={i} className="flex flex-col items-center rounded bg-zinc-200 dark:bg-zinc-800 px-4 py-3 min-w-[80px]">
                  <span className="text-lg font-bold">{c.chordName}</span>
                  <span className="text-xs text-zinc-500 font-mono mt-1">
                    {c.startTime.toFixed(1)}s – {c.endTime.toFixed(1)}s
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
      </main>
    </div>
  );
}
