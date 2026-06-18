import { baht, fullName, thaiDate } from "@/lib/format";
import { bahtText } from "@/lib/baht-text";
import { DocField, PrintDoc } from "@/components/print-doc";
import type { ClinicInfo } from "@/lib/clinic";

type Item = { id: number; description: string; qty: number; unitPrice: number; lineTotal: number };

export function ReceiptDoc({
  clinic,
  receiptNo,
  dateISO,
  patient,
  items,
  total,
  method,
  receiverName,
}: {
  clinic: ClinicInfo;
  receiptNo: string;
  dateISO: string;
  patient: { hn: string; prefix: string | null; firstName: string; lastName: string };
  items: Item[];
  total: number;
  method: "cash" | "transfer";
  receiverName?: string;
}) {
  return (
    <PrintDoc
      clinicName={clinic.name}
      clinicAddress={clinic.address}
      clinicPhone={clinic.phone}
      title="ใบเสร็จรับเงิน"
      titleEn="Receipt"
      meta={[
        { label: "เลขที่", value: receiptNo },
        { label: "วันที่", value: thaiDate(dateISO) },
      ]}
      signature={{ role: "ผู้รับเงิน", name: receiverName }}
    >
      <div className="mb-4 grid grid-cols-[1fr_auto] gap-x-6 gap-y-1.5">
        <DocField label="ได้รับเงินจาก" value={fullName(patient)} />
        <DocField label="HN" value={patient.hn} className="w-36" />
      </div>

      <table className="w-full border-collapse text-[12px]">
        <thead>
          <tr className="border-y-2 border-teal-900 text-teal-900">
            <th className="py-1.5 pr-2 text-left font-bold">รายการ</th>
            <th className="w-10 py-1.5 text-right font-bold">จำนวน</th>
            <th className="w-20 py-1.5 text-right font-bold">ราคา/หน่วย</th>
            <th className="w-20 py-1.5 text-right font-bold">จำนวนเงิน</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={it.id} className="border-b border-dotted border-ink/25">
              <td className="py-1.5 pr-2">
                <span className="mr-1.5 inline-block w-4 text-right tabular-nums text-ink-soft">{i + 1}.</span>
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
        <p className="flex-1 px-3 py-1.5 text-center text-[12px]">({bahtText(total)})</p>
        <p className="flex items-center gap-2 border-l-2 border-teal-900 bg-cream px-3 py-1.5 font-bold">
          รวมทั้งสิ้น <span className="text-sm tabular-nums">{baht(total)} บาท</span>
        </p>
      </div>

      <p className="mt-3 text-[12px]">
        ชำระโดย: <span className="font-medium">{method === "cash" ? "เงินสด" : "เงินโอน"}</span>
      </p>
    </PrintDoc>
  );
}
