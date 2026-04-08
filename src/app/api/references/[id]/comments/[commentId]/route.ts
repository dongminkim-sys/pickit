import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const { commentId } = await params;
  const db = getDb();
  db.prepare("DELETE FROM comments WHERE id = ?").run(commentId);
  return NextResponse.json({ ok: true });
}
