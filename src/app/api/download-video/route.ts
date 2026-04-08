import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import { mkdir, writeFile } from "fs/promises";
import { readdirSync } from "fs";
import { v4 as uuidv4 } from "uuid";

const execFileAsync = promisify(execFile);

function extractMetaAdId(url: string): string | null {
  const match = url.match(/[?&]id=(\d+)/);
  return match?.[1] || null;
}

function isMetaAdLibraryUrl(url: string): boolean {
  return url.includes("facebook.com/ads/library");
}

async function downloadFile(fileUrl: string, destPath: string): Promise<boolean> {
  try {
    const res = await fetch(fileUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" },
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

async function fetchMetaAdSnapshot(adId: string, accessToken: string, uploadDir: string, fileId: string): Promise<{
  type: "image" | "video";
  media_url: string;
  thumbnail_url?: string;
  title: string;
  body: string;
  advertiser: string;
} | null> {
  // Step 1: Get ad_snapshot_url from Ad Library API
  const apiUrl = `https://graph.facebook.com/v22.0/ads_archive?search_terms=*&ad_archive_id=${adId}&fields=ad_snapshot_url,ad_creative_bodies,bylines,ad_creative_link_titles&access_token=${accessToken}`;
  const apiRes = await fetch(apiUrl, { signal: AbortSignal.timeout(15000) });
  if (!apiRes.ok) return null;

  const apiData = await apiRes.json();
  const ad = apiData.data?.[0];
  if (!ad?.ad_snapshot_url) return null;

  const title = ad.ad_creative_link_titles?.[0] || "";
  const body = ad.ad_creative_bodies?.[0] || "";
  const advertiser = ad.bylines?.[0] || "";

  // Step 2: Fetch the snapshot page to extract actual media
  const snapshotRes = await fetch(ad.ad_snapshot_url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    },
    signal: AbortSignal.timeout(15000),
  });
  const html = await snapshotRes.text();

  // Try to find video source
  const videoMatch = html.match(/src="(https?:\/\/[^"]*?(?:\.mp4|video)[^"]*)"/i)
    || html.match(/"sd_src":"(https?:[^"]+)"/i)
    || html.match(/"hd_src":"(https?:[^"]+)"/i);

  if (videoMatch) {
    const videoUrl = videoMatch[1].replace(/\\u0025/g, "%").replace(/\\\//g, "/").replace(/&amp;/g, "&");
    const videoPath = path.join(uploadDir, `${fileId}.mp4`);
    const downloaded = await downloadFile(videoUrl, videoPath);
    if (downloaded) {
      // Also try to get thumbnail
      let thumbnailUrl = "";
      const imgMatch = html.match(/<img[^>]+src="(https?:\/\/[^"]+(?:\.jpg|\.png|\.webp)[^"]*)"/i);
      if (imgMatch) {
        const thumbPath = path.join(uploadDir, `${fileId}-thumb.jpg`);
        const thumbUrl = imgMatch[1].replace(/&amp;/g, "&");
        if (await downloadFile(thumbUrl, thumbPath)) {
          thumbnailUrl = `/uploads/${fileId}-thumb.jpg`;
        }
      }
      return { type: "video", media_url: `/uploads/${fileId}.mp4`, thumbnail_url: thumbnailUrl, title, body, advertiser };
    }
  }

  // Try to find image source
  const imgMatch = html.match(/<img[^>]+src="(https?:\/\/scontent[^"]+)"/i)
    || html.match(/<img[^>]+src="(https?:\/\/[^"]+(?:\.jpg|\.png|\.webp)[^"]*)"/i);

  if (imgMatch) {
    const imgUrl = imgMatch[1].replace(/&amp;/g, "&");
    const contentType = imgUrl.includes(".png") ? "png" : imgUrl.includes(".webp") ? "webp" : "jpg";
    const imgPath = path.join(uploadDir, `${fileId}.${contentType}`);
    const downloaded = await downloadFile(imgUrl, imgPath);
    if (downloaded) {
      return { type: "image", media_url: `/uploads/${fileId}.${contentType}`, title, body, advertiser };
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  const { url } = await request.json();

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "URL이 필요합니다" }, { status: 400 });
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });

  const fileId = uuidv4();

  // Meta Ad Library URL → use Meta API
  if (isMetaAdLibraryUrl(url)) {
    const adId = extractMetaAdId(url);
    if (!adId) {
      return NextResponse.json({ error: "광고 ID를 URL에서 추출할 수 없습니다" }, { status: 400 });
    }

    const accessToken = process.env.META_ACCESS_TOKEN;
    if (!accessToken) {
      return NextResponse.json({ error: "META_ACCESS_TOKEN이 설정되지 않았습니다" }, { status: 500 });
    }

    try {
      const result = await fetchMetaAdSnapshot(adId, accessToken, uploadDir, fileId);
      if (!result) {
        return NextResponse.json({ error: "광고 소재를 가져올 수 없습니다" }, { status: 500 });
      }

      if (result.type === "video") {
        return NextResponse.json({
          type: "video",
          video_url: result.media_url,
          thumbnail_url: result.thumbnail_url || "",
          title: result.title || result.body?.slice(0, 50) || "",
          advertiser: result.advertiser,
          body: result.body,
          source_url: url,
        });
      } else {
        return NextResponse.json({
          type: "image",
          image_url: result.media_url,
          title: result.title || result.body?.slice(0, 50) || "",
          advertiser: result.advertiser,
          body: result.body,
          source_url: url,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "알 수 없는 오류";
      console.error("Meta Ad Library error:", message);
      return NextResponse.json({ error: `Meta 광고 조회 실패: ${message.slice(0, 200)}` }, { status: 500 });
    }
  }

  // Other URLs → use yt-dlp
  try {
    const { stdout: infoJson } = await execFileAsync("yt-dlp", [
      "--dump-json",
      "--no-download",
      url,
    ], { timeout: 30000 });

    const info = JSON.parse(infoJson);
    const title = info.title || "";
    const thumbnail = info.thumbnail || "";
    const width = info.width || null;
    const height = info.height || null;
    const aspectRatio = width && height ? width / height : null;

    const outputPath = path.join(uploadDir, `${fileId}.mp4`);
    await execFileAsync("yt-dlp", [
      "-f", "bestvideo[height<=720][vcodec^=avc1]+bestaudio[acodec^=mp4a]/bestvideo[height<=720]+bestaudio/best[height<=720]/best",
      "--merge-output-format", "mp4",
      "--postprocessor-args", "ffmpeg:-c:v libx264 -c:a aac -movflags +faststart",
      "-o", outputPath,
      "--no-playlist",
      url,
    ], { timeout: 300000 });

    const files = readdirSync(uploadDir) as string[];
    const downloaded = files.find((f: string) => f.startsWith(fileId));

    if (!downloaded) {
      return NextResponse.json({ error: "다운로드 실패" }, { status: 500 });
    }

    const videoUrl = `/uploads/${downloaded}`;

    // Generate thumbnail from video using ffmpeg
    let thumbnailUrl = "";
    try {
      const thumbId = `${fileId}-thumb`;
      const thumbPath = path.join(uploadDir, `${thumbId}.jpg`);
      await execFileAsync("ffmpeg", [
        "-i", outputPath,
        "-ss", "00:00:01",
        "-vframes", "1",
        "-q:v", "2",
        thumbPath,
      ], { timeout: 15000 });
      thumbnailUrl = `/uploads/${thumbId}.jpg`;
    } catch {
      // ffmpeg thumbnail failed, not critical
    }

    return NextResponse.json({
      type: "video",
      video_url: videoUrl,
      thumbnail_url: thumbnailUrl,
      title,
      source_url: url,
      aspect_ratio: aspectRatio,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    console.error("Download error:", message);
    return NextResponse.json(
      { error: `다운로드 실패: ${message.slice(0, 200)}` },
      { status: 500 }
    );
  }
}
