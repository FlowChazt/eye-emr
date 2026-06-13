import { requireUser } from "@/lib/session";
import { PatientsSearchClient } from "./patients-search-client";

export default async function PatientsPage() {
  await requireUser();
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-4 text-lg font-bold text-teal-900">ค้นหาผู้ป่วย</h1>
      <div className="card p-4">
        <PatientsSearchClient />
      </div>
    </div>
  );
}
