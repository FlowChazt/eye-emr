const THAI_MONTHS = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

/** Today's date as YYYY-MM-DD in local time (the clinic day). */
export function todayISO(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** "2026-06-11" -> "11 มิ.ย. 2569" */
export function thaiDate(iso: string | null | undefined): string {
  if (!iso) return "-";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${d} ${THAI_MONTHS[m - 1]} ${y + 543}`;
}

/** "2026-06-11 14:30:22" (sqlite datetime, UTC) -> local "14:30" */
export function timeHM(sqliteDatetime: string | null | undefined): string {
  if (!sqliteDatetime) return "-";
  const dt = new Date(sqliteDatetime.replace(" ", "T") + "Z");
  if (isNaN(dt.getTime())) return sqliteDatetime;
  return dt.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
}

export function baht(n: number | null | undefined): string {
  return (n ?? 0).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fullName(p: { prefix?: string | null; firstName: string; lastName: string }): string {
  return `${p.prefix ?? ""}${p.firstName} ${p.lastName}`.trim();
}

/** Age in years from ISO dob */
export function ageYears(dob: string | null | undefined): number | null {
  if (!dob) return null;
  const b = new Date(dob);
  if (isNaN(b.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) age--;
  return age;
}

export const VISIT_STATUS_LABEL: Record<string, string> = {
  waiting: "รอตรวจ",
  in_progress: "กำลังตรวจ",
  completed: "เสร็จสิ้น",
};
