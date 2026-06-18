"use client";

import { useState, useTransition, useActionState } from "react";
import {
  adjustStock,
  createMedication,
  setAutoAddOnVisit,
  setMedicationActive,
  updateMedication,
} from "./actions";
import { baht } from "@/lib/format";

type Med = {
  id: number;
  name: string;
  kind: "drug" | "procedure";
  autoAddOnVisit: boolean;
  unit: string;
  price: number;
  stockQty: number;
  lowStockThreshold: number;
  portionAmount: number | null;
  indication: string | null;
  defaultInstructions: string | null;
  active: boolean;
};

const field = "field";

function MedFormFields({ defaults }: { defaults?: Partial<Med> }) {
  return (
    <div className="grid grid-cols-12 gap-3">
      <label className="col-span-4">
        <span className="mb-1 block text-xs font-medium text-ink-soft">ชื่อยา *</span>
        <input name="name" required defaultValue={defaults?.name ?? ""} className={`${field} w-full`} />
      </label>
      <label className="col-span-2">
        <span className="mb-1 block text-xs font-medium text-ink-soft">หน่วย</span>
        <input name="unit" defaultValue={defaults?.unit ?? "เม็ด"} className={`${field} w-full`} />
      </label>
      <label className="col-span-2">
        <span className="mb-1 block text-xs font-medium text-ink-soft" title="จำนวนที่จ่ายต่อครั้ง และจำนวนที่ใส่ได้ใน 1 ซอง">
          จำนวน/ซอง
        </span>
        <input
          name="portionAmount"
          type="number"
          min="0"
          step="any"
          defaultValue={defaults?.portionAmount ?? ""}
          placeholder="เช่น 30"
          className={`${field} w-full tabular-nums`}
        />
      </label>
      <label className="col-span-2">
        <span className="mb-1 block text-xs font-medium text-ink-soft">ราคาขาย (฿) *</span>
        <input name="price" type="number" min="0" step="any" required defaultValue={defaults?.price ?? ""} className={`${field} w-full tabular-nums`} />
      </label>
      <label className="col-span-2">
        <span className="mb-1 block text-xs font-medium text-ink-soft">เตือนเมื่อต่ำกว่า</span>
        <input name="lowStockThreshold" type="number" min="0" defaultValue={defaults?.lowStockThreshold ?? 10} className={`${field} w-full tabular-nums`} />
      </label>
      {defaults === undefined && (
        <label className="col-span-2">
          <span className="mb-1 block text-xs font-medium text-ink-soft">จำนวนเริ่มต้น</span>
          <input name="stockQty" type="number" min="0" defaultValue={0} className={`${field} w-full tabular-nums`} />
        </label>
      )}
      <label className="col-span-6">
        <span className="mb-1 block text-xs font-medium text-ink-soft">สรรพคุณ (อธิบายให้ผู้ป่วยทราบ)</span>
        <input
          name="indication"
          defaultValue={defaults?.indication ?? ""}
          placeholder="เช่น ยาลดกรดในกระเพาะ แก้ปวดท้อง"
          className={`${field} w-full`}
        />
      </label>
      <label className="col-span-6">
        <span className="mb-1 block text-xs font-medium text-ink-soft">วิธีใช้ (พิมพ์บนฉลาก/ติดประวัติ)</span>
        <input name="defaultInstructions" defaultValue={defaults?.defaultInstructions ?? ""} className={`${field} w-full`} />
      </label>
    </div>
  );
}

function AddMedForm() {
  const [state, action, pending] = useActionState(
    async (prev: unknown, formData: FormData) => createMedication(prev, formData),
    null,
  );
  return (
    <form action={action} className="card p-4">
      <h2 className="mb-3 text-sm font-semibold tracking-wide text-ink-soft uppercase">เพิ่มยาใหม่</h2>
      <MedFormFields />
      {state && "error" in state && state.error && (
        <p className="mt-3 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{state.error}</p>
      )}
      <button disabled={pending} className="btn-primary mt-4 px-5 py-2">
        {pending ? "กำลังบันทึก…" : "เพิ่มยา"}
      </button>
    </form>
  );
}

function EditMedRow({ med, onClose }: { med: Med; onClose: () => void }) {
  const [state, action, pending] = useActionState(
    async (prev: unknown, formData: FormData) => {
      const res = await updateMedication(med.id, prev, formData);
      if (res && "ok" in res) onClose();
      return res;
    },
    null,
  );
  return (
    <form action={action} className="rounded-md border border-line-soft bg-cream p-3">
      <MedFormFields defaults={med} />
      {state && "error" in state && state.error && (
        <p className="mt-3 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{state.error}</p>
      )}
      <div className="mt-3 flex gap-2">
        <button disabled={pending} className="btn-primary">
          บันทึก
        </button>
        <button type="button" onClick={onClose} className="btn-ghost">
          ยกเลิก
        </button>
      </div>
    </form>
  );
}

