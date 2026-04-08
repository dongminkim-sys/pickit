import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM competitors ORDER BY category, name").all();
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json();

  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(
    "INSERT INTO competitors (id, name, category, links, memo, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(
    id,
    body.name || "",
    body.category || "",
    JSON.stringify(body.links || []),
    body.memo || "",
    body.created_by || "",
    now
  );

  return NextResponse.json({ id, message: "Created" }, { status: 201 });
}
