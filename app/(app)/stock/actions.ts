"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, tables } from "@/db";
import { requireUser } from "@/lib/session";

function medFromForm(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "กรุณากรอกชื่อยา" } as const;
  const price = Number(formData.get("price") ?? 0);
  const lowStockThreshold = Number(formData.get("lowStockThreshold") ?? 10);
  if (!Number.isFinite(price) || price < 0) return { error: "ราคาไม่ถูกต้อง" } as const;
  return {
    data: {
      name,
      unit: String(formData.get("unit") ?? "เม็ด").trim() || "เม็ด",
      price,
      lowStockThreshold: Number.isFinite(lowStockThreshold) ? Math.max(0, lowStockThreshold) : 10,
      defaultInstructions: String(formData.get("defaultInstructions") ?? "").trim() || null,
    },
  } as const;
}

export async function createMedication(_prev: unknown, formData: FormData) {
  const user = await requireUser();
  const parsed = medFromForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const initialQty = Math.max(0, Math.floor(Number(formData.get("stockQty") ?? 0)) || 0);

  db.transaction((tx) => {
    const med = tx
      .insert(tables.medications)
      .values({ ...parsed.data, stockQty: initialQty })
      .returning()
      .get();
    if (initialQty > 0) {
      tx.insert(tables.stockMovements)
        .values({ medicationId: med.id, change: initialQty, reason: "restock", userId: user.userId, note: "เพิ่มยาใหม่" })
        .run();
    }
  });

  revalidatePath("/stock");
  return { ok: true };
}

export async function updateMedication(medicationId: number, _prev: unknown, formData: FormData) {
  await requireUser();
  const parsed = medFromForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  db.update(tables.medications).set(parsed.data).where(eq(tables.medications.id, medicationId)).run();
  revalidatePath("/stock");
  return { ok: true };
}

/** Restock (+n) or adjust (signed n, sets reason accordingly). */
export async function adjustStock(medicationId: number, change: number, note?: string) {
  const user = await requireUser();
  if (!Number.isInteger(change) || change === 0) return { error: "จำนวนไม่ถูกต้อง" };

  try {
    db.transaction((tx) => {
      const med = tx.select().from(tables.medications).where(eq(tables.medications.id, medicationId)).get();
      if (!med) throw new Error("ไม่พบยานี้");
      if (med.stockQty + change < 0) throw new Error(`ปรับไม่ได้ — สต็อกปัจจุบัน ${med.stockQty} ${med.unit}`);

      tx.update(tables.medications)
        .set({ stockQty: sql`${tables.medications.stockQty} + ${change}` })
        .where(eq(tables.medications.id, medicationId))
        .run();
      tx.insert(tables.stockMovements)
        .values({
          medicationId,
          change,
          reason: change > 0 ? "restock" : "adjust",
          userId: user.userId,
          note: note?.trim() || null,
        })
        .run();
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "เกิดข้อผิดพลาด" };
  }

  revalidatePath("/stock");
  return { ok: true };
}

/** Soft-delete: hide from pickers but keep history intact. */
export async function setMedicationActive(medicationId: number, active: boolean) {
  await requireUser();
  db.update(tables.medications).set({ active }).where(eq(tables.medications.id, medicationId)).run();
  revalidatePath("/stock");
  return { ok: true };
}
