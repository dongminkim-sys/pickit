import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// DELETE /api/users/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();

  // Prevent deleting the last admin
  const user = db.prepare("SELECT is_admin FROM users WHERE id = ?").get(id) as { is_admin: number } | undefined;
  if (!user) {
    return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
  }
  if (user.is_admin) {
    const adminCount = db.prepare("SELECT COUNT(*) as cnt FROM users WHERE is_admin = 1").get() as { cnt: number };
    if (adminCount.cnt <= 1) {
      return NextResponse.json({ error: "관리자는 최소 1명이 있어야 합니다." }, { status: 400 });
    }
  }

  // Delete user's related data
  db.prepare("DELETE FROM user_passwords WHERE user_id = ?").run(id);
  db.prepare("DELETE FROM user_profiles WHERE user_id = ?").run(id);
  db.prepare("DELETE FROM favorites WHERE user_id = ?").run(id);
  db.prepare("DELETE FROM comments WHERE user_id = ?").run(id);
  db.prepare("DELETE FROM users WHERE id = ?").run(id);

  return NextResponse.json({ ok: true });
}

// PATCH /api/users/[id] — update user
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const body = await request.json();

  const fields: string[] = [];
  const values: unknown[] = [];

  if (body.name !== undefined) { fields.push("name = ?"); values.push(body.name); }
  if (body.avatar !== undefined) { fields.push("avatar = ?"); values.push(body.avatar); }
  if (body.color !== undefined) { fields.push("color = ?"); values.push(body.color); }
  if (body.is_admin !== undefined) {
    // Prevent removing last admin
    if (!body.is_admin) {
      const current = db.prepare("SELECT is_admin FROM users WHERE id = ?").get(id) as { is_admin: number } | undefined;
      if (current?.is_admin) {
        const adminCount = db.prepare("SELECT COUNT(*) as cnt FROM users WHERE is_admin = 1").get() as { cnt: number };
        if (adminCount.cnt <= 1) {
          return NextResponse.json({ error: "관리자는 최소 1명이 있어야 합니다." }, { status: 400 });
        }
      }
    }
    fields.push("is_admin = ?");
    values.push(body.is_admin ? 1 : 0);
  }

  if (fields.length === 0) {
    return NextResponse.json({ error: "변경 사항이 없습니다." }, { status: 400 });
  }

  values.push(id);
  db.prepare(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`).run(...values);

  return NextResponse.json({ ok: true });
}
