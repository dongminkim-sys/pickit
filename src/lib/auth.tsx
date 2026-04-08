"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import type { AppUser } from "./db";

interface AuthContextType {
  userId: string | null;
  userName: string | null;
  isAdmin: boolean;
  users: AppUser[];
  avatarUrls: Record<string, string>;
  login: (userId: string) => void;
  logout: () => void;
  updateAvatar: (userId: string, url: string) => void;
  refreshUsers: () => void;
  refreshAvatars: () => void;
  getUserName: (id: string) => string;
  getUserAvatar: (id: string) => string;
  getUserColor: (id: string) => string;
}

const AuthContext = createContext<AuthContextType>({
  userId: null,
  userName: null,
  isAdmin: false,
  users: [],
  avatarUrls: {},
  login: () => {},
  logout: () => {},
  updateAvatar: () => {},
  refreshUsers: () => {},
  refreshAvatars: () => {},
  getUserName: (id) => id,
  getUserAvatar: () => "?",
  getUserColor: () => "bg-gray-500",
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [avatarUrls, setAvatarUrls] = useState<Record<string, string>>({});

  const refreshUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      setUsers(data);
    } catch {}
  }, []);

  const refreshAvatars = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/profiles");
      const data = await res.json();
      setAvatarUrls(data);
    } catch {}
  }, []);

  useEffect(() => {
    refreshUsers().then(() => {
      const saved = localStorage.getItem("ad-ref-user");
      if (saved) {
        setUserId(saved);
        // Record visit on page load for returning users
        fetch("/api/visits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: saved }),
        }).catch(() => {});
      }
      setLoaded(true);
    });
    refreshAvatars();
  }, [refreshUsers, refreshAvatars]);

  function login(id: string) {
    setUserId(id);
    localStorage.setItem("ad-ref-user", id);
    refreshAvatars();
    // Record visit log
    fetch("/api/visits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: id }),
    }).catch(() => {});
  }

  function logout() {
    setUserId(null);
    localStorage.removeItem("ad-ref-user");
  }

  function updateAvatar(uid: string, url: string) {
    setAvatarUrls((prev) => ({ ...prev, [uid]: url }));
  }

  const getUserName = useCallback((id: string) => {
    return users.find((u) => u.id === id)?.name || id;
  }, [users]);

  const getUserAvatar = useCallback((id: string) => {
    return users.find((u) => u.id === id)?.avatar || "?";
  }, [users]);

  const getUserColor = useCallback((id: string) => {
    return users.find((u) => u.id === id)?.color || "bg-gray-500";
  }, [users]);

  const currentUser = users.find((u) => u.id === userId);
  const userName = currentUser?.name || null;
  const isAdmin = currentUser?.is_admin === 1;

  if (!loaded) return null;

  return (
    <AuthContext.Provider value={{
      userId, userName, isAdmin, users, avatarUrls,
      login, logout, updateAvatar, refreshUsers, refreshAvatars,
      getUserName, getUserAvatar, getUserColor,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
