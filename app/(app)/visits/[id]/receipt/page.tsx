import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db, tables } from "@/db";
import { requireUser } from "@/lib/session";
import { baht, fullName, thaiDate } from "@/lib/format";
import { bahtText } from "@/lib/baht-text";
import { PrintButton } from "@/components/print-button";
import { DocField, PrintDoc } from "@/components/print-doc";

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

      <PrintDoc
        clinicName={clinicName || "Eye Clinic"}
        clinicAddress={clinicAddress}
        clinicPhone={clinicPhone}
        title="ใบเสร็จรับเงิน"
        titleEn="Receipt"
        meta={[
          { label: "เลขที่", value: payment.receiptNo },
          { label: "วันที่", value: thaiDate(visit.visitDate) },
        ]}
        signature={{ role: "ผู้รับเงิน", name: receiver?.displayName }}
      >
        <div className="mb-4 grid grid-cols-[1fr_auto] gap-x-6 gap-y-1.5">
          <DocField label="ได้รับเงินจาก" value={fullName(patient)} />
          <DocField label="HN" value={patient.hn} className="w-36" />
        </div>

        <table className="w-full border-collapse text-[14px]">
          <thead>
            <tr className="border-y-2 border-teal-900 text-teal-900">
              <th className="py-1.5 pr-2 text-left font-bold">รายการ</th>
              <th className="w-16 py-1.5 text-right font-bold">จำนวน</th>
              <th className="w-24 py-1.5 text-right font-bold">ราคา/หน่วย</th>
              <th className="w-24 py-1.5 text-right font-bold">จำนวนเงิน</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={it.id} className="border-b border-dotted border-ink/25">
                <td className="py-1.5 pr-2">
                  <span className="mr-2 inline-block w-5 text-right tabular-nums text-ink-soft">{i + 1}.</span>
                  {it.description}
                </td>
                <td className="py-1.5 text-right tabular-nums">{it.qty}</td>
                <td className="py-1.5 text-right tabular-nums">{baht(it.unitPrice)}</td>
                <td className="py-1.5 text-right tabular-nums">{baht(it.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-3 flex items-stretch border-2 border-teal-900">
          <p className="flex-1 px-3 py-2 text-center text-[14px]">
            ({bahtText(payment.total)})
          </p>
          <p className="flex items-center gap-3 border-l-2 border-teal-900 bg-cream px-4 py-2 font-bold">
            รวมทั้งสิ้น <span className="text-base tabular-nums">{baht(payment.total)} บาท</span>
          </p>
        </div>

        <p className="mt-3 text-[14px]">
          ชำระโดย:{" "}
          <span className="font-medium">{payment.method === "cash" ? "เงินสด" : "เงินโอน"}</span>
        </p>
      </PrintDoc>
    </div>
  );
}
