"use client";

import { useState } from "react";
import { AdReference } from "@/lib/db";
import { formatNumber, platformColor, platformLabel, categoryColor } from "@/lib/constants";
import { useAuth } from "@/lib/auth";
import UserAvatar from "./UserAvatar";
import Comments from "./Comments";

interface Props {
  item: AdReference;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onItemUpdate?: (updated: AdReference) => void;
}

export default function ReferenceDetail({ item, onClose, onEdit, onDelete, onItemUpdate }: Props) {
  const { getUserName } = useAuth();
  const hasData = item.platform !== "gfa";
  const isEmbeddableVideo = item.media_type === "video" && item.media_url && (item.media_url.includes("youtube") || item.media_url.includes("youtu.be"));
  const isDirectVideo = item.media_type === "video" && item.media_url && !isEmbeddableVideo;
  const canTranscribe = isDirectVideo && item.media_url.startsWith("/");

  const [transcript, setTranscript] = useState(item.transcript || "");
  const [extracting, setExtracting] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleTranscribe() {
    setExtracting(true);
    try {
      const res = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ video_url: item.media_url }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "추출 실패");
      }
      const data = await res.json();
      setTranscript(data.formatted);

      // Save to DB and update parent state
      await fetch(`/api/references/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: data.formatted }),
      });
      onItemUpdate?.({ ...item, transcript: data.formatted });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "스크립트 추출에 실패했습니다.");
    }
    setExtracting(false);
  }

  function handleCopy() {
    navigator.clipboard.writeText(transcript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Media */}
        <div className="relative aspect-video bg-gray-100 rounded-t-3xl overflow-hidden">
          {isEmbeddableVideo ? (
            <iframe src={item.media_url.replace("watch?v=", "embed/")} className="w-full h-full" allowFullScreen />
          ) : isDirectVideo ? (
            <video src={item.media_url} controls autoPlay className="w-full h-full object-contain bg-black" />
          ) : item.thumbnail_url || item.media_url ? (
            <img src={item.thumbnail_url || item.media_url} alt={item.title} className="w-full h-full object-contain" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300 text-sm">미디어 없음</div>
          )}
          <button onClick={onClose} className="absolute top-3 right-3 bg-white/80 hover:bg-white text-gray-600 w-8 h-8 rounded-full flex items-center justify-center transition-all shadow">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full border ${platformColor(item.platform)}`}>
                  {platformLabel(item.platform)}
                </span>
                <span className="text-[11px] text-text-muted bg-gray-100 px-2 py-0.5 rounded-full">
                  {item.media_type === "video" ? "영상" : "이미지"}
                </span>
                {item.category && (
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${categoryColor(item.category)}`}>{item.category}</span>
                )}
              </div>
              <h2 className="text-lg font-bold text-text-primary">{item.title}</h2>
              {item.brand && <p className="text-sm text-text-secondary mt-0.5">{item.brand}</p>}
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={onEdit} className="px-3.5 py-1.5 text-xs font-medium text-text-secondary bg-gray-100 rounded-full hover:bg-gray-200 transition-all">수정</button>
              <button onClick={() => { if (confirm("정말 삭제하시겠습니까?")) onDelete(); }} className="px-3.5 py-1.5 text-xs font-medium text-accent bg-red-50 rounded-full hover:bg-red-100 transition-all">삭제</button>
            </div>
          </div>

          {/* Creator */}
          {item.created_by && (
            <div className="flex items-center gap-2">
              <UserAvatar userId={item.created_by} size="md" />
              <span className="text-sm text-text-secondary">{getUserName(item.created_by)}님이 핔</span>
              <span className="text-xs text-text-muted">· {new Date(item.created_at).toLocaleDateString("ko-KR")}</span>
            </div>
          )}

          {/* Stats */}
          {hasData && (item.views !== null || item.likes !== null || item.active_days !== null) && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {item.views !== null && (
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-text-muted mb-0.5">조회수</p>
                  <p className="text-lg font-bold text-text-primary">{formatNumber(item.views)}</p>
                </div>
              )}
              {item.likes !== null && (
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-text-muted mb-0.5">좋아요</p>
                  <p className="text-lg font-bold text-text-primary">{formatNumber(item.likes)}</p>
                </div>
              )}
              {item.active_days !== null && (
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-text-muted mb-0.5">활성 기간</p>
                  <p className="text-lg font-bold text-text-primary">{item.active_days}<span className="text-sm font-normal text-text-muted">일</span></p>
                </div>
              )}
              {item.ad_start_date && (
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-text-muted mb-0.5">광고 기간</p>
                  <p className="text-xs font-medium text-text-primary leading-relaxed">
                    {item.ad_start_date}{item.ad_end_date && <><br />~ {item.ad_end_date}</>}
                  </p>
                </div>
              )}
            </div>
          )}

          {item.tags && (
            <div className="flex flex-wrap gap-1.5">
              {item.tags.split(",").map((tag, i) => (
                <span key={i} className="bg-gray-100 text-text-secondary text-[11px] px-2.5 py-1 rounded-full">#{tag.trim()}</span>
              ))}
            </div>
          )}

          {item.memo && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-[10px] font-semibold text-amber-700 mb-1">메모</p>
              <p className="text-sm text-amber-900 whitespace-pre-wrap leading-relaxed">{item.memo}</p>
            </div>
          )}

          {/* Transcript */}
          {canTranscribe && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-blue-700 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  스크립트
                </h4>
                <div className="flex gap-2">
                  {transcript && (
                    <button onClick={handleCopy} className="text-[11px] font-medium text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1">
                      {copied ? (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          복사됨
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                          복사
                        </>
                      )}
                    </button>
                  )}
                  <button
                    onClick={handleTranscribe}
                    disabled={extracting}
                    className="text-[11px] font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50 transition-colors flex items-center gap-1"
                  >
                    {extracting ? (
                      <>
                        <div className="w-3 h-3 rounded-full border-2 border-blue-300 border-t-blue-600 animate-spin" />
                        추출 중...
                      </>
                    ) : transcript ? (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        다시 추출
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                        스크립트 추출
                      </>
                    )}
                  </button>
                </div>
              </div>
              {transcript ? (
                <pre className="text-sm text-blue-900 whitespace-pre-wrap leading-relaxed font-sans max-h-60 overflow-y-auto">{transcript}</pre>
              ) : (
                <p className="text-sm text-blue-400">영상의 음성을 자동으로 텍스트로 변환합니다.</p>
              )}
            </div>
          )}

          {item.media_url && !item.media_url.startsWith("/") && (
            <a href={item.media_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
              원본 링크 열기
            </a>
          )}

          {/* Comments */}
          <div className="border-t border-gray-100 pt-4">
            <Comments referenceId={item.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
