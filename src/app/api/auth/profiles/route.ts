import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// GET /api/auth/profiles — all user avatar URLs
export async function GET() {
  const db = getDb();
  const rows = db.prepare("SELECT user_id, avatar_url FROM user_profiles").all() as { user_id: string; avatar_url: string }[];
  const map: Record<string, string> = {};
  for (const r of rows) {
    if (r.avatar_url) map[r.user_id] = r.avatar_url;
  }
  return NextResponse.json(map);
}
