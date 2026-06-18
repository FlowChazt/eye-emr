// Repro of the Windows failure: a DB where migration 0002 half-applied (column
// added) but was never recorded, then verify the runtime migrator self-heals.
import Database from "better-sqlite3";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const tmp = path.join(os.tmpdir(), `eye-migrate-${Date.now()}.db`);
process.env.DB_PATH = tmp;

async function main() {
const dir = path.join(process.cwd(), "drizzle");
const journal = JSON.parse(fs.readFileSync(path.join(dir, "meta/_journal.json"), "utf8")) as {
  entries: { idx: number; when: number; tag: string }[];
};
const entries = [...journal.entries].sort((a, b) => a.idx - b.idx);
const stmts = (tag: string) =>
  fs
    .readFileSync(path.join(dir, `${tag}.sql`), "utf8")
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter(Boolean);

// build a "pre-update" DB: 0000 + 0001 applied & recorded
const seed = new Database(tmp);
seed.exec(
  `CREATE TABLE IF NOT EXISTS __drizzle_migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, hash TEXT NOT NULL, created_at NUMERIC)`,
);
for (const e of entries.slice(0, 2)) {
  for (const s of stmts(e.tag)) seed.exec(s);
  seed.prepare(`INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)`).run(e.tag, e.when);
}
// simulate the interrupted 0002: column exists but is NOT recorded
seed.exec(`ALTER TABLE visit_items ADD instructions text`);
seed.close();

// importing the app db module runs runMigrations() against DB_PATH
await import("../db/index");

const check = new Database(tmp);
const cols = (t: string) =>
  check
    .prepare(`PRAGMA table_info(${t})`)
    .all()
    .map((c) => (c as { name: string }).name);
const recorded = check.prepare(`SELECT created_at FROM __drizzle_migrations`).all().length;

const expect = (label: string, ok: boolean) => console.log(`${ok ? "✓" : "✗ FAIL"}  ${label}`);
expect("visit_items.instructions", cols("visit_items").includes("instructions"));
expect("medications.portion_amount", cols("medications").includes("portion_amount"));
expect("medications.indication", cols("medications").includes("indication"));
expect("medications.kind", cols("medications").includes("kind"));
expect("medications.auto_add_on_visit", cols("medications").includes("auto_add_on_visit"));
expect("users.auto_print_on_close", cols("users").includes("auto_print_on_close"));
expect(`all ${entries.length} migrations recorded (got ${recorded})`, recorded === entries.length);
check.close();
for (const f of [tmp, `${tmp}-wal`, `${tmp}-shm`]) fs.existsSync(f) && fs.rmSync(f);
}

main();
