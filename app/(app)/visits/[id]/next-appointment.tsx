"use client";

import { useState, useTransition } from "react";
import { cancelAppointment, createAppointment } from "@/app/(app)/appointments/actions";
import { thaiDate, todayISO } from "@/lib/format";

type Appointment = {
  id: number;
  date: string;
  note: string | null;
};

const field = "field";

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
    <section className="card p-4">
      <h2 className="mb-3 text-sm font-semibold tracking-wide text-ink-soft uppercase">นัดครั้งถัดไป</h2>

      {appointments.length > 0 && (
        <ul className="mb-4 space-y-2">
          {appointments.map((a) => (
            <li
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-strong/20 bg-amber-soft px-3 py-2 text-sm"
            >
              <p>
                <span className="font-semibold">{thaiDate(a.date)}</span>
                {a.note && <span className="ml-2 text-ink-soft">· {a.note}</span>}
              </p>
              <button
                type="button"
                disabled={pending}
                onClick={() => cancel(a.id)}
                className="btn-danger"
              >
                ยกเลิกนัด
              </button>
            </li>
          ))}
        </ul>
      )}

      <form action={submit} className="flex flex-wrap items-end gap-3">
        <label>
          <span className="mb-1 block text-xs font-medium text-ink-soft">วันนัด</span>
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
              className="rounded-md border border-line bg-cream px-2.5 py-1.5 text-sm hover:bg-teal-50"
            >
              {label}
            </button>
          ))}
        </div>
        <label className="min-w-48 flex-1">
          <span className="mb-1 block text-xs font-medium text-ink-soft">นัดมาเพื่อ</span>
          <input
            name="note"
            placeholder="เช่น ติดตามอาการ / ฟังผลเลือด"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className={`${field} w-full`}
          />
        </label>
        <button disabled={pending || !date} className="btn-primary">
          {pending ? "กำลังบันทึก…" : "ตั้งนัด"}
        </button>
      </form>
      {error && <p className="mt-3 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
    </section>
  );
}
