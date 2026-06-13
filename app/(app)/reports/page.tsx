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
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h1 className="text-lg font-bold text-teal-900">รายงานรายรับ</h1>
          <span className="text-sm text-ink-soft">
            {monthVisits} visit · รวม{" "}
            <span className="font-semibold text-teal-800 tabular-nums">{baht(monthTotal)}</span> บาท
          </span>
        </div>
        <form className="flex items-center gap-1.5">
          <input type="month" name="month" defaultValue={month} className="field w-auto" />
          <button className="btn-ghost">ดู</button>
        </form>
      </header>

      {daily.length === 0 ? (
        <p className="card border-dashed bg-paper/60 p-10 text-center text-sm text-ink-soft">
          ไม่มีรายรับในเดือนที่เลือก
        </p>
      ) : (
        <div className="card overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>วันที่</th>
                <th className="text-right">จำนวน visit</th>
                <th className="text-right">เงินสด</th>
                <th className="text-right">เงินโอน</th>
                <th className="text-right">รวม</th>
              </tr>
            </thead>
            <tbody>
              {daily.map((d) => (
                <tr key={d.date}>
                  <td>{thaiDate(d.date)}</td>
                  <td className="text-right tabular-nums">{d.visits}</td>
                  <td className="text-right tabular-nums">{baht(d.cash)}</td>
                  <td className="text-right tabular-nums">{baht(d.transfer)}</td>
                  <td className="text-right font-semibold tabular-nums">{baht(d.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-line bg-cream font-semibold">
                <td className="px-3 py-2">รวมทั้งเดือน</td>
                <td className="px-3 py-2 text-right tabular-nums">{monthVisits}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {baht(daily.reduce((s, d) => s + d.cash, 0))}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {baht(daily.reduce((s, d) => s + d.transfer, 0))}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-teal-800">{baht(monthTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
