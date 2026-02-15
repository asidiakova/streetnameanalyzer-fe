"use client";

import { useState, useEffect } from "react";
import { StreetMapPageClient } from "./map/street-map-page-client";
import { StatisticsPageClient } from "./statistics/statistics-page-client";
import type { Mappings } from "@/types/mappings";
import type { Evaluation } from "@/types/evaluation";

type View = "map" | "statistics";

export default function Home() {
  const [view, setView] = useState<View>("map");
  const [mappings, setMappings] = useState<Mappings | null>(null);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);

  useEffect(() => {
    Promise.all([fetch("/api/mappings"), fetch("/api/evaluation")])
      .then(async ([mapRes, evalRes]) => {
        const [mapData, evalData] = await Promise.all([
          await mapRes.json() as Promise<Mappings>,
          await evalRes.json() as Promise<Evaluation>,
        ]);
        setMappings(mapData);
        setEvaluation(evalData);
      })
      .catch(() => {
        setMappings(null);
        setEvaluation(null);
      });
  }, []);

  if (mappings === null) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-zinc-100">
        <p className="text-zinc-600">Loading data…</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full flex-col">
      <header className="flex shrink-0 items-center gap-2 border-b border-zinc-200 bg-white px-4 py-2">
        <nav className="flex gap-1" aria-label="Main">
          <button
            type="button"
            onClick={() => setView("map")}
            className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
              view === "map"
                ? "bg-zinc-800 text-white"
                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
            }`}
          >
            Map
          </button>
          <button
            type="button"
            onClick={() => setView("statistics")}
            className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
              view === "statistics"
                ? "bg-zinc-800 text-white"
                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
            }`}
          >
            Statistics
          </button>
        </nav>
      </header>

      {view === "map" && (
        <div className="min-h-0 flex-1">
          <StreetMapPageClient mappings={mappings} evaluation={evaluation} />
        </div>
      )}

      {view === "statistics" && (
        <div className="min-h-0 flex-1 overflow-hidden">
          <StatisticsPageClient mappings={mappings} evaluation={evaluation} />
        </div>
      )}
    </div>
  );
}
