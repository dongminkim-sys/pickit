import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// GET /api/auth/profile?user_id=xxx
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("user_id");
  if (!userId) return NextResponse.json({});
  const db = getDb();
  const row = db.prepare("SELECT avatar_url FROM user_profiles WHERE user_id = ?").get(userId) as { avatar_url: string } | undefined;
  return NextResponse.json({ avatar_url: row?.avatar_url || "" });
}

// GET all profiles
export async function POST(request: NextRequest) {
  const db = getDb();
  const { user_id, avatar_url } = await request.json();
  if (!user_id) return NextResponse.json({ error: "Missing user_id" }, { status: 400 });

  const existing = db.prepare("SELECT 1 FROM user_profiles WHERE user_id = ?").get(user_id);
  if (existing) {
    db.prepare("UPDATE user_profiles SET avatar_url = ? WHERE user_id = ?").run(avatar_url, user_id);
  } else {
    db.prepare("INSERT INTO user_profiles (user_id, avatar_url) VALUES (?, ?)").run(user_id, avatar_url);
  }
  return NextResponse.json({ ok: true });
}