function RestockControls({ med, onError }: { med: Med; onError: (e: string | null) => void }) {
  const [qty, setQty] = useState("");
  const [pending, start] = useTransition();
  const n = Math.floor(Number(qty));

  function apply(sign: 1 | -1) {
    if (!(n > 0)) return;
    onError(null);
    start(async () => {
      const res = await adjustStock(med.id, sign * n);
      if ("error" in res && res.error) onError(res.error);
      else setQty("");
    });
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      <input
        value={qty}
        onChange={(e) => setQty(e.target.value)}
        type="number"
        min="1"
        placeholder="จำนวน"
        className={`${field} w-20 px-2 py-1 tabular-nums`}
      />
      <button
        onClick={() => apply(1)}
        disabled={pending || !(n > 0)}
        title="รับยาเข้า"
        className="rounded-md bg-teal-100 px-2.5 py-1 text-sm font-semibold text-teal-800 hover:bg-teal-200 disabled:opacity-40"
      >
        +เข้า
      </button>
      <button
        onClick={() => apply(-1)}
        disabled={pending || !(n > 0)}
        title="ปรับยอดออก (ยาหมดอายุ/สูญหาย)"
        className="rounded-md bg-line/60 px-2.5 py-1 text-sm font-semibold text-ink-soft hover:bg-line disabled:opacity-40"
      >
        −ออก
      </button>
    </div>
  );
}

