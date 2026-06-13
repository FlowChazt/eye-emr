import Link from "next/link";
import { baht, thaiDate, VISIT_STATUS_LABEL } from "@/lib/format";
import type { tables } from "@/db";

type Visit = typeof tables.visits.$inferSelect;
type VisitItem = typeof tables.visitItems.$inferSelect;

function vitalsLine(v: Visit): string | null {
  const parts: string[] = [];
  if (v.weightKg != null) parts.push(`นน. ${v.weightKg} kg`);
  if (v.heightCm != null) parts.push(`สส. ${v.heightCm} cm`);
  if (v.bpSystolic != null && v.bpDiastolic != null) parts.push(`BP ${v.bpSystolic}/${v.bpDiastolic}`);
  if (v.pulse != null) parts.push(`HR ${v.pulse}`);
  if (v.temperatureC != null) parts.push(`T ${v.temperatureC}°C`);
  return parts.length ? parts.join(" · ") : null;
}

/** Read-only EMR view of the patient's previous visits, shown inside a visit. */
export function HistoryPanel({
  patientHn,
  visits,
  itemsByVisit,
}: {
  patientHn: string;
  visits: Visit[];
  itemsByVisit: Map<number, VisitItem[]>;
}) {
  return (
    <section className="rounded-2xl border border-line bg-paper p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">ประวัติการรักษาที่ผ่านมา</h2>
        <Link href={`/patients/${patientHn}`} className="text-sm font-medium text-teal-700 hover:underline">
          เปิดหน้า EMR เต็ม →
        </Link>
      </div>

      {visits.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line bg-cream/60 p-8 text-center text-ink-soft">
          ยังไม่มีประวัติการรักษาครั้งก่อน
        </p>
      ) : (
        <ul className="space-y-3">
          {visits.map((v, i) => {
            const items = itemsByVisit.get(v.id) ?? [];
            const total = items.reduce((s, it) => s + it.lineTotal, 0);
            const vitals = vitalsLine(v);
            return (
              <li key={v.id}>
                <details open={i === 0} className="group rounded-xl border border-line bg-cream/40">
                  <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 rounded-xl px-4 py-3 hover:bg-teal-50/60">
                    <span>
                      <span className="font-semibold">{thaiDate(v.visitDate)}</span>
                      <span className="ml-3 text-ink-soft">{v.diagnosis || v.chiefComplaint || "ไม่ระบุ"}</span>
                    </span>
                    <span className="text-sm text-ink-soft">{VISIT_STATUS_LABEL[v.status]}</span>
                  </summary>
                  <div className="space-y-3 border-t border-line/60 px-4 py-3 text-[15px]">
                    {vitals && <p className="text-sm tabular-nums text-ink-soft">{vitals}</p>}
                    {v.chiefComplaint && (
                      <p>
                        <span className="text-sm font-medium text-ink-soft">CC:</span> {v.chiefComplaint}
                      </p>
                    )}
                    {v.note && (
                      <div>
                        <p className="text-sm font-medium text-ink-soft">บันทึกการตรวจ</p>
                        <p className="whitespace-pre-wrap">{v.note}</p>
                      </div>
                    )}
                    {v.diagnosis && (
                      <p>
                        <span className="text-sm font-medium text-ink-soft">Dx:</span> {v.diagnosis}
                      </p>
                    )}
                    {items.length > 0 && (
                      <div>
                        <p className="mb-1 text-sm font-medium text-ink-soft">ยา/หัตถการ</p>
                        <ul className="space-y-0.5">
                          {items.map((it) => (
                            <li key={it.id} className="flex justify-between gap-3">
                              <span>
                                {it.description} × {it.qty}
                              </span>
                              <span className="tabular-nums text-ink-soft">{baht(it.lineTotal)}</span>
                            </li>
                          ))}
                        </ul>
                        <p className="mt-1 border-t border-line/60 pt-1 text-right font-medium tabular-nums">
                          รวม {baht(total)} บาท
                        </p>
                      </div>
                    )}
                    <p className="text-right">
                      <Link href={`/visits/${v.id}`} className="text-sm font-medium text-teal-700 hover:underline">
                        เปิดหน้า visit นี้ →
                      </Link>
                    </p>
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
