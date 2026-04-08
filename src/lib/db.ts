import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "references.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    const fs = require("fs");
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initDb(db);
  }
  return db;
}

function initDb(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS references_ad (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      brand TEXT NOT NULL DEFAULT '',
      platform TEXT NOT NULL CHECK(platform IN ('meta', 'youtube', 'tiktok', 'gfa')),
      media_type TEXT NOT NULL CHECK(media_type IN ('video', 'image')),
      media_url TEXT NOT NULL DEFAULT '',
      thumbnail_url TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT '',
      tags TEXT NOT NULL DEFAULT '',
      likes INTEGER,
      views INTEGER,
      ad_start_date TEXT,
      ad_end_date TEXT,
      active_days INTEGER,
      memo TEXT NOT NULL DEFAULT '',
      aspect_ratio REAL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_platform ON references_ad(platform);
    CREATE INDEX IF NOT EXISTS idx_category ON references_ad(category);
    CREATE INDEX IF NOT EXISTS idx_created_at ON references_ad(created_at);

    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      reference_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (reference_id) REFERENCES references_ad(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_comments_ref ON comments(reference_id);

    CREATE TABLE IF NOT EXISTS user_passwords (
      user_id TEXT PRIMARY KEY,
      password_hash TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_profiles (
      user_id TEXT PRIMARY KEY,
      avatar_url TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      avatar TEXT NOT NULL DEFAULT '',
      color TEXT NOT NULL DEFAULT 'bg-gray-500',
      is_admin INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS favorites (
      user_id TEXT NOT NULL,
      reference_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, reference_id),
      FOREIGN KEY (reference_id) REFERENCES references_ad(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS visit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      visited_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_visit_logs_user ON visit_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_visit_logs_at ON visit_logs(visited_at);

    CREATE TABLE IF NOT EXISTS competitors (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      links TEXT NOT NULL DEFAULT '[]',
      memo TEXT NOT NULL DEFAULT '',
      created_by TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Migrations
  const cols = db.prepare("PRAGMA table_info(references_ad)").all() as { name: string }[];
  if (!cols.find((c) => c.name === "aspect_ratio")) {
    db.exec("ALTER TABLE references_ad ADD COLUMN aspect_ratio REAL");
  }
  if (!cols.find((c) => c.name === "created_by")) {
    db.exec("ALTER TABLE references_ad ADD COLUMN created_by TEXT NOT NULL DEFAULT ''");
  }
  if (!cols.find((c) => c.name === "transcript")) {
    db.exec("ALTER TABLE references_ad ADD COLUMN transcript TEXT NOT NULL DEFAULT ''");
  }
  if (!cols.find((c) => c.name === "ad_url")) {
    db.exec("ALTER TABLE references_ad ADD COLUMN ad_url TEXT NOT NULL DEFAULT ''");
  }

  // Competitors migrations
  const compCols = db.prepare("PRAGMA table_info(competitors)").all() as { name: string }[];
  if (!compCols.find((c) => c.name === "category")) {
    db.exec("ALTER TABLE competitors ADD COLUMN category TEXT NOT NULL DEFAULT ''");
  }

  // Seed default users if users table is empty
  const userCount = db.prepare("SELECT COUNT(*) as cnt FROM users").get() as { cnt: number };
  if (userCount.cnt === 0) {
    const seedUsers = [
      { id: "wooseok", name: "김우석", avatar: "W", color: "bg-blue-500", is_admin: 1 },
      { id: "heetak", name: "전희탁", avatar: "H", color: "bg-emerald-500", is_admin: 0 },
      { id: "yujin", name: "유진", avatar: "Y", color: "bg-purple-500", is_admin: 0 },
      { id: "dongmin", name: "김동민", avatar: "D", color: "bg-orange-500", is_admin: 1 },
    ];
    const insert = db.prepare("INSERT OR IGNORE INTO users (id, name, avatar, color, is_admin) VALUES (?, ?, ?, ?, ?)");
    for (const u of seedUsers) {
      insert.run(u.id, u.name, u.avatar, u.color, u.is_admin);
    }
  }
}

export type Platform = "meta" | "youtube" | "tiktok" | "gfa";
export type MediaType = "video" | "image";

export interface AdReference {
  id: string;
  title: string;
  brand: string;
  platform: Platform;
  media_type: MediaType;
  media_url: string;
  thumbnail_url: string;
  category: string;
  tags: string;
  likes: number | null;
  views: number | null;
  ad_start_date: string | null;
  ad_end_date: string | null;
  active_days: number | null;
  memo: string;
  aspect_ratio: number | null;
  transcript: string;
  ad_url: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AppUser {
  id: string;
  name: string;
  avatar: string;
  color: string;
  is_admin: number;
}

export interface Comment {
  id: string;
  reference_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export interface CompetitorLink {
  label: string;
  url: string;
}

export interface Competitor {
  id: string;
  name: string;
  category: string;
  links: string; // JSON string of CompetitorLink[]
  memo: string;
  created_by: string;
  created_at: string;
}
