/**
 * Core logic tests: HN/receipt counters, stock deduction transactionality,
 * and price snapshotting. Uses a throwaway DB file via DB_PATH.
 */
import { beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

process.env.DB_PATH = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "eye-emr-test-")), "test.db");

// imported after DB_PATH is set so the connection uses the temp file
const { db, tables } = await import("@/db");
const { nextHN, nextReceiptNo, currentYearBE2 } = await import("@/lib/counters");
const { eq, sql } = await import("drizzle-orm");

let userId: number;
let patientId: number;
let medId: number;

beforeAll(() => {
  userId = db
    .insert(tables.users)
    .values({ username: "t", displayName: "Test", passwordHash: "x" })
    .returning()
    .get().id;
  patientId = db
    .insert(tables.patients)
    .values({ hn: "00-0000", firstName: "ทดสอบ", lastName: "ระบบ" })
    .returning()
    .get().id;
  medId = db
    .insert(tables.medications)
    .values({ name: "TestMed", unit: "เม็ด", price: 5, stockQty: 10, lowStockThreshold: 2 })
    .returning()
    .get().id;
});

describe("counters", () => {
  it("generates sequential HNs with BE year prefix", () => {
    const year = String(currentYearBE2()).padStart(2, "0");
    expect(nextHN()).toBe(`${year}-0001`);
    expect(nextHN()).toBe(`${year}-0002`);
  });

  it("generates receipt numbers independently of HN", () => {
    const year = String(currentYearBE2()).padStart(2, "0");
    expect(nextReceiptNo()).toBe(`R${year}-00001`);
    expect(nextReceiptNo()).toBe(`R${year}-00002`);
  });

  it("year rollover starts a fresh sequence", () => {
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    const year = String(currentYearBE2(nextYear)).padStart(2, "0");
    expect(nextHN(nextYear)).toBe(`${year}-0001`);
  });
});

describe("checkout transaction", () => {
  function makeVisit() {
    return db
      .insert(tables.visits)
      .values({ patientId, visitDate: "2026-06-11", createdBy: userId })
      .returning()
      .get().id;
  }

  /** Simplified mirror of completeVisit's transaction body. */
  function completeVisitTx(visitId: number) {
    db.transaction((tx) => {
      const items = tx.select().from(tables.visitItems).where(eq(tables.visitItems.visitId, visitId)).all();
      const total = items.reduce((s, it) => s + it.lineTotal, 0);
      for (const item of items) {
        if (item.type !== "medication" || !item.medicationId) continue;
        const med = tx.select().from(tables.medications).where(eq(tables.medications.id, item.medicationId)).get()!;
        if (med.stockQty < item.qty) throw new Error("insufficient stock");
        tx.update(tables.medications)
          .set({ stockQty: sql`${tables.medications.stockQty} - ${item.qty}` })
          .where(eq(tables.medications.id, item.medicationId))
          .run();
        tx.insert(tables.stockMovements)
          .values({ medicationId: item.medicationId, change: -item.qty, reason: "dispense", visitId, userId })
          .run();
      }
      tx.insert(tables.payments)
        .values({ visitId, receiptNo: nextReceiptNo(), total, method: "cash", receivedBy: userId })
        .run();
      tx.update(tables.visits).set({ status: "completed" }).where(eq(tables.visits.id, visitId)).run();
    });
  }

  it("deducts stock and records payment + movement atomically", () => {
    const visitId = makeVisit();
    db.insert(tables.visitItems)
      .values({ visitId, type: "medication", medicationId: medId, description: "TestMed", qty: 3, unitPrice: 5, lineTotal: 15 })
      .run();

    completeVisitTx(visitId);

    const med = db.select().from(tables.medications).where(eq(tables.medications.id, medId)).get()!;
    expect(med.stockQty).toBe(7);
    const payment = db.select().from(tables.payments).where(eq(tables.payments.visitId, visitId)).get()!;
    expect(payment.total).toBe(15);
    const moves = db.select().from(tables.stockMovements).where(eq(tables.stockMovements.visitId, visitId)).all();
    expect(moves).toHaveLength(1);
    expect(moves[0].change).toBe(-3);
  });

  it("rolls back everything when stock is insufficient", () => {
    const visitId = makeVisit();
    db.insert(tables.visitItems)
      .values({ visitId, type: "medication", medicationId: medId, description: "TestMed", qty: 999, unitPrice: 5, lineTotal: 4995 })
      .run();

    expect(() => completeVisitTx(visitId)).toThrow("insufficient stock");

    const med = db.select().from(tables.medications).where(eq(tables.medications.id, medId)).get()!;
    expect(med.stockQty).toBe(7); // unchanged from previous test
    expect(db.select().from(tables.payments).where(eq(tables.payments.visitId, visitId)).get()).toBeUndefined();
    const visit = db.select().from(tables.visits).where(eq(tables.visits.id, visitId)).get()!;
    expect(visit.status).toBe("waiting");
  });
});

describe("price snapshotting", () => {
  it("keeps historical line items at the dispensed price after a price change", () => {
    const visitId = db
      .insert(tables.visits)
      .values({ patientId, visitDate: "2026-06-11", createdBy: userId })
      .returning()
      .get().id;
    db.insert(tables.visitItems)
      .values({ visitId, type: "medication", medicationId: medId, description: "TestMed", qty: 1, unitPrice: 5, lineTotal: 5 })
      .run();

    // price goes up
    db.update(tables.medications).set({ price: 99 }).where(eq(tables.medications.id, medId)).run();

    const item = db.select().from(tables.visitItems).where(eq(tables.visitItems.visitId, visitId)).get()!;
    expect(item.unitPrice).toBe(5);
    expect(item.lineTotal).toBe(5);
  });
});
