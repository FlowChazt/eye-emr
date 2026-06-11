import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db, tables } from "@/db";
import { requireUser } from "@/lib/session";
import { baht, fullName, thaiDate } from "@/lib/format";
import { PrintButton } from "./print-button";

async function getSetting(key: string): Promise<string> {
  const row = db.select().from(tables.settings).where(eq(tables.settings.key, key)).get();
  return row?.value ?? "";
}

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const visitId = Number(id);
  if (!Number.isInteger(visitId)) notFound();

  const payment = db.select().from(tables.payments).where(eq(tables.payments.visitId, visitId)).get();
  if (!payment) notFound();

  const visit = db.select().from(tables.visits).where(eq(tables.visits.id, visitId)).get()!;
  const patient = db.select().from(tables.patients).where(eq(tables.patients.id, visit.patientId)).get()!;
  const items = db
    .select()
    .from(tables.visitItems)
    .where(eq(tables.visitItems.visitId, visitId))
    .orderBy(asc(tables.visitItems.id))
    .all();
  const receiver = db.select().from(tables.users).where(eq(tables.users.id, payment.receivedBy)).get();

  const clinicName = await getSetting("clinic_name");
  const clinicAddress = await getSetting("clinic_address");
  const clinicPhone = await getSetting("clinic_phone");

  return (
    <div className="mx-auto max-w-xl">
      <div className="no-print mb-4 flex items-center justify-between">
        <Link href={`/visits/${visitId}`} className="text-teal-700 underline underline-offset-2">
          ← กลับไปที่ visit
        </Link>
        <PrintButton />
      </div>

      {/* A5-proportioned receipt */}
      <div className="receipt rounded-xl border border-line bg-white p-8 font-print shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <header className="mb-6 text-center">
          <h1 className="text-xl font-bold">{clinicName || "Eye Clinic"}</h1>
          {clinicAddress && <p className="text-sm">{clinicAddress}</p>}
          {clinicPhone && <p className="text-sm">โทร. {clinicPhone}</p>}
          <p className="mt-3 text-lg font-bold">ใบเสร็จรับเงิน</p>
        </header>

        <div className="mb-4 flex justify-between text-sm">
          <div>
            <p>
              ผู้ป่วย: <span className="font-medium">{fullName(patient)}</span>
            </p>
            <p>HN: {patient.hn}</p>
          </div>
          <div className="text-right">
            <p>เลขที่: {payment.receiptNo}</p>
            <p>วันที่: {thaiDate(visit.visitDate)}</p>
          </div>
        </div>

        <table className="mb-4 w-full text-sm">
          <thead>
            <tr className="border-y border-black/60">
              <th className="py-1.5 text-left font-semibold">รายการ</th>
              <th className="py-1.5 text-right font-semibold">จำนวน</th>
              <th className="py-1.5 text-right font-semibold">ราคา/หน่วย</th>
              <th className="py-1.5 text-right font-semibold">จำนวนเงิน</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-b border-dotted border-black/20">
                <td className="py-1.5">{it.description}</td>
                <td className="py-1.5 text-right tabular-nums">{it.qty}</td>
                <td className="py-1.5 text-right tabular-nums">{baht(it.unitPrice)}</td>
                <td className="py-1.5 text-right tabular-nums">{baht(it.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-black/60">
              <td colSpan={3} className="py-2 text-right font-bold">
                รวมทั้งสิ้น
              </td>
              <td className="py-2 text-right text-base font-bold tabular-nums">{baht(payment.total)} บาท</td>
            </tr>
          </tfoot>
        </table>

        <div className="flex justify-between text-sm">
          <p>ชำระโดย: {payment.method === "cash" ? "เงินสด" : "เงินโอน"}</p>
          <p>ผู้รับเงิน: {receiver?.displayName ?? "-"}</p>
        </div>
      </div>
    </div>
  );
}
