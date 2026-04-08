"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import LoginScreen from "@/components/LoginScreen";
import Toast from "@/components/Toast";
import UserAvatar from "@/components/UserAvatar";
import { useAuth } from "@/lib/auth";
import { categoryColor } from "@/lib/constants";
import type { Competitor, CompetitorLink } from "@/lib/db";

export default function CompetitorsPage() {
  const { userId, userName, getUserName } = useAuth();
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Competitor | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());

  // Form state
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formCatFocused, setFormCatFocused] = useState(false);
  const [formLinks, setFormLinks] = useState<CompetitorLink[]>([{ label: "", url: "" }]);
  const [formMemo, setFormMemo] = useState("");

  // 기존 경쟁사에서 사용된 카테고리 목록 추출
  const existingCategories = [...new Set(competitors.map((c) => c.category).filter(Boolean))];
  const catSuggestions = existingCategories.filter(
    (cat) => cat.toLowerCase().includes(formCategory.toLowerCase()) && cat !== formCategory
  );

  const fetchCompetitors = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/competitors");
    const data = await res.json();
    setCompetitors(data);
    if (data.length > 0 && !selectedId) setSelectedId(data[0].id);
    setLoading(false);
  }, [selectedId]);

  useEffect(() => {
    if (userId) fetchCompetitors();
  }, [userId, fetchCompetitors]);

  const selected = competitors.find((c) => c.id === selectedId) || null;
  const selectedLinks: CompetitorLink[] = selected ? JSON.parse(selected.links || "[]") : [];

  function openCreateForm() {
    setEditingItem(null);
    setFormName("");
    setFormCategory("");
    setFormLinks([{ label: "", url: "" }]);
    setFormMemo("");
    setShowForm(true);
  }

  function openEditForm(item: Competitor) {
    setEditingItem(item);
    setFormName(item.name);
    setFormCategory(item.category || "");
    const links: CompetitorLink[] = JSON.parse(item.links || "[]");
    setFormLinks(links.length > 0 ? links : [{ label: "", url: "" }]);
    setFormMemo(item.memo);
    setShowForm(true);
  }

  function addLinkRow() {
    setFormLinks([...formLinks, { label: "", url: "" }]);
  }

  function updateLink(index: number, field: "label" | "url", value: string) {
    const updated = [...formLinks];
    updated[index] = { ...updated[index], [field]: value };
    setFormLinks(updated);
  }

  function removeLink(index: number) {
    if (formLinks.length <= 1) return;
    setFormLinks(formLinks.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    if (!formName.trim()) return;
    const validLinks = formLinks.filter((l) => l.label.trim() && l.url.trim());

    if (editingItem) {
      await fetch(`/api/competitors/${editingItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formName, category: formCategory, links: validLinks, memo: formMemo }),
      });
      setToast("수정 완료!");
    } else {
      const res = await fetch("/api/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formName, category: formCategory, links: validLinks, memo: formMemo, created_by: userId }),
      });
      const data = await res.json();
      setSelectedId(data.id);
      setToast("등록 완료!");
    }
    setShowForm(false);
    fetchCompetitors();
  }

  async function handleDelete(id: string) {
    if (!confirm("정말 삭제하시겠어요?")) return;
    await fetch(`/api/competitors/${id}`, { method: "DELETE" });
    if (selectedId === id) {
      const remaining = competitors.filter((c) => c.id !== id);
      setSelectedId(remaining.length > 0 ? remaining[0].id : null);
    }
    setToast("삭제 완료!");
    fetchCompetitors();
  }

  if (!userId) return <LoginScreen />;

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-6">
              <Link href="/" className="text-xl font-black text-accent tracking-tight">핔잇</Link>
              <nav className="flex items-center gap-1">
                <Link href="/" className="px-3 py-1.5 text-sm font-medium text-text-secondary hover:text-text-primary rounded-lg hover:bg-gray-50 transition-colors">
                  소재
                </Link>
                <span className="px-3 py-1.5 text-sm font-medium text-accent bg-accent/5 rounded-lg">
                  경쟁사
                </span>
              </nav>
            </div>
            <div className="flex items-center gap-2">
              <UserAvatar userId={userId} size="sm" />
              <span className="text-sm text-text-secondary hidden sm:block">{userName}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      {loading ? (
        <div className="flex-1 flex justify-center items-center">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : competitors.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">🏢</div>
            <h2 className="text-xl font-bold text-text-primary mb-2">등록된 경쟁사가 없어요</h2>
            <p className="text-text-secondary mb-6">경쟁사를 추가하고 광고 라이브러리를 빠르게 확인해보세요</p>
            <button
              onClick={openCreateForm}
              className="bg-accent text-white px-6 py-2.5 rounded-xl font-bold hover:bg-accent-hover transition-colors"
            >
              + 경쟁사 추가하기
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex max-w-7xl mx-auto w-full">
          {/* Sidebar */}
          <aside className="w-60 shrink-0 bg-white overflow-y-auto shadow-[2px_0_12px_rgba(0,0,0,0.06)] z-10">
            <div className="p-3">
              <button
                onClick={openCreateForm}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-bold text-accent bg-accent/5 rounded-xl hover:bg-accent/10 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                추가
              </button>
            </div>
            <nav className="px-3 pb-3">
              {(() => {
                const grouped: Record<string, Competitor[]> = {};
                competitors.forEach((c) => {
                  const cat = c.category || "미분류";
                  if (!grouped[cat]) grouped[cat] = [];
                  grouped[cat].push(c);
                });
                const toggleCat = (cat: string) => {
                  setCollapsedCats((prev) => {
                    const next = new Set(prev);
                    if (next.has(cat)) next.delete(cat); else next.add(cat);
                    return next;
                  });
                };
                return Object.entries(grouped).map(([cat, comps]) => (
                  <div key={cat} className="mb-2">
                    <button
                      onClick={() => toggleCat(cat)}
                      className="w-full flex items-center justify-between px-1 py-1.5 group"
                    >
                      <span className="text-[11px] font-semibold text-text-muted group-hover:text-text-secondary transition-colors">{cat}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-text-muted/60">{comps.length}</span>
                        <svg className={`w-3 h-3 text-text-muted/40 transition-transform ${collapsedCats.has(cat) ? "-rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>
                    {!collapsedCats.has(cat) && comps.map((comp) => (
                      <button
                        key={comp.id}
                        onClick={() => setSelectedId(comp.id)}
                        className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-colors mb-0.5 ${
                          selectedId === comp.id
                            ? "bg-accent/5 text-accent"
                            : "text-text-secondary hover:bg-gray-50 hover:text-text-primary"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {selectedId === comp.id && (
                            <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                          )}
                          <span className="truncate">{comp.name}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                ));
              })()}
            </nav>
          </aside>

          {/* Detail panel */}
          {selected ? (
            <main className="flex-1 p-6 sm:p-8 overflow-y-auto">
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-text-primary">{selected.name}</h2>
                  {selected.category && (
                    <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full mt-1 ${categoryColor(selected.category)}`}>
                      {selected.category}
                    </span>
                  )}
                  {selected.memo && (
                    <p className="text-sm text-text-secondary mt-1">{selected.memo}</p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditForm(selected)}
                    className="p-2 text-text-muted hover:text-text-secondary rounded-lg hover:bg-gray-100 transition-colors"
                    title="수정"
                  >
                    <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(selected.id)}
                    className="p-2 text-text-muted hover:text-red-500 rounded-lg hover:bg-gray-100 transition-colors"
                    title="삭제"
                  >
                    <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Links */}
              {selectedLinks.length > 0 ? (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">바로가기</h3>
                  {selectedLinks.map((link, i) => (
                    <a
                      key={i}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-4 py-3 bg-white border border-gray-100 hover:border-accent/30 hover:bg-accent/5 rounded-xl text-sm transition-all group"
                    >
                      <svg className="w-5 h-5 text-text-muted group-hover:text-accent shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      <span className="font-medium text-text-primary group-hover:text-accent">{link.label}</span>
                      <span className="text-xs text-text-muted truncate max-w-xs hidden sm:block">{link.url}</span>
                      <svg className="w-4 h-4 text-text-muted group-hover:text-accent ml-auto shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-text-muted">
                  <p>등록된 링크가 없습니다</p>
                  <button
                    onClick={() => openEditForm(selected)}
                    className="mt-2 text-sm text-accent hover:text-accent-hover font-medium"
                  >
                    링크 추가하기
                  </button>
                </div>
              )}

              {/* Footer info */}
              <div className="flex items-center gap-1.5 mt-8 pt-4 border-t border-gray-100">
                {selected.created_by && <UserAvatar userId={selected.created_by} size="sm" />}
                <span className="text-xs text-text-muted">
                  {selected.created_by ? getUserName(selected.created_by) : ""}이 등록
                </span>
              </div>
            </main>
          ) : (
            <main className="flex-1 flex items-center justify-center text-text-muted">
              경쟁사를 선택해주세요
            </main>
          )}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-5">{editingItem ? "경쟁사 수정" : "경쟁사 추가"}</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">경쟁사/브랜드명</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="예: 닥터지, 올리브영"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                />
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-text-secondary mb-1">카테고리</label>
                <input
                  type="text"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  onFocus={() => setFormCatFocused(true)}
                  onBlur={() => setTimeout(() => setFormCatFocused(false), 150)}
                  placeholder="예: 다이어트 보조제, 스킨케어"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                />
                {formCatFocused && catSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 py-1 max-h-40 overflow-y-auto">
                    {catSuggestions.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onMouseDown={() => setFormCategory(cat)}
                        className="w-full text-left px-3 py-2 text-sm text-text-secondary hover:bg-accent/5 hover:text-accent transition-colors"
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">링크</label>
                <div className="space-y-2">
                  {formLinks.map((link, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        type="text"
                        value={link.label}
                        onChange={(e) => updateLink(i, "label", e.target.value)}
                        placeholder="이름 (예: Meta Ad Library)"
                        className="w-1/3 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                      />
                      <input
                        type="url"
                        value={link.url}
                        onChange={(e) => updateLink(i, "url", e.target.value)}
                        placeholder="URL"
                        className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                      />
                      {formLinks.length > 1 && (
                        <button onClick={() => removeLink(i)} className="p-2 text-text-muted hover:text-red-500 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={addLinkRow}
                  className="mt-2 text-sm text-accent hover:text-accent-hover font-medium transition-colors"
                >
                  + 링크 추가
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">메모</label>
                <textarea
                  value={formMemo}
                  onChange={(e) => setFormMemo(e.target.value)}
                  placeholder="메모 (선택)"
                  rows={2}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm font-medium text-text-secondary hover:bg-gray-50 rounded-xl transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSubmit}
                disabled={!formName.trim()}
                className="px-5 py-2 text-sm font-bold text-white bg-accent hover:bg-accent-hover rounded-xl transition-colors disabled:opacity-40"
              >
                {editingItem ? "수정" : "등록"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
