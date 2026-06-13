"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { cancelAppointment, createAppointment } from "@/app/(app)/appointments/actions";
import { thaiDate, todayISO } from "@/lib/format";

type Appointment = {
  id: number;
  date: string;
  note: string | null;
};

const field =
  "rounded-lg border border-line bg-cream px-3 py-2 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-200";

function plusFromToday(days: number, months: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setMonth(d.getMonth() + months);
  return todayISO(d);
}

const QUICK_PICKS: [string, number, number][] = [
  ["1 สัปดาห์", 7, 0],
  ["2 สัปดาห์", 14, 0],
  ["1 เดือน", 0, 1],
  ["3 เดือน", 0, 3],
];

export function NextAppointment({
  patientId,
  visitId,
  appointments,
}: {
  patientId: number;
  visitId: number;
  appointments: Appointment[];
}) {
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    startTransition(async () => {
      const res = await createAppointment(patientId, visitId, formData);
      if ("error" in res) {
        setError(res.error ?? null);
      } else {
        setError(null);
        setDate("");
        setNote("");
      }
    });
  }

  function cancel(id: number) {
    startTransition(async () => {
      const res = await cancelAppointment(id);
      setError("error" in res ? (res.error ?? null) : null);
    });
  }

  return (
    <section className="rounded-2xl border border-line bg-paper p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold">นัดครั้งถัดไป</h2>

      {appointments.length > 0 && (
        <ul className="mb-4 space-y-2">
          {appointments.map((a) => (
            <li
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-strong/20 bg-amber-soft px-4 py-2.5"
            >
              <p>
                📅 <span className="font-semibold">{thaiDate(a.date)}</span>
                {a.note && <span className="ml-2 text-ink-soft">· {a.note}</span>}
              </p>
              <div className="flex items-center gap-2">
                <Link
                  href={`/appointments/${a.id}/print`}
                  className="rounded-lg border border-line bg-paper px-3 py-1.5 text-sm font-medium hover:bg-cream"
                >
                  🖨️ พิมพ์ใบนัด
                </Link>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => cancel(a.id)}
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-danger hover:bg-danger-soft disabled:opacity-50"
                >
                  ยกเลิกนัด
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form action={submit} className="flex flex-wrap items-end gap-3">
        <label>
          <span className="mb-1 block text-sm font-medium">วันนัด</span>
          <input
            type="date"
            name="date"
            required
            min={plusFromToday(1, 0)}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={field}
          />
        </label>
        <div className="flex gap-1.5 pb-0.5">
          {QUICK_PICKS.map(([label, days, months]) => (
            <button
              key={label}
              type="button"
              onClick={() => setDate(plusFromToday(days, months))}
              className="rounded-lg border border-line bg-cream px-2.5 py-2 text-sm hover:bg-teal-50"
            >
              {label}
            </button>
          ))}
        </div>
        <label className="min-w-48 flex-1">
          <span className="mb-1 block text-sm font-medium">นัดมาเพื่อ</span>
          <input
            name="note"
            placeholder="เช่น ติดตามอาการ / ฟังผลเลือด"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className={`${field} w-full`}
          />
        </label>
        <button
          disabled={pending || !date}
          className="rounded-lg bg-teal-700 px-4 py-2 font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
        >
          {pending ? "กำลังบันทึก…" : "ตั้งนัด"}
        </button>
      </form>
      {error && <p className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
    </section>
  );
}
