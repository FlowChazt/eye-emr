"use client";

import { useMemo, useState, useTransition } from "react";
import {
  addCustomItem,
  addMedicationItem,
  completeVisit,
  removeVisitItem,
} from "../actions";
import { baht } from "@/lib/format";

type Item = {
  id: number;
  type: "medication" | "custom";
  description: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
};

type Med = {
  id: number;
  name: string;
  unit: string;
  price: number;
  stockQty: number;
};

const field =
  "rounded-lg border border-line bg-cream px-3 py-2 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-200";

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

  // custom item state
  const [customDesc, setCustomDesc] = useState("");
  const [customPrice, setCustomPrice] = useState("");

  const matches = useMemo(() => {
    const q = medQuery.trim().toLowerCase();
    if (!q || selectedMed) return [];
    return medications.filter((m) => m.name.toLowerCase().includes(q)).slice(0, 8);
  }, [medQuery, medications, selectedMed]);

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

  return (
    <section className="rounded-2xl border border-line bg-paper p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold">การรักษา / ยา</h2>

      {/* item list */}
      {items.length > 0 && (
        <table className="mb-4 w-full text-[15px]">
          <thead>
            <tr className="border-b border-line text-left text-sm text-ink-soft">
              <th className="py-2 font-medium">รายการ</th>
              <th className="py-2 text-right font-medium">จำนวน</th>
              <th className="py-2 text-right font-medium">ราคา/หน่วย</th>
              <th className="py-2 text-right font-medium">รวม</th>
              {!readOnly && <th className="w-10" />}
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-b border-line/60 last:border-0">
                <td className="py-2">
                  {it.description}
                  {it.type === "custom" && (
                    <span className="ml-2 rounded bg-teal-100 px-1.5 py-0.5 text-xs text-teal-800">อื่นๆ</span>
                  )}
                </td>
                <td className="py-2 text-right tabular-nums">{it.qty}</td>
                <td className="py-2 text-right tabular-nums">{baht(it.unitPrice)}</td>
                <td className="py-2 text-right font-medium tabular-nums">{baht(it.lineTotal)}</td>
                {!readOnly && (
                  <td className="py-2 text-right">
                    <button
                      onClick={() => run(() => removeVisitItem(visitId, it.id))}
                      disabled={pending}
                      title="ลบรายการ"
                      className="rounded px-2 py-1 text-ink-soft hover:bg-danger-soft hover:text-danger"
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
              <td colSpan={3} className="pt-3 text-right font-semibold">
                รวมทั้งหมด
              </td>
              <td className="pt-3 text-right text-lg font-bold tabular-nums text-teal-800">
                {baht(total)} ฿
              </td>
              {!readOnly && <td />}
            </tr>
          </tfoot>
        </table>
      )}

      {items.length === 0 && (
        <p className="mb-4 rounded-xl border border-dashed border-line p-6 text-center text-sm text-ink-soft">
          ยังไม่มีรายการรักษา
        </p>
      )}

      {!readOnly && (
        <div className="space-y-4">
          {/* medication picker */}
          <div className="rounded-xl bg-cream p-4">
            <p className="mb-2 text-sm font-semibold">เพิ่มยาจากสต็อก</p>
            <div className="relative flex flex-wrap items-start gap-2">
              <div className="relative min-w-64 flex-1">
                <input
                  value={selectedMed ? selectedMed.name : medQuery}
                  onChange={(e) => {
                    setSelectedMed(null);
                    setMedQuery(e.target.value);
                  }}
                  placeholder="พิมพ์ชื่อยา…"
                  className={`${field} w-full bg-paper`}
                />
                {matches.length > 0 && (
                  <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-line bg-paper shadow-lg">
                    {matches.map((m) => (
                      <li key={m.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedMed(m);
                            setMedQty("1");
                          }}
                          className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-teal-50"
                        >
                          <span>{m.name}</span>
                          <span className={`text-sm tabular-nums ${m.stockQty <= 0 ? "text-danger" : "text-ink-soft"}`}>
                            {baht(m.price)} ฿/{m.unit} · เหลือ {m.stockQty}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <input
                value={medQty}
                onChange={(e) => setMedQty(e.target.value)}
                type="number"
                min="0"
                step="any"
                placeholder="จำนวน"
                className={`${field} w-24 bg-paper tabular-nums`}
              />
              <button
                onClick={addMed}
                disabled={pending || !selectedMed || !(qtyNum > 0)}
                className="rounded-lg bg-teal-700 px-4 py-2 font-semibold text-white hover:bg-teal-800 disabled:opacity-40"
              >
                เพิ่ม
              </button>
            </div>
            {selectedMed && previewTotal !== null && (
              <p className="mt-2 text-sm text-ink-soft">
                {selectedMed.name} × {qtyNum} {selectedMed.unit} ={" "}
                <span className="font-semibold text-ink">{baht(previewTotal)} ฿</span>
                {qtyNum > selectedMed.stockQty && (
                  <span className="ml-2 font-medium text-danger">สต็อกไม่พอ (เหลือ {selectedMed.stockQty})</span>
                )}
              </p>
            )}
          </div>

          {/* custom item */}
          <div className="rounded-xl bg-cream p-4">
            <p className="mb-2 text-sm font-semibold">การรักษาอื่นๆ / ค่าบริการ</p>
            <div className="flex flex-wrap gap-2">
              <input
                value={customDesc}
                onChange={(e) => setCustomDesc(e.target.value)}
                placeholder="เช่น ค่าตรวจ, ทำแผล, ฉีดยา…"
                className={`${field} min-w-64 flex-1 bg-paper`}
              />
              <input
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                type="number"
                min="0"
                step="any"
                placeholder="ราคา (฿)"
                className={`${field} w-28 bg-paper tabular-nums`}
              />
              <button
                onClick={addCustom}
                disabled={pending || !customDesc.trim() || !(Number(customPrice) >= 0) || customPrice === ""}
                className="rounded-lg bg-teal-700 px-4 py-2 font-semibold text-white hover:bg-teal-800 disabled:opacity-40"
              >
                เพิ่ม
              </button>
            </div>
          </div>

          {error && <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}

          {/* checkout */}
          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-line pt-4">
            <span className="mr-auto text-sm text-ink-soft">
              ปิด visit จะหักสต็อกยาและออกใบเสร็จ — แก้ไขไม่ได้หลังปิด
            </span>
            <button
              onClick={() => run(() => completeVisit(visitId, "cash"))}
              disabled={pending}
              className="rounded-lg bg-teal-700 px-5 py-2.5 font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
            >
              💵 ปิด visit · เงินสด {baht(total)} ฿
            </button>
            <button
              onClick={() => run(() => completeVisit(visitId, "transfer"))}
              disabled={pending}
              className="rounded-lg border border-teal-700 px-5 py-2.5 font-semibold text-teal-800 hover:bg-teal-50 disabled:opacity-50"
            >
              📱 ปิด visit · เงินโอน
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
