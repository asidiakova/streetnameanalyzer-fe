"use client";

import { useMemo, useState, useRef, useCallback } from "react";
import type { Mappings, NormalizedGroup } from "@/types/mappings";
import { formatMethodLabel } from "@/lib/format";
import { LENGTH_M_TO_KM } from "@/lib/stats";

const ALPHABET = "AÁÄBCČDĎEÉFGHIÍJKLĹĽMNŇOÓÔPQRŔSŠTŤUÚVWXYÝZŽ".split("");
const PAGE_SIZE = 100;

type DictEntry = {
  name: string;
  groupId: string;
  group: NormalizedGroup;
};

export function DictionaryPageClient({
  mappings,
}: {
  mappings: Mappings;
}) {
  const methods = useMemo(() => Object.keys(mappings), [mappings]);
  const [activeMethod, setActiveMethod] = useState(methods[0] ?? "");
  const [search, setSearch] = useState("");
  const [activeLetter, setActiveLetter] = useState<string | null>(null);
  const [expandedName, setExpandedName] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const listRef = useRef<HTMLDivElement>(null);

  const method = mappings[activeMethod];

  const allEntries = useMemo<DictEntry[]>(() => {
    if (!method) return [];
    const entries: DictEntry[] = [];
    for (const [name, groupId] of Object.entries(method.mapping)) {
      const group = method.groups[groupId];
      if (group) entries.push({ name, groupId, group });
    }
    entries.sort((a, b) =>
      a.name.localeCompare(b.name, "sk", { sensitivity: "base" })
    );
    return entries;
  }, [method]);

  const availableLetters = useMemo(() => {
    const first = new Set<string>();
    for (const e of allEntries) {
      const ch = e.name[0]?.toUpperCase();
      if (ch) first.add(ch);
    }
    return first;
  }, [allEntries]);

  const filtered = useMemo(() => {
    let result = allEntries;
    if (activeLetter) {
      result = result.filter(
        (e) => e.name[0]?.toUpperCase() === activeLetter
      );
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((e) => e.name.toLowerCase().includes(q));
    }
    return result;
  }, [allEntries, activeLetter, search]);

  const visible = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount]
  );

  const handleLetterClick = useCallback(
    (letter: string) => {
      setActiveLetter((prev) => (prev === letter ? null : letter));
      setVisibleCount(PAGE_SIZE);
      setExpandedName(null);
      listRef.current?.scrollTo({ top: 0 });
    },
    []
  );

  const handleMethodChange = useCallback((value: string) => {
    setActiveMethod(value);
    setSearch("");
    setActiveLetter(null);
    setExpandedName(null);
    setVisibleCount(PAGE_SIZE);
  }, []);

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    setActiveLetter(null);
    setVisibleCount(PAGE_SIZE);
    setExpandedName(null);
  }, []);

  const handleExportCsv = useCallback(() => {
    if (!method) return;
    const escape = (v: string) =>
      v.includes(",") || v.includes('"') || v.includes("\n")
        ? `"${v.replace(/"/g, '""')}"`
        : v;
    const rows = ["street_name,normalized_to"];
    for (const entry of allEntries) {
      rows.push(`${escape(entry.name)},${escape(entry.group.representative)}`);
    }
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dictionary_${activeMethod}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [method, allEntries, activeMethod]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-zinc-50">
      <div className="shrink-0 border-b border-zinc-200 bg-white px-6 py-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label
              htmlFor="dict-method"
              className="mb-1 block text-xs font-medium text-zinc-500"
              title="Algorithm used to decide which street name spellings belong together"
            >
              Normalization method
            </label>
            <select
              id="dict-method"
              value={activeMethod}
              onChange={(e) => handleMethodChange(e.target.value)}
              className="rounded border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900"
            >
              {methods.map((key) => (
                <option key={key} value={key}>
                  {formatMethodLabel(key)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[200px] max-w-md">
            <label htmlFor="dict-search" className="sr-only">
              Search street names
            </label>
            <input
              id="dict-search"
              type="text"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search street names…"
              className="w-full rounded border border-zinc-200 px-3 py-1.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
            />
          </div>

          <p className="text-xs text-zinc-500">
            {filtered.length.toLocaleString()} name
            {filtered.length !== 1 ? "s" : ""}
            {activeLetter ? ` starting with "${activeLetter}"` : ""}
            {search.trim() ? ` matching "${search.trim()}"` : ""}
          </p>

          <button
            type="button"
            onClick={handleExportCsv}
            className="ml-auto shrink-0 rounded border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            Export CSV
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-0.5">
          {ALPHABET.map((letter) => {
            const available = availableLetters.has(letter);
            const active = activeLetter === letter;
            return (
              <button
                key={letter}
                type="button"
                disabled={!available}
                onClick={() => handleLetterClick(letter)}
                className={`h-7 w-7 rounded text-xs font-medium transition-colors ${
                  active
                    ? "bg-zinc-800 text-white"
                    : available
                      ? "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                      : "bg-zinc-50 text-zinc-300 cursor-default"
                }`}
              >
                {letter}
              </button>
            );
          })}
          {activeLetter && (
            <button
              type="button"
              onClick={() => handleLetterClick(activeLetter)}
              className="ml-1 rounded px-2 text-xs text-zinc-500 hover:text-zinc-800"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto px-6 py-4">
        {visible.length === 0 ? (
          <p className="py-12 text-center text-sm text-zinc-500">
            No street names match your search.
          </p>
        ) : (
          <div className="space-y-px">
            {visible.map((entry) => {
              const isExpanded = expandedName === entry.name;
              return (
                <div key={entry.name}>
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedName((prev) =>
                        prev === entry.name ? null : entry.name
                      )
                    }
                    className={`flex w-full items-center gap-3 rounded px-3 py-2 text-left text-sm transition-colors ${
                      isExpanded
                        ? "bg-zinc-200/60"
                        : "hover:bg-zinc-100"
                    }`}
                  >
                    <span className="min-w-0 flex-1 truncate font-medium text-zinc-900">
                      {entry.name}
                    </span>
                    <span className="shrink-0 text-xs text-zinc-400">
                      {isExpanded ? "▼" : "▶"}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="mb-2 ml-3 rounded border border-zinc-200 bg-white p-3">
                      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                        <dt className="text-zinc-500">Group</dt>
                        <dd className="font-medium text-zinc-900">
                          {entry.group.representative}
                        </dd>
                        <dt className="text-zinc-500">Total length</dt>
                        <dd className="text-zinc-700">
                          {(
                            entry.group.total_length / LENGTH_M_TO_KM
                          ).toFixed(2)}{" "}
                          km
                        </dd>
                        <dt className="text-zinc-500">Streets</dt>
                        <dd className="text-zinc-700">
                          {entry.group.street_count.toLocaleString()}
                        </dd>
                        <dt className="text-zinc-500">Segments</dt>
                        <dd className="text-zinc-700">
                          {entry.group.segment_count.toLocaleString()}
                        </dd>
                        <dt className="self-start text-zinc-500">
                          Variants ({entry.group.variants.length})
                        </dt>
                        <dd className="text-zinc-700">
                          <div className="flex flex-wrap gap-1">
                            {entry.group.variants.map((v) => (
                              <span
                                key={v}
                                className={`inline-block rounded px-1.5 py-0.5 text-xs ${
                                  v === entry.name
                                    ? "bg-zinc-800 text-white"
                                    : "bg-zinc-100 text-zinc-700"
                                }`}
                              >
                                {v}
                              </span>
                            ))}
                          </div>
                        </dd>
                      </dl>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {visibleCount < filtered.length && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              className="rounded bg-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-300 transition-colors"
            >
              Show more ({Math.min(PAGE_SIZE, filtered.length - visibleCount)}{" "}
              of {(filtered.length - visibleCount).toLocaleString()} remaining)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
