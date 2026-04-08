"use client";

import { useState, useEffect, useCallback } from "react";
import ReferenceCard from "@/components/ReferenceCard";
import ReferenceForm from "@/components/ReferenceForm";
import ReferenceDetail from "@/components/ReferenceDetail";
import LoginScreen from "@/components/LoginScreen";
import Toast from "@/components/Toast";
import AdminPanel from "@/components/AdminPanel";
import { PLATFORMS } from "@/lib/constants";
import { useAuth } from "@/lib/auth";
import { getGreeting, getToastMessage, getEmptyMessage } from "@/lib/pickit-copy";
import type { AdReference, Competitor, CompetitorLink } from "@/lib/db";

type View = "gallery" | "create" | "edit";

export default function Home() {
  const { userId, userName, isAdmin, avatarUrls, logout, updateAvatar, getUserAvatar, getUserColor } = useAuth();
  const [showAdmin, setShowAdmin] = useState(false);
  const [items, setItems] = useState<AdReference[]>([]);
  const [view, setView] = useState<View>("gallery");
  const [selectedItem, setSelectedItem] = useState<AdReference | null>(null);
  const [detailItem, setDetailItem] = useState<AdReference | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [greeting, setGreeting] = useState("");

  const [platform, setPlatform] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("created_at");
  const [order, setOrder] = useState("desc");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [showCompSidebar, setShowCompSidebar] = useState(true);
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());
  const [expandedCompId, setExpandedCompId] = useState<string | null>(null);

  const fetchCompetitors = useCallback(async () => {
    const res = await fetch("/api/competitors");
    setCompetitors(await res.json());
  }, []);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (platform) params.set("platform", platform);
    if (search) params.set("search", search);
    params.set("sort", sort);
    params.set("order", order);
    const res = await fetch(`/api/references?${params}`);
    const data = await res.json();
    setItems(data);
    setLoading(false);
  }, [platform, search, sort, order]);

  const fetchFavorites = useCallback(async () => {
    if (!userId) return;
    const res = await fetch(`/api/favorites?user_id=${userId}`);
    const ids: string[] = await res.json();
    setFavorites(new Set(ids));
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchItems();
      fetchFavorites();
      fetchCompetitors();
      setGreeting(getGreeting(userName || ""));
    }
  }, [fetchItems, fetchFavorites, fetchCompetitors, userId]);

  if (!userId) return <LoginScreen />;

  async function handleCreate(data: Partial<AdReference>) {
    await fetch("/api/references", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, created_by: userId }),
    });
    setView("gallery");
    setToast(getToastMessage());
    fetchItems();
  }

  async function handleUpdate(data: Partial<AdReference>) {
    if (!selectedItem) return;
    await fetch(`/api/references/${selectedItem.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setView("gallery");
    setSelectedItem(null);
    setDetailItem(null);
    setToast("수정 완료!");
    fetchItems();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/references/${id}`, { method: "DELETE" });
    setDetailItem(null);
    setToast("소재가 삭제되었어요.");
    fetchItems();
  }

  async function handleToggleFavorite(referenceId: string) {
    const res = await fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, reference_id: referenceId }),
    });
    const data = await res.json();
    setFavorites((prev) => {
      const next = new Set(prev);
      if (data.favorited) next.add(referenceId);
      else next.delete(referenceId);
      return next;
    });
  }

  const displayItems = showFavoritesOnly ? items.filter((i) => favorites.has(i.id)) : items;

  const platformCounts = items.reduce((acc, item) => {
    acc[item.platform] = (acc[item.platform] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Count picks per user (for profile dropdown)
  const myPickCount = items.filter((i) => i.created_by === userId).length;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-[1800px] mx-auto px-5 h-[60px] flex items-center gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2.5 shrink-0 cursor-pointer" onClick={() => { setView("gallery"); setPlatform(""); setSearch(""); }}>
            <div className="w-8 h-8 bg-accent rounded-xl flex items-center justify-center shadow-[0_2px_8px_rgba(230,0,35,0.2)]">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </div>
            <span className="text-[17px] font-extrabold text-text-primary hidden sm:block tracking-tight">핔잇</span>
          </div>

          {/* Nav tabs */}
          <nav className="flex items-center gap-1 shrink-0">
            <span className="px-3 py-1.5 text-sm font-medium text-accent bg-accent/5 rounded-lg">소재</span>
            <button
              onClick={() => setShowCompSidebar(!showCompSidebar)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors inline-flex items-center gap-1 ${
                showCompSidebar ? "text-accent bg-accent/5" : "text-text-secondary hover:text-text-primary hover:bg-gray-50"
              }`}
            >
              경쟁사
            </button>
          </nav>

          {/* Greeting */}
          <p className="text-sm text-text-secondary hidden lg:block truncate max-w-sm font-medium">{greeting}</p>

          {/* Search */}
          <div className="relative flex-1 max-w-xl ml-auto">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="소재 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-full bg-gray-100 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:bg-white focus:ring-2 focus:ring-gray-200 transition-all"
            />
          </div>

          {/* Platform pills */}
          <div className="hidden md:flex gap-1.5 shrink-0">
            <button onClick={() => { setView("gallery"); setPlatform(""); setShowFavoritesOnly(false); }}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all ${!platform && !showFavoritesOnly ? "bg-gray-900 text-white" : "bg-gray-100 text-text-secondary hover:bg-gray-200"}`}>
              전체 {items.length > 0 && <span className="ml-1 opacity-70">{items.length}</span>}
            </button>
            <button onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all flex items-center gap-1 ${
                showFavoritesOnly ? "bg-accent text-white" : "bg-gray-100 text-text-secondary hover:bg-gray-200"
              }`}>
              <svg className="w-3 h-3" fill={showFavoritesOnly ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {favorites.size > 0 && <span className="opacity-70">{favorites.size}</span>}
            </button>
            {PLATFORMS.map((p) => (
              <button key={p.value} onClick={() => setPlatform(platform === p.value ? "" : p.value)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all ${
                  platform === p.value ? "bg-gray-900 text-white" : "bg-gray-100 text-text-secondary hover:bg-gray-200"
                }`}>
                {p.label} {platformCounts[p.value] > 0 && <span className="ml-0.5 opacity-70">{platformCounts[p.value]}</span>}
              </button>
            ))}
          </div>

          {/* Sort */}
          <select value={`${sort}-${order}`}
            onChange={(e) => { const [s, o] = e.target.value.split("-"); setSort(s); setOrder(o); }}
            className="hidden sm:block px-3 py-2 rounded-full bg-gray-100 text-xs text-text-secondary focus:outline-none cursor-pointer">
            <option value="created_at-desc">최신순</option>
            <option value="created_at-asc">오래된순</option>
            <option value="views-desc">조회수순</option>
            <option value="likes-desc">좋아요순</option>
            <option value="active_days-desc">활성기간순</option>
          </select>

          {/* Create button */}
          <button onClick={() => { setView("create"); setSelectedItem(null); }}
            className="px-4 py-2.5 bg-accent hover:bg-accent-hover text-white text-sm font-bold rounded-full transition-all shrink-0 shadow-[0_2px_8px_rgba(230,0,35,0.2)]">
            + 핔하기
          </button>

          {/* User menu */}
          <div className="relative group shrink-0">
            {avatarUrls[userId!] ? (
              <img src={avatarUrls[userId!]} alt="" className="w-9 h-9 rounded-full object-cover ring-2 ring-white cursor-pointer" />
            ) : (
              <button className={`w-9 h-9 ${getUserColor(userId)} rounded-full flex items-center justify-center text-white text-xs font-bold ring-2 ring-white`}>
                {getUserAvatar(userId)}
              </button>
            )}
            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              <div className="px-4 py-2.5 border-b border-gray-100">
                <p className="text-sm font-bold text-text-primary">{userName}</p>
                <p className="text-[11px] text-text-muted mt-0.5">{myPickCount}개 핔</p>
              </div>
              <label className="w-full text-left px-4 py-2.5 text-sm text-text-secondary hover:bg-gray-50 transition-colors cursor-pointer flex items-center gap-2">
                <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                프로필 사진 변경
                <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file || !userId) return;
                  const formData = new FormData();
                  formData.append("file", file);
                  const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
                  const { url } = await uploadRes.json();
                  await fetch("/api/auth/profile", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ user_id: userId, avatar_url: url }),
                  });
                  updateAvatar(userId, url);
                }} />
              </label>
              {isAdmin && (
                <button onClick={() => setShowAdmin(true)} className="w-full text-left px-4 py-2.5 text-sm text-text-secondary hover:bg-gray-50 transition-colors flex items-center gap-2">
                  <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                  팀원 관리
                </button>
              )}
              <button onClick={logout} className="w-full text-left px-4 py-2.5 text-sm text-text-secondary hover:bg-gray-50 transition-colors">로그아웃</button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex flex-1">
        {/* Competitor sidebar */}
        {showCompSidebar && (
          <aside className="w-60 shrink-0 bg-white sticky top-[60px] h-[calc(100vh-60px)] overflow-y-auto hidden sm:block shadow-[2px_0_12px_rgba(0,0,0,0.06)] z-10">
            <div className="p-3">
              <a href="/competitors" className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-bold text-accent bg-accent/5 rounded-xl hover:bg-accent/10 transition-colors">
                경쟁사 관리
              </a>
            </div>
            {competitors.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-xs text-text-muted mb-2">등록된 경쟁사가 없어요</p>
                <a href="/competitors" className="text-xs text-accent font-medium hover:text-accent-hover">+ 추가하기</a>
              </div>
            ) : (
              <nav className="px-3 pb-3">
                {(() => {
                  const grouped: Record<string, typeof competitors> = {};
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
                      {!collapsedCats.has(cat) && comps.map((comp) => {
                        const links: CompetitorLink[] = JSON.parse(comp.links || "[]");
                        const isExpanded = expandedCompId === comp.id;
                        return (
                          <div key={comp.id}>
                            <button
                              onClick={() => setExpandedCompId(isExpanded ? null : comp.id)}
                              className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-colors mb-0.5 flex items-center gap-2 ${
                                isExpanded
                                  ? "bg-accent/5 text-accent"
                                  : "text-text-secondary hover:bg-gray-50 hover:text-text-primary"
                              }`}
                            >
                              {isExpanded && <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />}
                              <span className="truncate">{comp.name}</span>
                              {links.length > 0 && (
                                <svg className={`w-3 h-3 shrink-0 ml-auto transition-transform ${isExpanded ? "rotate-180" : ""} ${isExpanded ? "text-accent/50" : "text-text-muted/30"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              )}
                            </button>
                            {isExpanded && links.length > 0 && (
                              <div className="ml-3 mb-1 pl-2 border-l-2 border-accent/10">
                                {links.map((link, i) => (
                                  <a
                                    key={i}
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-2 py-1.5 text-xs text-text-secondary hover:text-accent rounded-lg transition-colors"
                                  >
                                    <svg className="w-3 h-3 shrink-0 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                    <span className="truncate">{link.label}</span>
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ));
                })()}
              </nav>
            )}
          </aside>
        )}

        <main className="flex-1 max-w-[1800px] mx-auto px-5 py-6">
        {view === "gallery" && (
          <>
            {/* Mobile platform filter */}
            <div className="flex md:hidden gap-1.5 mb-4 overflow-x-auto pb-2">
              <button onClick={() => { setPlatform(""); setShowFavoritesOnly(false); }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-full shrink-0 ${!platform && !showFavoritesOnly ? "bg-gray-900 text-white" : "bg-gray-100 text-text-secondary"}`}>전체</button>
              <button onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-full shrink-0 flex items-center gap-1 ${showFavoritesOnly ? "bg-accent text-white" : "bg-gray-100 text-text-secondary"}`}>
                <svg className="w-3 h-3" fill={showFavoritesOnly ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
              </button>
              {PLATFORMS.map((p) => (
                <button key={p.value} onClick={() => setPlatform(platform === p.value ? "" : p.value)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-full shrink-0 ${platform === p.value ? "bg-gray-900 text-white" : "bg-gray-100 text-text-secondary"}`}>{p.label}</button>
              ))}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 rounded-full border-2 border-gray-200 border-t-accent animate-spin" />
              </div>
            ) : displayItems.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                </div>
                <p className="text-text-muted text-sm whitespace-pre-line mb-5">{getEmptyMessage(platform)}</p>
                <button onClick={() => setView("create")}
                  className="px-5 py-2.5 bg-accent text-white text-sm font-bold rounded-full hover:bg-accent-hover transition-all shadow-[0_2px_8px_rgba(230,0,35,0.2)]">
                  첫 소재 핔하기
                </button>
              </div>
            ) : (
              <div className={`gap-4 ${showCompSidebar ? "columns-2 sm:columns-2 lg:columns-3 xl:columns-4 2xl:columns-5" : "columns-2 sm:columns-3 lg:columns-4 xl:columns-5 2xl:columns-6"}`}>
                {displayItems.map((item) => (
                  <ReferenceCard key={item.id} item={item} onDetail={() => setDetailItem(item)} isFavorited={favorites.has(item.id)} onToggleFavorite={() => handleToggleFavorite(item.id)} />
                ))}
              </div>
            )}
          </>
        )}

        {(view === "create" || view === "edit") && (
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-3 mb-5">
              <button onClick={() => { setView("gallery"); setSelectedItem(null); }}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-text-muted hover:bg-gray-200 transition-all">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <h2 className="text-lg font-bold text-text-primary">{view === "create" ? "새 소재 핔하기" : "소재 수정"}</h2>
            </div>
            <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm">
              <ReferenceForm
                initial={view === "edit" ? selectedItem ?? undefined : undefined}
                onSubmit={view === "create" ? handleCreate : handleUpdate}
                onCancel={() => { setView("gallery"); setSelectedItem(null); }}
              />
            </div>
          </div>
        )}
      </main>
      </div>

      {/* Detail Modal */}
      {detailItem && (
        <ReferenceDetail
          item={detailItem}
          onClose={() => setDetailItem(null)}
          onEdit={() => { setSelectedItem(detailItem); setDetailItem(null); setView("edit"); }}
          onDelete={() => handleDelete(detailItem.id)}
          onItemUpdate={(updated) => {
            setDetailItem(updated);
            setItems((prev) => prev.map((i) => i.id === updated.id ? updated : i));
          }}
        />
      )}

      {/* Admin Panel */}
      {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />}

      {/* Toast */}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
