"use client";

import { Fragment, useState } from "react";
import type { NormalizedGroup } from "@/types/mappings";
import { LENGTH_M_TO_KM } from "@/lib/stats";

function variantPreview(variants: string[], maxShow = 1) {
  if (variants.length <= maxShow) return variants.join(", ");
  return `${variants.slice(0, maxShow).join(", ")} +${variants.length - maxShow} more`;
}

export function GroupTable({
  groups,
}: {
  groups: [string, NormalizedGroup][];
}) {
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);

  return (
    <div className="rounded border border-zinc-200 bg-white overflow-x-auto">
      <table className="w-full table-fixed text-left text-sm">
        <thead className="bg-zinc-50">
          <tr className="border-b border-zinc-200">
            <th className="w-[40%] px-3 py-2 font-medium text-zinc-700">
              Representative
            </th>
            <th className="w-[15%] px-3 py-2 font-medium text-zinc-700">
              Total length (km)
            </th>
            <th className="w-[10%] px-3 py-2 font-medium text-zinc-700">
              Streets
            </th>
            <th className="w-[10%] px-3 py-2 font-medium text-zinc-700">
              Segments
            </th>
            <th className="w-[25%] px-3 py-2 font-medium text-zinc-700">
              Variants
            </th>
          </tr>
        </thead>
        <tbody>
          {groups.map(([groupId, g]) => {
            const isExpanded = expandedGroupId === groupId;
            return (
              <Fragment key={groupId}>
                <tr className="border-b border-zinc-100 last:border-0 align-top">
                  <td className="px-3 py-2 font-medium text-zinc-900">
                    {g.representative}
                  </td>
                  <td className="px-3 py-2 text-zinc-700">
                    {(g.total_length / LENGTH_M_TO_KM).toFixed(3)}
                  </td>
                  <td className="px-3 py-2 text-zinc-700">
                    {g.street_count.toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-zinc-700">
                    {g.segment_count.toLocaleString()}
                  </td>
                  <td className="w-[15%] px-3 py-2 text-zinc-700">
                    <button
                      type="button"
                      title="Click to expand full list"
                      onClick={() =>
                        setExpandedGroupId((c) =>
                          c === groupId ? null : groupId
                        )
                      }
                      className="flex w-full items-center gap-1 text-left text-zinc-700 hover:text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-1 rounded"
                    >
                      <span className="min-w-0 truncate text-xs">
                        {variantPreview(g.variants)}
                      </span>
                      <span className="shrink-0 text-xs text-zinc-500">
                        {isExpanded ? "▼" : "▶"}
                      </span>
                    </button>
                  </td>
                </tr>
                {isExpanded && (
                  <tr className="border-b border-zinc-100 bg-zinc-50/50">
                    <td colSpan={5} className="px-3 py-2">
                      <div className="max-h-60 overflow-y-auto space-y-0.5 text-xs text-zinc-700">
                        {g.variants.map((v, i) => (
                          <div key={`${groupId}-variant-${i}`}>{v}</div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
