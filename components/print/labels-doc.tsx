import { fullName, thaiDate } from "@/lib/format";
import { ClinicLogo } from "@/components/clinic-logo";
import type { ClinicInfo } from "@/lib/clinic";

export type DrugLabel = {
  key: string;
  drug: string;
  indication: string | null;
  instructions: string | null;
  packetIndex: number;
  packetTotal: number;
};

type MedItem = { id: number; medicationId: number | null; description: string; instructions: string | null; qty: number };
export type MedInfo = { portionAmount: number | null; indication: string | null };

/**
 * Expand medication line items into one printable label per packet:
 * packets = ceil(qty / portion); meds with no portion get a single label.
 */
export function buildLabels(items: MedItem[], medById: Map<number, MedInfo>): DrugLabel[] {
  const labels: DrugLabel[] = [];
  for (const it of items) {
    const info = it.medicationId ? medById.get(it.medicationId) : undefined;
    const portion = info?.portionAmount ?? null;
    const count = portion && portion > 0 ? Math.max(1, Math.ceil(it.qty / portion)) : 1;
    for (let i = 0; i < count; i++) {
      labels.push({
        key: `${it.id}-${i}`,
        drug: it.description,
        indication: info?.indication ?? null,
        instructions: it.instructions,
        packetIndex: i + 1,
        packetTotal: count,
      });
    }
  }
  return labels;
}

export function LabelsDoc({
  clinic,
  dateISO,
  patient,
  labels,
}: {
  clinic: ClinicInfo;
  dateISO: string;
  patient: { hn: string; prefix: string | null; firstName: string; lastName: string; allergies: string | null };
  labels: DrugLabel[];
}) {
  const date = thaiDate(dateISO);
  const name = fullName(patient);
  return (
    <div className="flex flex-wrap content-start gap-[3mm]">
      {labels.map((l) => (
        <div
          key={l.key}
          className="flex h-[45mm] w-[62mm] flex-col overflow-hidden rounded-[2px] border border-teal-900 bg-white px-[3mm] py-[2mm] font-print text-ink [print-color-adjust:exact] [break-inside:avoid]"
        >
          <div className="flex items-center gap-1.5 border-b border-teal-900/40 pb-[1mm]">
            <ClinicLogo size={16} variant="mark" className="shrink-0 text-teal-900" />
            <span className="truncate text-[8px] font-bold tracking-wide text-teal-900">{clinic.name}</span>
            {clinic.phone && <span className="ml-auto shrink-0 text-[7px] text-ink-soft">โทร. {clinic.phone}</span>}
          </div>

          <div className="mt-[1mm] flex items-baseline justify-between text-[8px] text-ink-soft">
            <span className="truncate">
              <span className="font-semibold tabular-nums text-teal-700">{patient.hn}</span> {name}
            </span>
            <span className="shrink-0 tabular-nums">{date}</span>
          </div>

          <p className="mt-[1mm] truncate text-[12px] font-bold leading-tight text-teal-900">{l.drug}</p>

          {l.indication && (
            <p className="mt-[0.5mm] line-clamp-2 text-[9px] leading-snug text-ink-soft">
              <span className="font-medium text-ink">สรรพคุณ:</span> {l.indication}
            </p>
          )}

          <div className="mt-[1mm] flex-1 overflow-hidden">
            <p className="text-[8px] font-medium text-ink-soft">วิธีใช้</p>
            <p className="text-[11px] leading-snug">{l.instructions || "—"}</p>
          </div>

          <div className="mt-[1mm] flex items-end justify-between gap-1 text-[7px]">
            {patient.allergies ? (
              <span className="truncate font-medium text-danger">⚠ แพ้: {patient.allergies}</span>
            ) : (
              <span />
            )}
            {l.packetTotal > 1 && (
              <span className="shrink-0 text-ink-soft">
                ซองที่ {l.packetIndex}/{l.packetTotal}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
