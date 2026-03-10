"use client";

import { useState, useRef } from "react";
import { BasicPitch, noteFramesToTime, addPitchBendsToNoteEvents, outputToNotesPoly } from "@spotify/basic-pitch";

export default function Home() {
  const [status, setStatus] = useState("Drop a file to see raw note events...");
  const [notes, setNotes] = useState<unknown[] | null>(null);
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

    console.log("Raw notes:", result);
    console.log("First note:", result[0]);
    console.log("Total notes detected:", result.length);

    setNotes(result.slice(0, 20));
    setStatus(`Done — ${result.length} notes detected`);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <main className="flex flex-col items-center gap-6 p-16">
        <h1 className="text-2xl font-semibold text-black dark:text-white">
          basic-pitch experiment
        </h1>
        <input
          ref={fileInputRef}
          type="file"
          accept=".mp3,.wav,.m4a"
          onChange={handleFileChange}
          className="text-sm text-zinc-600 dark:text-zinc-400"
        />
        <pre className="max-h-[600px] w-full max-w-2xl overflow-auto rounded bg-zinc-100 p-4 text-sm text-black dark:bg-zinc-900 dark:text-white">
          {notes ? JSON.stringify(notes, null, 2) : status}
        </pre>
      </main>
    </div>
  );
}
