import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import type { Mappings } from "@/types/mappings";

let cached: Mappings | null = null;

export async function GET() {
  if (cached) return NextResponse.json(cached);
  const path = join(process.cwd(), "src", "mappings.json");
  const raw = await readFile(path, "utf-8");
  cached = JSON.parse(raw) as Mappings;
  return NextResponse.json(cached);
}
