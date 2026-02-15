import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import type { Evaluation } from "@/types/evaluation";

let cached: Evaluation | null = null;

export async function GET() {
  if (cached) return NextResponse.json(cached);
  const filePath = join(process.cwd(), "src", "evaluation.json");
  const raw = await readFile(filePath, "utf-8");
  cached = JSON.parse(raw) as Evaluation;
  return NextResponse.json(cached);
}
