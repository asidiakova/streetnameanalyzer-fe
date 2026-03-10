import { readFile } from "fs/promises";
import { join } from "path";
import type { Mappings } from "@/types/mappings";
import type { Evaluation } from "@/types/evaluation";
import { HomeClient } from "./home-client";

export default async function Home() {
  const [mappings, evaluation] = await Promise.all([
    readFile(join(process.cwd(), "src", "mappings.json"), "utf-8").then(
      (raw) => JSON.parse(raw) as Mappings
    ),
    readFile(join(process.cwd(), "src", "evaluation.json"), "utf-8").then(
      (raw) => JSON.parse(raw) as Evaluation
    ),
  ]);

  return <HomeClient mappings={mappings} evaluation={evaluation} />;
}
