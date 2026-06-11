import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, tables } from "@/db";
import { requireUser } from "@/lib/session";
import { PatientForm } from "@/components/patient-form";
import { updatePatient } from "../../actions";

export default async function EditPatientPage({ params }: { params: Promise<{ hn: string }> }) {
  await requireUser();
  const { hn } = await params;

  const patient = db.select().from(tables.patients).where(eq(tables.patients.hn, hn)).get();
  if (!patient) notFound();

  const action = updatePatient.bind(null, patient.id);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 text-2xl font-bold text-teal-900">แก้ไขข้อมูลผู้ป่วย</h1>
      <p className="mb-6 text-sm text-ink-soft">HN {patient.hn}</p>
      <div className="rounded-2xl border border-line bg-paper p-6 shadow-sm">
        <PatientForm action={action} defaults={patient} submitLabel="บันทึก" />
      </div>
    </div>
  );
}
