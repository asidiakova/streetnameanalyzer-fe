"use client";

import { useState } from "react";
import { StreetMapPageClient } from "./map/street-map-page-client";
import { StatisticsPageClient } from "./statistics/statistics-page-client";
import { DictionaryPageClient } from "./dictionary/dictionary-page-client";
import type { Mappings } from "@/types/mappings";
import type { Evaluation } from "@/types/evaluation";

type View = "map" | "statistics" | "dictionary";

const NAV_ITEMS: { id: View; label: string }[] = [
  { id: "map", label: "Map" },
  { id: "statistics", label: "Statistics" },
  { id: "dictionary", label: "Dictionary" },
];

export function HomeClient({
  mappings,
  evaluation,
}: {
  mappings: Mappings;
  evaluation: Evaluation;
}) {
  const [view, setView] = useState<View>("map");

  return (
    <div className="flex h-screen w-full flex-col">
      <header className="flex shrink-0 items-center gap-2 border-b border-zinc-200 bg-white px-4 py-2">
        <nav className="flex gap-1" aria-label="Main">
          {NAV_ITEMS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setView(id)}
              className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                view === id
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              }`}
            >
              {label}
            </button>
          ))}
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

      {view === "dictionary" && (
        <div className="min-h-0 flex-1 overflow-hidden">
          <DictionaryPageClient mappings={mappings} />
        </div>
      )}
    </div>
  );
}
