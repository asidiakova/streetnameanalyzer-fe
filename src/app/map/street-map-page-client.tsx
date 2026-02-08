"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import type { Mappings, NormalizedGroup } from "@/types/mappings";

const StreetMap = dynamic(
  () => import("@/components/street-map").then((m) => ({ default: m.StreetMap })),
  { ssr: false, loading: () => <div className="grid h-full w-full place-items-center bg-zinc-100">Loading map…</div> }
);

const TOP_GROUPS_LIMIT = 100;

export function StreetMapPageClient() {
  const [mappings, setMappings] = useState<Mappings | null>(null);
  const [activeMethod, setActiveMethod] = useState<string>("suffix_stripping");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/mappings")
      .then((r) => r.json())
      .then((data: Mappings) => {
        setMappings(data);
        const keys = Object.keys(data);
        if (keys.length > 0) setActiveMethod((prev) => (keys.includes(prev) ? prev : keys[0]));
      })
      .catch(() => setMappings(null));
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
      <aside className="flex w-80 shrink-0 flex-col border-r border-zinc-200 bg-white">
        <div className="shrink-0 border-b border-zinc-200 p-4">
          <label htmlFor="normalization-method" className="mb-1.5 block text-xs font-medium text-zinc-500">
            Normalization method
          </label>
          <select
            id="normalization-method"
            value={activeMethod}
            onChange={(e) => {
              setActiveMethod(e.target.value);
              clearHighlight();
            }}
            className="w-full rounded border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900"
          >
            {mappings
              ? Object.keys(mappings).map((key) => (
                  <option key={key} value={key}>
                    {key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                  </option>
                ))
              : (
                  <option value="suffix_stripping">Suffix stripping</option>
                )}
          </select>
        </div>
        <div className="flex-1 overflow-y-auto p-4 pt-3">
          <h2 className="mb-3 text-sm font-semibold text-zinc-500">
            Normalized streets (by length)
          </h2>
          <ul className="space-y-2">
            {sortedGroups.map(([canonical, group]) => {
              const isSelected = selectedGroupId === canonical;
              return (
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
                    isSelected
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
                  {!isSelected && group.variants.length > 1 && (
                    <div className="mt-1 text-xs text-zinc-400">
                      {group.variants.length} variant{group.variants.length !== 1 ? "s" : ""}
                    </div>
                  )}
                  {isSelected && group.variants.length > 0 && (
                    <div className="mt-2 border-t border-zinc-200 pt-2">
                      <div className="mb-1.5 text-xs font-medium text-zinc-500">
                        All variants ({group.variants.length})
                      </div>
                      <ul className="max-h-40 space-y-0.5 overflow-y-auto text-xs text-zinc-600">
                        {group.variants.map((v) => (
                          <li key={v} className="truncate py-0.5">
                            {v}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </aside>
      <main className="min-w-0 flex-1">
        <StreetMap selectedVariants={selectedVariants} className="h-full w-full" />
      </main>
    </div>
  );
}
