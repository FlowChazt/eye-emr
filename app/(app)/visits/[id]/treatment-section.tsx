"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  addCustomItem,
  addMedicationItem,
  completeVisit,
  removeVisitItem,
  saveVisitRecord,
  setItemInstructions,
} from "../actions";
import { baht } from "@/lib/format";

type Item = {
  id: number;
  type: "medication" | "custom" | "procedure";
  description: string;
  instructions: string | null;
  qty: number;
  unitPrice: number;
  lineTotal: number;
};

type Med = {
  id: number;
  name: string;
  kind: "drug" | "procedure";
  unit: string;
  price: number;
  stockQty: number;
  portionAmount: number | null;
};

const field = "field";

export function TreatmentSection({
  visitId,
  items,
  medications,
  readOnly,
}: {
  visitId: number;
  items: Item[];
  medications: Med[];
  readOnly: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // medication picker state
  const [medQuery, setMedQuery] = useState("");
  const [selectedMed, setSelectedMed] = useState<Med | null>(null);
  const [medQty, setMedQty] = useState("");
  const [active, setActive] = useState(0);
  const qtyRef = useRef<HTMLInputElement>(null);
  const medSearchRef = useRef<HTMLInputElement>(null);

  // custom item state
  const [customDesc, setCustomDesc] = useState("");
  const [customPrice, setCustomPrice] = useState("");

  const matches = useMemo(() => {
    const q = medQuery.trim().toLowerCase();
    if (!q || selectedMed) return [];
    return medications.filter((m) => m.name.toLowerCase().includes(q)).slice(0, 8);
  }, [medQuery, medications, selectedMed]);

  // keep the highlighted row in range as the matches list changes
  useEffect(() => setActive(0), [medQuery]);

  function pickMed(m: Med) {
    setSelectedMed(m);
    setMedQty(String(m.portionAmount && m.portionAmount > 0 ? m.portionAmount : 1));
    requestAnimationFrame(() => qtyRef.current?.select());
  }

  const total = items.reduce((s, it) => s + it.lineTotal, 0);
  const qtyNum = Number(medQty);
  const previewTotal = selectedMed && qtyNum > 0 ? selectedMed.price * qtyNum : null;

  function run(fn: () => Promise<{ error?: string } | { ok: boolean } | void>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res && "error" in res && res.error) setError(res.error);
    });
  }

  function addMed() {
    if (!selectedMed || !(qtyNum > 0)) return;
    run(async () => {
      const res = await addMedicationItem(visitId, selectedMed.id, qtyNum);
      if (!("error" in res)) {
        setSelectedMed(null);
        setMedQuery("");
        setMedQty("");
        // return focus to the search box so meds can be added back-to-back
        requestAnimationFrame(() => medSearchRef.current?.focus());
      }
      return res;
    });
  }

  function addCustom() {
    const price = Number(customPrice);
    run(async () => {
      const res = await addCustomItem(visitId, customDesc, price);
      if (!("error" in res)) {
        setCustomDesc("");
        setCustomPrice("");
      }
      return res;
    });
  }

  // Closing the visit also flushes the exam form so the user never loses
  // unsaved vitals/notes by forgetting to press "บันทึกการตรวจ" first.
  function closeVisit(method: "cash" | "transfer") {
    setError(null);
    startTransition(async () => {
      const formEl = document.getElementById("visit-record-form");
      if (formEl instanceof HTMLFormElement) {
        try {
          await saveVisitRecord(visitId, new FormData(formEl));
        } catch (e) {
          setError(e instanceof Error ? e.message : "บันทึกข้อมูลการตรวจไม่สำเร็จ");
          return;
        }
      }
      const res = await completeVisit(visitId, method);
      if (res && "error" in res && res.error) setError(res.error);
    });
  }

  return (
    <section className="card p-4">
      <h2 className="mb-3 text-sm font-semibold tracking-wide text-ink-soft uppercase">การรักษา / ยา</h2>

      {/* item list */}
      {items.length > 0 && (
        <table className="mb-4 w-full text-[13px]">
          <thead>
            <tr className="border-b border-line text-left text-xs font-medium tracking-wide text-ink-soft uppercase">
              <th className="py-1.5 font-medium">รายการ</th>
              <th className="py-1.5 text-right font-medium">จำนวน</th>
              <th className="py-1.5 text-right font-medium">ราคา/หน่วย</th>
              <th className="py-1.5 text-right font-medium">รวม</th>
              {!readOnly && <th className="w-8" />}
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-b border-line-soft last:border-0">
                <td className="py-1.5">
                  {it.description}
                  {it.type === "custom" && (
                    <span className="chip ml-2 bg-teal-100 text-teal-800">อื่นๆ</span>
                  )}
                  {it.type === "procedure" && (
                    <span className="chip ml-2 bg-amber-soft text-amber-strong">หัตถการ</span>
                  )}
                  {it.type === "medication" &&
                    (readOnly ? (
                      it.instructions && (
                        <span className="mt-0.5 block text-xs text-ink-soft">วิธีใช้: {it.instructions}</span>
                      )
                    ) : (
                      <input
                        defaultValue={it.instructions ?? ""}
                        onBlur={(e) => {
                          if (e.target.value.trim() === (it.instructions ?? "").trim()) return;
                          run(() => setItemInstructions(visitId, it.id, e.target.value));
                        }}
                        placeholder="วิธีใช้ (สำหรับฉลากยา)…"
                        className={`${field} mt-1 w-full text-xs`}
                      />
                    ))}
                </td>
                <td className="py-1.5 text-right tabular-nums">{it.qty}</td>
                <td className="py-1.5 text-right tabular-nums">{baht(it.unitPrice)}</td>
                <td className="py-1.5 text-right font-medium tabular-nums">{baht(it.lineTotal)}</td>
                {!readOnly && (
                  <td className="py-1.5 text-right">
                    <button
                      onClick={() => run(() => removeVisitItem(visitId, it.id))}
                      disabled={pending}
                      title="ลบรายการ"
                      className="rounded px-1.5 py-0.5 text-ink-soft hover:bg-danger-soft hover:text-danger"
                    >
                      ✕
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} className="pt-2.5 text-right text-sm font-semibold">
                รวมทั้งหมด
              </td>
              <td className="pt-2.5 text-right text-base font-bold tabular-nums text-teal-800">
                {baht(total)} ฿
              </td>
              {!readOnly && <td />}
            </tr>
          </tfoot>
        </table>
      )}

      {items.length === 0 && (
        <p className="mb-4 rounded-md border border-dashed border-line p-5 text-center text-sm text-ink-soft">
          ยังไม่มีรายการรักษา
        </p>
      )}

      {!readOnly && (
        <div className="space-y-4">
          {/* medication picker */}
          <div className="rounded-md border border-line-soft bg-cream p-3">
            <p className="mb-2 text-xs font-semibold tracking-wide text-ink-soft uppercase">เพิ่มยา / หัตถการ</p>
            <div className="relative flex flex-wrap items-start gap-2">
              <div className="relative min-w-64 flex-1">
                <input
                  ref={medSearchRef}
                  value={selectedMed ? selectedMed.name : medQuery}
                  onChange={(e) => {
                    setSelectedMed(null);
                    setMedQuery(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (selectedMed || matches.length === 0) return;
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setActive((i) => Math.min(i + 1, matches.length - 1));
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setActive((i) => Math.max(i - 1, 0));
                    } else if (e.key === "Enter") {
                      e.preventDefault();
                      pickMed(matches[Math.min(active, matches.length - 1)]);
                    }
                  }}
                  placeholder="พิมพ์ชื่อยา / หัตถการ…"
                  className={`${field} w-full`}
                />
                {matches.length > 0 && (
                  <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-line bg-paper shadow-lg">
                    {matches.map((m, i) => (
                      <li key={m.id}>
                        <button
                          type="button"
                          onClick={() => pickMed(m)}
                          onMouseEnter={() => setActive(i)}
                          className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-sm hover:bg-teal-50 ${i === active ? "bg-teal-50" : ""}`}
                        >
                          <span>
                            {m.name}
                            {m.kind === "procedure" && (
                              <span className="chip ml-2 bg-amber-soft text-amber-strong">หัตถการ</span>
                            )}
                          </span>
                          {m.kind === "procedure" ? (
                            <span className="text-xs tabular-nums text-ink-soft">{baht(m.price)} ฿</span>
                          ) : (
                            <span className={`text-xs tabular-nums ${m.stockQty <= 0 ? "text-danger" : "text-ink-soft"}`}>
                              {baht(m.price)} ฿/{m.unit} · เหลือ {m.stockQty}
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <input
                ref={qtyRef}
                value={medQty}
                onChange={(e) => setMedQty(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && selectedMed && qtyNum > 0) {
                    e.preventDefault();
                    addMed();
                  }
                }}
                type="number"
                min="0"
                step="any"
                placeholder="จำนวน"
                className={`${field} w-24 tabular-nums`}
              />
              <button
                onClick={addMed}
                disabled={pending || !selectedMed || !(qtyNum > 0)}
                className="btn-primary"
              >
                เพิ่ม
              </button>
            </div>
            {selectedMed && previewTotal !== null && (
              <p className="mt-2 text-xs text-ink-soft">
                {selectedMed.name} × {qtyNum} {selectedMed.unit} ={" "}
                <span className="font-semibold text-ink">{baht(previewTotal)} ฿</span>
                {selectedMed.kind === "drug" && qtyNum > selectedMed.stockQty && (
                  <span className="ml-2 font-medium text-danger">สต็อกไม่พอ (เหลือ {selectedMed.stockQty})</span>
                )}
              </p>
            )}
          </div>

          {/* custom item */}
          <div className="rounded-md border border-line-soft bg-cream p-3">
            <p className="mb-2 text-xs font-semibold tracking-wide text-ink-soft uppercase">การรักษาอื่นๆ / ค่าบริการ</p>
            <div className="flex flex-wrap gap-2">
              <input
                value={customDesc}
                onChange={(e) => setCustomDesc(e.target.value)}
                placeholder="เช่น ค่าตรวจ, ทำแผล, ฉีดยา…"
                className={`${field} min-w-64 flex-1`}
              />
              <input
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                type="number"
                min="0"
                step="any"
                placeholder="ราคา (฿)"
                className={`${field} w-28 tabular-nums`}
              />
              <button
                onClick={addCustom}
                disabled={pending || !customDesc.trim() || !(Number(customPrice) >= 0) || customPrice === ""}
                className="btn-primary"
              >
                เพิ่ม
              </button>
            </div>
          </div>

          {error && <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}

          {/* checkout */}
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line pt-4">
            <span className="mr-auto text-xs text-ink-soft">
              ปิด visit จะหักสต็อกยาและออกใบเสร็จ — แก้ไขไม่ได้หลังปิด
            </span>
            <button
              onClick={() => closeVisit("cash")}
              disabled={pending}
              className="btn-primary px-4 py-2"
            >
              ปิด visit · เงินสด {baht(total)} ฿
            </button>
            <button
              onClick={() => closeVisit("transfer")}
              disabled={pending}
              className="btn px-4 py-2 border border-teal-700 text-teal-800 hover:bg-teal-50"
            >
              ปิด visit · เงินโอน
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
