"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import type { Mappings, NormalizedGroup } from "@/types/mappings";

const StreetMap = dynamic(
  () => import("@/components/street-map").then((m) => ({ default: m.StreetMap })),
  {
    ssr: false,
    loading: () => (
      <div className="grid w-full h-full place-items-center bg-zinc-100">
        Loading map…
      </div>
    ),
  }
);

const TOP_GROUPS_LIMIT = 100;

export function StreetMapPageClient() {
  const [mappings, setMappings] = useState<Mappings | null>(null);
  const [activeMethod, setActiveMethod] = useState<string>("suffix_stripping");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/mappings")
      .then((r) => r.json())
      .then((data: Mappings) => setMappings(data));
  }, []);

  const method = mappings?.[activeMethod];
  const sortedGroups = method
    ? (Object.entries(method.groups) as [string, NormalizedGroup][])
        .sort(([, a], [, b]) => b.total_length - a.total_length)
        .slice(0, TOP_GROUPS_LIMIT)
    : [];

  const selectedVariants =
    selectedGroupId && method
      ? method.groups[selectedGroupId]?.variants ?? null
      : null;

  const clearHighlight = () => setSelectedGroupId(null);

  return (
    <div className="flex h-screen w-full">
      <aside className="w-80 shrink-0 overflow-y-auto border-r border-zinc-200 bg-white p-4">
        <h2 className="mb-3 text-lg font-semibold text-zinc-900">
          Normalized streets (by length)
        </h2>
        {mappings && Object.keys(mappings).length > 1 && (
          <select
            value={activeMethod}
            onChange={(e) => {
              setActiveMethod(e.target.value);
              clearHighlight();
            }}
            className="mb-3 w-full rounded border border-zinc-200 px-2 py-1.5 text-sm"
          >
            {Object.keys(mappings).map((key) => (
              <option key={key} value={key}>
                {key.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        )}
        <ul className="space-y-2">
          {sortedGroups.map(([canonical, group]) => (
            <li
              key={canonical}
              role="button"
              tabIndex={0}
              onClick={() =>
                setSelectedGroupId((prev) => (prev === canonical ? null : canonical))
              }
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSelectedGroupId((prev) =>
                    prev === canonical ? null : canonical
                  );
                }
              }}
              className={`cursor-pointer rounded border p-2 text-sm transition-colors hover:bg-zinc-100 ${
                selectedGroupId === canonical
                  ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
                  : "border-zinc-100 bg-zinc-50/50"
              }`}
            >
              <div className="font-medium text-zinc-900">
                {group.representative}
              </div>
              <div className="mt-0.5 text-zinc-500">
                {group.total_length.toFixed(1)} km · {group.segment_count}{" "}
                segment{group.segment_count !== 1 ? "s" : ""}
              </div>
              {group.variants.length > 1 && (
                <div className="mt-1 text-xs text-zinc-400">
                  Variants: {group.variants.slice(0, 3).join(", ")}
                  {group.variants.length > 3 && " …"}
                </div>
              )}
            </li>
          ))}
        </ul>
      </aside>
      <main className="min-w-0 flex-1">
        <StreetMap selectedVariants={selectedVariants} className="h-full w-full" />
      </main>
    </div>
  );
}
