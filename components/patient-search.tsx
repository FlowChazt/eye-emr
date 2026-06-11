"use client";

import { useState, useTransition } from "react";
import { searchPatients } from "@/app/(app)/patients/actions";
import { ageYears, fullName } from "@/lib/format";

type Patient = Awaited<ReturnType<typeof searchPatients>>[number];

export function PatientSearch({
  onPick,
  pickLabel,
  autoFocus = true,
}: {
  onPick: (patient: Patient) => void | Promise<void>;
  pickLabel: string;
  autoFocus?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Patient[] | null>(null);
  const [searching, startSearch] = useTransition();
  const [picking, startPick] = useTransition();

  function runSearch(q: string) {
    setQuery(q);
    if (q.trim().length < 2) {
      setResults(null);
      return;
    }
    startSearch(async () => setResults(await searchPatients(q)));
  }

  return (
    <div>
      <input
        value={query}
        onChange={(e) => runSearch(e.target.value)}
        autoFocus={autoFocus}
        placeholder="ค้นหาด้วย HN / ชื่อ / เบอร์โทร / เลขบัตรประชาชน"
        className="w-full rounded-lg border border-line bg-cream px-4 py-3 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-200"
      />

      {searching && <p className="mt-3 text-sm text-ink-soft">กำลังค้นหา…</p>}

      {results && results.length === 0 && !searching && (
        <p className="mt-3 text-sm text-ink-soft">ไม่พบผู้ป่วย — ลงทะเบียนผู้ป่วยใหม่ด้านล่าง</p>
      )}

      {results && results.length > 0 && (
        <ul className="mt-3 divide-y divide-line overflow-hidden rounded-xl border border-line bg-paper">
          {results.map((p) => {
            const age = ageYears(p.dob);
            return (
              <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-teal-50/60">
                <div>
                  <span className="font-semibold tabular-nums text-teal-800">{p.hn}</span>
                  <span className="ml-3 font-medium">{fullName(p)}</span>
                  <span className="ml-2 text-sm text-ink-soft">
                    {age !== null && `${age} ปี`} {p.phone && `· ${p.phone}`}
                  </span>
                  {p.allergies && (
                    <span className="ml-2 rounded bg-danger-soft px-1.5 py-0.5 text-xs font-medium text-danger">
                      แพ้: {p.allergies}
                    </span>
                  )}
                </div>
                <button
                  disabled={picking}
                  onClick={() => startPick(async () => void (await onPick(p)))}
                  className="shrink-0 rounded-lg bg-teal-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
                >
                  {pickLabel}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
