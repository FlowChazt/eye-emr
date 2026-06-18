import { asc } from "drizzle-orm";
import { db, tables } from "@/db";
import { requireUser } from "@/lib/session";
import { AlertIcon } from "@/components/icons";
import { StockClient } from "./stock-client";

export default async function StockPage() {
  await requireUser();
  const meds = db.select().from(tables.medications).orderBy(asc(tables.medications.name)).all();

  const low = meds.filter((m) => m.active && m.kind === "drug" && m.stockQty <= m.lowStockThreshold);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-4 text-lg font-bold text-teal-900">สต็อกยา</h1>
      {low.length > 0 && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-amber-strong/20 bg-amber-soft px-4 py-3 text-sm">
          <AlertIcon size={16} className="mt-0.5 shrink-0 text-amber-strong" />
          <p className="font-semibold text-amber-strong">
            ยาใกล้หมด {low.length} รายการ:{" "}
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
