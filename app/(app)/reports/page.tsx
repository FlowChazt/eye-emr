import { desc, eq, like, sql } from "drizzle-orm";
import { db, tables } from "@/db";
import { requireUser } from "@/lib/session";
import { baht, thaiDate, todayISO } from "@/lib/format";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  await requireUser();
  const params = await searchParams;
  const month =
    params.month && /^\d{4}-\d{2}$/.test(params.month) ? params.month : todayISO().slice(0, 7);

  // daily totals within the month, joined through visits for the visit date
  const daily = db
    .select({
      date: tables.visits.visitDate,
      visits: sql<number>`count(*)`,
      cash: sql<number>`coalesce(sum(case when ${tables.payments.method} = 'cash' then ${tables.payments.total} end), 0)`,
      transfer: sql<number>`coalesce(sum(case when ${tables.payments.method} = 'transfer' then ${tables.payments.total} end), 0)`,
      total: sql<number>`coalesce(sum(${tables.payments.total}), 0)`,
    })
    .from(tables.payments)
    .innerJoin(tables.visits, eq(tables.payments.visitId, tables.visits.id))
    .where(like(tables.visits.visitDate, `${month}-%`))
    .groupBy(tables.visits.visitDate)
    .orderBy(desc(tables.visits.visitDate))
    .all();

  const monthTotal = daily.reduce((s, d) => s + d.total, 0);
  const monthVisits = daily.reduce((s, d) => s + d.visits, 0);

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-teal-900">รายงานรายรับ</h1>
          <p className="mt-1 text-sm text-ink-soft">
            เดือนนี้ {monthVisits} visit · รวม{" "}
            <span className="font-semibold text-ink">{baht(monthTotal)} บาท</span>
          </p>
        </div>
        <form className="flex items-center gap-2">
          <input
            type="month"
            name="month"
            defaultValue={month}
            className="rounded-lg border border-line bg-paper px-3 py-2 text-sm"
          />
          <button className="rounded-lg border border-line bg-paper px-3 py-2 text-sm font-medium hover:bg-cream">
            ดู
          </button>
        </form>
      </header>

      {daily.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line bg-paper/60 p-10 text-center text-ink-soft">
          ไม่มีรายรับในเดือนที่เลือก
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-paper shadow-sm">
          <table className="w-full text-[15px]">
            <thead>
              <tr className="border-b border-line bg-cream text-left text-sm text-ink-soft">
                <th className="px-4 py-3 font-medium">วันที่</th>
                <th className="px-4 py-3 text-right font-medium">จำนวน visit</th>
                <th className="px-4 py-3 text-right font-medium">เงินสด</th>
                <th className="px-4 py-3 text-right font-medium">เงินโอน</th>
                <th className="px-4 py-3 text-right font-medium">รวม</th>
              </tr>
            </thead>
            <tbody>
              {daily.map((d) => (
                <tr key={d.date} className="border-b border-line/60 last:border-0">
                  <td className="px-4 py-3">{thaiDate(d.date)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{d.visits}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{baht(d.cash)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{baht(d.transfer)}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">{baht(d.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-line bg-cream font-semibold">
                <td className="px-4 py-3">รวมทั้งเดือน</td>
                <td className="px-4 py-3 text-right tabular-nums">{monthVisits}</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {baht(daily.reduce((s, d) => s + d.cash, 0))}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {baht(daily.reduce((s, d) => s + d.transfer, 0))}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-teal-800">{baht(monthTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
