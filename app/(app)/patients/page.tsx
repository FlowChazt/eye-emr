import { requireUser } from "@/lib/session";
import { PatientsSearchClient } from "./patients-search-client";

export default async function PatientsPage() {
  await requireUser();
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold text-teal-900">ค้นหาผู้ป่วย</h1>
      <div className="rounded-2xl border border-line bg-paper p-6 shadow-sm">
        <PatientsSearchClient />
      </div>
    </div>
  );
}
