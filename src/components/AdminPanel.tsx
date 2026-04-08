"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { AVATAR_COLOR_OPTIONS } from "@/lib/constants";
import UserAvatar from "./UserAvatar";
import type { AppUser } from "@/lib/db";

interface VisitLog {
  id: number;
  user_id: string;
  user_name: string;
  visited_at: string;
}

interface VisitSummary {
  user_id: string;
  user_name: string;
  visit_count: number;
  last_visit: string;
}

type Tab = "members" | "visits";

interface Props {
  onClose: () => void;
}

export default function AdminPanel({ onClose }: Props) {
  const { users, refreshUsers, userId: currentUserId } = useAuth();
  const [tab, setTab] = useState<Tab>("members");
  const [adding, setAdding] = useState(false);
  const [newId, setNewId] = useState("");
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("bg-blue-500");
  const [newIsAdmin, setNewIsAdmin] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Visit logs state
  const [visits, setVisits] = useState<VisitLog[]>([]);
  const [visitSummary, setVisitSummary] = useState<VisitSummary[]>([]);
  const [visitsLoading, setVisitsLoading] = useState(false);

  useEffect(() => {
    if (tab === "visits") {
      setVisitsLoading(true);
      fetch("/api/visits?limit=200")
        .then((r) => r.json())
        .then((data) => {
          setVisits(data.visits);
          setVisitSummary(data.summary);
        })
        .catch(() => {})
        .finally(() => setVisitsLoading(false));
    }
  }, [tab]);

  async function handleAdd() {
    if (!newId.trim() || !newName.trim()) {
      setError("아이디와 이름을 입력하세요.");
      return;
    }
    if (!/^[a-z0-9_]+$/.test(newId)) {
      setError("아이디는 영문 소문자, 숫자, 밑줄만 가능합니다.");
      return;
    }
    setLoading(true);
    setError("");
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: newId.trim(), name: newName.trim(), color: newColor, is_admin: newIsAdmin }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
    } else {
      setNewId("");
      setNewName("");
      setNewColor("bg-blue-500");
      setNewIsAdmin(false);
      setAdding(false);
      await refreshUsers();
    }
    setLoading(false);
  }

  async function handleDelete(user: AppUser) {
    if (user.id === currentUserId) {
      alert("자기 자신은 삭제할 수 없습니다.");
      return;
    }
    if (!confirm(`${user.name}님을 정말 삭제하시겠습니까?\n해당 사용자의 댓글과 즐겨찾기도 함께 삭제됩니다.`)) return;
    const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error);
    } else {
      await refreshUsers();
    }
  }

  async function toggleAdmin(user: AppUser) {
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_admin: user.is_admin ? 0 : 1 }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error);
    } else {
      await refreshUsers();
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[80vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-text-primary">관리</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-text-muted hover:bg-gray-200 transition-all">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-5 bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setTab("members")}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                tab === "members" ? "bg-white text-text-primary shadow-sm" : "text-text-muted hover:text-text-secondary"
              }`}
            >
              팀원 관리
            </button>
            <button
              onClick={() => setTab("visits")}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                tab === "visits" ? "bg-white text-text-primary shadow-sm" : "text-text-muted hover:text-text-secondary"
              }`}
            >
              방문 기록
            </button>
          </div>

          {/* Visit logs tab */}
          {tab === "visits" && (
            <div>
              {visitsLoading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="w-6 h-6 rounded-full border-2 border-gray-200 border-t-accent animate-spin" />
                </div>
              ) : (
                <>
                  {/* Summary - last 30 days */}
                  <div className="mb-5">
                    <h3 className="text-xs font-bold text-text-secondary mb-2">최근 30일 요약</h3>
                    <div className="space-y-2">
                      {visitSummary.map((s) => (
                        <div key={s.user_id} className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-xl">
                          <UserAvatar userId={s.user_id} size="sm" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-text-primary truncate">{s.user_name || s.user_id}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold text-text-primary">{s.visit_count}회</p>
                            <p className="text-[10px] text-text-muted">마지막 {formatVisitDate(s.last_visit)}</p>
                          </div>
                        </div>
                      ))}
                      {visitSummary.length === 0 && (
                        <p className="text-sm text-text-muted text-center py-6">아직 방문 기록이 없습니다.</p>
                      )}
                    </div>
                  </div>

                  {/* Recent visits detail */}
                  <div>
                    <h3 className="text-xs font-bold text-text-secondary mb-2">최근 방문</h3>
                    <div className="space-y-1 max-h-60 overflow-y-auto">
                      {visits.map((v) => (
                        <div key={v.id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded-lg transition-colors">
                          <UserAvatar userId={v.user_id} size="xs" />
                          <span className="text-sm text-text-primary font-medium">{v.user_name || v.user_id}</span>
                          <span className="text-xs text-text-muted ml-auto shrink-0">{formatVisitDate(v.visited_at)}</span>
                        </div>
                      ))}
                      {visits.length === 0 && (
                        <p className="text-sm text-text-muted text-center py-6">아직 방문 기록이 없습니다.</p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* User list (members tab) */}
          {tab === "members" && (
            <>
              <div className="space-y-3 mb-6">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-2xl">
                    <UserAvatar userId={user.id} size="lg" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-text-primary">{user.name}</p>
                        {user.is_admin === 1 && (
                          <span className="text-[10px] font-medium text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">관리자</span>
                        )}
                        {user.id === currentUserId && (
                          <span className="text-[10px] font-medium text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-full">나</span>
                        )}
                      </div>
                      <p className="text-xs text-text-muted">@{user.id}</p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        onClick={() => toggleAdmin(user)}
                        title={user.is_admin ? "관리자 해제" : "관리자 지정"}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                          user.is_admin ? "bg-amber-100 text-amber-600 hover:bg-amber-200" : "bg-gray-200 text-text-muted hover:bg-gray-300"
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </button>
                      {user.id !== currentUserId && (
                        <button
                          onClick={() => handleDelete(user)}
                          className="w-8 h-8 rounded-full bg-red-50 text-accent flex items-center justify-center hover:bg-red-100 transition-all"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Add new user */}
              {!adding ? (
                <button
                  onClick={() => { setAdding(true); setError(""); }}
                  className="w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl text-sm font-medium text-text-muted hover:border-accent hover:text-accent transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  새 팀원 추가
                </button>
              ) : (
                <div className="border-2 border-accent/20 rounded-2xl p-4 space-y-3">
                  <h3 className="text-sm font-bold text-text-primary">새 팀원 추가</h3>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-text-secondary mb-1">아이디 (영문)</label>
                      <input
                        type="text"
                        value={newId}
                        onChange={(e) => { setNewId(e.target.value.toLowerCase()); setError(""); }}
                        placeholder="예: gildong"
                        className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-text-secondary mb-1">이름</label>
                      <input
                        type="text"
                        value={newName}
                        onChange={(e) => { setNewName(e.target.value); setError(""); }}
                        placeholder="예: 홍길동"
                        className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-text-secondary mb-1.5">아바타 색상</label>
                    <div className="flex flex-wrap gap-2">
                      {AVATAR_COLOR_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setNewColor(opt.value)}
                          className={`w-8 h-8 rounded-full ${opt.value} transition-all ${
                            newColor === opt.value ? "ring-2 ring-offset-2 ring-gray-400 scale-110" : "hover:scale-105"
                          }`}
                          title={opt.label}
                        />
                      ))}
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={newIsAdmin} onChange={(e) => setNewIsAdmin(e.target.checked)} className="rounded" />
                    <span className="text-sm text-text-secondary">관리자 권한 부여</span>
                  </label>

                  {error && <p className="text-xs text-accent">{error}</p>}

                  <div className="flex gap-2 justify-end">
                    <button onClick={() => { setAdding(false); setError(""); }} className="px-4 py-2 text-sm text-text-secondary bg-gray-100 rounded-full hover:bg-gray-200 transition-all">취소</button>
                    <button onClick={handleAdd} disabled={loading} className="px-4 py-2 text-sm font-bold text-white bg-accent rounded-full hover:bg-accent-hover disabled:opacity-50 transition-all">
                      {loading ? "추가 중..." : "추가"}
                    </button>
                  </div>
                </div>
              )}

              <p className="text-[11px] text-text-muted mt-4 text-center">새 팀원은 첫 로그인 시 비밀번호가 자동 등록됩니다.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function formatVisitDate(dateStr: string): string {
  const date = new Date(dateStr + "Z");
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "방금 전";
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffHour < 24) return `${diffHour}시간 전`;
  if (diffDay < 7) return `${diffDay}일 전`;

  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${month}/${day} ${hours}:${minutes}`;
}
