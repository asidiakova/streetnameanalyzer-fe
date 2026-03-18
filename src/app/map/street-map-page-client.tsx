"use client";

import { useState, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import type { Mappings, NormalizedGroup } from "@/types/mappings";
import type { Evaluation, ProblemEntity } from "@/types/evaluation";
import { computeMethodStats, LENGTH_M_TO_KM } from "@/lib/stats";
import { formatMethodLabel } from "@/lib/format";

const StreetMap = dynamic(
  () =>
    import("@/components/street-map").then((m) => ({
      default: m.StreetMap,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-full w-full place-items-center bg-zinc-100">
        Loading map…
      </div>
    ),
  }
);

type TabId = "streets" | "collisions" | "problems";

const TABS: { id: TabId; label: string }[] = [
  { id: "streets", label: "Streets" },
  { id: "collisions", label: "Collisions" },
  { id: "problems", label: "Problem entities" },
];

function filterGroupsBySearch(
  entries: [string, NormalizedGroup][],
  search: string
): [string, NormalizedGroup][] {
  if (!search.trim()) return entries;
  const q = search.trim().toLowerCase();
  return entries.filter(([, g]) => {
    if (g.representative.toLowerCase().includes(q)) return true;
    return g.variants.some((v) => v.toLowerCase().includes(q));
  });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadJson(filename: string, data: unknown) {
  downloadBlob(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    filename
  );
}

function escapeCsvField(value: string): string {
  if (!/[\n",]/.test(value)) return value;
  return `"${value.replace(/"/g, '""')}"`;
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows
    .map((row) => row.map((cell) => escapeCsvField(String(cell))).join(","))
    .join("\n");
  downloadBlob(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
    filename
  );
}

function visibleGroupsToCsvRows(
  method: string,
  entries: [string, NormalizedGroup][]
): string[][] {
  const header = [
    "method",
    "group_id",
    "representative",
    "total_length_km",
    "segment_count",
    "variant_count",
    "variants",
  ];
  const dataRows = entries.map(([id, g]) => [
    method,
    id,
    g.representative,
    (g.total_length / LENGTH_M_TO_KM).toFixed(3),
    String(g.segment_count),
    String(g.variants.length),
    g.variants.join("; "),
  ]);
  return [header, ...dataRows];
}

function selectedGroupToCsvRows(
  method: string,
  groupId: string,
  group: NormalizedGroup
): string[][] {
  const header = [
    "method",
    "group_id",
    "representative",
    "total_length_km",
    "segment_count",
    "variant",
  ];
  const km = (group.total_length / LENGTH_M_TO_KM).toFixed(3);
  const dataRows = group.variants.map((variant) => [
    method,
    groupId,
    group.representative,
    km,
    String(group.segment_count),
    variant,
  ]);
  return [header, ...dataRows];
}

export function StreetMapPageClient({
  mappings,
  evaluation,
}: {
  mappings: Mappings;
  evaluation: Evaluation;
}) {
  const [activeMethod, setActiveMethod] = useState<string>("");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [focusClusterIndex, setFocusClusterIndex] = useState(0);
  const [focusTrigger, setFocusTrigger] = useState(0);
  const [clusterCount, setClusterCount] = useState(0);
  const [activeTab, setActiveTab] = useState<TabId>("streets");
  const [streetSearch, setStreetSearch] = useState("");
  const [problemSort, setProblemSort] = useState<"score" | "entity_label">(
    "score"
  );

  const methodKeys = Object.keys(mappings);
  const effectiveMethod =
    methodKeys.length > 0 && methodKeys.includes(activeMethod)
      ? activeMethod
      : methodKeys[0] ?? "";

  const method = mappings[effectiveMethod];
  const methodEval = evaluation[effectiveMethod];
  const computedStats = useMemo(
    () => computeMethodStats(method),
    [method]
  );

  const sortedGroupsAll = useMemo(() => {
    if (!method) return [];
    return (
      Object.entries(method.groups) as [string, NormalizedGroup][]
    ).sort(([, a], [, b]) => b.total_length - a.total_length);
  }, [method]);

  const collisionGroupIds = useMemo(() => {
    if (!methodEval) return new Set<string>();
    return new Set(methodEval.collisions.map((c) => c.group_id));
  }, [methodEval]);

  const displayStreetEntries = useMemo(
    () =>
      streetSearch.trim()
        ? filterGroupsBySearch(sortedGroupsAll, streetSearch)
        : sortedGroupsAll,
    [sortedGroupsAll, streetSearch]
  );

  const selectedGroup =
    selectedGroupId && method
      ? (method.groups[selectedGroupId] ?? null)
      : null;
  const selectedVariants = selectedGroup?.variants ?? null;

  const clearHighlight = useCallback(() => {
    setSelectedGroupId(null);
    setFocusClusterIndex(0);
  }, []);

  const toggleGroup = useCallback(
    (groupId: string) => {
      if (selectedGroupId === groupId) {
        setSelectedGroupId(null);
        setFocusClusterIndex(0);
      } else {
        setSelectedGroupId(groupId);
        setFocusClusterIndex(0);
        setFocusTrigger((t) => t + 1);
      }
    },
    [selectedGroupId]
  );

  const handleExportVisible = useCallback(() => {
    if (!method) return;
    const groups: Record<string, NormalizedGroup> = {};
    for (const [id, g] of displayStreetEntries) groups[id] = g;
    const filename = `street-groups-${effectiveMethod}-visible.json`;
    downloadJson(filename, { method: effectiveMethod, groups });
  }, [method, effectiveMethod, displayStreetEntries]);

  const handleExportSelected = useCallback(() => {
    if (!selectedGroupId || !method) return;
    const group = method.groups[selectedGroupId];
    if (!group) return;
    const filename = `street-group-${effectiveMethod}-${selectedGroupId}.json`;
    downloadJson(filename, {
      method: effectiveMethod,
      group_id: selectedGroupId,
      ...group,
    });
  }, [method, effectiveMethod, selectedGroupId]);

  const handleExportVisibleCsv = useCallback(() => {
    if (!method || displayStreetEntries.length === 0) return;
    const rows = visibleGroupsToCsvRows(effectiveMethod, displayStreetEntries);
    downloadCsv(`street-groups-${effectiveMethod}-visible.csv`, rows);
  }, [method, effectiveMethod, displayStreetEntries]);

  const handleExportSelectedCsv = useCallback(() => {
    if (!selectedGroupId || !method) return;
    const group = method.groups[selectedGroupId];
    if (!group) return;
    const rows = selectedGroupToCsvRows(
      effectiveMethod,
      selectedGroupId,
      group
    );
    downloadCsv(
      `street-group-${effectiveMethod}-${selectedGroupId}.csv`,
      rows
    );
  }, [method, effectiveMethod, selectedGroupId]);

  const sortedProblemEntities = useMemo(() => {
    if (!methodEval?.problem_entities) return [];
    const list = [...methodEval.problem_entities];
    if (problemSort === "score") list.sort((a, b) => a.score - b.score);
    else
      list.sort((a, b) =>
        a.entity_label.localeCompare(b.entity_label, "sk")
      );
    return list;
  }, [methodEval, problemSort]);

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden">
      <aside className="flex w-96 shrink-0 flex-col min-h-0 border-r border-zinc-200 bg-white">
        <div className="shrink-0 border-b border-zinc-200 p-4">
          <label
            htmlFor="normalization-method"
            className="mb-1.5 block text-xs font-medium text-zinc-500"
            title="Algorithm used to decide which street name spellings belong to the same real-world street"
          >
            Normalization method
          </label>
          <select
            id="normalization-method"
            value={effectiveMethod}
            onChange={(e) => {
              setActiveMethod(e.target.value);
              clearHighlight();
            }}
            className="w-full rounded border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900"
          >
            {Object.keys(mappings).map((key) => (
              <option key={key} value={key}>
                {formatMethodLabel(key)}
              </option>
            ))}
          </select>
        </div>

        {computedStats && (
          <div className="shrink-0 border-b border-zinc-200 p-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Summary
            </h3>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
              <dt className="text-zinc-500 cursor-help" title="Clusters of name variants that the normalization method considers the same street">Groups</dt>
              <dd className="font-medium text-zinc-900">
                {computedStats.totalGroups.toLocaleString()}
              </dd>
              <dt className="text-zinc-500 cursor-help" title="Unique name strings in the dataset — the same name in different cities counts separately">Streets</dt>
              <dd className="font-medium text-zinc-900">
                {computedStats.totalStreets.toLocaleString()}
              </dd>
              <dt className="text-zinc-500 cursor-help" title="Individual geometric line features from OpenStreetMap — a single street is split into many segments between intersections">Segments</dt>
              <dd className="font-medium text-zinc-900">
                {computedStats.totalSegments.toLocaleString()}
              </dd>
              <dt className="text-zinc-500 cursor-help" title="Combined length of all segments across all groups">Total length</dt>
              <dd className="font-medium text-zinc-900">
                {computedStats.totalLengthKm.toFixed(1)} km
              </dd>
              <dt className="text-zinc-500 cursor-help" title="Average number of unique name strings merged into each group">Avg streets/group</dt>
              <dd className="font-medium text-zinc-900">
                {computedStats.avgStreetsPerGroup}
              </dd>
              <dt className="text-zinc-500 cursor-help" title="Average geometric length of a single OSM segment">Avg length/segment</dt>
              <dd className="font-medium text-zinc-900">
                {computedStats.avgLengthPerSegmentM} m
              </dd>
              {methodEval && (
                <>
                  <dt className="text-zinc-500 cursor-help" title="Percentage of known Wikidata entities whose name variants were correctly placed into a single group">Grouping rate</dt>
                  <dd className="font-medium text-zinc-900">
                    {(methodEval.grouping_rate * 100).toFixed(1)}%
                  </dd>
                  <dt className="text-zinc-500 cursor-help" title="Percentage of groups that incorrectly merged distinct entities (e.g. two different people with similar names)">Collision rate</dt>
                  <dd className="font-medium text-zinc-900">
                    {(methodEval.collision_rate * 100).toFixed(1)}%
                  </dd>
                  <dt className="text-zinc-500 cursor-help" title="Number of groups that contain names belonging to more than one real-world entity">Colliding groups</dt>
                  <dd className="font-medium text-zinc-900">
                    {methodEval.colliding_groups}
                  </dd>
                  <dt className="text-zinc-500 cursor-help" title="Wikidata entities (real-world people, places, or concepts) whose street name variants were fragmented across multiple groups">Problem entities</dt>
                  <dd className="font-medium text-zinc-900">
                    {methodEval.problem_entities.length}
                  </dd>
                </>
              )}
            </dl>
          </div>
        )}

        <div className="flex shrink-0 gap-1 border-b border-zinc-200 px-2 pt-2">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTab === id
                  ? "bg-zinc-200 text-zinc-900"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === "streets" && (
            <>
              <p className="mb-3 text-xs text-zinc-500">
                Each item is a normalized group — a set of name variants
                (e.g. &quot;Štúrova&quot;, &quot;Ľ. Štúra&quot;) that
                the method considers the same street. Click a group to
                highlight its segments on the map.
              </p>
              <div className="mb-3">
                <label htmlFor="street-search" className="sr-only">
                  Search streets
                </label>
                <input
                  id="street-search"
                  type="search"
                  placeholder="Search by name or variant…"
                  value={streetSearch}
                  onChange={(e) => setStreetSearch(e.target.value)}
                  className="w-full rounded border border-zinc-200 px-2 py-1.5 text-sm text-zinc-900 placeholder:text-zinc-400"
                />
              </div>
              <h2 className="mb-2 text-sm font-semibold text-zinc-500">
                By length
                {streetSearch.trim()
                  ? ` (${displayStreetEntries.length} match)`
                  : ` (${displayStreetEntries.length} groups)`}
              </h2>
              <ul className="space-y-2">
                {displayStreetEntries.map(([canonical, group]) => {
                  const isSelected = selectedGroupId === canonical;
                  const isCollision = collisionGroupIds.has(canonical);
                  return (
                    <li
                      key={canonical}
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleGroup(canonical)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          toggleGroup(canonical);
                        }
                      }}
                      className={`cursor-pointer rounded border p-2 text-sm transition-colors hover:bg-zinc-100 ${
                        isSelected
                          ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
                          : "border-zinc-100 bg-zinc-50/50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-medium text-zinc-900 min-w-0 truncate">
                          {group.representative}
                        </span>
                        {isCollision && (
                          <span
                            className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800"
                            title="This group contains a collision (distinct entities merged)"
                          >
                            Collision
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 text-zinc-500">
                        {(group.total_length / LENGTH_M_TO_KM).toFixed(1)} km ·{" "}
                        {group.street_count} street
                        {group.street_count !== 1 ? "s" : ""} ·{" "}
                        {group.segment_count} segment
                        {group.segment_count !== 1 ? "s" : ""}
                      </div>
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
            </>
          )}

          {activeTab === "collisions" && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-zinc-500">
                Collisions ({methodEval?.collisions.length ?? 0})
              </h2>
              <p className="text-xs text-zinc-500">
                A collision occurs when the normalization method incorrectly
                groups names of different real-world entities (e.g. two
                different people) into one group. Click &quot;Show on
                map&quot; to highlight that group.
              </p>
              {!methodEval ? (
                <p className="text-xs text-zinc-500">
                  No evaluation data for this method.
                </p>
              ) : (
                <ul className="space-y-2">
                  {methodEval.collisions.map((collision) => {
                    const group = method?.groups[collision.group_id];
                    const rep =
                      group?.representative ?? collision.group_id;
                    const isSelected =
                      selectedGroupId === collision.group_id;
                    return (
                      <li
                        key={collision.group_id}
                        className={`rounded border p-2 text-sm ${
                          isSelected
                            ? "border-blue-500 bg-blue-50"
                            : "border-zinc-200 bg-zinc-50/50"
                        }`}
                      >
                        <div className="font-medium text-zinc-900">
                          {rep}
                        </div>
                        <div className="mt-1 text-xs text-zinc-500">
                          {collision.entities
                            .map((e) => e.label)
                            .join(" · ")}
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            toggleGroup(collision.group_id)
                          }
                          className="mt-2 rounded bg-zinc-200 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-300"
                        >
                          {isSelected ? "Clear map" : "Show on map"}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {activeTab === "problems" && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-zinc-500">
                Problem entities (
                {methodEval?.problem_entities.length ?? 0})
              </h2>
              <p className="text-xs text-zinc-500">
                An entity is a real-world person, place, or concept (from
                Wikidata) that a street is named after. Problem entities are
                those whose name variants were fragmented across multiple
                groups instead of being unified. A lower score means worse
                fragmentation.
              </p>
              {!methodEval ? (
                <p className="text-xs text-zinc-500">
                  No evaluation data for this method.
                </p>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="problem-sort"
                      className="text-xs text-zinc-500"
                    >
                      Sort by
                    </label>
                    <select
                      id="problem-sort"
                      value={problemSort}
                      onChange={(e) =>
                        setProblemSort(
                          e.target.value as "score" | "entity_label"
                        )
                      }
                      className="rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-900"
                    >
                      <option value="score">Score (worst first)</option>
                      <option value="entity_label">Name</option>
                    </select>
                  </div>
                  <ul className="space-y-1.5">
                    {sortedProblemEntities.map((p: ProblemEntity) => (
                      <li
                        key={p.wikidata_id}
                        className="rounded border border-zinc-100 bg-zinc-50/50 px-2 py-1.5 text-sm"
                      >
                        <div className="font-medium text-zinc-900">
                          {p.entity_label}
                        </div>
                        <div className="mt-0.5 flex gap-3 text-xs text-zinc-500">
                          <span>
                            Score: {(p.score * 100).toFixed(0)}%
                          </span>
                          <span>
                            {p.total_variants} variant
                            {p.total_variants !== 1 ? "s" : ""} →{" "}
                            {p.unique_groups} group
                            {p.unique_groups !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-zinc-200 p-4 flex flex-col gap-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleExportVisible}
              disabled={!method || displayStreetEntries.length === 0}
              className="flex-1 rounded border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              JSON
            </button>
            <button
              type="button"
              onClick={handleExportVisibleCsv}
              disabled={!method || displayStreetEntries.length === 0}
              className="flex-1 rounded border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              CSV
            </button>
          </div>
          <p className="text-xs text-zinc-500">Export visible groups</p>
          {selectedGroupId && (
            <>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleExportSelected}
                  className="flex-1 rounded border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  JSON
                </button>
                <button
                  type="button"
                  onClick={handleExportSelectedCsv}
                  className="flex-1 rounded border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  CSV
                </button>
              </div>
              <p className="text-xs text-zinc-500">
                Export selected group
              </p>
            </>
          )}
        </div>
      </aside>
      <main className="relative min-h-0 min-w-0 flex-1">
        <StreetMap
          selectedVariants={selectedVariants}
          focusClusterIndex={focusClusterIndex}
          focusTrigger={focusTrigger}
          onClusterCountChangeAction={setClusterCount}
          className="h-full w-full"
        />
        {selectedGroupId && clusterCount > 0 && (
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-zinc-200 bg-white/95 px-4 py-2 shadow-lg backdrop-blur-sm">
            <button
              type="button"
              onClick={() => {
                setFocusClusterIndex((i) =>
                  i - 1 < 0 ? clusterCount - 1 : i - 1
                );
                setFocusTrigger((t) => t + 1);
              }}
              className="rounded border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:pointer-events-none disabled:opacity-50"
            >
              Previous
            </button>
            <div className="flex flex-col items-center">
              <span className="max-w-56 truncate text-sm font-medium text-zinc-900">
                {selectedGroup?.representative}
              </span>
              <span className="text-xs text-zinc-500">
                Location {focusClusterIndex + 1} / {clusterCount}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setFocusClusterIndex((i) =>
                  i + 1 >= clusterCount ? 0 : i + 1
                );
                setFocusTrigger((t) => t + 1);
              }}
              className="rounded border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:pointer-events-none disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
