import { notFound } from "next/navigation";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db, tables } from "@/db";
import { requireUser } from "@/lib/session";
import { getClinic } from "@/lib/clinic";
import { ReceiptDoc } from "@/components/print/receipt-doc";
import { AppointmentDoc } from "@/components/print/appointment-doc";
import { LabelsDoc, buildLabels } from "@/components/print/labels-doc";

type DocKind = "receipt" | "appointment" | "labels";

/**
 * Combined printable view: renders any subset of a visit's documents
 * (receipt / appointment / drug labels) stacked with page breaks. Loaded in a
 * hidden iframe by the visit page's print bar so one click prints everything.
 */
export default async function VisitPrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ docs?: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const { docs: docsParam } = await searchParams;
  const visitId = Number(id);
  if (!Number.isInteger(visitId)) notFound();

  const visit = db.select().from(tables.visits).where(eq(tables.visits.id, visitId)).get();
  if (!visit) notFound();
  const patient = db.select().from(tables.patients).where(eq(tables.patients.id, visit.patientId)).get()!;
  const clinic = getClinic();

  const want = new Set<DocKind>(
    (docsParam ?? "receipt,appointment,labels")
      .split(",")
      .map((s) => s.trim())
      .filter((s): s is DocKind => s === "receipt" || s === "appointment" || s === "labels"),
  );

  const blocks: React.ReactNode[] = [];

  // ── Receipt ────────────────────────────────────────────────────────────────
  if (want.has("receipt")) {
    const payment = db.select().from(tables.payments).where(eq(tables.payments.visitId, visitId)).get();
    if (payment) {
      const items = db
        .select()
        .from(tables.visitItems)
        .where(eq(tables.visitItems.visitId, visitId))
        .orderBy(asc(tables.visitItems.id))
        .all();
      const receiver = db.select().from(tables.users).where(eq(tables.users.id, payment.receivedBy)).get();
      blocks.push(
        <ReceiptDoc
          key="receipt"
          clinic={clinic}
          receiptNo={payment.receiptNo}
          dateISO={visit.visitDate}
          patient={patient}
          items={items}
          total={payment.total}
          method={payment.method}
          receiverName={receiver?.displayName}
        />,
      );
    }
  }

  // ── Appointment(s) created during this visit ────────────────────────────────
  if (want.has("appointment")) {
    const appts = db
      .select()
      .from(tables.appointments)
      // the patient's upcoming appointments — same set the visit's
      // "นัดครั้งถัดไป" card shows, so the bar prints what you see
      .where(
        and(
          eq(tables.appointments.patientId, visit.patientId),
          eq(tables.appointments.status, "scheduled"),
        ),
      )
      .orderBy(asc(tables.appointments.date))
      .all();
    for (const appt of appts) {
      const doctor = db.select().from(tables.users).where(eq(tables.users.id, appt.createdBy)).get();
      blocks.push(
        <AppointmentDoc key={`appt-${appt.id}`} clinic={clinic} appt={appt} patient={patient} doctorName={doctor?.displayName} />,
      );
    }
  }

  // ── Drug labels ─────────────────────────────────────────────────────────────
  if (want.has("labels")) {
    const medItems = db
      .select()
      .from(tables.visitItems)
      .where(and(eq(tables.visitItems.visitId, visitId), eq(tables.visitItems.type, "medication")))
      .orderBy(asc(tables.visitItems.id))
      .all();
    if (medItems.length > 0) {
      const medIds = [...new Set(medItems.map((it) => it.medicationId).filter((x): x is number => x != null))];
      const meds = medIds.length
        ? db.select().from(tables.medications).where(inArray(tables.medications.id, medIds)).all()
        : [];
      const medById = new Map(meds.map((m) => [m.id, { portionAmount: m.portionAmount, indication: m.indication }]));
      const labels = buildLabels(medItems, medById);
      blocks.push(<LabelsDoc key="labels" clinic={clinic} dateISO={visit.visitDate} patient={patient} labels={labels} />);
    }
  }

  if (blocks.length === 0) {
    return <p className="p-6 text-sm text-ink-soft">ไม่มีเอกสารให้พิมพ์</p>;
  }

  return (
    <div className="mx-auto max-w-3xl">
      {blocks.map((block, i) => (
        <div key={i} className={i < blocks.length - 1 ? "print:break-after-page" : ""}>
          {block}
        </div>
      ))}
    </div>
  );
}
