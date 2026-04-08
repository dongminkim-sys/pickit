"use client";

import { useState, FormEvent } from "react";
import { PLATFORMS, CATEGORIES, PLATFORM_HAS_DATA } from "@/lib/constants";
import type { AdReference, Platform, MediaType } from "@/lib/db";

interface Props {
  initial?: AdReference;
  onSubmit: (data: Partial<AdReference>) => void;
  onCancel: () => void;
}

function isDownloadableUrl(url: string): boolean {
  return (
    url.includes("youtube.com") || url.includes("youtu.be") || url.includes("tiktok.com") ||
    url.includes("facebook.com/ads") || url.includes("facebook.com/reel") ||
    url.includes("instagram.com/reel") || url.includes("instagram.com/p/")
  );
}

export default function ReferenceForm({ initial, onSubmit, onCancel }: Props) {
  const [platform, setPlatform] = useState<Platform>(initial?.platform || "meta");
  const [mediaType, setMediaType] = useState<MediaType>(initial?.media_type || "image");
  const [title, setTitle] = useState(initial?.title || "");
  const [brand, setBrand] = useState(initial?.brand || "");
  const [mediaUrl, setMediaUrl] = useState(initial?.media_url || "");
  const [sourceUrl, setSourceUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState(initial?.thumbnail_url || "");
  const [category, setCategory] = useState(initial?.category || "");
  const [tags, setTags] = useState(initial?.tags || "");
  const [likes, setLikes] = useState(initial?.likes?.toString() || "");
  const [views, setViews] = useState(initial?.views?.toString() || "");
  const [adStartDate, setAdStartDate] = useState(initial?.ad_start_date || "");
  const [adEndDate, setAdEndDate] = useState(initial?.ad_end_date || "");
  const [memo, setMemo] = useState(initial?.memo || "");
  const [aspectRatio, setAspectRatio] = useState<number | null>(initial?.aspect_ratio ?? null);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState("");
  const [dragging, setDragging] = useState(false);

  const hasData = PLATFORM_HAS_DATA[platform];

  async function handleDownload(url: string) {
    if (!url || !isDownloadableUrl(url)) return;
    setDownloading(true);
    setDownloadProgress("소재 정보 가져오는 중...");
    try {
      const res = await fetch("/api/download-video", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "다운로드 실패"); }
      const data = await res.json();
      setSourceUrl(url);
      if (data.title && !title) setTitle(data.title);
      if (data.advertiser && !brand) setBrand(data.advertiser);

      if (data.type === "image") {
        setMediaUrl(data.image_url);
        setMediaType("image");
        setDownloadProgress("이미지 다운로드 완료!");
      } else {
        setMediaUrl(data.video_url);
        if (data.thumbnail_url) setThumbnailUrl(data.thumbnail_url);
        if (data.aspect_ratio) setAspectRatio(data.aspect_ratio);
        setMediaType("video");
        setDownloadProgress("영상 다운로드 완료!");
      }
      setDownloadProgress("완료!");
    } catch (err: unknown) {
      setDownloadProgress(`오류: ${err instanceof Error ? err.message : "다운로드 실패"}`);
    }
    setTimeout(() => { setDownloading(false); setDownloadProgress(""); }, 2000);
  }

  async function uploadFile(file: File, field: "media" | "thumbnail") {
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (field === "media") {
        setMediaUrl(data.url);
        if (file.type.startsWith("video/")) setMediaType("video");
        else setMediaType("image");
      } else {
        setThumbnailUrl(data.url);
      }
    } catch { alert("업로드 실패"); }
    setUploading(false);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>, field: "media" | "thumbnail") {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFile(file, field);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
      uploadFile(file, "media");
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const memoWithSource = sourceUrl ? (memo ? `${memo}\n\n원본: ${sourceUrl}` : `원본: ${sourceUrl}`) : memo;
    onSubmit({
      title, brand, platform, media_type: mediaType, media_url: mediaUrl, thumbnail_url: thumbnailUrl,
      category, tags, likes: hasData && likes ? parseInt(likes) : null, views: hasData && views ? parseInt(views) : null,
      ad_start_date: hasData && adStartDate ? adStartDate : null, ad_end_date: hasData && adEndDate ? adEndDate : null,
      memo: memoWithSource, aspect_ratio: aspectRatio,
    });
  }

  const inputClass = "w-full rounded-xl bg-white border border-gray-200 px-3.5 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/30 transition-all";
  const labelClass = "block text-xs font-semibold text-text-secondary mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Platform */}
      <div>
        <label className={labelClass}>광고 플랫폼</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {PLATFORMS.map((p) => (
            <button key={p.value} type="button" onClick={() => setPlatform(p.value as Platform)}
              className={`px-3 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
                platform === p.value ? "bg-accent text-white border-accent" : "bg-white text-text-secondary border-gray-200 hover:border-gray-300"
              }`}>{p.label}</button>
          ))}
        </div>
      </div>

      {/* Media type */}
      <div>
        <label className={labelClass}>소재 유형</label>
        <div className="flex gap-2">
          {(["image", "video"] as MediaType[]).map((t) => (
            <button key={t} type="button" onClick={() => setMediaType(t)}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
                mediaType === t ? "bg-gray-900 text-white border-gray-900" : "bg-white text-text-secondary border-gray-200 hover:border-gray-300"
              }`}>{t === "image" ? "이미지" : "영상"}</button>
          ))}
        </div>
      </div>

      {/* URL download */}
      <div>
        <label className={labelClass}>링크로 자동 다운로드 <span className="font-normal text-text-muted">YouTube, TikTok, Instagram, Meta 광고 라이브러리</span></label>
        <div className="flex gap-2">
          <input type="text" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} className={`${inputClass} flex-1`} placeholder="https://facebook.com/ads/library/?id=..." />
          <button type="button" disabled={downloading || !sourceUrl || !isDownloadableUrl(sourceUrl)} onClick={() => handleDownload(sourceUrl)}
            className="px-4 py-2.5 bg-accent hover:bg-accent-hover disabled:opacity-30 text-white text-sm font-semibold rounded-xl transition-all whitespace-nowrap flex items-center gap-2">
            {downloading ? <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> :
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>}
            다운로드
          </button>
        </div>
        {downloadProgress && (
          <p className={`mt-1.5 text-xs ${downloadProgress.startsWith("오류") ? "text-accent" : downloadProgress === "완료!" ? "text-success" : "text-text-muted"}`}>{downloadProgress}</p>
        )}
        {mediaUrl && mediaUrl.startsWith("/uploads/") && (
          <p className="mt-1.5 text-xs text-success flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            로컬에 저장 완료. 원본이 삭제되어도 안전합니다.
          </p>
        )}
      </div>

      {/* Title & Brand */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><label className={labelClass}>소재 제목 *</label><input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} placeholder="예: 비타민C 세럼 체험 광고" required /></div>
        <div><label className={labelClass}>광고주 / 브랜드</label><input type="text" value={brand} onChange={(e) => setBrand(e.target.value)} className={inputClass} placeholder="예: 닥터지" /></div>
      </div>

      {/* Category & Tags */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><label className={labelClass}>카테고리</label><select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}><option value="">선택 안함</option>{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
        <div><label className={labelClass}>태그</label><input type="text" value={tags} onChange={(e) => setTags(e.target.value)} className={inputClass} placeholder="쉼표로 구분 (예: UGC, 리뷰, 할인)" /></div>
      </div>

      {/* Direct file upload with drag & drop */}
      <div>
        <label className={labelClass}>소재 파일 직접 업로드</label>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
            dragging ? "border-accent bg-accent-soft" : "border-gray-200 hover:border-gray-300"
          }`}
        >
          {mediaUrl ? (
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text-primary truncate">{mediaUrl}</p>
                <p className="text-xs text-success mt-0.5 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  파일 업로드 완료
                </p>
              </div>
              <button type="button" onClick={() => setMediaUrl("")} className="text-xs text-text-muted hover:text-accent transition-colors">변경</button>
            </div>
          ) : (
            <>
              <svg className="w-8 h-8 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-sm text-text-muted mb-2">파일을 드래그하여 놓거나</p>
              <label className="inline-block px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm cursor-pointer text-text-secondary transition-all font-medium">
                파일 선택<input type="file" className="hidden" accept="image/*,video/*" onChange={(e) => handleFileUpload(e, "media")} />
              </label>
            </>
          )}
        </div>
      </div>

      {/* Thumbnail */}
      <div>
        <label className={labelClass}>썸네일</label>
        <div className="flex gap-2">
          <input type="text" value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} className={`${inputClass} flex-1`} placeholder="썸네일 URL 또는 파일 업로드" />
          <label className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm cursor-pointer text-text-secondary whitespace-nowrap transition-all font-medium">
            파일 선택<input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, "thumbnail")} />
          </label>
        </div>
        {uploading && <p className="text-xs text-accent mt-1.5">업로드 중...</p>}
      </div>

      {/* Performance data */}
      {hasData && (
        <div className="border-t border-gray-200 pt-5">
          <h3 className="text-xs font-semibold text-text-secondary mb-4">성과 데이터</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div><label className={labelClass}>좋아요</label><input type="number" value={likes} onChange={(e) => setLikes(e.target.value)} className={inputClass} placeholder="0" /></div>
            <div><label className={labelClass}>조회수</label><input type="number" value={views} onChange={(e) => setViews(e.target.value)} className={inputClass} placeholder="0" /></div>
            <div><label className={labelClass}>광고 시작일</label><input type="date" value={adStartDate} onChange={(e) => setAdStartDate(e.target.value)} className={inputClass} /></div>
            <div><label className={labelClass}>광고 종료일</label><input type="date" value={adEndDate} onChange={(e) => setAdEndDate(e.target.value)} className={inputClass} /></div>
          </div>
        </div>
      )}

      {/* Memo */}
      <div><label className={labelClass}>메모</label><textarea value={memo} onChange={(e) => setMemo(e.target.value)} className={`${inputClass} h-24 resize-none`} placeholder="이 소재에 대한 인사이트, 참고할 점 등을 기록하세요" /></div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="px-5 py-2.5 text-sm text-text-secondary bg-gray-100 rounded-full hover:bg-gray-200 transition-all font-medium">취소</button>
        <button type="submit" disabled={uploading || downloading} className="px-6 py-2.5 text-sm font-bold text-white bg-accent rounded-full hover:bg-accent-hover transition-all disabled:opacity-50 shadow-[0_2px_8px_rgba(230,0,35,0.2)]">
          {initial ? "수정하기" : "핔하기"}
        </button>
      </div>
    </form>
  );
}
