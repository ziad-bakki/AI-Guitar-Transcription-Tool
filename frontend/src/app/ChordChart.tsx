"use client";

import { useEffect, useRef } from "react";
import { SVGuitarChord, ChordStyle } from "svguitar";
import { getChordDiagram } from "./chordDiagrams";

interface ChordChartProps {
  chordName: string;
  onClose: () => void;
}

export default function ChordChart({ chordName, onClose }: ChordChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const diagram = getChordDiagram(chordName);
    if (!diagram) return;

    // Clear previous render
    containerRef.current.innerHTML = "";

    const chart = new SVGuitarChord(containerRef.current);
    chart
      .configure({
        strings: 6,
        frets: 4,
        position: diagram.position,
        tuning: ["E", "A", "D", "G", "B", "e"],
        style: ChordStyle.normal,
        fretSize: 1.5,
        strokeWidth: 2,
        nutWidth: 10,
        color: "#ffffff",
        backgroundColor: "transparent",
        barreChordRadius: 0.3,
        fontFamily: "system-ui, sans-serif",
        titleColor: "#ffffff",
        stringColor: "#666",
        fretColor: "#666",
        fretLabelColor: "#999",
        tuningsFontSize: 28,
        fingerSize: 0.65,
        fingerColor: "#ffffff",
        fingerTextColor: "#000",
        barreChordStrokeColor: "#ffffff",
        sidePadding: 0.2,
        titleBottomMargin: 0,
      })
      .chord({
        fingers: diagram.fingers,
        barres: diagram.barres,
      })
      .draw();
  }, [chordName]);

  const diagram = getChordDiagram(chordName);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="relative rounded-lg bg-zinc-900 p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-2 right-3 text-zinc-400 hover:text-white text-xl"
        >
          x
        </button>
        <h2 className="text-center text-xl font-bold text-white mb-2">{chordName}</h2>
        {diagram ? (
          <div ref={containerRef} className="w-[250px] h-[300px]" />
        ) : (
          <p className="text-zinc-400 text-sm px-4 py-8">
            No diagram available for {chordName}
          </p>
        )}
      </div>
    </div>
  );
}
