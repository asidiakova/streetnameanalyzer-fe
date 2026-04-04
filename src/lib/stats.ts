import type { MethodData, NormalizedGroup } from "@/types/mappings";

const LENGTH_M_TO_KM = 1000;

export type MethodStats = {
  totalGroups: number;
  totalStreets: number;
  totalLengthKm: number;
  totalSegments: number;
  avgStreetsPerGroup: number;
  avgLengthPerSegmentM: number;
};

export function computeMethodStats(method: MethodData | undefined): MethodStats | null {
  if (!method) return null;
  const groups = Object.values(method.groups);
  const totalGroups = groups.length;
  const totalStreets = groups.reduce((s, g) => s + g.street_count, 0);
  const totalLengthM = groups.reduce((s, g) => s + g.total_length, 0);
  const totalSegments = groups.reduce((s, g) => s + g.segment_count, 0);
  const avgStreetsPerGroup =
    totalGroups > 0 ? totalStreets / totalGroups : 0;
  const avgLengthPerSegmentM =
    totalSegments > 0 ? totalLengthM / totalSegments : 0;
  return {
    totalGroups,
    totalStreets,
    totalLengthKm: totalLengthM / LENGTH_M_TO_KM,
    totalSegments,
    avgStreetsPerGroup: Math.round(avgStreetsPerGroup * 10) / 10,
    avgLengthPerSegmentM: Math.round(avgLengthPerSegmentM * 10) / 10,
  };
}

export function getTopGroupsByLength(
  method: MethodData | undefined,
  n: number
): [string, NormalizedGroup][] {
  if (!method) return [];
  return (Object.entries(method.groups) as [string, NormalizedGroup][])
    .sort(([, a], [, b]) => b.total_length - a.total_length)
    .slice(0, n);
}

export function getStreetCountDistribution(
  method: MethodData | undefined
): { streetCount: number; groupCount: number }[] {
  if (!method) return [];
  const counts: Record<number, number> = {};
  for (const g of Object.values(method.groups)) {
    const c = g.street_count;
    counts[c] = (counts[c] ?? 0) + 1;
  }
  return Object.entries(counts)
    .map(([k, v]) => ({ streetCount: Number(k), groupCount: v }))
    .sort((a, b) => a.streetCount - b.streetCount);
}

export { LENGTH_M_TO_KM };
