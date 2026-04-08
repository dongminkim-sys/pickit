"use client";

import { useRef, useState, useEffect } from "react";
import { AdReference } from "@/lib/db";
import { formatNumber, platformColor, platformLabel, categoryColor } from "@/lib/constants";
import { useAuth } from "@/lib/auth";
import UserAvatar from "./UserAvatar";

interface Props {
  item: AdReference;
  onDetail: () => void;
  isFavorited?: boolean;
  onToggleFavorite?: () => void;
}

export default function ReferenceCard({ item, onDetail, isFavorited, onToggleFavorite }: Props) {
  const { getUserName } = useAuth();
  const hasData = item.platform !== "gfa";
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [detectedRatio, setDetectedRatio] = useState<number | null>(null);

  const isVideo = item.media_type === "video";
  const hasVideoFile =
    isVideo && item.media_url && !item.media_url.includes("youtube") && !item.media_url.includes("youtu.be");

  const ratio = item.aspect_ratio || detectedRatio || (16 / 9);

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  }

  function handleLoadedMetadata() {
    if (videoRef.current && !item.aspect_ratio) {
      const v = videoRef.current;
      if (v.videoWidth && v.videoHeight) setDetectedRatio(v.videoWidth / v.videoHeight);
    }
  }

  function togglePlay(e: React.MouseEvent) {
    e.stopPropagation();
    if (!hasVideoFile || !videoRef.current) return;
    if (playing) {
      videoRef.current.pause();
      setPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setPlaying(true);
    }
  }

  useEffect(() => {
    if (!hasVideoFile || !videoRef.current) return;
    const video = videoRef.current;
    const observer = new IntersectionObserver(
      ([entry]) => { if (!entry.isIntersecting && playing) { video.pause(); setPlaying(false); } },
      { threshold: 0.3 }
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [hasVideoFile, playing]);

  return (
    <div className="group rounded-2xl bg-white overflow-hidden break-inside-avoid mb-4 shadow-sm hover:shadow-lg transition-all duration-200">
      {/* Media */}
      <div className={`relative overflow-hidden bg-gray-100 cursor-pointer`} style={hasVideoFile ? { aspectRatio: `${ratio}` } : (isVideo && item.aspect_ratio) ? { aspectRatio: `${item.aspect_ratio}` } : undefined}>
        {hasVideoFile ? (
          <>
            <video
              ref={videoRef}
              src={item.media_url}
              loop
              playsInline
              preload="metadata"
              poster={item.thumbnail_url || undefined}
              onLoadedMetadata={handleLoadedMetadata}
              onClick={togglePlay}
              className="w-full h-full object-contain"
              controls={playing}
            />
            {!playing && (
              <div className="absolute inset-0 flex items-center justify-center" onClick={togglePlay}>
                <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center hover:bg-accent transition-all hover:scale-110">
                  <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            )}
          </>
        ) : (item.thumbnail_url || item.media_url) ? (
          <img
            src={item.thumbnail_url || item.media_url}
            alt={item.title}
            onClick={onDetail}
            className={`w-full group-hover:scale-105 transition-transform duration-500 ${isVideo && item.aspect_ratio ? "h-full object-cover" : ""}`}
          />
        ) : (
          <div className="flex items-center justify-center text-gray-300" style={{ aspectRatio: "16/9" }} onClick={onDetail}>
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
            </svg>
          </div>
        )}

        {/* Badges (hidden during playback) */}
        {!playing && (
          <>
            {isVideo && (
              <span className="absolute top-2.5 right-2.5 bg-black/50 text-white px-1.5 py-0.5 text-[10px] rounded-full flex items-center gap-1">
                <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                영상
              </span>
            )}
            {onToggleFavorite && (
              <button
                onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
                className={`absolute bottom-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  isFavorited ? "bg-accent text-white" : "bg-black/30 text-white hover:bg-accent/80"
                }`}
              >
                <svg className="w-4 h-4" fill={isFavorited ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </button>
            )}
          </>
        )}
      </div>

      {/* Info */}
      <div className="px-3.5 pt-3 pb-3.5 cursor-pointer" onClick={onDetail}>
        <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-full border mb-2.5 -ml-0.5 ${platformColor(item.platform)}`}>
          {platformLabel(item.platform)}
        </span>
        <h3 className="font-bold text-sm text-text-primary leading-snug line-clamp-2">{item.title}</h3>

        {item.brand && (
          <p className="text-[13px] text-text-secondary mt-1">{item.brand}</p>
        )}

        {hasData && (item.views !== null || item.likes !== null || item.active_days !== null) && (
          <div className="flex items-center gap-3 mt-2 text-xs text-text-secondary">
            {item.views !== null && (
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                {formatNumber(item.views)}
              </span>
            )}
            {item.likes !== null && (
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                {formatNumber(item.likes)}
              </span>
            )}
            {item.active_days !== null && <span className="font-medium">{item.active_days}일</span>}
          </div>
        )}

        {/* Tags */}
        {item.tags && (
          <div className="flex flex-wrap gap-1 mt-2">
            {item.tags.split(",").slice(0, 3).map((tag, i) => (
              <span key={i} className="text-[11px] text-text-secondary bg-gray-50 px-2 py-0.5 rounded-full">#{tag.trim()}</span>
            ))}
            {item.tags.split(",").length > 3 && (
              <span className="text-[11px] text-text-muted">+{item.tags.split(",").length - 3}</span>
            )}
          </div>
        )}

        {/* Creator + Category row */}
        <div className="flex items-center justify-between mt-2.5">
          <div className="flex items-center gap-1.5">
            {item.created_by && (
              <>
                <UserAvatar userId={item.created_by} size="sm" />
                <span className="text-xs text-text-secondary">{getUserName(item.created_by)}</span>
              </>
            )}
            {item.created_at && (
              <span className="text-[11px] text-text-muted">{formatDate(item.created_at)}</span>
            )}
          </div>
          {item.category && (
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${categoryColor(item.category)}`}>
              {item.category}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
