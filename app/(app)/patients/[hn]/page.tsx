import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db, tables } from "@/db";
import { requireUser } from "@/lib/session";
import { ageYears, fullName, thaiDate, VISIT_STATUS_LABEL } from "@/lib/format";
import { openVisitAndGo } from "../actions";

const SEX_LABEL: Record<string, string> = { male: "ชาย", female: "หญิง", other: "อื่นๆ" };

export default async function PatientPage({ params }: { params: Promise<{ hn: string }> }) {
  await requireUser();
  const { hn } = await params;

  const patient = db.select().from(tables.patients).where(eq(tables.patients.hn, hn)).get();
  if (!patient) notFound();

  const visitRows = db
    .select()
    .from(tables.visits)
    .where(eq(tables.visits.patientId, patient.id))
    .orderBy(desc(tables.visits.visitDate), desc(tables.visits.id))
    .all();

  const age = ageYears(patient.dob);
  const openVisit = openVisitAndGo.bind(null, patient.id);

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold tabular-nums text-teal-700">HN {patient.hn}</p>
          <h1 className="text-2xl font-bold text-teal-900">{fullName(patient)}</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {patient.sex && SEX_LABEL[patient.sex]}
            {age !== null && <> · {age} ปี</>}
            {patient.dob && <> · เกิด {thaiDate(patient.dob)}</>}
            {patient.phone && <> · {patient.phone}</>}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/patients/${patient.hn}/edit`}
            className="rounded-lg border border-line bg-paper px-4 py-2 font-medium hover:bg-cream"
          >
            แก้ไขข้อมูล
          </Link>
          <form action={openVisit}>
            <button className="rounded-lg bg-teal-700 px-4 py-2 font-semibold text-white hover:bg-teal-800">
              + เปิด visit
            </button>
          </form>
        </div>
      </header>

      {patient.allergies && (
        <div className="mb-5 flex items-center gap-3 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3">
          <span className="text-xl" aria-hidden>⚠️</span>
          <div>
            <p className="text-sm font-bold text-danger">ประวัติแพ้ยา/แพ้อาหาร</p>
            <p className="text-danger">{patient.allergies}</p>
          </div>
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-3 text-[15px] sm:grid-cols-2">
        <div className="rounded-xl border border-line bg-paper p-4">
          <p className="text-sm font-medium text-ink-soft">โรคประจำตัว</p>
          <p>{patient.chronicConditions || "-"}</p>
        </div>
        <div className="rounded-xl border border-line bg-paper p-4">
          <p className="text-sm font-medium text-ink-soft">ที่อยู่</p>
          <p>{patient.address || "-"}</p>
        </div>
        {patient.notes && (
          <div className="rounded-xl border border-line bg-paper p-4 sm:col-span-2">
            <p className="text-sm font-medium text-ink-soft">หมายเหตุ</p>
            <p>{patient.notes}</p>
          </div>
        )}
      </div>

      <h2 className="mb-3 text-lg font-semibold">ประวัติการรักษา ({visitRows.length} ครั้ง)</h2>
      {visitRows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line bg-paper/60 p-8 text-center text-ink-soft">
          ยังไม่มีประวัติการรักษา
        </p>
      ) : (
        <ul className="space-y-2">
          {visitRows.map((v) => (
            <li key={v.id}>
              <Link
                href={`/visits/${v.id}`}
                className="flex items-center justify-between rounded-xl border border-line bg-paper px-4 py-3 transition hover:border-teal-200 hover:bg-teal-50/60"
              >
                <div>
                  <span className="font-medium">{thaiDate(v.visitDate)}</span>
                  <span className="ml-3 text-ink-soft">
                    {v.diagnosis || v.chiefComplaint || "ไม่ระบุ"}
                  </span>
                </div>
                <span className="text-sm text-ink-soft">{VISIT_STATUS_LABEL[v.status]}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
