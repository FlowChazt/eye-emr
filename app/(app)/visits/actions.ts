"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, tables } from "@/db";
import { nextReceiptNo } from "@/lib/counters";
import { todayISO } from "@/lib/format";
import { requireUser } from "@/lib/session";

function numOrNull(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Save vitals + clinical note fields. Also bumps waiting → in_progress. */
export async function saveVisitRecord(visitId: number, formData: FormData) {
  await requireUser();
  const get = (k: string) => {
    const v = String(formData.get(k) ?? "").trim();
    return v === "" ? null : v;
  };

  const visit = db.select().from(tables.visits).where(eq(tables.visits.id, visitId)).get();
  if (!visit) throw new Error("ไม่พบ visit นี้");
  if (visit.status === "completed") throw new Error("visit นี้ปิดแล้ว แก้ไขไม่ได้");

  db.update(tables.visits)
    .set({
      weightKg: numOrNull(formData.get("weightKg")),
      heightCm: numOrNull(formData.get("heightCm")),
      bpSystolic: numOrNull(formData.get("bpSystolic")),
      bpDiastolic: numOrNull(formData.get("bpDiastolic")),
      pulse: numOrNull(formData.get("pulse")),
      temperatureC: numOrNull(formData.get("temperatureC")),
      chiefComplaint: get("chiefComplaint"),
      note: get("note"),
      diagnosis: get("diagnosis"),
      status: visit.status === "waiting" ? "in_progress" : visit.status,
    })
    .where(eq(tables.visits.id, visitId))
    .run();

  revalidatePath(`/visits/${visitId}`);
  revalidatePath("/");
}

/** Add a medication line item (price/name snapshotted from current stock). */
export async function addMedicationItem(visitId: number, medicationId: number, qty: number) {
  await requireUser();
  if (!(qty > 0)) return { error: "จำนวนต้องมากกว่า 0" };

  const visit = db.select().from(tables.visits).where(eq(tables.visits.id, visitId)).get();
  if (!visit || visit.status === "completed") return { error: "visit นี้ปิดแล้ว" };

  const med = db.select().from(tables.medications).where(eq(tables.medications.id, medicationId)).get();
  if (!med) return { error: "ไม่พบรายการนี้" };
  const isProcedure = med.kind === "procedure";
  if (!isProcedure && med.stockQty < qty) return { error: `สต็อกไม่พอ (เหลือ ${med.stockQty} ${med.unit})` };

  db.insert(tables.visitItems)
    .values({
      visitId,
      type: isProcedure ? "procedure" : "medication",
      medicationId,
      description: med.name,
      instructions: isProcedure ? null : (med.defaultInstructions ?? null),
      qty,
      unitPrice: med.price,
      lineTotal: Math.round(med.price * qty * 100) / 100,
    })
    .run();

  revalidatePath(`/visits/${visitId}`);
  return { ok: true };
}

/** Per-user preference: auto-print all documents when a visit is closed. */
export async function setAutoPrintOnClose(value: boolean) {
  const user = await requireUser();
  db.update(tables.users).set({ autoPrintOnClose: value }).where(eq(tables.users.id, user.userId)).run();
  return { ok: true };
}

/** Set the วิธีใช้ (label instructions) for a medication line item. */
export async function setItemInstructions(visitId: number, itemId: number, instructions: string) {
  await requireUser();
  const visit = db.select().from(tables.visits).where(eq(tables.visits.id, visitId)).get();
  if (!visit || visit.status === "completed") return { error: "visit นี้ปิดแล้ว" };

  const text = instructions.trim();
  db.update(tables.visitItems)
    .set({ instructions: text === "" ? null : text })
    .where(eq(tables.visitItems.id, itemId))
    .run();

  revalidatePath(`/visits/${visitId}`);
  return { ok: true };
}

/** Add a custom treatment line item. */
export async function addCustomItem(visitId: number, description: string, price: number) {
  await requireUser();
  const desc = description.trim();
  if (!desc) return { error: "กรุณากรอกรายการ" };
  if (!Number.isFinite(price) || price < 0) return { error: "ราคาไม่ถูกต้อง" };

  const visit = db.select().from(tables.visits).where(eq(tables.visits.id, visitId)).get();
  if (!visit || visit.status === "completed") return { error: "visit นี้ปิดแล้ว" };

  db.insert(tables.visitItems)
    .values({ visitId, type: "custom", description: desc, qty: 1, unitPrice: price, lineTotal: price })
    .run();

  revalidatePath(`/visits/${visitId}`);
  return { ok: true };
}

export async function removeVisitItem(visitId: number, itemId: number) {
  await requireUser();
  const visit = db.select().from(tables.visits).where(eq(tables.visits.id, visitId)).get();
  if (!visit || visit.status === "completed") return { error: "visit นี้ปิดแล้ว" };

  db.delete(tables.visitItems).where(eq(tables.visitItems.id, itemId)).run();
  revalidatePath(`/visits/${visitId}`);
  return { ok: true };
}

/**
 * Complete the visit: atomically record payment, deduct stock, and write
 * stock movements. Fails (and rolls back) if any medication's stock is short.
 */
export async function completeVisit(visitId: number, method: "cash" | "transfer") {
  const user = await requireUser();

  try {
    db.transaction((tx) => {
      const visit = tx.select().from(tables.visits).where(eq(tables.visits.id, visitId)).get();
      if (!visit) throw new Error("ไม่พบ visit นี้");
      if (visit.status === "completed") throw new Error("visit นี้ปิดไปแล้ว");

      const items = tx.select().from(tables.visitItems).where(eq(tables.visitItems.visitId, visitId)).all();
      const total = Math.round(items.reduce((s, it) => s + it.lineTotal, 0) * 100) / 100;

      // deduct stock per medication item
      for (const item of items) {
        if (item.type !== "medication" || !item.medicationId) continue;
        const med = tx.select().from(tables.medications).where(eq(tables.medications.id, item.medicationId)).get();
        if (!med) throw new Error(`ไม่พบยา: ${item.description}`);
        if (med.stockQty < item.qty) {
          throw new Error(`สต็อก ${med.name} ไม่พอ (เหลือ ${med.stockQty} ${med.unit})`);
        }
        tx.update(tables.medications)
          .set({ stockQty: sql`${tables.medications.stockQty} - ${item.qty}` })
          .where(eq(tables.medications.id, item.medicationId))
          .run();
        tx.insert(tables.stockMovements)
          .values({
            medicationId: item.medicationId,
            change: -item.qty,
            reason: "dispense",
            visitId,
            userId: user.userId,
          })
          .run();
      }

      tx.insert(tables.payments)
        .values({ visitId, receiptNo: nextReceiptNo(), total, method, receivedBy: user.userId })
        .run();

      tx.update(tables.visits)
        .set({ status: "completed", completedAt: sql`datetime('now')` })
        .where(eq(tables.visits.id, visitId))
        .run();
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "เกิดข้อผิดพลาด" };
  }

  revalidatePath(`/visits/${visitId}`);
  revalidatePath("/");
  revalidatePath("/stock");

  const u = db.select().from(tables.users).where(eq(tables.users.id, user.userId)).get();
  redirect(`/visits/${visitId}${u?.autoPrintOnClose ? "?printAll=1" : ""}`);
}

/**
 * Reopen a closed visit — only allowed on the same clinic day it was created.
 * Reverses the checkout: restores dispensed stock, voids the payment/receipt,
 * and flips the visit back to in_progress so it can be edited again. Re-closing
 * issues a fresh receipt number (the voided one is simply skipped).
 */
export async function reopenVisit(visitId: number) {
  await requireUser();

  try {
    db.transaction((tx) => {
      const visit = tx.select().from(tables.visits).where(eq(tables.visits.id, visitId)).get();
      if (!visit) throw new Error("ไม่พบ visit นี้");
      if (visit.status !== "completed") throw new Error("visit นี้ยังไม่ได้ปิด");
      if (visit.visitDate !== todayISO()) throw new Error("เปิด visit ซ้ำได้เฉพาะวันนี้เท่านั้น");

      // restore stock from this visit's dispense movements, then remove them
      const movements = tx
        .select()
        .from(tables.stockMovements)
        .where(and(eq(tables.stockMovements.visitId, visitId), eq(tables.stockMovements.reason, "dispense")))
        .all();
      for (const mv of movements) {
        tx.update(tables.medications)
          .set({ stockQty: sql`${tables.medications.stockQty} - ${mv.change}` })
          .where(eq(tables.medications.id, mv.medicationId))
          .run();
      }
      tx.delete(tables.stockMovements)
        .where(and(eq(tables.stockMovements.visitId, visitId), eq(tables.stockMovements.reason, "dispense")))
        .run();

      // void the receipt and unlock the visit
      tx.delete(tables.payments).where(eq(tables.payments.visitId, visitId)).run();
      tx.update(tables.visits)
        .set({ status: "in_progress", completedAt: null })
        .where(eq(tables.visits.id, visitId))
        .run();
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "เกิดข้อผิดพลาด" };
  }

  revalidatePath(`/visits/${visitId}`);
  revalidatePath("/");
  revalidatePath("/stock");
  return { ok: true };
}
