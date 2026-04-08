import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import crypto from "crypto";

function hash(pw: string) {
  return crypto.createHash("sha256").update(pw).digest("hex");
}

export async function POST(request: NextRequest) {
  const { user_id, password } = await request.json();
  if (!user_id || !password) {
    return NextResponse.json({ error: "필수 항목이 누락되었습니다." }, { status: 400 });
  }

  const db = getDb();
  const row = db.prepare("SELECT password_hash FROM user_passwords WHERE user_id = ?").get(user_id) as { password_hash: string } | undefined;

  if (!row) {
    // First login — set this as the password
    db.prepare("INSERT INTO user_passwords (user_id, password_hash) VALUES (?, ?)").run(user_id, hash(password));
    return NextResponse.json({ ok: true });
  }

  if (row.password_hash === hash(password)) {
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "비밀번호가 틀렸습니다." }, { status: 401 });
}
