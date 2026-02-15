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
  getSegmentCountDistribution,
  getVariantCountDistribution,
  LENGTH_M_TO_KM,
} from "@/lib/stats";

const TOP_N_LENGTH = 20;
const BAR_COLORS = ["#3b82f6", "#8b5cf6", "#06b6d4"];

function hexToRgba(hex: string, opacity: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

function formatMethodLabel(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

type ChartTab = "length" | "segments" | "variants";

type TooltipPayload = ReadonlyArray<{ payload: unknown }> | undefined;

export function StatisticsPageClient({
  mappings,
  evaluation,
}: {
  mappings: Mappings;
  evaluation: Evaluation | null;
}) {
  const [activeMethod, setActiveMethod] = useState(() =>
    Object.keys(mappings).length > 0 ? Object.keys(mappings)[0] : ""
  );
  const [chartTab, setChartTab] = useState<ChartTab>("length");

  const methodKeys = Object.keys(mappings);
  const method = mappings[activeMethod];

  const allMethods = useMemo(
    () =>
      methodKeys.map((key) => ({
        method: key,
        label: formatMethodLabel(key),
      })),
    [methodKeys]
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

  const segmentDist = useMemo(
    () => getSegmentCountDistribution(method),
    [method]
  );

  const variantDist = useMemo(
    () => getVariantCountDistribution(method),
    [method]
  );

  const segmentDistWithFill = useMemo(() => {
    const n = segmentDist.length;
    return segmentDist.map((d, i) => ({
      ...d,
      fill: hexToRgba(
        BAR_COLORS[1],
        0.85 + (0.15 * (n - i)) / Math.max(n, 1)
      ),
    }));
  }, [segmentDist]);

  const variantDistWithFill = useMemo(() => {
    const n = variantDist.length;
    return variantDist.map((d, i) => ({
      ...d,
      fill: hexToRgba(
        BAR_COLORS[2],
        0.85 + (0.15 * (n - i)) / Math.max(n, 1)
      ),
    }));
  }, [variantDist]);

  const chartTabs: { id: ChartTab; label: string }[] = [
    { id: "length", label: "Top groups by length" },
    { id: "segments", label: "Segment count distribution" },
    { id: "variants", label: "Variants per group distribution" },
  ];

  return (
    <div className="flex h-full flex-col overflow-auto bg-zinc-50 p-6">
      <div className="mb-6">
        <label
          htmlFor="statistics-method"
          className="mb-1.5 block text-sm font-medium text-zinc-700"
        >
          Normalization method (for charts below)
        </label>
        <select
          id="statistics-method"
          value={activeMethod}
          onChange={(e) => setActiveMethod(e.target.value)}
          className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
        >
          {methodKeys.map((key) => (
            <option key={key} value={key}>
              {formatMethodLabel(key)}
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
                <th className="px-4 py-3 font-medium text-zinc-700">Method</th>
                <th className="px-4 py-3 font-medium text-zinc-700">
                  Total entities
                </th>
                <th className="px-4 py-3 font-medium text-zinc-700">
                  Total variants
                </th>
                <th className="px-4 py-3 font-medium text-zinc-700">
                  Total groups
                </th>
                <th className="px-4 py-3 font-medium text-zinc-700">
                  Grouping rate
                </th>
                <th className="px-4 py-3 font-medium text-zinc-700">
                  Collision rate
                </th>
                <th className="px-4 py-3 font-medium text-zinc-700">
                  Colliding groups
                </th>
              </tr>
            </thead>
            <tbody>
              {allMethods.map(({ method: key, label }) => {
                const evalData = evaluation?.[key];
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

      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-zinc-800">Charts</h2>
        <div className="mb-4 flex gap-2">
          {chartTabs.map(({ id, label }) => (
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

        <div className="h-100 w-full overflow-visible rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
          {chartTab === "length" && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topByLength}
                layout="vertical"
                margin={{ left: 8, right: 24, top: 24, bottom: 12 }}
              >
                <XAxis type="number" unit=" km" tick={{ fontSize: 12 }} />
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
                  content={({ payload }: { payload: TooltipPayload }) => {
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
                />
              </BarChart>
            </ResponsiveContainer>
          )}

          {chartTab === "segments" && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={segmentDistWithFill}
                margin={{ left: 24, right: 24, top: 24, bottom: 48 }}
                barCategoryGap="20%"
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e4e4e7"
                  vertical={false}
                />
                <XAxis
                  dataKey="segmentCount"
                  type="number"
                  tick={{ fontSize: 12, fill: "#52525b" }}
                  allowDecimals={false}
                  label={{
                    value: "Segment count",
                    position: "insideBottom",
                    offset: -24,
                    style: { fill: "#71717a", fontSize: 12 },
                  }}
                />
                <YAxis
                  scale="log"
                  domain={[1, "auto"]}
                  tick={{ fontSize: 12, fill: "#52525b" }}
                  label={{
                    value: "Number of groups",
                    angle: -90,
                    position: "insideLeft",
                    style: { fill: "#71717a", fontSize: 12 },
                  }}
                />
                <Tooltip
                  content={({ payload }: { payload: TooltipPayload }) => {
                    const p = payload?.[0]?.payload as
                      | { segmentCount: number; groupCount: number }
                      | undefined;
                    if (!p) return null;
                    return (
                      <div className="rounded border border-zinc-200 bg-white px-3 py-2 text-sm shadow-lg">
                        <span className="text-zinc-600">
                          {p.segmentCount} segment{p.segmentCount !== 1 ? "s" : ""}:{" "}
                        </span>
                        <span className="font-medium">{p.groupCount} groups</span>
                      </div>
                    );
                  }}
                />
                <Bar
                  dataKey="groupCount"
                  fill={BAR_COLORS[1]}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}

          {chartTab === "variants" && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={variantDistWithFill}
                margin={{ left: 24, right: 24, top: 24, bottom: 48 }}
                barCategoryGap="20%"
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e4e4e7"
                  vertical={false}
                />
                <XAxis
                  dataKey="variantCount"
                  type="number"
                  tick={{ fontSize: 12, fill: "#52525b" }}
                  allowDecimals={false}
                  label={{
                    value: "Variant count",
                    position: "insideBottom",
                    offset: -24,
                    style: { fill: "#71717a", fontSize: 12 },
                  }}
                />
                <YAxis
                  scale="log"
                  domain={[1, "auto"]}
                  tick={{ fontSize: 12, fill: "#52525b" }}
                  label={{
                    value: "Number of groups",
                    angle: -90,
                    position: "insideLeft",
                    style: { fill: "#71717a", fontSize: 12 },
                  }}
                />
                <Tooltip
                  content={({ payload }: { payload: TooltipPayload }) => {
                    const p = payload?.[0]?.payload as
                      | { variantCount: number; groupCount: number }
                      | undefined;
                    if (!p) return null;
                    return (
                      <div className="rounded border border-zinc-200 bg-white px-3 py-2 text-sm shadow-lg">
                        <span className="text-zinc-600">
                          {p.variantCount} variant{p.variantCount !== 1 ? "s" : ""}:{" "}
                        </span>
                        <span className="font-medium">{p.groupCount} groups</span>
                      </div>
                    );
                  }}
                />
                <Bar
                  dataKey="groupCount"
                  fill={BAR_COLORS[2]}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>
    </div>
  );
}
