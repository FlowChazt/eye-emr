import Link from "next/link";
import { and, asc, desc, eq } from "drizzle-orm";
import { db, tables } from "@/db";
import { requireUser } from "@/lib/session";
import { baht, fullName, thaiDate, timeHM, todayISO, VISIT_STATUS_LABEL } from "@/lib/format";

const STATUS_CHIP: Record<string, string> = {
  waiting: "bg-amber-soft text-amber-strong",
  in_progress: "bg-teal-100 text-teal-800",
  completed: "bg-line/60 text-ink-soft",
};

export default async function ClinicPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  await requireUser();
  const params = await searchParams;
  const date = params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : todayISO();
  const isToday = date === todayISO();

  const rows = db
    .select({
      visit: tables.visits,
      patient: tables.patients,
      payment: tables.payments,
    })
    .from(tables.visits)
    .innerJoin(tables.patients, eq(tables.visits.patientId, tables.patients.id))
    .leftJoin(tables.payments, eq(tables.payments.visitId, tables.visits.id))
    .where(eq(tables.visits.visitDate, date))
    .orderBy(desc(tables.visits.id))
    .all();

  // patients appointed for this day who haven't been checked in yet
  const appts = db
    .select({ appt: tables.appointments, patient: tables.patients })
    .from(tables.appointments)
    .innerJoin(tables.patients, eq(tables.appointments.patientId, tables.patients.id))
    .where(and(eq(tables.appointments.date, date), eq(tables.appointments.status, "scheduled")))
    .orderBy(asc(tables.appointments.id))
    .all();

  const waiting = rows.filter((r) => r.visit.status === "waiting").length;
  const inProgress = rows.filter((r) => r.visit.status === "in_progress").length;
  const completed = rows.filter((r) => r.visit.status === "completed").length;
  const income = rows.reduce((s, r) => s + (r.payment?.total ?? 0), 0);

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-teal-900">
            คลินิก{isToday ? "วันนี้" : ""} <span className="text-ink-soft">· {thaiDate(date)}</span>
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            รอตรวจ {waiting} · กำลังตรวจ {inProgress} · เสร็จสิ้น {completed}
            {appts.length > 0 && <> · นัดหมาย {appts.length}</>}
            {income > 0 && <> · รายรับ {baht(income)} บาท</>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <form className="flex items-center gap-2">
            <input
              type="date"
              name="date"
              defaultValue={date}
              className="rounded-lg border border-line bg-paper px-3 py-2 text-sm"
            />
            <button className="rounded-lg border border-line bg-paper px-3 py-2 text-sm font-medium hover:bg-cream">
              ดู
            </button>
          </form>
          <Link
            href="/new-visit"
            className="rounded-lg bg-teal-700 px-4 py-2 font-semibold text-white shadow-sm transition hover:bg-teal-800"
          >
            + เปิด visit ใหม่
          </Link>
        </div>
      </header>

      {rows.length === 0 && appts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-paper/60 p-12 text-center text-ink-soft">
          ยังไม่มีผู้ป่วย{isToday ? "วันนี้" : "ในวันที่เลือก"} —{" "}
          <Link href="/new-visit" className="font-medium text-teal-700 underline underline-offset-2">
            เปิด visit ใหม่
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-paper shadow-sm">
          <table className="w-full text-[15px]">
            <thead>
              <tr className="border-b border-line bg-cream text-left text-sm text-ink-soft">
                <th className="px-4 py-3 font-medium">เวลา</th>
                <th className="px-4 py-3 font-medium">HN</th>
                <th className="px-4 py-3 font-medium">ชื่อ-สกุล</th>
                <th className="px-4 py-3 font-medium">อาการสำคัญ</th>
                <th className="px-4 py-3 font-medium">สถานะ</th>
                <th className="px-4 py-3 text-right font-medium">ยอดชำระ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ visit, patient, payment }) => (
                <tr key={visit.id} className="border-b border-line/60 last:border-0 hover:bg-teal-50/60">
                  <td className="px-4 py-3 tabular-nums text-ink-soft">{timeHM(visit.createdAt)}</td>
                  <td className="px-4 py-3 font-medium tabular-nums">{patient.hn}</td>
                  <td className="px-4 py-3">
                    <Link href={`/visits/${visit.id}`} className="font-medium text-teal-800 hover:underline">
                      {fullName(patient)}
                    </Link>
                    {patient.allergies && (
                      <span className="ml-2 rounded bg-danger-soft px-1.5 py-0.5 text-xs font-medium text-danger">
                        แพ้ยา
                      </span>
                    )}
                  </td>
                  <td className="max-w-50 truncate px-4 py-3 text-ink-soft">{visit.chiefComplaint ?? "-"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_CHIP[visit.status]}`}>
                      {VISIT_STATUS_LABEL[visit.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {payment ? `${baht(payment.total)} ฿` : "-"}
                  </td>
                </tr>
              ))}
              {/* appointed patients not yet checked in — greyed out; clicking opens new-visit prefilled */}
              {appts.map(({ appt, patient }) => (
                <tr key={`appt-${appt.id}`} className="border-b border-line/60 bg-cream/50 last:border-0 hover:bg-teal-50/60">
                  <td className="px-4 py-3 text-ink-soft/60">นัด</td>
                  <td className="px-4 py-3 font-medium tabular-nums text-ink-soft/60">{patient.hn}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/new-visit?appointmentId=${appt.id}`}
                      title="คลิกเพื่อเปิด visit"
                      className="font-medium text-ink-soft/60 italic hover:text-teal-800 hover:underline"
                    >
                      {fullName(patient)}
                    </Link>
                    {patient.allergies && (
                      <span className="ml-2 rounded bg-danger-soft px-1.5 py-0.5 text-xs font-medium text-danger opacity-70">
                        แพ้ยา
                      </span>
                    )}
                  </td>
                  <td className="max-w-50 truncate px-4 py-3 text-ink-soft/60">{appt.note ?? "-"}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full border border-dashed border-amber-strong/40 px-2.5 py-1 text-xs font-semibold text-amber-strong/80">
                      นัดหมาย · ยังไม่มา
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-ink-soft/60">-</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
