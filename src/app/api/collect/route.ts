import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { mkdir, writeFile } from "fs/promises";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

async function downloadMedia(
  url: string,
  destPath: string
): Promise<boolean> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return false;
    const buffer = Buffer.from(await res.arrayBuffer());
    await writeFile(destPath, buffer);
    return true;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      title = "",
      brand = "",
      platform = "meta",
      media_type = "image",
      media_url = "",
      thumbnail_url = "",
      category = "",
      tags = "",
      memo = "",
      ad_start_date = null,
      active_days = null,
      created_by = "",
      ad_url = "",
    } = body;

    if (!media_url && !title) {
      return NextResponse.json(
        { error: "최소한 제목이나 미디어 URL이 필요합니다" },
        { status: 400, headers: corsHeaders() }
      );
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    const fileId = uuidv4();
    let localMediaUrl = media_url;
    let localThumbnailUrl = thumbnail_url;

    // Download media if it's an external URL
    if (media_url && media_url.startsWith("http")) {
      const ext =
        media_type === "video"
          ? ".mp4"
          : media_url.match(/\.(png|webp|gif)/i)
            ? `.${media_url.match(/\.(png|webp|gif)/i)![1]}`
            : ".jpg";
      const destPath = path.join(uploadDir, `${fileId}${ext}`);
      const ok = await downloadMedia(media_url, destPath);
      if (ok) {
        localMediaUrl = `/uploads/${fileId}${ext}`;
      }
    }

    // Download thumbnail if it's an external URL
    if (thumbnail_url && thumbnail_url.startsWith("http")) {
      const thumbPath = path.join(uploadDir, `${fileId}-thumb.jpg`);
      const ok = await downloadMedia(thumbnail_url, thumbPath);
      if (ok) {
        localThumbnailUrl = `/uploads/${fileId}-thumb.jpg`;
      }
    }

    const db = getDb();
    const id = uuidv4();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO references_ad (id, title, brand, platform, media_type, media_url, thumbnail_url, category, tags, likes, views, ad_start_date, ad_end_date, active_days, memo, aspect_ratio, created_by, ad_url, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      title,
      brand,
      platform,
      media_type,
      localMediaUrl,
      localThumbnailUrl,
      category,
      tags,
      null,
      null,
      ad_start_date,
      null,
      active_days,
      memo,
      null,
      created_by,
      ad_url,
      now,
      now
    );

    return NextResponse.json(
      { id, message: "수집 완료" },
      { status: 201, headers: corsHeaders() }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    console.error("Collect error:", message);
    return NextResponse.json(
      { error: `수집 실패: ${message}` },
      { status: 500, headers: corsHeaders() }
    );
  }
}
