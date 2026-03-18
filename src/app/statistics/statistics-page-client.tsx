"use client";

import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { Mappings } from "@/types/mappings";
import type { Evaluation } from "@/types/evaluation";
import {
  getTopGroupsByLength,
  getStreetCountDistribution,
  LENGTH_M_TO_KM,
} from "@/lib/stats";
import { formatMethodLabel } from "@/lib/format";
import { GroupTable } from "@/components/group-table";

const TOP_N_LENGTH = 20;
const BAR_COLORS = ["#3b82f6", "#8b5cf6", "#06b6d4", "#f59e0b", "#ef4444"];

const LENGTH_BUCKETS = [
  { label: "0–1", min: 0, max: 1 },
  { label: "1–5", min: 1, max: 5 },
  { label: "5–10", min: 5, max: 10 },
  { label: "10–50", min: 10, max: 50 },
  { label: "50–100", min: 50, max: 100 },
  { label: "100+", min: 100, max: Infinity },
];

const SCORE_BUCKETS = [
  { label: "0–10%", min: 0, max: 0.1 },
  { label: "10–20%", min: 0.1, max: 0.2 },
  { label: "20–30%", min: 0.2, max: 0.3 },
  { label: "30–40%", min: 0.3, max: 0.4 },
  { label: "40–50%", min: 0.4, max: 0.5 },
  { label: "50–60%", min: 0.5, max: 0.6 },
  { label: "60–70%", min: 0.6, max: 0.7 },
  { label: "70–80%", min: 0.7, max: 0.8 },
  { label: "80–90%", min: 0.8, max: 0.9 },
  { label: "90–100%", min: 0.9, max: 1.01 },
];

