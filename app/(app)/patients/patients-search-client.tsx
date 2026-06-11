"use client";

import { useRouter } from "next/navigation";
import { PatientSearch } from "@/components/patient-search";

export function PatientsSearchClient() {
  const router = useRouter();
  return <PatientSearch pickLabel="เปิดประวัติ" onPick={(p) => router.push(`/patients/${p.hn}`)} />;
}
