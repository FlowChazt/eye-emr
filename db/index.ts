import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = process.env.DB_PATH ?? path.join(DATA_DIR, "clinic.db");

// Single shared connection across the app (and across Next.js hot reloads in dev).
const globalForDb = globalThis as unknown as { __sqlite?: Database.Database };

function createConnection() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return sqlite;
}

const sqlite = globalForDb.__sqlite ?? createConnection();
if (process.env.NODE_ENV !== "production") globalForDb.__sqlite = sqlite;

/**
 * Apply pending Drizzle migrations on startup.
 *
 * Custom (not drizzle's `migrate`) for two reasons:
 *  1. Idempotent — tolerates DDL that already exists (e.g. an "ADD COLUMN" that
 *     a previous interrupted run half-applied), so the DB self-heals instead of
 *     crashing with "duplicate column name".
 *  2. Stays compatible with rows drizzle already wrote to `__drizzle_migrations`
 *     by keying applied state on each migration's journal timestamp (`when`).
 *
 * It is NEVER run during `next build`: that phase spawns ~15 worker processes
 * that all import this module, and concurrent migrations on one SQLite file
 * race each other. Build does no DB work; the single runtime server migrates.
 */
function runMigrations(): void {
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const dir = path.join(process.cwd(), "drizzle");
  const journalPath = path.join(dir, "meta", "_journal.json");
  if (!fs.existsSync(journalPath)) return;

  const journal = JSON.parse(fs.readFileSync(journalPath, "utf8")) as {
    entries: { idx: number; when: number; tag: string }[];
  };

  sqlite.exec(
    `CREATE TABLE IF NOT EXISTS __drizzle_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hash TEXT NOT NULL,
      created_at NUMERIC
    )`,
  );

  const applied = new Set(
    sqlite
      .prepare(`SELECT created_at FROM __drizzle_migrations`)
      .all()
      .map((r) => Number((r as { created_at: number }).created_at)),
  );

  const record = sqlite.prepare(`INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)`);

  for (const entry of [...journal.entries].sort((a, b) => a.idx - b.idx)) {
    if (applied.has(entry.when)) continue;

    const sqlText = fs.readFileSync(path.join(dir, `${entry.tag}.sql`), "utf8");
    const statements = sqlText
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean);

    const apply = sqlite.transaction(() => {
      for (const stmt of statements) {
        try {
          sqlite.exec(stmt);
        } catch (e) {
          // already-applied DDL from a prior interrupted run — safe to skip
          const msg = e instanceof Error ? e.message : String(e);
          if (/duplicate column name|already exists/i.test(msg)) continue;
          throw e;
        }
      }
      record.run(entry.tag, entry.when);
    });
    apply();
  }
}

runMigrations();

export const db = drizzle(sqlite, { schema });

export * as tables from "./schema";
