"use client";

import { useState, useTransition, useActionState } from "react";
import { adjustStock, createMedication, setMedicationActive, updateMedication } from "./actions";
import { baht } from "@/lib/format";

type Med = {
  id: number;
  name: string;
  unit: string;
  price: number;
  stockQty: number;
  lowStockThreshold: number;
  defaultInstructions: string | null;
  active: boolean;
};

const field =
  "rounded-lg border border-line bg-cream px-3 py-2 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-200";

function MedFormFields({ defaults }: { defaults?: Partial<Med> }) {
  return (
    <div className="grid grid-cols-12 gap-3">
      <label className="col-span-4">
        <span className="mb-1 block text-sm font-medium">ชื่อยา *</span>
        <input name="name" required defaultValue={defaults?.name ?? ""} className={`${field} w-full`} />
      </label>
      <label className="col-span-2">
        <span className="mb-1 block text-sm font-medium">หน่วย</span>
        <input name="unit" defaultValue={defaults?.unit ?? "เม็ด"} className={`${field} w-full`} />
      </label>
      <label className="col-span-2">
        <span className="mb-1 block text-sm font-medium">ราคาขาย (฿) *</span>
        <input name="price" type="number" min="0" step="any" required defaultValue={defaults?.price ?? ""} className={`${field} w-full tabular-nums`} />
      </label>
      <label className="col-span-2">
        <span className="mb-1 block text-sm font-medium">เตือนเมื่อต่ำกว่า</span>
        <input name="lowStockThreshold" type="number" min="0" defaultValue={defaults?.lowStockThreshold ?? 10} className={`${field} w-full tabular-nums`} />
      </label>
      {defaults === undefined && (
        <label className="col-span-2">
          <span className="mb-1 block text-sm font-medium">จำนวนเริ่มต้น</span>
          <input name="stockQty" type="number" min="0" defaultValue={0} className={`${field} w-full tabular-nums`} />
        </label>
      )}
      <label className={defaults === undefined ? "col-span-12" : "col-span-4"}>
        <span className="mb-1 block text-sm font-medium">วิธีใช้ (พิมพ์บนฉลาก/ติดประวัติ)</span>
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
    <form action={action} className="rounded-2xl border border-line bg-paper p-5 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold">เพิ่มยาใหม่</h2>
      <MedFormFields />
      {state && "error" in state && state.error && (
        <p className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{state.error}</p>
      )}
      <button
        disabled={pending}
        className="mt-4 rounded-lg bg-teal-700 px-5 py-2 font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
      >
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
    <form action={action} className="rounded-xl bg-cream p-4">
      <MedFormFields defaults={med} />
      {state && "error" in state && state.error && (
        <p className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{state.error}</p>
      )}
      <div className="mt-3 flex gap-2">
        <button disabled={pending} className="rounded-lg bg-teal-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50">
          บันทึก
        </button>
        <button type="button" onClick={onClose} className="rounded-lg border border-line px-4 py-1.5 text-sm hover:bg-paper">
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
        className={`${field} w-20 bg-paper px-2 py-1 text-sm tabular-nums`}
      />
      <button
        onClick={() => apply(1)}
        disabled={pending || !(n > 0)}
        title="รับยาเข้า"
        className="rounded-lg bg-teal-100 px-2.5 py-1 text-sm font-semibold text-teal-800 hover:bg-teal-200 disabled:opacity-40"
      >
        +เข้า
      </button>
      <button
        onClick={() => apply(-1)}
        disabled={pending || !(n > 0)}
        title="ปรับยอดออก (ยาหมดอายุ/สูญหาย)"
        className="rounded-lg bg-line/60 px-2.5 py-1 text-sm font-semibold text-ink-soft hover:bg-line disabled:opacity-40"
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

  const visible = medications.filter((m) => showInactive || m.active);

  return (
    <div className="space-y-6">
      {error && <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}

      <div className="overflow-hidden rounded-2xl border border-line bg-paper shadow-sm">
        <table className="w-full text-[15px]">
          <thead>
            <tr className="border-b border-line bg-cream text-left text-sm text-ink-soft">
              <th className="px-4 py-3 font-medium">ชื่อยา</th>
              <th className="px-4 py-3 text-right font-medium">ราคาขาย</th>
              <th className="px-4 py-3 text-right font-medium">คงเหลือ</th>
              <th className="px-4 py-3 text-right font-medium">รับเข้า / ปรับออก</th>
              <th className="px-4 py-3 text-right font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {visible.map((m) => {
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
            {visible.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-ink-soft">
                  ยังไม่มียาในระบบ
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <label className="flex items-center gap-2 text-sm text-ink-soft">
        <input
          type="checkbox"
          checked={showInactive}
          onChange={(e) => setShowInactive(e.target.checked)}
          className="h-4 w-4 accent-teal-700"
        />
        แสดงยาที่เลิกใช้แล้ว
      </label>

      <AddMedForm />
    </div>
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
      <tr className={`border-b border-line/60 last:border-0 ${!med.active ? "opacity-50" : ""}`}>
        <td className="px-4 py-3">
          <span className="font-medium">{med.name}</span>
          {lowStock && (
            <span className="ml-2 rounded bg-amber-soft px-1.5 py-0.5 text-xs font-semibold text-amber-strong">
              ใกล้หมด
            </span>
          )}
          {!med.active && (
            <span className="ml-2 rounded bg-line/60 px-1.5 py-0.5 text-xs text-ink-soft">เลิกใช้</span>
          )}
          {med.defaultInstructions && (
            <p className="mt-0.5 text-sm text-ink-soft">{med.defaultInstructions}</p>
          )}
        </td>
        <td className="px-4 py-3 text-right tabular-nums">
          {baht(med.price)} ฿/{med.unit}
        </td>
        <td className={`px-4 py-3 text-right font-semibold tabular-nums ${lowStock ? "text-amber-strong" : ""}`}>
          {med.stockQty}
        </td>
        <td className="px-4 py-3">
          {med.active && <RestockControls med={med} onError={onError} />}
        </td>
        <td className="px-4 py-3 text-right text-sm whitespace-nowrap">
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
          <td colSpan={5} className="px-4 pb-4">
            <EditMedRow med={med} onClose={onCloseEdit} />
          </td>
        </tr>
      )}
    </>
  );
}
