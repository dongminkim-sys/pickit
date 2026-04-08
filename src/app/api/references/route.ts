import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export async function GET(request: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(request.url);

  const platform = searchParams.get("platform");
  const category = searchParams.get("category");
  const search = searchParams.get("search");
  const sort = searchParams.get("sort") || "created_at";
  const order = searchParams.get("order") || "desc";

  let query = "SELECT * FROM references_ad WHERE 1=1";
  const params: unknown[] = [];

  if (platform) {
    query += " AND platform = ?";
    params.push(platform);
  }
  if (category) {
    query += " AND category = ?";
    params.push(category);
  }
  if (search) {
    query += " AND (title LIKE ? OR brand LIKE ? OR tags LIKE ? OR memo LIKE ?)";
    const term = `%${search}%`;
    params.push(term, term, term, term);
  }

  const validSorts = ["created_at", "views", "likes", "ad_start_date", "active_days"];
  const sortCol = validSorts.includes(sort) ? sort : "created_at";
  const sortOrder = order === "asc" ? "ASC" : "DESC";
  query += ` ORDER BY ${sortCol} ${sortOrder}`;

  const rows = db.prepare(query).all(...params);
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json();

  const id = uuidv4();
  const now = new Date().toISOString();

  // Calculate active days if start and end dates provided
  let activeDays = body.active_days ?? null;
  if (body.ad_start_date && body.ad_end_date && activeDays === null) {
    const start = new Date(body.ad_start_date);
    const end = new Date(body.ad_end_date);
    activeDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }

  const stmt = db.prepare(`
    INSERT INTO references_ad (id, title, brand, platform, media_type, media_url, thumbnail_url, category, tags, likes, views, ad_start_date, ad_end_date, active_days, memo, aspect_ratio, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
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
    body.created_by || "",
    now,
    now
  );

  return NextResponse.json({ id, message: "Created" }, { status: 201 });
}
