import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db, tables } from "@/db";
import { requireUser } from "@/lib/session";
import { ageYears, baht, fullName, thaiDate, VISIT_STATUS_LABEL } from "@/lib/format";
import { VisitRecordForm } from "./visit-record-form";
import { TreatmentSection } from "./treatment-section";

export default async function VisitPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const visitId = Number(id);
  if (!Number.isInteger(visitId)) notFound();

  const visit = db.select().from(tables.visits).where(eq(tables.visits.id, visitId)).get();
  if (!visit) notFound();

  const patient = db.select().from(tables.patients).where(eq(tables.patients.id, visit.patientId)).get()!;
  const items = db
    .select()
    .from(tables.visitItems)
    .where(eq(tables.visitItems.visitId, visitId))
    .orderBy(asc(tables.visitItems.id))
    .all();
  const payment = db.select().from(tables.payments).where(eq(tables.payments.visitId, visitId)).get();
  const meds = db
    .select()
    .from(tables.medications)
    .where(eq(tables.medications.active, true))
    .orderBy(asc(tables.medications.name))
    .all();

  const age = ageYears(patient.dob);
  const readOnly = visit.status === "completed";
  const total = items.reduce((s, it) => s + it.lineTotal, 0);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {/* patient header */}
      <header className="rounded-2xl border border-line bg-paper p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-ink-soft">
              Visit · {thaiDate(visit.visitDate)} ·{" "}
              <span className="font-medium">{VISIT_STATUS_LABEL[visit.status]}</span>
            </p>
            <h1 className="mt-1 text-xl font-bold text-teal-900">
              <Link href={`/patients/${patient.hn}`} className="hover:underline">
                {fullName(patient)}
              </Link>
              <span className="ml-3 text-base font-semibold tabular-nums text-teal-700">HN {patient.hn}</span>
            </h1>
            <p className="mt-1 text-sm text-ink-soft">
              {age !== null && `${age} ปี`}
              {patient.chronicConditions && <> · โรคประจำตัว: {patient.chronicConditions}</>}
            </p>
          </div>
          {readOnly && payment && (
            <Link
              href={`/visits/${visit.id}/receipt`}
              className="rounded-lg border border-line bg-cream px-4 py-2 font-medium hover:bg-teal-50"
            >
              🖨️ พิมพ์ใบเสร็จ ({payment.receiptNo})
            </Link>
          )}
        </div>

        {patient.allergies && (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-danger/30 bg-danger-soft px-4 py-2.5">
            <span aria-hidden>⚠️</span>
            <p className="font-semibold text-danger">แพ้: {patient.allergies}</p>
          </div>
        )}
      </header>

      {/* vitals + clinical record */}
      <VisitRecordForm visit={visit} readOnly={readOnly} />

      {/* treatments + checkout */}
      <TreatmentSection
        visitId={visit.id}
        items={items}
        medications={meds}
        readOnly={readOnly}
      />

      {readOnly && payment && (
        <div className="rounded-2xl border border-teal-200 bg-teal-50 px-5 py-4 text-teal-900">
          ชำระแล้ว {baht(payment.total)} บาท ({payment.method === "cash" ? "เงินสด" : "โอน"}) · ใบเสร็จ{" "}
          {payment.receiptNo}
        </div>
      )}
    </div>
  );
}
