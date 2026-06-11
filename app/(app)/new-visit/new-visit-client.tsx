"use client";

import { createPatient, openVisitAndGo } from "@/app/(app)/patients/actions";
import { PatientForm } from "@/components/patient-form";
import { PatientSearch } from "@/components/patient-search";

export function NewVisitClient() {
  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-line bg-paper p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">ผู้ป่วยเดิม</h2>
        <PatientSearch pickLabel="เปิด visit" onPick={(p) => openVisitAndGo(p.id)} />
      </section>

      <section className="rounded-2xl border border-line bg-paper p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">ลงทะเบียนผู้ป่วยใหม่</h2>
        <PatientForm action={createPatient} submitLabel="ลงทะเบียน" openVisitOption />
      </section>
    </div>
  );
}
