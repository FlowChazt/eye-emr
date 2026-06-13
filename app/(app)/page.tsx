import Link from "next/link";
import { and, asc, desc, eq } from "drizzle-orm";
import { db, tables } from "@/db";
import { requireUser } from "@/lib/session";
import { baht, fullName, thaiDate, timeHM, todayISO, VISIT_STATUS_LABEL } from "@/lib/format";
import { PlusIcon } from "@/components/icons";

const STATUS_CHIP: Record<string, string> = {
  waiting: "bg-amber-soft text-amber-strong",
  in_progress: "bg-teal-100 text-teal-800",
  completed: "bg-line/70 text-ink-soft",
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
    <div>
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h1 className="text-lg font-bold text-teal-900">
            งาน{isToday ? "วันนี้" : ""}
          </h1>
          <span className="text-sm text-ink-soft">{thaiDate(date)}</span>
        </div>
        <div className="flex items-center gap-2">
          <form className="flex items-center gap-1.5">
            <input type="date" name="date" defaultValue={date} className="field w-auto" />
            <button className="btn-ghost">ดู</button>
          </form>
          <Link href="/new-visit" className="btn-primary">
            <PlusIcon size={16} /> เปิด visit ใหม่
          </Link>
        </div>
      </header>

      {/* summary strip */}
      <div className="mb-4 flex flex-wrap gap-x-5 gap-y-1 text-sm">
        <Stat label="รอตรวจ" value={waiting} tone="text-amber-strong" />
        <Stat label="กำลังตรวจ" value={inProgress} tone="text-teal-700" />
        <Stat label="เสร็จสิ้น" value={completed} tone="text-ink" />
        {appts.length > 0 && <Stat label="นัดหมาย" value={appts.length} tone="text-ink-soft" />}
        {income > 0 && (
          <span className="ml-auto self-center text-sm text-ink-soft">
            รายรับ <span className="font-semibold tabular-nums text-teal-800">{baht(income)}</span> บาท
          </span>
        )}
      </div>

      {rows.length === 0 && appts.length === 0 ? (
        <div className="card border-dashed bg-paper/60 p-12 text-center text-sm text-ink-soft">
          ยังไม่มีผู้ป่วย{isToday ? "วันนี้" : "ในวันที่เลือก"} —{" "}
          <Link href="/new-visit" className="font-medium text-teal-700 underline underline-offset-2">
            เปิด visit ใหม่
          </Link>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-16">เวลา</th>
                <th className="w-20">HN</th>
                <th>ชื่อ-สกุล</th>
                <th>อาการสำคัญ</th>
                <th className="w-28">สถานะ</th>
                <th className="w-24 text-right">ยอดชำระ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ visit, patient, payment }) => (
                <tr key={visit.id} className="hover:bg-teal-50/60">
                  <td className="tabular-nums text-ink-soft">{timeHM(visit.createdAt)}</td>
                  <td className="font-medium tabular-nums">{patient.hn}</td>
                  <td>
                    <Link href={`/visits/${visit.id}`} className="font-medium text-teal-800 hover:underline">
                      {fullName(patient)}
                    </Link>
                    {patient.allergies && (
                      <span className="chip ml-2 bg-danger-soft text-danger">แพ้ยา</span>
                    )}
                  </td>
                  <td className="max-w-64 truncate text-ink-soft">{visit.chiefComplaint ?? "-"}</td>
                  <td>
                    <span className={`chip ${STATUS_CHIP[visit.status]}`}>
                      {VISIT_STATUS_LABEL[visit.status]}
                    </span>
                  </td>
                  <td className="text-right tabular-nums">
                    {payment ? `${baht(payment.total)} ฿` : "-"}
                  </td>
                </tr>
              ))}
              {/* appointed patients not yet checked in — greyed out; clicking opens new-visit prefilled */}
              {appts.map(({ appt, patient }) => (
                <tr key={`appt-${appt.id}`} className="bg-cream/50 hover:bg-teal-50/60">
                  <td className="text-ink-soft/60">นัด</td>
                  <td className="font-medium tabular-nums text-ink-soft/60">{patient.hn}</td>
                  <td>
                    <Link
                      href={`/new-visit?appointmentId=${appt.id}`}
                      title="คลิกเพื่อเปิด visit"
                      className="font-medium text-ink-soft/60 italic hover:text-teal-800 hover:underline"
                    >
                      {fullName(patient)}
                    </Link>
                    {patient.allergies && (
                      <span className="chip ml-2 bg-danger-soft text-danger opacity-70">แพ้ยา</span>
                    )}
                  </td>
                  <td className="max-w-64 truncate text-ink-soft/60">{appt.note ?? "-"}</td>
                  <td>
                    <span className="chip border border-dashed border-amber-strong/40 text-amber-strong/80">
                      ยังไม่มา
                    </span>
                  </td>
                  <td className="text-right text-ink-soft/60">-</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <span className="text-ink-soft">
      {label} <span className={`font-semibold tabular-nums ${tone}`}>{value}</span>
    </span>
  );
}
