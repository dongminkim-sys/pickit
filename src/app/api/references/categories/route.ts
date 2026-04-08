import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const db = getDb();
  const rows = db
    .prepare(
      "SELECT DISTINCT category FROM references_ad WHERE category != '' ORDER BY category"
    )
    .all() as { category: string }[];
  return NextResponse.json(rows.map((r) => r.category));
}
