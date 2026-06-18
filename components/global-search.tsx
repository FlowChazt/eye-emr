"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { searchPatients } from "@/app/(app)/patients/actions";
import { ageYears, fullName } from "@/lib/format";
import { SearchIcon } from "./icons";

type Patient = Awaited<ReturnType<typeof searchPatients>>[number];

/**
 * Top-bar "jump to patient" search. Type HN / name / phone to get a compact
 * results dropdown; Enter or click opens the patient chart. Closes on blur,
 * Escape, or after navigating.
 */
export function GlobalSearch() {
  const router = useRouter();
  const boxRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Patient[] | null>(null);
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const [, startSearch] = useTransition();

  function run(q: string) {
    setQuery(q);
    setOpen(true);
    setActive(0);
    if (q.trim().length < 2) {
      setResults(null);
      return;
    }
    startSearch(async () => setResults(await searchPatients(q)));
  }

  function go(hn: string) {
    setOpen(false);
    setQuery("");
    setResults(null);
    router.push(`/patients/${hn}`);
  }

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={boxRef} className="relative w-64">
      <SearchIcon
        size={15}
        className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-ink-soft"
      />
      <input
        value={query}
        onChange={(e) => run(e.target.value)}
        onFocus={() => results && setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            return;
          }
          const list = results?.slice(0, 8) ?? [];
          if (list.length === 0) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => Math.min(i + 1, list.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            go(list[Math.min(active, list.length - 1)].hn);
          }
        }}
        placeholder="ค้นหาผู้ป่วย…"
        className="w-full rounded-md border border-line bg-cream py-1.5 pr-3 pl-8 text-sm outline-none focus:border-teal-600 focus:bg-white focus:ring-2 focus:ring-teal-100"
      />

      {open && results && (
        <div className="absolute top-full right-0 left-0 z-20 mt-1 overflow-hidden rounded-md border border-line bg-paper shadow-lg">
          {results.length === 0 ? (
            <p className="px-3 py-2.5 text-sm text-ink-soft">ไม่พบผู้ป่วย</p>
          ) : (
            <ul className="max-h-80 overflow-auto">
              {results.slice(0, 8).map((p, i) => {
                const age = ageYears(p.dob);
                return (
                  <li key={p.id}>
                    <button
                      onClick={() => go(p.hn)}
                      onMouseEnter={() => setActive(i)}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-teal-50 ${i === active ? "bg-teal-50" : ""}`}
                    >
                      <span className="font-semibold tabular-nums text-teal-700">{p.hn}</span>
                      <span className="font-medium">{fullName(p)}</span>
                      {age !== null && <span className="text-xs text-ink-soft">{age} ปี</span>}
                      {p.allergies && (
                        <span className="chip ml-auto bg-danger-soft text-danger">แพ้ยา</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
