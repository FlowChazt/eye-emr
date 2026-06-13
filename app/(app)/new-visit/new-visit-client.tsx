"use client";

import { useTransition } from "react";
import { createPatient, openVisitAndGo } from "@/app/(app)/patients/actions";
import { PatientForm } from "@/components/patient-form";
import { PatientSearch } from "@/components/patient-search";
import { ageYears, fullName, thaiDate } from "@/lib/format";

type FromAppointment = {
  appt: { id: number; date: string; note: string | null };
  patient: {
    id: number;
    hn: string;
    prefix: string | null;
    firstName: string;
    lastName: string;
    dob: string | null;
    phone: string | null;
    allergies: string | null;
  };
} | null;

export function NewVisitClient({ fromAppointment }: { fromAppointment: FromAppointment }) {
  const [opening, startOpening] = useTransition();

  return (
    <div className="space-y-5">
      {fromAppointment && (
        <section className="card border-teal-200 bg-teal-50 p-4">
          <h2 className="mb-2 text-sm font-semibold tracking-wide text-teal-800 uppercase">ผู้ป่วยนัดหมาย</h2>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p>
                <span className="font-semibold tabular-nums text-teal-700">{fromAppointment.patient.hn}</span>
                <span className="ml-3 font-medium">{fullName(fromAppointment.patient)}</span>
                <span className="ml-2 text-sm text-ink-soft">
                  {ageYears(fromAppointment.patient.dob) !== null && `${ageYears(fromAppointment.patient.dob)} ปี`}
                  {fromAppointment.patient.phone && ` · ${fromAppointment.patient.phone}`}
                </span>
              </p>
              <p className="mt-1 text-sm text-ink-soft">
                นัดวันที่ {thaiDate(fromAppointment.appt.date)}
                {fromAppointment.appt.note && <> · {fromAppointment.appt.note}</>}
              </p>
              {fromAppointment.patient.allergies && (
                <p className="mt-1 text-sm font-semibold text-danger">แพ้: {fromAppointment.patient.allergies}</p>
              )}
            </div>
            <button
              disabled={opening}
              onClick={() =>
                startOpening(async () => {
                  await openVisitAndGo(fromAppointment.patient.id, fromAppointment.appt.id);
                })
              }
              className="btn-primary px-5 py-2"
            >
              {opening ? "กำลังเปิด…" : "เปิด visit ผู้ป่วยนัด"}
            </button>
          </div>
        </section>
      )}

      <section className="card p-4">
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-ink-soft uppercase">ผู้ป่วยเดิม</h2>
        <PatientSearch pickLabel="เปิด visit" onPick={(p) => openVisitAndGo(p.id)} autoFocus={!fromAppointment} />
      </section>

      <section className="card p-4">
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-ink-soft uppercase">ลงทะเบียนผู้ป่วยใหม่</h2>
        <PatientForm action={createPatient} submitLabel="ลงทะเบียน" openVisitOption />
      </section>
    </div>
  );
}
