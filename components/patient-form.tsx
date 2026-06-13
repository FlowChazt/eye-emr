"use client";

import { useActionState, useState } from "react";
import { ageYears, isoToCE, parseDobParts, THAI_MONTHS_FULL } from "@/lib/format";

type PatientValues = {
  prefix?: string | null;
  firstName?: string;
  lastName?: string;
  nationalId?: string | null;
  dob?: string | null;
  sex?: string | null;
  phone?: string | null;
  address?: string | null;
  allergies?: string | null;
  chronicConditions?: string | null;
  notes?: string | null;
};

const field =
  "w-full rounded-lg border border-line bg-cream px-3 py-2 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-200";

export function PatientForm({
  action,
  defaults,
  submitLabel,
  openVisitOption = false,
}: {
  action: (prev: unknown, formData: FormData) => Promise<{ error?: string } | void>;
  defaults?: PatientValues;
  submitLabel: string;
  openVisitOption?: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    async (prev: unknown, formData: FormData) => (await action(prev, formData)) ?? null,
    null,
  );

  // DOB is entered Thai-style (วัน / เดือน / ปี พ.ศ.) and stored as CE ISO.
  const dobDefault = defaults?.dob ? isoToCE(defaults.dob).split("-") : null;
  const [dobDay, setDobDay] = useState(dobDefault ? String(Number(dobDefault[2])) : "");
  const [dobMonth, setDobMonth] = useState(dobDefault ? String(Number(dobDefault[1])) : "");
  const [dobYearBE, setDobYearBE] = useState(dobDefault ? String(Number(dobDefault[0]) + 543) : "");
  const dobParsed = parseDobParts(dobDay || null, dobMonth || null, dobYearBE || null);
  const previewAge = "iso" in dobParsed && dobParsed.iso ? ageYears(dobParsed.iso) : null;

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-12 gap-3">
        <label className="col-span-2">
          <span className="mb-1 block text-sm font-medium">คำนำหน้า</span>
          <select name="prefix" defaultValue={defaults?.prefix ?? ""} className={field}>
            <option value="">-</option>
            {["นาย", "นาง", "นางสาว", "ด.ช.", "ด.ญ."].map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
        <label className="col-span-5">
          <span className="mb-1 block text-sm font-medium">ชื่อ *</span>
          <input name="firstName" required defaultValue={defaults?.firstName ?? ""} className={field} />
        </label>
        <label className="col-span-5">
          <span className="mb-1 block text-sm font-medium">นามสกุล *</span>
          <input name="lastName" required defaultValue={defaults?.lastName ?? ""} className={field} />
        </label>
      </div>

      <div className="grid grid-cols-12 gap-3">
        <label className="col-span-5">
          <span className="mb-1 block text-sm font-medium">เลขบัตรประชาชน</span>
          <input name="nationalId" defaultValue={defaults?.nationalId ?? ""} className={field} />
        </label>
        <label className="col-span-3">
          <span className="mb-1 block text-sm font-medium">เพศ</span>
          <select name="sex" defaultValue={defaults?.sex ?? ""} className={field}>
            <option value="">-</option>
            <option value="female">หญิง</option>
            <option value="male">ชาย</option>
            <option value="other">อื่นๆ</option>
          </select>
        </label>
        <label className="col-span-4">
          <span className="mb-1 block text-sm font-medium">เบอร์โทร</span>
          <input name="phone" defaultValue={defaults?.phone ?? ""} className={field} />
        </label>
      </div>

      <div className="grid grid-cols-12 items-end gap-3">
        <label className="col-span-2">
          <span className="mb-1 block text-sm font-medium">วันเกิด</span>
          <input
            name="dobDay"
            inputMode="numeric"
            placeholder="วันที่"
            value={dobDay}
            onChange={(e) => setDobDay(e.target.value)}
            className={`${field} tabular-nums`}
          />
        </label>
        <label className="col-span-4">
          <span className="mb-1 block text-sm font-medium">เดือน</span>
          <select name="dobMonth" value={dobMonth} onChange={(e) => setDobMonth(e.target.value)} className={field}>
            <option value="">-</option>
            {THAI_MONTHS_FULL.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label className="col-span-3">
          <span className="mb-1 block text-sm font-medium">ปีเกิด (พ.ศ.)</span>
          <input
            name="dobYearBE"
            inputMode="numeric"
            placeholder="เช่น 2510"
            value={dobYearBE}
            onChange={(e) => setDobYearBE(e.target.value)}
            className={`${field} tabular-nums`}
          />
        </label>
        <p className="col-span-3 pb-2 text-sm text-ink-soft">
          {"error" in dobParsed
            ? <span className="text-danger">{dobParsed.error}</span>
            : previewAge !== null && <>อายุ <span className="font-semibold text-ink">{previewAge}</span> ปี</>}
        </p>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">ที่อยู่</span>
        <input name="address" defaultValue={defaults?.address ?? ""} className={field} />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-danger">ประวัติแพ้ยา/แพ้อาหาร</span>
        <input
          name="allergies"
          defaultValue={defaults?.allergies ?? ""}
          placeholder="เว้นว่างถ้าไม่มี"
          className={`${field} border-danger/30 focus:border-danger focus:ring-danger/20`}
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label>
          <span className="mb-1 block text-sm font-medium">โรคประจำตัว</span>
          <input name="chronicConditions" defaultValue={defaults?.chronicConditions ?? ""} className={field} />
        </label>
        <label>
          <span className="mb-1 block text-sm font-medium">หมายเหตุ</span>
          <input name="notes" defaultValue={defaults?.notes ?? ""} className={field} />
        </label>
      </div>

      {state?.error && (
        <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{state.error}</p>
      )}

      <div className="flex items-center gap-4 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-teal-700 px-5 py-2.5 font-semibold text-white transition hover:bg-teal-800 disabled:opacity-50"
        >
          {pending ? "กำลังบันทึก…" : submitLabel}
        </button>
        {openVisitOption && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="openVisit" value="1" defaultChecked className="h-4 w-4 accent-teal-700" />
            เปิด visit ทันทีหลังลงทะเบียน
          </label>
        )}
      </div>
    </form>
  );
}
