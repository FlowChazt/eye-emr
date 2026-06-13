import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, desc, eq } from "drizzle-orm";
import { db, tables } from "@/db";
import { requireUser } from "@/lib/session";
import { thaiDate, VISIT_STATUS_LABEL } from "@/lib/format";
import { PatientBanner } from "@/components/patient-banner";
import { BackButton } from "@/components/back-button";
import { PlusIcon, PrintIcon } from "@/components/icons";
import { openVisitAndGo } from "../actions";
import { cancelAppointment } from "@/app/(app)/appointments/actions";

export default async function PatientPage({ params }: { params: Promise<{ hn: string }> }) {
  await requireUser();
  const { hn } = await params;

  const patient = db.select().from(tables.patients).where(eq(tables.patients.hn, hn)).get();
  if (!patient) notFound();

  const visitRows = db
    .select()
    .from(tables.visits)
    .where(eq(tables.visits.patientId, patient.id))
    .orderBy(desc(tables.visits.visitDate), desc(tables.visits.id))
    .all();

  const scheduledAppts = db
    .select()
    .from(tables.appointments)
    .where(and(eq(tables.appointments.patientId, patient.id), eq(tables.appointments.status, "scheduled")))
    .orderBy(asc(tables.appointments.date))
    .all();

  const openVisit = openVisitAndGo.bind(null, patient.id, undefined);

  async function cancelAppt(appointmentId: number) {
    "use server";
    await cancelAppointment(appointmentId);
  }

  return (
    <div className="mx-auto max-w-4xl">
      <BackButton fallbackHref="/patients" />

      <PatientBanner
        patient={patient}
        context={
          <>
            {patient.dob && <>เกิด {thaiDate(patient.dob)}</>}
            {patient.phone && <> · {patient.phone}</>}
          </>
        }
        actions={
          <>
            <Link href={`/patients/${patient.hn}/edit`} className="btn-ghost">
              แก้ไขข้อมูล
            </Link>
            <form action={openVisit}>
              <button className="btn-primary">
                <PlusIcon size={16} /> เปิด visit
              </button>
            </form>
          </>
        }
      />

      {scheduledAppts.length > 0 && (
        <div className="mb-4 rounded-md border border-amber-strong/20 bg-amber-soft px-4 py-3">
          <p className="mb-1.5 text-xs font-bold tracking-wide text-amber-strong uppercase">นัดหมายที่จะมาถึง</p>
          <ul className="space-y-1.5">
            {scheduledAppts.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <p>
                  <span className="font-semibold">{thaiDate(a.date)}</span>
                  {a.note && <span className="ml-2 text-ink-soft">· {a.note}</span>}
                </p>
                <div className="flex items-center gap-2">
                  <Link href={`/appointments/${a.id}/print`} className="btn-ghost">
                    <PrintIcon size={15} /> ใบนัด
                  </Link>
                  <form action={cancelAppt.bind(null, a.id)}>
                    <button className="btn-danger">ยกเลิก</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mb-5 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <div className="card p-3">
          <p className="mb-0.5 text-xs font-medium tracking-wide text-ink-soft uppercase">โรคประจำตัว</p>
          <p>{patient.chronicConditions || "-"}</p>
        </div>
        <div className="card p-3">
          <p className="mb-0.5 text-xs font-medium tracking-wide text-ink-soft uppercase">ที่อยู่</p>
          <p>{patient.address || "-"}</p>
        </div>
        {patient.notes && (
          <div className="card p-3 sm:col-span-2">
            <p className="mb-0.5 text-xs font-medium tracking-wide text-ink-soft uppercase">หมายเหตุ</p>
            <p>{patient.notes}</p>
          </div>
        )}
      </div>

      <h2 className="mb-2 text-sm font-semibold tracking-wide text-ink-soft uppercase">
        ประวัติการรักษา ({visitRows.length} ครั้ง)
      </h2>
      {visitRows.length === 0 ? (
        <p className="card border-dashed bg-paper/60 p-6 text-center text-sm text-ink-soft">
          ยังไม่มีประวัติการรักษา
        </p>
      ) : (
        <ul className="card divide-y divide-line-soft overflow-hidden">
          {visitRows.map((v) => (
            <li key={v.id}>
              <Link
                href={`/visits/${v.id}`}
                className="flex items-center justify-between px-4 py-2.5 text-sm transition hover:bg-teal-50/60"
              >
                <div>
                  <span className="font-medium">{thaiDate(v.visitDate)}</span>
                  <span className="ml-3 text-ink-soft">
                    {v.diagnosis || v.chiefComplaint || "ไม่ระบุ"}
                  </span>
                </div>
                <span className="text-xs text-ink-soft">{VISIT_STATUS_LABEL[v.status]}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
