import { and, eq } from "drizzle-orm";
import { db, tables } from "@/db";
import { requireUser } from "@/lib/session";
import { NewVisitClient } from "./new-visit-client";

export default async function NewVisitPage({
  searchParams,
}: {
  searchParams: Promise<{ appointmentId?: string }>;
}) {
  await requireUser();
  const params = await searchParams;

  // arrived via an appointment row on the clinic page → patient info prefilled
  const apptId = Number(params.appointmentId);
  const fromAppointment = Number.isInteger(apptId)
    ? (db
        .select({ appt: tables.appointments, patient: tables.patients })
        .from(tables.appointments)
        .innerJoin(tables.patients, eq(tables.appointments.patientId, tables.patients.id))
        .where(and(eq(tables.appointments.id, apptId), eq(tables.appointments.status, "scheduled")))
        .get() ?? null)
    : null;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold text-teal-900">เปิด visit ใหม่</h1>
      <NewVisitClient fromAppointment={fromAppointment} />
    </div>
  );
}
