"use client";

import { useState, useRef, useEffect } from "react";
import { BasicPitch, noteFramesToTime, addPitchBendsToNoteEvents, outputToNotesPoly, NoteEventTime } from "@spotify/basic-pitch";



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
  const fileInputRef = useRef<HTMLInputElement>(null);



  const handlearraytonotes = (midi: NoteEventTime[]) => {
    console.log(midiToNoteName(midi))
  }

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
      return note.amplitude > 0.5   // drop low-confidence notes
        && note.durationSeconds > 0.05;         // drop tiny blips (< 50ms)
    });

    console.log("Raw notes:", result);
    console.log("First note:", result[0]);
    console.log("Total notes detected:", result.length);
    console.log("Filtered notes:", filtered.length);
    console.log("Type of:", typeof filtered)

    setNotes(filtered.slice(0, 20));
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
        <div className="flex justify-between items-center">
          {notes && (
            <><pre className="max-h-100 w-full max-w-2xl overflow-auto rounded bg-zinc-100 p-4 text-sm text-black dark:bg-zinc-900 dark:text-white">
              {notes.map((note, i) => (
                <div key={i}>{note.pitchMidi}</div>
              ))

              }
              {/* {notes ? JSON.stringify(notes, null, 2) : status} */}
            </pre><pre className="max-h-100 w-full max-w-2xl overflow-auto rounded bg-zinc-100 p-4 text-sm text-black dark:bg-zinc-900 dark:text-white">
                {noteNames?.map((note, i) => (
                  <div key={i}>{note}</div>
                ))}
              </pre></>
          )
          }
        </div>
      </main>
    </div>
  );
}
