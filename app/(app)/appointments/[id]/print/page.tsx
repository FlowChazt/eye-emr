import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, tables } from "@/db";
import { requireUser } from "@/lib/session";
import { getClinic } from "@/lib/clinic";
import { PrintButton } from "@/components/print-button";
import { AppointmentDoc } from "@/components/print/appointment-doc";

export default async function AppointmentPrintPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const apptId = Number(id);
  if (!Number.isInteger(apptId)) notFound();

  const appt = db.select().from(tables.appointments).where(eq(tables.appointments.id, apptId)).get();
  if (!appt) notFound();
  const patient = db.select().from(tables.patients).where(eq(tables.patients.id, appt.patientId)).get()!;
  const doctor = db.select().from(tables.users).where(eq(tables.users.id, appt.createdBy)).get();
  const clinic = getClinic();

  const backHref = appt.scheduledFromVisitId ? `/visits/${appt.scheduledFromVisitId}` : `/patients/${patient.hn}`;

  return (
    <div className="mx-auto max-w-xl">
      <div className="no-print mb-4 flex items-center justify-between">
        <Link href={backHref} className="text-teal-700 underline underline-offset-2">
          ← กลับ
        </Link>
        <PrintButton />
      </div>

      <AppointmentDoc clinic={clinic} appt={appt} patient={patient} doctorName={doctor?.displayName} />
    </div>
  );
}
