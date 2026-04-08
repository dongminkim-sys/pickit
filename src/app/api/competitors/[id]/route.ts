import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const body = await request.json();

  db.prepare(
    "UPDATE competitors SET name = ?, category = ?, links = ?, memo = ? WHERE id = ?"
  ).run(
    body.name || "",
    body.category || "",
    JSON.stringify(body.links || []),
    body.memo || "",
    id
  );

  return NextResponse.json({ message: "Updated" });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  db.prepare("DELETE FROM competitors WHERE id = ?").run(id);
  return NextResponse.json({ message: "Deleted" });
}
