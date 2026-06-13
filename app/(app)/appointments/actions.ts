"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, tables } from "@/db";
import { todayISO } from "@/lib/format";
import { requireUser } from "@/lib/session";

function revalidateAppointmentViews(patientId: number, visitId: number | null) {
  revalidatePath("/");
  if (visitId) revalidatePath(`/visits/${visitId}`);
  const patient = db.select().from(tables.patients).where(eq(tables.patients.id, patientId)).get();
  if (patient) revalidatePath(`/patients/${patient.hn}`);
}

/** Schedule the patient's next appointment (typically from within a visit). */
export async function createAppointment(patientId: number, visitId: number | null, formData: FormData) {
  const user = await requireUser();
  const date = String(formData.get("date") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "กรุณาเลือกวันนัด" };
  if (date <= todayISO()) return { error: "วันนัดต้องเป็นวันถัดไปจากวันนี้" };

  const appt = db
    .insert(tables.appointments)
    .values({ patientId, scheduledFromVisitId: visitId, date, note, createdBy: user.userId })
    .returning()
    .get();

  revalidateAppointmentViews(patientId, visitId);
  return { ok: true as const, id: appt.id };
}

export async function cancelAppointment(appointmentId: number) {
  await requireUser();
  const appt = db.select().from(tables.appointments).where(eq(tables.appointments.id, appointmentId)).get();
  if (!appt || appt.status !== "scheduled") return { error: "ไม่พบนัดหมายนี้ หรือนัดหมายถูกใช้ไปแล้ว" };

  db.update(tables.appointments)
    .set({ status: "cancelled" })
    .where(eq(tables.appointments.id, appointmentId))
    .run();

  revalidateAppointmentViews(appt.patientId, appt.scheduledFromVisitId);
  return { ok: true as const };
}
