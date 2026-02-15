import type { MethodData, NormalizedGroup } from "@/types/mappings";

const LENGTH_M_TO_KM = 1000;

export type MethodStats = {
  totalGroups: number;
  totalNames: number;
  totalLengthKm: number;
  totalSegments: number;
  avgGroupSize: number;
  avgLengthPerSegmentM: number;
};

export function computeMethodStats(method: MethodData | undefined): MethodStats | null {
  if (!method) return null;
  const groups = Object.values(method.groups);
  const totalGroups = groups.length;
  const totalNames = Object.keys(method.mapping).length;
  const totalLengthM = groups.reduce((s, g) => s + g.total_length, 0);
  const totalSegments = groups.reduce((s, g) => s + g.segment_count, 0);
  const avgGroupSize =
    totalGroups > 0
      ? groups.reduce((s, g) => s + g.variants.length, 0) / totalGroups
      : 0;
  const avgLengthPerSegmentM =
    totalSegments > 0 ? totalLengthM / totalSegments : 0;
  return {
    totalGroups,
    totalNames,
    totalLengthKm: totalLengthM / LENGTH_M_TO_KM,
    totalSegments,
    avgGroupSize: Math.round(avgGroupSize * 10) / 10,
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

export function getSegmentCountDistribution(
  method: MethodData | undefined
): { segmentCount: number; groupCount: number }[] {
  if (!method) return [];
  const counts: Record<number, number> = {};
  for (const g of Object.values(method.groups)) {
    const c = g.segment_count;
    counts[c] = (counts[c] ?? 0) + 1;
  }
  return Object.entries(counts)
    .map(([k, v]) => ({ segmentCount: Number(k), groupCount: v }))
    .sort((a, b) => a.segmentCount - b.segmentCount);
}

export function getVariantCountDistribution(
  method: MethodData | undefined
): { variantCount: number; groupCount: number }[] {
  if (!method) return [];
  const counts: Record<number, number> = {};
  for (const g of Object.values(method.groups)) {
    const c = g.variants.length;
    counts[c] = (counts[c] ?? 0) + 1;
  }
  return Object.entries(counts)
    .map(([k, v]) => ({ variantCount: Number(k), groupCount: v }))
    .sort((a, b) => a.variantCount - b.variantCount);
}

export { LENGTH_M_TO_KM };
