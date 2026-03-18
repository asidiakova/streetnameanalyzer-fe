import { readFile } from "fs/promises";
import { join } from "path";
import type { Mappings, DataMetadata } from "@/types/mappings";
import type { Evaluation } from "@/types/evaluation";
import { HomeClient } from "./home-client";

function extractMetadata<T extends Record<string, unknown>>(
  raw: T
): { metadata: DataMetadata; data: Omit<T, "_metadata"> } {
  const { _metadata, ...data } = raw;
  return {
    metadata: _metadata as DataMetadata,
    data: data as Omit<T, "_metadata">,
  };
}

export default async function Home() {
  const [mappingsRaw, evaluationRaw] = await Promise.all([
    readFile(join(process.cwd(), "src", "mappings.json"), "utf-8").then(
      (raw) => JSON.parse(raw) as Record<string, unknown>
    ),
    readFile(join(process.cwd(), "src", "evaluation.json"), "utf-8").then(
      (raw) => JSON.parse(raw) as Record<string, unknown>
    ),
  ]);

  const { metadata, data: mappings } = extractMetadata(mappingsRaw);
  const { data: evaluation } = extractMetadata(evaluationRaw);

  return (
    <HomeClient
      mappings={mappings as unknown as Mappings}
      evaluation={evaluation as unknown as Evaluation}
      metadata={metadata}
    />
  );
}
