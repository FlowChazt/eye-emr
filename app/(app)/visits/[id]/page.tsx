import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, desc, eq, inArray, ne } from "drizzle-orm";
import { db, tables } from "@/db";
import { requireUser } from "@/lib/session";
import { baht, thaiDate, VISIT_STATUS_LABEL } from "@/lib/format";
import { PatientBanner } from "@/components/patient-banner";
import { PrintIcon } from "@/components/icons";
import { VisitRecordForm } from "./visit-record-form";
import { TreatmentSection } from "./treatment-section";
import { VisitTabs } from "./visit-tabs";
import { HistoryPanel } from "./history-panel";
import { NextAppointment } from "./next-appointment";

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

  // previous visits (+ their items) for the "ประวัติเดิม" tab
  const prevVisits = db
    .select()
    .from(tables.visits)
    .where(and(eq(tables.visits.patientId, patient.id), ne(tables.visits.id, visitId)))
    .orderBy(desc(tables.visits.visitDate), desc(tables.visits.id))
    .all();
  const prevItems = prevVisits.length
    ? db
        .select()
        .from(tables.visitItems)
        .where(inArray(tables.visitItems.visitId, prevVisits.map((v) => v.id)))
        .orderBy(asc(tables.visitItems.id))
        .all()
    : [];
  const itemsByVisit = new Map<number, typeof prevItems>();
  for (const it of prevItems) {
    const list = itemsByVisit.get(it.visitId) ?? [];
    list.push(it);
    itemsByVisit.set(it.visitId, list);
  }

  // pending appointments for this patient
  const scheduledAppts = db
    .select()
    .from(tables.appointments)
    .where(and(eq(tables.appointments.patientId, patient.id), eq(tables.appointments.status, "scheduled")))
    .orderBy(asc(tables.appointments.date))
    .all();

  const readOnly = visit.status === "completed";

  return (
    <div className="mx-auto max-w-4xl">
      <PatientBanner
        patient={patient}
        nameHref={`/patients/${patient.hn}`}
        context={
          <>
            Visit · {thaiDate(visit.visitDate)} ·{" "}
            <span className="font-medium">{VISIT_STATUS_LABEL[visit.status]}</span>
          </>
        }
        actions={
          readOnly && payment ? (
            <Link href={`/visits/${visit.id}/receipt`} className="btn-ghost">
              <PrintIcon size={16} /> พิมพ์ใบเสร็จ ({payment.receiptNo})
            </Link>
          ) : null
        }
      />

      <VisitTabs
        historyCount={prevVisits.length}
        record={
          <>
            {/* vitals + clinical record */}
            <VisitRecordForm visit={visit} readOnly={readOnly} />

            {/* next appointment */}
            <NextAppointment
              patientId={patient.id}
              visitId={visit.id}
              appointments={scheduledAppts.map((a) => ({ id: a.id, date: a.date, note: a.note }))}
            />

            {/* treatments + checkout */}
            <TreatmentSection visitId={visit.id} items={items} medications={meds} readOnly={readOnly} />

            {readOnly && payment && (
              <div className="card border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">
                ชำระแล้ว <span className="font-semibold tabular-nums">{baht(payment.total)}</span> บาท ({payment.method === "cash" ? "เงินสด" : "โอน"}) · ใบเสร็จ{" "}
                {payment.receiptNo}
              </div>
            )}
          </>
        }
        history={<HistoryPanel patientHn={patient.hn} visits={prevVisits} itemsByVisit={itemsByVisit} />}
      />
    </div>
  );
}
