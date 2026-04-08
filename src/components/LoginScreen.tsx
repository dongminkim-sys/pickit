"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import UserAvatar from "./UserAvatar";

export default function LoginScreen() {
  const { login, users } = useAuth();
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string } | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!selectedUser || !password) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: selectedUser.id, password }),
      });
      const data = await res.json();
      if (res.ok) {
        login(selectedUser.id);
      } else {
        setError(data.error || "로그인 실패");
      }
    } catch {
      setError("서버 연결에 실패했습니다.");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-accent rounded-2xl mb-5 shadow-[0_4px_20px_rgba(230,0,35,0.25)]">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </div>
          <h1 className="text-4xl font-extrabold text-text-primary tracking-tight">핔잇</h1>
          <p className="text-lg text-text-secondary mt-3 leading-relaxed font-medium">또 찾지 말고, 이젠 핔잇.</p>
        </div>

        {!selectedUser ? (
          /* Step 1: User selection */
          <div className="space-y-2.5">
            {users.map((user) => (
              <button
                key={user.id}
                onClick={() => { setSelectedUser(user); setPassword(""); setError(""); }}
                className="w-full flex items-center gap-4 px-5 py-3.5 bg-white border-2 border-gray-100 rounded-2xl hover:border-accent/50 hover:shadow-md transition-all group"
              >
                <UserAvatar userId={user.id} size="lg" />
                <span className="text-[15px] font-semibold text-text-primary group-hover:text-accent transition-colors">
                  {user.name}
                </span>
                <svg className="w-4 h-4 text-gray-300 ml-auto group-hover:text-accent transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        ) : (
          /* Step 2: Password input */
          <div className="space-y-4">
            <button
              onClick={() => { setSelectedUser(null); setPassword(""); setError(""); }}
              className="flex items-center gap-2 text-sm text-text-muted hover:text-text-secondary transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              다른 계정
            </button>

            <div className="flex items-center gap-4 px-5 py-3.5 bg-gray-50 rounded-2xl">
              <UserAvatar userId={selectedUser.id} size="lg" />
              <span className="text-[15px] font-semibold text-text-primary">{selectedUser.name}</span>
            </div>

            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) handleLogin(); }}
                placeholder="비밀번호를 입력하세요"
                autoFocus
                className="w-full px-5 py-3.5 bg-white border-2 border-gray-100 rounded-2xl text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent/50 focus:shadow-md transition-all"
              />
              {error && <p className="text-xs text-accent mt-2 pl-1">{error}</p>}
              <p className="text-xs text-text-muted mt-2 pl-1">처음 로그인하면 입력한 비밀번호가 자동으로 등록됩니다.</p>
            </div>

            <button
              onClick={handleLogin}
              disabled={!password || loading}
              className="w-full py-3.5 bg-accent hover:bg-accent-hover disabled:opacity-40 text-white text-sm font-bold rounded-2xl transition-all shadow-[0_2px_8px_rgba(230,0,35,0.2)]"
            >
              {loading ? "로그인 중..." : "로그인"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