export function StockClient({ medications }: { medications: Med[] }) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [, startToggle] = useTransition();

  const drugs = medications.filter((m) => m.kind === "drug" && (showInactive || m.active));
  const procedures = medications.filter((m) => m.kind === "procedure" && (showInactive || m.active));

  return (
    <div className="space-y-5">
      {error && <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}

      <div className="card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>ชื่อยา</th>
              <th className="text-right">ราคาขาย</th>
              <th className="text-right">คงเหลือ</th>
              <th className="text-right">รับเข้า / ปรับออก</th>
              <th className="text-right"></th>
            </tr>
          </thead>
          <tbody>
            {drugs.map((m) => {
              const lowStock = m.active && m.stockQty <= m.lowStockThreshold;
              return (
                <FragmentRow
                  key={m.id}
                  med={m}
                  lowStock={lowStock}
                  editing={editingId === m.id}
                  onEdit={() => setEditingId(m.id)}
                  onCloseEdit={() => setEditingId(null)}
                  onError={setError}
                  onToggleActive={() =>
                    startToggle(async () => void (await setMedicationActive(m.id, !m.active)))
                  }
                />
              );
            })}
            {drugs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-ink-soft">
                  ยังไม่มียาในระบบ
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AddMedForm />

      {/* ── หัตถการ / อุปกรณ์ ──────────────────────────────────────────────── */}
      <div className="pt-2">
        <h2 className="mb-3 text-lg font-bold text-teal-900">หัตถการ / อุปกรณ์</h2>
        <div className="card overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>ชื่อรายการ</th>
                <th className="text-right">ราคา</th>
                <th className="text-center">เพิ่มอัตโนมัติทุก visit</th>
                <th className="text-right"></th>
              </tr>
            </thead>
            <tbody>
              {procedures.map((m) => (
                <ProcedureRow
                  key={m.id}
                  med={m}
                  editing={editingId === m.id}
                  onEdit={() => setEditingId(m.id)}
                  onCloseEdit={() => setEditingId(null)}
                  onToggleAuto={() => startToggle(async () => void (await setAutoAddOnVisit(m.id, !m.autoAddOnVisit)))}
                  onToggleActive={() => startToggle(async () => void (await setMedicationActive(m.id, !m.active)))}
                />
              ))}
              {procedures.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-ink-soft">
                    ยังไม่มีหัตถการ/อุปกรณ์ — เช่น ค่าตรวจ, ค่าฉีดยา IV, เซ็ตทำแผล
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddProcedureForm />

      <label className="flex items-center gap-2 text-sm text-ink-soft">
        <input
          type="checkbox"
          checked={showInactive}
          onChange={(e) => setShowInactive(e.target.checked)}
          className="h-4 w-4 accent-teal-700"
        />
        แสดงรายการที่เลิกใช้แล้ว
      </label>
    </div>
  );
}

function ProcedureFields({ defaults }: { defaults?: Partial<Med> }) {
  return (
    <div className="grid grid-cols-12 gap-3">
      <input type="hidden" name="kind" value="procedure" />
      <label className="col-span-6">
        <span className="mb-1 block text-xs font-medium text-ink-soft">ชื่อรายการ *</span>
        <input name="name" required defaultValue={defaults?.name ?? ""} placeholder="เช่น ค่าตรวจ, ค่าฉีดยา IV" className={`${field} w-full`} />
      </label>
      <label className="col-span-3">
        <span className="mb-1 block text-xs font-medium text-ink-soft">ราคา (฿) *</span>
        <input name="price" type="number" min="0" step="any" required defaultValue={defaults?.price ?? ""} className={`${field} w-full tabular-nums`} />
      </label>
      <label className="col-span-3 flex items-end gap-2 pb-2 text-sm">
        <input
          type="checkbox"
          name="autoAddOnVisit"
          defaultChecked={defaults?.autoAddOnVisit ?? false}
          className="h-4 w-4 accent-teal-700"
        />
        <span className="text-ink-soft">เพิ่มอัตโนมัติทุก visit</span>
      </label>
    </div>
  );
}

function AddProcedureForm() {
  const [state, action, pending] = useActionState(
    async (prev: unknown, formData: FormData) => createMedication(prev, formData),
    null,
  );
  return (
    <form action={action} className="card p-4">
      <h2 className="mb-3 text-sm font-semibold tracking-wide text-ink-soft uppercase">เพิ่มหัตถการ / อุปกรณ์</h2>
      <ProcedureFields />
      {state && "error" in state && state.error && (
        <p className="mt-3 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{state.error}</p>
      )}
      <button disabled={pending} className="btn-primary mt-4 px-5 py-2">
        {pending ? "กำลังบันทึก…" : "เพิ่มรายการ"}
      </button>
    </form>
  );
}

function ProcedureRow({
  med,
  editing,
  onEdit,
  onCloseEdit,
  onToggleAuto,
  onToggleActive,
}: {
  med: Med;
  editing: boolean;
  onEdit: () => void;
  onCloseEdit: () => void;
  onToggleAuto: () => void;
  onToggleActive: () => void;
}) {
  const [state, action, pending] = useActionState(
    async (prev: unknown, formData: FormData) => {
      const res = await updateMedication(med.id, prev, formData);
      if (res && "ok" in res) onCloseEdit();
      return res;
    },
    null,
  );
  return (
    <>
      <tr className={!med.active ? "opacity-50" : ""}>
        <td>
          <span className="font-medium">{med.name}</span>
          {!med.active && <span className="chip ml-2 bg-line/60 text-ink-soft">เลิกใช้</span>}
        </td>
        <td className="text-right tabular-nums">{baht(med.price)} ฿</td>
        <td className="text-center">
          <input
            type="checkbox"
            checked={med.autoAddOnVisit}
            onChange={onToggleAuto}
            className="h-4 w-4 accent-teal-700"
            title="เพิ่มรายการนี้ให้ทุก visit อัตโนมัติ"
          />
        </td>
        <td className="text-right whitespace-nowrap">
          <button onClick={editing ? onCloseEdit : onEdit} className="text-teal-700 hover:underline">
            แก้ไข
          </button>
          <button onClick={onToggleActive} className="ml-3 text-ink-soft hover:underline">
            {med.active ? "เลิกใช้" : "ใช้งาน"}
          </button>
        </td>
      </tr>
      {editing && (
        <tr>
          <td colSpan={4} className="px-3 pb-3">
            <form action={action} className="rounded-md border border-line-soft bg-cream p-3">
              <ProcedureFields defaults={med} />
              {state && "error" in state && state.error && (
                <p className="mt-3 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{state.error}</p>
              )}
              <div className="mt-3 flex gap-2">
                <button disabled={pending} className="btn-primary">
                  บันทึก
                </button>
                <button type="button" onClick={onCloseEdit} className="btn-ghost">
                  ยกเลิก
                </button>
              </div>
            </form>
          </td>
        </tr>
      )}
    </>
  );
}

function FragmentRow({
  med,
  lowStock,
  editing,
  onEdit,
  onCloseEdit,
  onError,
  onToggleActive,
}: {
  med: Med;
  lowStock: boolean;
  editing: boolean;
  onEdit: () => void;
  onCloseEdit: () => void;
  onError: (e: string | null) => void;
  onToggleActive: () => void;
}) {
  return (
    <>
      <tr className={!med.active ? "opacity-50" : ""}>
        <td>
          <span className="font-medium">{med.name}</span>
          {lowStock && (
            <span className="chip ml-2 bg-amber-soft font-semibold text-amber-strong">ใกล้หมด</span>
          )}
          {!med.active && <span className="chip ml-2 bg-line/60 text-ink-soft">เลิกใช้</span>}
          {med.defaultInstructions && (
            <p className="mt-0.5 text-xs text-ink-soft">{med.defaultInstructions}</p>
          )}
        </td>
        <td className="text-right tabular-nums">
          {baht(med.price)} ฿/{med.unit}
        </td>
        <td className={`text-right font-semibold tabular-nums ${lowStock ? "text-amber-strong" : ""}`}>
          {med.stockQty}
        </td>
        <td>{med.active && <RestockControls med={med} onError={onError} />}</td>
        <td className="text-right whitespace-nowrap">
          <button onClick={editing ? onCloseEdit : onEdit} className="text-teal-700 hover:underline">
            แก้ไข
          </button>
          <button onClick={onToggleActive} className="ml-3 text-ink-soft hover:underline">
            {med.active ? "เลิกใช้" : "ใช้งาน"}
          </button>
        </td>
      </tr>
      {editing && (
        <tr>
          <td colSpan={5} className="px-3 pb-3">
            <EditMedRow med={med} onClose={onCloseEdit} />
          </td>
        </tr>
      )}
    </>
  );
}