function hexToRgba(hex: string, opacity: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

type ChartTab = "length" | "streets" | "lengthDist" | "scores" | "collisionSize";

const CHART_TABS: { id: ChartTab; label: string }[] = [
  { id: "length", label: "Top groups by length" },
  { id: "streets", label: "Street count distribution" },
  { id: "lengthDist", label: "Length distribution" },
  { id: "scores", label: "Problem entity scores" },
  { id: "collisionSize", label: "Collision size" },
];

type TooltipPayload = ReadonlyArray<{ payload?: unknown }> | undefined;

export function StatisticsPageClient({
  mappings,
  evaluation,
}: {
  mappings: Mappings;
  evaluation: Evaluation;
}) {
  const [activeMethod, setActiveMethod] = useState(() =>
    Object.keys(mappings).length > 0 ? Object.keys(mappings)[0] : ""
  );
  const [chartTab, setChartTab] = useState<ChartTab>("length");
  const [selectedLengthGroupId, setSelectedLengthGroupId] = useState<
    string | null
  >(null);
  const [selectedStreetCount, setSelectedStreetCount] = useState<
    number | null
  >(null);
  const [selectedLengthBucket, setSelectedLengthBucket] = useState<
    string | null
  >(null);
  const [selectedScoreBucket, setSelectedScoreBucket] = useState<
    string | null
  >(null);
  const [selectedCollisionSize, setSelectedCollisionSize] = useState<
    number | null
  >(null);

  const method = mappings[activeMethod];

  const allMethods = useMemo(
    () =>
      Object.keys(mappings).map((key) => ({
        method: key,
        label: formatMethodLabel(key),
      })),
    [mappings]
  );

  const topByLength = useMemo(() => {
    const items = getTopGroupsByLength(method, TOP_N_LENGTH).map(
      ([id, g]) => ({
        name:
          g.representative.length > 25
            ? g.representative.slice(0, 24) + "…"
            : g.representative,
        fullName: g.representative,
        lengthKm: g.total_length / LENGTH_M_TO_KM,
        groupId: id,
      })
    );
    return items.reverse();
  }, [method]);

  const streetDist = useMemo(
    () => getStreetCountDistribution(method),
    [method]
  );

  const streetDistWithFill = useMemo(() => {
    const n = streetDist.length;
    return streetDist.map((d, i) => ({
      ...d,
      fill: hexToRgba(
        BAR_COLORS[1],
        0.85 + (0.15 * (n - i)) / Math.max(n, 1)
      ),
    }));
  }, [streetDist]);

  const groupsWithSelectedStreetCount = useMemo(() => {
    if (selectedStreetCount == null || !method) return [];
    return (
      Object.entries(method.groups) as [
        string,
        (typeof method.groups)[string],
      ][]
    ).filter(([, g]) => g.street_count === selectedStreetCount);
  }, [method, selectedStreetCount]);

  const lengthDistData = useMemo(() => {
    if (!method) return [];
    const counts = LENGTH_BUCKETS.map((b) => ({ ...b, count: 0 }));
    for (const g of Object.values(method.groups)) {
      const km = g.total_length / LENGTH_M_TO_KM;
      const bucket = counts.find((b) => km >= b.min && km < b.max);
      if (bucket) bucket.count++;
    }
    return counts.map((b) => ({ label: b.label, count: b.count }));
  }, [method]);

  const scoreDistData = useMemo(() => {
    const entities = evaluation[activeMethod]?.problem_entities;
    if (!entities?.length) return [];
    const counts = SCORE_BUCKETS.map((b) => ({ ...b, count: 0 }));
    for (const p of entities) {
      const bucket = counts.find((b) => p.score >= b.min && p.score < b.max);
      if (bucket) bucket.count++;
    }
    return counts.map((b) => ({ label: b.label, count: b.count }));
  }, [evaluation, activeMethod]);

  const collisionSizeData = useMemo(() => {
    const collisions = evaluation[activeMethod]?.collisions;
    if (!collisions?.length) return [];
    const counts: Record<number, number> = {};
    for (const c of collisions) {
      const size = c.entities.length;
      counts[size] = (counts[size] ?? 0) + 1;
    }
    return Object.entries(counts)
      .map(([k, v]) => ({ entityCount: Number(k), collisionCount: v }))
      .sort((a, b) => a.entityCount - b.entityCount);
  }, [evaluation, activeMethod]);

  const groupsInSelectedLengthBucket = useMemo(() => {
    if (!selectedLengthBucket || !method) return [];
    const bucket = LENGTH_BUCKETS.find((b) => b.label === selectedLengthBucket);
    if (!bucket) return [];
    return (
      Object.entries(method.groups) as [string, (typeof method.groups)[string]][]
    )
      .filter(([, g]) => {
        const km = g.total_length / LENGTH_M_TO_KM;
        return km >= bucket.min && km < bucket.max;
      })
      .sort(([, a], [, b]) => b.total_length - a.total_length);
  }, [method, selectedLengthBucket]);

  const entitiesInSelectedScoreBucket = useMemo(() => {
    if (!selectedScoreBucket) return [];
    const entities = evaluation[activeMethod]?.problem_entities;
    if (!entities) return [];
    const bucket = SCORE_BUCKETS.find((b) => b.label === selectedScoreBucket);
    if (!bucket) return [];
    return entities
      .filter((p) => p.score >= bucket.min && p.score < bucket.max)
      .sort((a, b) => a.score - b.score);
  }, [evaluation, activeMethod, selectedScoreBucket]);

  const collisionsWithSelectedSize = useMemo(() => {
    if (selectedCollisionSize == null) return [];
    const collisions = evaluation[activeMethod]?.collisions;
    if (!collisions) return [];
    return collisions.filter(
      (c) => c.entities.length === selectedCollisionSize
    );
  }, [evaluation, activeMethod, selectedCollisionSize]);

  const handleMethodChange = (key: string) => {
    setActiveMethod(key);
    setSelectedLengthGroupId(null);
    setSelectedStreetCount(null);
    setSelectedLengthBucket(null);
    setSelectedScoreBucket(null);
    setSelectedCollisionSize(null);
  };

  return (
    <div className="flex h-full flex-col overflow-auto bg-zinc-50 p-6">
      <div className="mb-6">
        <label
          htmlFor="statistics-method"
          className="mb-1.5 block text-sm font-medium text-zinc-700"
          title="Algorithm used to decide which street name spellings belong together"
        >
          Normalization method (for charts below)
        </label>
        <select
          id="statistics-method"
          value={activeMethod}
          onChange={(e) => handleMethodChange(e.target.value)}
          className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
        >
          {allMethods.map(({ method: key, label }) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-zinc-800">
          Summary (all methods)
        </h2>
        <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-sm">
          <table className="w-full min-w-lg text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50">
                <th className="px-4 py-3 font-medium text-zinc-700" title="Algorithm used to decide which street name spellings belong together">
                  Method
                </th>
                <th className="px-4 py-3 font-medium text-zinc-700 cursor-help" title="Wikidata entities (real-world people, places, or concepts) linked to street names in the evaluation dataset">
                  Total entities
                </th>
                <th className="px-4 py-3 font-medium text-zinc-700 cursor-help" title="Total number of distinct street name spellings across all entities">
                  Total variants
                </th>
                <th className="px-4 py-3 font-medium text-zinc-700 cursor-help" title="Number of normalized groups produced by this method">
                  Total groups
                </th>
                <th className="px-4 py-3 font-medium text-zinc-700 cursor-help" title="Percentage of entities whose name variants were correctly placed into a single group">
                  Grouping rate
                </th>
                <th className="px-4 py-3 font-medium text-zinc-700 cursor-help" title="Percentage of groups that incorrectly merged names of different entities">
                  Collision rate
                </th>
                <th className="px-4 py-3 font-medium text-zinc-700 cursor-help" title="Number of groups that contain names belonging to more than one real-world entity">
                  Colliding groups
                </th>
              </tr>
            </thead>
            <tbody>
              {allMethods.map(({ method: key, label }) => {
                const evalData = evaluation[key];
                return (
                  <tr
                    key={key}
                    className={`border-b border-zinc-100 last:border-0 ${
                      key === activeMethod ? "bg-blue-50/50" : ""
                    }`}
                  >
                    <td className="px-4 py-3 font-medium text-zinc-900">
                      {label}
                    </td>
                    <td className="px-4 py-3 text-zinc-700">
                      {evalData
                        ? evalData.total_entities.toLocaleString()
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-700">
                      {evalData
                        ? evalData.total_variants.toLocaleString()
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-700">
                      {evalData
                        ? evalData.total_groups.toLocaleString()
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-700">
                      {evalData
                        ? `${(evalData.grouping_rate * 100).toFixed(2)}%`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-700">
                      {evalData
                        ? `${(evalData.collision_rate * 100).toFixed(2)}%`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-700">
                      {evalData
                        ? evalData.colliding_groups.toLocaleString()
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-8 pb-12">
        <h2 className="mb-4 text-lg font-semibold text-zinc-800">Charts</h2>
        <div className="mb-4 flex gap-2">
          {CHART_TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setChartTab(id)}
              className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                chartTab === id
                  ? "bg-zinc-800 text-white"
                  : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="w-full rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
          {chartTab === "length" && (
            <>
              <p className="mb-3 text-xs text-zinc-500">
                Top groups ranked by total combined length of all their
                segments. Click a bar to see the name variants within
                that group.
              </p>
              <div className="h-96 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topByLength}
                    layout="vertical"
                    margin={{ left: 8, right: 24, top: 24, bottom: 12 }}
                  >
                    <XAxis
                      type="number"
                      unit=" km"
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={220}
                      interval={0}
                      tick={{ fontSize: 11, fill: "#52525b" }}
                      axisLine={false}
                      tickLine={false}
                      padding={{ top: 14, bottom: 14 }}
                    />
                    <Tooltip
                      content={({
                        payload,
                      }: {
                        payload: TooltipPayload;
                      }) => {
                        const p = payload?.[0]?.payload as
                          | { fullName: string; lengthKm: number }
                          | undefined;
                        if (!p) return null;
                        return (
                          <div className="rounded border border-zinc-200 bg-white px-3 py-2 text-sm shadow-lg">
                            <div className="font-medium text-zinc-900">
                              {p.fullName}
                            </div>
                            <div className="text-zinc-600">
                              {p.lengthKm.toFixed(2)} km
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Bar
                      dataKey="lengthKm"
                      fill={BAR_COLORS[0]}
                      radius={[0, 4, 4, 0]}
                      cursor="pointer"
                      onClick={(data) =>
                        setSelectedLengthGroupId(
                          (
                            data?.payload as
                              | { groupId?: string }
                              | undefined
                          )?.groupId ?? null
                        )
                      }
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {selectedLengthGroupId &&
                method?.groups[selectedLengthGroupId] && (
                  <div className="mt-4 border-t border-zinc-200 pt-4">
                    <h3 className="mb-2 text-sm font-semibold text-zinc-800">
                      Variants in this group
                    </h3>
                    <div className="overflow-x-auto rounded border border-zinc-200">
                      <table className="w-full min-w-md text-left text-sm">
                        <thead>
                          <tr className="border-b border-zinc-200 bg-zinc-50">
                            <th className="px-3 py-2 font-medium text-zinc-700">
                              Name
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {method.groups[
                            selectedLengthGroupId
                          ].variants.map((variantName, i) => (
                            <tr
                              key={`${variantName}-${i}`}
                              className="border-b border-zinc-100 last:border-0"
                            >
                              <td className="px-3 py-2 font-medium text-zinc-900">
                                {variantName}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
            </>
          )}

          {chartTab === "streets" && (
            <>
              <p className="mb-3 text-xs text-zinc-500">
                How many unique street names (name strings) each
                normalized group contains. A group with 1 street had no
                additional spellings merged; larger counts mean more
                variants were unified. Click a bar to see the groups
                with that street count.
              </p>
              <div className="h-96 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={streetDistWithFill}
                    margin={{
                      left: 24,
                      right: 24,
                      top: 24,
                      bottom: 48,
                    }}
                    barCategoryGap="15%"
                    barSize={32}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#e4e4e7"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="streetCount"
                      type="category"
                      tick={{ fontSize: 12, fill: "#52525b" }}
                      allowDecimals={false}
                      label={{
                        value: "Street count",
                        position: "insideBottom",
                        offset: -24,
                        style: { fill: "#71717a", fontSize: 12 },
                      }}
                    />
                    <YAxis
                      scale="log"
                      domain={[0.5, "auto"]}
                      tick={{ fontSize: 12, fill: "#52525b" }}
                      label={{
                        value: "Number of groups",
                        angle: -90,
                        position: "insideLeft",
                        style: { fill: "#71717a", fontSize: 12 },
                      }}
                    />
                    <Tooltip
                      content={({
                        payload,
                      }: {
                        payload: TooltipPayload;
                      }) => {
                        const p = payload?.[0]?.payload as
                          | {
                              streetCount: number;
                              groupCount: number;
                            }
                          | undefined;
                        if (!p) return null;
                        return (
                          <div className="rounded border border-zinc-200 bg-white px-3 py-2 text-sm shadow-lg">
                            <span className="text-zinc-600">
                              {p.streetCount} street
                              {p.streetCount !== 1 ? "s" : ""}:{" "}
                            </span>
                            <span className="font-medium">
                              {p.groupCount} group
                              {p.groupCount !== 1 ? "s" : ""}
                            </span>
                          </div>
                        );
                      }}
                    />
                    <Bar
                      dataKey="groupCount"
                      fill={BAR_COLORS[1]}
                      radius={[4, 4, 0, 0]}
                      cursor="pointer"
                      onClick={(data) =>
                        setSelectedStreetCount(
                          (
                            data?.payload as
                              | { streetCount?: number }
                              | undefined
                          )?.streetCount ?? null
                        )
                      }
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {selectedStreetCount != null &&
                groupsWithSelectedStreetCount.length > 0 && (
                  <div className="mt-4 border-t border-zinc-200 pt-4">
                    <h3 className="mb-2 text-sm font-semibold text-zinc-800">
                      Groups with {selectedStreetCount} street
                      {selectedStreetCount !== 1 ? "s" : ""} (
                      {groupsWithSelectedStreetCount.length})
                    </h3>
                    <GroupTable
                      groups={groupsWithSelectedStreetCount}
                    />
                  </div>
                )}
            </>
          )}

          {chartTab === "lengthDist" && (
            <>
              <p className="mb-3 text-xs text-zinc-500">
                Distribution of groups by their total combined segment
                length. Each bar represents a length range; the Y axis
                uses a logarithmic scale. Click a bar to see the groups
                in that range.
              </p>
              <div className="h-96 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={lengthDistData}
                    margin={{ left: 24, right: 24, top: 24, bottom: 48 }}
                    barCategoryGap="20%"
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#e4e4e7"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 12, fill: "#52525b" }}
                      label={{
                        value: "Total length (km)",
                        position: "insideBottom",
                        offset: -24,
                        style: { fill: "#71717a", fontSize: 12 },
                      }}
                    />
                    <YAxis
                      scale="log"
                      domain={[0.5, "auto"]}
                      tick={{ fontSize: 12, fill: "#52525b" }}
                      label={{
                        value: "Number of groups",
                        angle: -90,
                        position: "insideLeft",
                        style: { fill: "#71717a", fontSize: 12 },
                      }}
                    />
                    <Tooltip
                      content={({
                        payload,
                      }: {
                        payload: TooltipPayload;
                      }) => {
                        const p = payload?.[0]?.payload as
                          | { label: string; count: number }
                          | undefined;
                        if (!p) return null;
                        return (
                          <div className="rounded border border-zinc-200 bg-white px-3 py-2 text-sm shadow-lg">
                            <span className="text-zinc-600">
                              {p.label} km:{" "}
                            </span>
                            <span className="font-medium">
                              {p.count} group{p.count !== 1 ? "s" : ""}
                            </span>
                          </div>
                        );
                      }}
                    />
                    <Bar
                      dataKey="count"
                      fill={BAR_COLORS[2]}
                      radius={[4, 4, 0, 0]}
                      cursor="pointer"
                      minPointSize={5}
                      onClick={(data) =>
                        setSelectedLengthBucket(
                          (
                            data?.payload as { label?: string } | undefined
                          )?.label ?? null
                        )
                      }
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {selectedLengthBucket &&
                groupsInSelectedLengthBucket.length > 0 && (
                  <div className="mt-4 border-t border-zinc-200 pt-4">
                    <h3 className="mb-2 text-sm font-semibold text-zinc-800">
                      Groups with length {selectedLengthBucket} km (
                      {groupsInSelectedLengthBucket.length})
                    </h3>
                    <GroupTable groups={groupsInSelectedLengthBucket} />
                  </div>
                )}
            </>
          )}

          {chartTab === "scores" && (
            <>
            <p className="mb-3 text-xs text-zinc-500">
              Each entity (a real-world person, place, or concept from
              Wikidata) that a street is named after receives a score
              between 0 and 1 measuring how well its name variants were
              grouped. A score of 1 means all variants ended up in one
              group; lower scores indicate fragmentation. Click a bar
              to see the affected entities.
            </p>
            <div className="h-96 w-full">
              {scoreDistData.length === 0 ? (
                <div className="grid h-full place-items-center text-sm text-zinc-500">
                  No problem entities for this method.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={scoreDistData}
                    margin={{ left: 24, right: 24, top: 24, bottom: 48 }}
                    barCategoryGap="15%"
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#e4e4e7"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: "#52525b" }}
                      label={{
                        value: "Score range",
                        position: "insideBottom",
                        offset: -24,
                        style: { fill: "#71717a", fontSize: 12 },
                      }}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: "#52525b" }}
                      allowDecimals={false}
                      label={{
                        value: "Number of entities",
                        angle: -90,
                        position: "insideLeft",
                        style: { fill: "#71717a", fontSize: 12 },
                      }}
                    />
                    <Tooltip
                      content={({
                        payload,
                      }: {
                        payload: TooltipPayload;
                      }) => {
                        const p = payload?.[0]?.payload as
                          | { label: string; count: number }
                          | undefined;
                        if (!p) return null;
                        return (
                          <div className="rounded border border-zinc-200 bg-white px-3 py-2 text-sm shadow-lg">
                            <span className="text-zinc-600">
                              {p.label}:{" "}
                            </span>
                            <span className="font-medium">
                              {p.count} entit{p.count !== 1 ? "ies" : "y"}
                            </span>
                          </div>
                        );
                      }}
                    />
                    <Bar
                      dataKey="count"
                      fill={BAR_COLORS[3]}
                      radius={[4, 4, 0, 0]}
                      cursor="pointer"
                      onClick={(data) =>
                        setSelectedScoreBucket(
                          (
                            data?.payload as { label?: string } | undefined
                          )?.label ?? null
                        )
                      }
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
              {selectedScoreBucket &&
                entitiesInSelectedScoreBucket.length > 0 && (
                  <div className="mt-4 border-t border-zinc-200 pt-4">
                    <h3 className="mb-2 text-sm font-semibold text-zinc-800">
                      Problem entities with score {selectedScoreBucket} (
                      {entitiesInSelectedScoreBucket.length})
                    </h3>
                    <div className="rounded border border-zinc-200 bg-white overflow-x-auto">
                      <table className="w-full table-fixed text-left text-sm">
                        <thead className="bg-zinc-50">
                          <tr className="border-b border-zinc-200">
                            <th className="w-[35%] px-3 py-2 font-medium text-zinc-700">
                              Entity
                            </th>
                            <th className="w-[15%] px-3 py-2 font-medium text-zinc-700">
                              Score
                            </th>
                            <th className="w-[15%] px-3 py-2 font-medium text-zinc-700">
                              Variants
                            </th>
                            <th className="w-[15%] px-3 py-2 font-medium text-zinc-700">
                              Dominant
                            </th>
                            <th className="w-[20%] px-3 py-2 font-medium text-zinc-700">
                              Unique groups
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {entitiesInSelectedScoreBucket.map((p) => (
                            <tr
                              key={p.wikidata_id}
                              className="border-b border-zinc-100 last:border-0"
                            >
                              <td className="px-3 py-2 font-medium text-zinc-900">
                                {p.entity_label}
                              </td>
                              <td className="px-3 py-2 text-zinc-700">
                                {(p.score * 100).toFixed(1)}%
                              </td>
                              <td className="px-3 py-2 text-zinc-700">
                                {p.total_variants}
                              </td>
                              <td className="px-3 py-2 text-zinc-700">
                                {p.dominant_count}
                              </td>
                              <td className="px-3 py-2 text-zinc-700">
                                {p.unique_groups}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
            </div>
            </>
          )}

          {chartTab === "collisionSize" && (
            <>
            <p className="mb-3 text-xs text-zinc-500">
              A collision happens when a group incorrectly merges names
              of different real-world entities. The &quot;size&quot; is
              how many distinct entities were merged into one group.
              Click a bar to see the affected collisions.
            </p>
            <div className="h-96 w-full">
              {collisionSizeData.length === 0 ? (
                <div className="grid h-full place-items-center text-sm text-zinc-500">
                  No collisions for this method.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={collisionSizeData}
                    margin={{ left: 24, right: 24, top: 24, bottom: 48 }}
                    barCategoryGap="20%"
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#e4e4e7"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="entityCount"
                      type="category"
                      tick={{ fontSize: 12, fill: "#52525b" }}
                      label={{
                        value: "Entities per collision",
                        position: "insideBottom",
                        offset: -24,
                        style: { fill: "#71717a", fontSize: 12 },
                      }}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: "#52525b" }}
                      allowDecimals={false}
                      label={{
                        value: "Number of collisions",
                        angle: -90,
                        position: "insideLeft",
                        style: { fill: "#71717a", fontSize: 12 },
                      }}
                    />
                    <Tooltip
                      content={({
                        payload,
                      }: {
                        payload: TooltipPayload;
                      }) => {
                        const p = payload?.[0]?.payload as
                          | {
                              entityCount: number;
                              collisionCount: number;
                            }
                          | undefined;
                        if (!p) return null;
                        return (
                          <div className="rounded border border-zinc-200 bg-white px-3 py-2 text-sm shadow-lg">
                            <span className="text-zinc-600">
                              {p.entityCount} entit
                              {p.entityCount !== 1 ? "ies" : "y"}:{" "}
                            </span>
                            <span className="font-medium">
                              {p.collisionCount} collision
                              {p.collisionCount !== 1 ? "s" : ""}
                            </span>
                          </div>
                        );
                      }}
                    />
                    <Bar
                      dataKey="collisionCount"
                      fill={BAR_COLORS[4]}
                      radius={[4, 4, 0, 0]}
                      cursor="pointer"
                      onClick={(data) =>
                        setSelectedCollisionSize(
                          (
                            data?.payload as
                              | { entityCount?: number }
                              | undefined
                          )?.entityCount ?? null
                        )
                      }
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
              {selectedCollisionSize != null &&
                collisionsWithSelectedSize.length > 0 && (
                  <div className="mt-4 border-t border-zinc-200 pt-4">
                    <h3 className="mb-2 text-sm font-semibold text-zinc-800">
                      Collisions with {selectedCollisionSize} entit
                      {selectedCollisionSize !== 1 ? "ies" : "y"} (
                      {collisionsWithSelectedSize.length})
                    </h3>
                    <div className="rounded border border-zinc-200 bg-white overflow-x-auto">
                      <table className="w-full table-fixed text-left text-sm">
                        <thead className="bg-zinc-50">
                          <tr className="border-b border-zinc-200">
                            <th className="w-[35%] px-3 py-2 font-medium text-zinc-700">
                              Group
                            </th>
                            <th className="w-[65%] px-3 py-2 font-medium text-zinc-700">
                              Merged entities
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {collisionsWithSelectedSize.map((c) => {
                            const group =
                              method?.groups[c.group_id];
                            return (
                              <tr
                                key={c.group_id}
                                className="border-b border-zinc-100 last:border-0"
                              >
                                <td className="px-3 py-2 font-medium text-zinc-900">
                                  {group?.representative ?? c.group_id}
                                </td>
                                <td className="px-3 py-2 text-zinc-700">
                                  {c.entities
                                    .map((e) => e.label)
                                    .join(" · ")}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
            </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
