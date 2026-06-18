import { ageYears, fullName, thaiDate, thaiDateFull, todayISO } from "@/lib/format";
import { DocField, PrintDoc } from "@/components/print-doc";
import type { ClinicInfo } from "@/lib/clinic";

export function AppointmentDoc({
  clinic,
  appt,
  patient,
  doctorName,
}: {
  clinic: ClinicInfo;
  appt: { date: string; note: string | null };
  patient: { hn: string; prefix: string | null; firstName: string; lastName: string; dob: string | null };
  doctorName?: string;
}) {
  const age = ageYears(patient.dob);
  return (
    <PrintDoc
      clinicName={clinic.name}
      clinicAddress={clinic.address}
      clinicPhone={clinic.phone}
      title="ใบนัด"
      titleEn="Appointment Card"
      meta={[{ label: "วันที่ออกใบนัด", value: thaiDate(todayISO()) }]}
      signature={{ role: "แพทย์ผู้นัด", name: doctorName }}
      footnote={
        "กรุณานำใบนัดนี้มาด้วยทุกครั้งที่มารับการตรวจ" +
        (clinic.phone ? ` · หากไม่สะดวกมาตามนัด กรุณาติดต่อ โทร. ${clinic.phone}` : "")
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
  );
}
