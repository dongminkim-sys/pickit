import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// GET /api/favorites?user_id=xxx
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("user_id");
  if (!userId) return NextResponse.json([]);
  const db = getDb();
  const rows = db.prepare("SELECT reference_id FROM favorites WHERE user_id = ?").all(userId) as { reference_id: string }[];
  return NextResponse.json(rows.map((r) => r.reference_id));
}

// POST /api/favorites — toggle favorite
export async function POST(request: NextRequest) {
  const db = getDb();
  const { user_id, reference_id } = await request.json();
  if (!user_id || !reference_id) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const existing = db.prepare("SELECT 1 FROM favorites WHERE user_id = ? AND reference_id = ?").get(user_id, reference_id);
  if (existing) {
    db.prepare("DELETE FROM favorites WHERE user_id = ? AND reference_id = ?").run(user_id, reference_id);
    return NextResponse.json({ favorited: false });
  } else {
    db.prepare("INSERT INTO favorites (user_id, reference_id) VALUES (?, ?)").run(user_id, reference_id);
    return NextResponse.json({ favorited: true });
  }
}
