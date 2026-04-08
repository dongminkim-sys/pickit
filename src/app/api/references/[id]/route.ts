import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const row = db.prepare("SELECT * FROM references_ad WHERE id = ?").get(id);
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(row);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const body = await request.json();
  const now = new Date().toISOString();

  let activeDays = body.active_days ?? null;
  if (body.ad_start_date && body.ad_end_date && activeDays === null) {
    const start = new Date(body.ad_start_date);
    const end = new Date(body.ad_end_date);
    activeDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }

  const stmt = db.prepare(`
    UPDATE references_ad SET
      title = ?, brand = ?, platform = ?, media_type = ?, media_url = ?,
      thumbnail_url = ?, category = ?, tags = ?, likes = ?, views = ?,
      ad_start_date = ?, ad_end_date = ?, active_days = ?, memo = ?, aspect_ratio = ?, updated_at = ?
    WHERE id = ?
  `);

  stmt.run(
    body.title || "",
    body.brand || "",
    body.platform || "meta",
    body.media_type || "image",
    body.media_url || "",
    body.thumbnail_url || "",
    body.category || "",
    body.tags || "",
    body.likes ?? null,
    body.views ?? null,
    body.ad_start_date || null,
    body.ad_end_date || null,
    activeDays,
    body.memo || "",
    body.aspect_ratio ?? null,
    now,
    id
  );

  return NextResponse.json({ message: "Updated" });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const body = await request.json();
  if (body.transcript !== undefined) {
    db.prepare("UPDATE references_ad SET transcript = ?, updated_at = ? WHERE id = ?").run(body.transcript, new Date().toISOString(), id);
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  db.prepare("DELETE FROM references_ad WHERE id = ?").run(id);
  return NextResponse.json({ message: "Deleted" });
}
