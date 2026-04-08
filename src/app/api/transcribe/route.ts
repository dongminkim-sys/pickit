import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
  const { video_url } = await request.json();
  if (!video_url) {
    return NextResponse.json({ error: "video_url is required" }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY not configured" }, { status: 500 });
  }

  const tmpId = uuidv4();
  const tmpDir = path.join(process.cwd(), "public", "uploads");
  const audioPath = path.join(tmpDir, `${tmpId}.mp3`);

  try {
    // Extract audio from video using ffmpeg
    const videoPath = video_url.startsWith("/")
      ? path.join(process.cwd(), "public", video_url)
      : video_url;

    execSync(
      `ffmpeg -i "${videoPath}" -vn -acodec libmp3lame -ar 16000 -ac 1 -q:a 4 "${audioPath}" -y`,
      { timeout: 60000, stdio: "pipe" }
    );

    // Check file size (Whisper API limit: 25MB)
    const stats = fs.statSync(audioPath);
    if (stats.size > 25 * 1024 * 1024) {
      fs.unlinkSync(audioPath);
      return NextResponse.json({ error: "오디오 파일이 25MB를 초과합니다." }, { status: 400 });
    }

    // Call OpenAI Whisper API with timestamps
    const formData = new FormData();
    const audioBuffer = fs.readFileSync(audioPath);
    const audioBlob = new Blob([audioBuffer], { type: "audio/mp3" });
    formData.append("file", audioBlob, `${tmpId}.mp3`);
    formData.append("model", "whisper-1");
    formData.append("language", "ko");
    formData.append("response_format", "verbose_json");
    formData.append("timestamp_granularities[]", "segment");

    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || "Whisper API 호출 실패");
    }

    const data = await res.json();

    // Format segments with timestamps
    const segments = (data.segments || []).map((seg: { start: number; end: number; text: string }) => ({
      start: seg.start,
      end: seg.end,
      text: seg.text.trim(),
    }));

    // Build formatted transcript
    const formatted = segments
      .map((s: { start: number; text: string }) => {
        const min = Math.floor(s.start / 60);
        const sec = Math.floor(s.start % 60);
        const ts = `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
        return `[${ts}] ${s.text}`;
      })
      .join("\n");

    // Cleanup
    fs.unlinkSync(audioPath);

    return NextResponse.json({
      text: data.text,
      formatted,
      segments,
    });
  } catch (err: unknown) {
    // Cleanup on error
    if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
    const message = err instanceof Error ? err.message : "스크립트 추출 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
