import { and, eq, sql } from "drizzle-orm";
import { db, tables } from "@/db";

/** Current 2-digit Buddhist-era year, e.g. 2026 CE -> 2569 BE -> 69 */
export function currentYearBE2(date = new Date()): number {
  return (date.getFullYear() + 543) % 100;
}

/**
 * Atomically increment and return the next running number for a counter kind
 * in the given BE year. Must be called inside a transaction when combined
 * with other writes.
 */
function nextCounter(kind: "hn" | "receipt", yearBE: number): number {
  // Upsert-then-increment; better-sqlite3 runs statements synchronously so
  // this is race-free within the single shared connection.
  db.insert(tables.counters)
    .values({ kind, yearBE, value: 0 })
    .onConflictDoNothing()
    .run();
  db.update(tables.counters)
    .set({ value: sql`${tables.counters.value} + 1` })
    .where(and(eq(tables.counters.kind, kind), eq(tables.counters.yearBE, yearBE)))
    .run();
  const row = db
    .select({ value: tables.counters.value })
    .from(tables.counters)
    .where(and(eq(tables.counters.kind, kind), eq(tables.counters.yearBE, yearBE)))
    .get();
  return row!.value;
}

/** Generate the next HN, e.g. "69-0001" */
export function nextHN(date = new Date()): string {
  const year = currentYearBE2(date);
  const n = nextCounter("hn", year);
  return `${String(year).padStart(2, "0")}-${String(n).padStart(4, "0")}`;
}

/** Generate the next receipt number, e.g. "R69-00001" */
export function nextReceiptNo(date = new Date()): string {
  const year = currentYearBE2(date);
  const n = nextCounter("receipt", year);
  return `R${String(year).padStart(2, "0")}-${String(n).padStart(5, "0")}`;
}
