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
        color: "#e4e4e7",
        backgroundColor: "transparent",
        barreChordRadius: 0.3,
        fontFamily: "system-ui, sans-serif",
        titleColor: "#e4e4e7",
        stringColor: "#52525b",
        fretColor: "#52525b",
        fretLabelColor: "#71717a",
        tuningsFontSize: 28,
        fingerSize: 0.65,
        fingerColor: "#8b5cf6",
        fingerTextColor: "#ffffff",
        barreChordStrokeColor: "#8b5cf6",
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative rounded-2xl bg-zinc-900 border border-zinc-800 p-8 shadow-2xl shadow-black/50"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-4 text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <h2 className="text-center text-2xl font-bold text-zinc-100 mb-4">{chordName}</h2>
        {diagram ? (
          <div ref={containerRef} className="w-[250px] h-[300px]" />
        ) : (
          <p className="text-zinc-500 text-sm px-6 py-10 text-center">
            No diagram available for <span className="text-zinc-300 font-medium">{chordName}</span>
          </p>
        )}
      </div>
    </div>
  );
}
