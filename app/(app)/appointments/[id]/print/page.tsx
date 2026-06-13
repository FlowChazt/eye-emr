import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, tables } from "@/db";
import { requireUser } from "@/lib/session";
import { ageYears, fullName, thaiDate, thaiDateFull, todayISO } from "@/lib/format";
import { PrintButton } from "@/components/print-button";
import { DocField, PrintDoc } from "@/components/print-doc";

async function getSetting(key: string): Promise<string> {
  const row = db.select().from(tables.settings).where(eq(tables.settings.key, key)).get();
  return row?.value ?? "";
}

export default async function AppointmentPrintPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const apptId = Number(id);
  if (!Number.isInteger(apptId)) notFound();

  const appt = db.select().from(tables.appointments).where(eq(tables.appointments.id, apptId)).get();
  if (!appt) notFound();
  const patient = db.select().from(tables.patients).where(eq(tables.patients.id, appt.patientId)).get()!;
  const doctor = db.select().from(tables.users).where(eq(tables.users.id, appt.createdBy)).get();
  const age = ageYears(patient.dob);

  const clinicName = await getSetting("clinic_name");
  const clinicAddress = await getSetting("clinic_address");
  const clinicPhone = await getSetting("clinic_phone");

  const backHref = appt.scheduledFromVisitId ? `/visits/${appt.scheduledFromVisitId}` : `/patients/${patient.hn}`;

  return (
    <div className="mx-auto max-w-xl">
      <div className="no-print mb-4 flex items-center justify-between">
        <Link href={backHref} className="text-teal-700 underline underline-offset-2">
          ← กลับ
        </Link>
        <PrintButton />
      </div>

      <PrintDoc
        clinicName={clinicName || "Eye Clinic"}
        clinicAddress={clinicAddress}
        clinicPhone={clinicPhone}
        title="ใบนัด"
        titleEn="Appointment Card"
        meta={[{ label: "วันที่ออกใบนัด", value: thaiDate(todayISO()) }]}
        signature={{ role: "แพทย์ผู้นัด", name: doctor?.displayName }}
        footnote={
          "กรุณานำใบนัดนี้มาด้วยทุกครั้งที่มารับการตรวจ" +
          (clinicPhone ? ` · หากไม่สะดวกมาตามนัด กรุณาติดต่อ โทร. ${clinicPhone}` : "")
        }
      >
        <div className="mb-5 grid grid-cols-[1fr_auto] gap-x-6 gap-y-1.5">
          <DocField
            label="ชื่อผู้ป่วย"
            value={
              <>
                {fullName(patient)}
                {age !== null && <span className="ml-2 text-ink-soft">(อายุ {age} ปี)</span>}
              </>
            }
          />
          <DocField label="HN" value={patient.hn} className="w-36" />
        </div>

        <div className="border-2 border-teal-900 p-1">
          <div className="border border-[#c8a24a] px-5 py-3.5 text-center">
            <p className="text-[11px] tracking-wide text-ink-soft">แพทย์นัดตรวจครั้งถัดไป</p>
            <p className="mt-1.5 text-lg font-bold text-teal-900">{thaiDateFull(appt.date)}</p>
            {appt.note && (
              <p className="mt-1.5 text-[12px]">
                นัดมาเพื่อ: <span className="font-medium">{appt.note}</span>
              </p>
            )}
          </div>
        </div>
      </PrintDoc>
    </div>
  );
}
