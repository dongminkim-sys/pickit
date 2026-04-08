"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import UserAvatar from "./UserAvatar";
import type { Comment } from "@/lib/db";

interface Props {
  referenceId: string;
}

export default function Comments({ referenceId }: Props) {
  const { userId, getUserName } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchComments = useCallback(async () => {
    const res = await fetch(`/api/references/${referenceId}/comments`);
    const data = await res.json();
    setComments(data);
  }, [referenceId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  async function handleSubmit() {
    if (!content.trim() || !userId) return;
    setSubmitting(true);
    await fetch(`/api/references/${referenceId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, content: content.trim() }),
    });
    setContent("");
    setSubmitting(false);
    fetchComments();
  }

  async function handleDelete(commentId: string) {
    await fetch(`/api/references/${referenceId}/comments/${commentId}`, { method: "DELETE" });
    fetchComments();
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "방금";
    if (mins < 60) return `${mins}분 전`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}시간 전`;
    const days = Math.floor(hours / 24);
    return `${days}일 전`;
  }

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold text-text-secondary flex items-center gap-1.5">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        댓글 {comments.length > 0 && <span className="text-text-muted font-normal">{comments.length}</span>}
      </h4>

      {/* Comment list */}
      {comments.length > 0 && (
        <div className="space-y-2.5 max-h-48 overflow-y-auto">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2.5 group">
              <UserAvatar userId={c.user_id} size="md" className="mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-text-primary">{getUserName(c.user_id)}</span>
                  <span className="text-[10px] text-text-muted">{timeAgo(c.created_at)}</span>
                  {c.user_id === userId && (
                    <button onClick={() => handleDelete(c.id)} className="text-[10px] text-text-muted hover:text-accent opacity-0 group-hover:opacity-100 transition-opacity">삭제</button>
                  )}
                </div>
                <p className="text-sm text-text-primary leading-relaxed">{c.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2 items-end">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); handleSubmit(); } }}
          placeholder="댓글을 남겨보세요..."
          className="flex-1 rounded-full bg-gray-100 px-4 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all"
        />
        <button
          onClick={handleSubmit}
          disabled={!content.trim() || submitting}
          className="px-3.5 py-2 bg-accent hover:bg-accent-hover disabled:opacity-30 text-white text-xs font-bold rounded-full transition-all shrink-0"
        >
          등록
        </button>
      </div>
    </div>
  );
}
