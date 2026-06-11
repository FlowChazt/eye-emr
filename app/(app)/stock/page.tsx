import { asc } from "drizzle-orm";
import { db, tables } from "@/db";
import { requireUser } from "@/lib/session";
import { StockClient } from "./stock-client";

export default async function StockPage() {
  await requireUser();
  const meds = db.select().from(tables.medications).orderBy(asc(tables.medications.name)).all();

  const low = meds.filter((m) => m.active && m.stockQty <= m.lowStockThreshold);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-2 text-2xl font-bold text-teal-900">สต็อกยา</h1>
      {low.length > 0 && (
        <div className="mb-5 rounded-xl border border-amber-strong/20 bg-amber-soft px-4 py-3">
          <p className="font-semibold text-amber-strong">
            ⚠️ ยาใกล้หมด {low.length} รายการ:{" "}
            <span className="font-normal">
              {low.map((m) => `${m.name} (เหลือ ${m.stockQty})`).join(", ")}
            </span>
          </p>
        </div>
      )}
      <StockClient medications={meds} />
    </div>
  );
}
