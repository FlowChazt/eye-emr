"use client";

import { useState, useTransition } from "react";
import { saveVisitRecord } from "../actions";

type Visit = {
  id: number;
  weightKg: number | null;
  heightCm: number | null;
  bpSystolic: number | null;
  bpDiastolic: number | null;
  pulse: number | null;
  temperatureC: number | null;
  chiefComplaint: string | null;
  note: string | null;
  diagnosis: string | null;
};

const field = "field";

export function VisitRecordForm({ visit, readOnly }: { visit: Visit; readOnly: boolean }) {
  const [saving, startSaving] = useTransition();
  const [savedAt, setSavedAt] = useState<string | null>(null);

  function onSubmit(formData: FormData) {
    startSaving(async () => {
      await saveVisitRecord(visit.id, formData);
      setSavedAt(new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }));
    });
  }

  return (
    <form action={onSubmit} className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-wide text-ink-soft uppercase">บันทึกการตรวจ</h2>
        {!readOnly && (
          <div className="flex items-center gap-3">
            {savedAt && <span className="text-xs text-ink-soft">บันทึกแล้ว {savedAt}</span>}
            <button disabled={saving} className="btn-primary">
              {saving ? "กำลังบันทึก…" : "บันทึก"}
            </button>
          </div>
        )}
      </div>

      <fieldset disabled={readOnly} className="space-y-4">
        {/* vitals */}
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {(
            [
              ["weightKg", "น้ำหนัก (kg)", visit.weightKg],
              ["heightCm", "ส่วนสูง (cm)", visit.heightCm],
              ["bpSystolic", "BP บน", visit.bpSystolic],
              ["bpDiastolic", "BP ล่าง", visit.bpDiastolic],
              ["pulse", "ชีพจร", visit.pulse],
              ["temperatureC", "อุณหภูมิ (°C)", visit.temperatureC],
            ] as const
          ).map(([name, label, value]) => (
            <label key={name}>
              <span className="mb-1 block text-xs font-medium text-ink-soft">{label}</span>
              <input
                name={name}
                type="number"
                step="any"
                defaultValue={value ?? ""}
                className={`${field} tabular-nums`}
              />
            </label>
          ))}
        </div>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">อาการสำคัญ (CC)</span>
          <input name="chiefComplaint" defaultValue={visit.chiefComplaint ?? ""} className={field} />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">บันทึกการตรวจ</span>
          <textarea name="note" rows={8} defaultValue={visit.note ?? ""} className={field} />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">การวินิจฉัย (Dx)</span>
          <input name="diagnosis" defaultValue={visit.diagnosis ?? ""} className={field} />
        </label>
      </fieldset>
    </form>
  );
}
