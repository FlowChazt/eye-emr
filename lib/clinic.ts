import { db, tables } from "@/db";

export type ClinicInfo = { name: string; address?: string; phone?: string };

/** Read the clinic letterhead settings used across all printed documents. */
export function getClinic(): ClinicInfo {
  const rows = db.select().from(tables.settings).all();
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return {
    name: map.get("clinic_name") || "Eye Clinic",
    address: map.get("clinic_address") || undefined,
    phone: map.get("clinic_phone") || undefined,
  };
}
