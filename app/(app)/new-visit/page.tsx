import { requireUser } from "@/lib/session";
import { NewVisitClient } from "./new-visit-client";

export default async function NewVisitPage() {
  await requireUser();
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold text-teal-900">เปิด visit ใหม่</h1>
      <NewVisitClient />
    </div>
  );
}
