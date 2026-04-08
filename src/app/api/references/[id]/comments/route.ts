import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const rows = db.prepare("SELECT * FROM comments WHERE reference_id = ? ORDER BY created_at ASC").all(id);
  return NextResponse.json(rows);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const body = await request.json();

  const commentId = uuidv4();
  const now = new Date().toISOString();

  db.prepare("INSERT INTO comments (id, reference_id, user_id, content, created_at) VALUES (?, ?, ?, ?, ?)").run(
    commentId, id, body.user_id || "", body.content || "", now
  );

  return NextResponse.json({ id: commentId }, { status: 201 });
}
