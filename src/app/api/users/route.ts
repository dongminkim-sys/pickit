import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// GET /api/users — list all users
export async function GET() {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM users ORDER BY created_at ASC").all();
  return NextResponse.json(rows);
}

// POST /api/users — create a new user
export async function POST(request: NextRequest) {
  const db = getDb();
  const { id, name, avatar, color, is_admin } = await request.json();

  if (!id || !name) {
    return NextResponse.json({ error: "아이디와 이름은 필수입니다." }, { status: 400 });
  }

  // Check for duplicate ID
  const existing = db.prepare("SELECT 1 FROM users WHERE id = ?").get(id);
  if (existing) {
    return NextResponse.json({ error: "이미 존재하는 아이디입니다." }, { status: 409 });
  }

  const initial = avatar || name.charAt(0).toUpperCase();

  db.prepare("INSERT INTO users (id, name, avatar, color, is_admin) VALUES (?, ?, ?, ?, ?)").run(
    id, name, initial, color || "bg-gray-500", is_admin ? 1 : 0
  );

  return NextResponse.json({ ok: true }, { status: 201 });
}
