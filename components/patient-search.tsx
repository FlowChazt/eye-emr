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
  const [active, setActive] = useState(0);
  const [searching, startSearch] = useTransition();
  const [picking, startPick] = useTransition();

  function runSearch(q: string) {
    setQuery(q);
    setActive(0);
    if (q.trim().length < 2) {
      setResults(null);
      return;
    }
    startSearch(async () => setResults(await searchPatients(q)));
  }

  function pick(p: Patient) {
    startPick(async () => void (await onPick(p)));
  }

  return (
    <div>
      <input
        value={query}
        onChange={(e) => runSearch(e.target.value)}
        onKeyDown={(e) => {
          if (!results || results.length === 0) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => Math.min(i + 1, results.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            pick(results[Math.min(active, results.length - 1)]);
          }
        }}
        autoFocus={autoFocus}
        placeholder="ค้นหาด้วย HN / ชื่อ / เบอร์โทร / เลขบัตรประชาชน"
        className="field px-3 py-2.5"
      />

      {searching && <p className="mt-3 text-sm text-ink-soft">กำลังค้นหา…</p>}

      {results && results.length === 0 && !searching && (
        <p className="mt-3 text-sm text-ink-soft">ไม่พบผู้ป่วย — ลงทะเบียนผู้ป่วยใหม่ด้านล่าง</p>
      )}

      {results && results.length > 0 && (
        <ul className="mt-3 divide-y divide-line-soft overflow-hidden rounded-md border border-line bg-paper">
          {results.map((p, i) => {
            const age = ageYears(p.dob);
            return (
              <li
                key={p.id}
                onMouseEnter={() => setActive(i)}
                className={`flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-teal-50/60 ${i === active ? "bg-teal-50/60" : ""}`}
              >
                <div>
                  <span className="font-semibold tabular-nums text-teal-700">{p.hn}</span>
                  <span className="ml-3 font-medium">{fullName(p)}</span>
                  <span className="ml-2 text-sm text-ink-soft">
                    {age !== null && `${age} ปี`} {p.phone && `· ${p.phone}`}
                  </span>
                  {p.allergies && (
                    <span className="chip ml-2 bg-danger-soft text-danger">แพ้: {p.allergies}</span>
                  )}
                </div>
                <button
                  disabled={picking}
                  onClick={() => pick(p)}
                  className="btn-primary shrink-0"
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
