import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// Record a visit
export async function POST(request: NextRequest) {
  const { user_id } = await request.json();
  if (!user_id) {
    return NextResponse.json({ error: "user_id is required" }, { status: 400 });
  }

  const db = getDb();
  db.prepare("INSERT INTO visit_logs (user_id) VALUES (?)").run(user_id);
  return NextResponse.json({ ok: true });
}

// Get visit logs (for admin)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 500);
  const offset = parseInt(searchParams.get("offset") || "0");

  const db = getDb();

  // Recent visits with user info
  const visits = db.prepare(`
    SELECT v.id, v.user_id, v.visited_at, u.name as user_name
    FROM visit_logs v
    LEFT JOIN users u ON v.user_id = u.id
    ORDER BY v.visited_at DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset);

  // Summary: visit count per user (last 30 days)
  const summary = db.prepare(`
    SELECT v.user_id, u.name as user_name, COUNT(*) as visit_count,
           MAX(v.visited_at) as last_visit
    FROM visit_logs v
    LEFT JOIN users u ON v.user_id = u.id
    WHERE v.visited_at >= datetime('now', '-30 days')
    GROUP BY v.user_id
    ORDER BY visit_count DESC
  `).all();

  const total = (db.prepare("SELECT COUNT(*) as cnt FROM visit_logs").get() as { cnt: number }).cnt;

  return NextResponse.json({ visits, summary, total });
}
