"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, tables } from "@/db";
import { requireUser } from "@/lib/session";

export async function saveClinicInfo(_prev: unknown, formData: FormData) {
  await requireUser();
  const entries: Record<string, string> = {
    clinic_name: String(formData.get("clinic_name") ?? "").trim(),
    clinic_address: String(formData.get("clinic_address") ?? "").trim(),
    clinic_phone: String(formData.get("clinic_phone") ?? "").trim(),
  };
  for (const [key, value] of Object.entries(entries)) {
    db.insert(tables.settings)
      .values({ key, value })
      .onConflictDoUpdate({ target: tables.settings.key, set: { value } })
      .run();
  }
  revalidatePath("/settings");
  return { ok: true };
}

export async function createUser(_prev: unknown, formData: FormData) {
  await requireUser();
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!username || !displayName) return { error: "กรุณากรอกชื่อผู้ใช้และชื่อที่แสดง" };
  if (password.length < 6) return { error: "รหัสผ่านต้องยาวอย่างน้อย 6 ตัวอักษร" };

  const existing = db.select().from(tables.users).where(eq(tables.users.username, username)).get();
  if (existing) return { error: "ชื่อผู้ใช้นี้มีอยู่แล้ว" };

  db.insert(tables.users)
    .values({ username, displayName, passwordHash: bcrypt.hashSync(password, 10) })
    .run();
  revalidatePath("/settings");
  return { ok: true };
}

export async function changePassword(_prev: unknown, formData: FormData) {
  const me = await requireUser();
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  if (next.length < 6) return { error: "รหัสผ่านใหม่ต้องยาวอย่างน้อย 6 ตัวอักษร" };

  const user = db.select().from(tables.users).where(eq(tables.users.id, me.userId)).get()!;
  if (!bcrypt.compareSync(current, user.passwordHash)) return { error: "รหัสผ่านปัจจุบันไม่ถูกต้อง" };

  db.update(tables.users)
    .set({ passwordHash: bcrypt.hashSync(next, 10) })
    .where(eq(tables.users.id, me.userId))
    .run();
  return { ok: true };
}

export async function setUserActive(userId: number, active: boolean) {
  const me = await requireUser();
  if (userId === me.userId) return { error: "ปิดการใช้งานบัญชีตัวเองไม่ได้" };
  db.update(tables.users).set({ active }).where(eq(tables.users.id, userId)).run();
  revalidatePath("/settings");
  return { ok: true };
}
