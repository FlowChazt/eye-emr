const THAI_MONTHS = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

export const THAI_MONTHS_FULL = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

const THAI_WEEKDAYS = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];

/**
 * A 4-digit year >= 2300 can only be Buddhist era (CE 2300 is centuries away;
 * BE 2300 = CE 1757, before any living patient). Used to repair dates that
 * were entered with a พ.ศ. year into a Gregorian field.
 */
export function yearToCE(year: number): number {
  return year >= 2300 ? year - 543 : year;
}

/** Normalize an ISO date whose year may have been entered as พ.ศ. to CE. */
export function isoToCE(iso: string): string {
  const m = iso.match(/^(\d{4})(-\d{2}-\d{2})/);
  if (!m) return iso;
  return `${yearToCE(Number(m[1]))}${m[2]}`;
}

/**
 * Build an ISO (CE) date from Thai-style parts. `year` is expected in พ.ศ.
 * but a Gregorian year is detected and kept as-is.
 */
export function parseDobParts(
  day: string | null,
  month: string | null,
  year: string | null,
): { iso: string | null } | { error: string } {
  if (!day && !month && !year) return { iso: null };
  const d = Number(day), m = Number(month), yRaw = Number(year);
  if (!d || !m || !yRaw) return { error: "กรุณากรอกวันเกิดให้ครบ (วัน เดือน ปี พ.ศ.)" };
  const y = yearToCE(yRaw);
  if (y < 1850 || y > new Date().getFullYear()) return { error: "ปีเกิดไม่ถูกต้อง (กรอกปี พ.ศ. 4 หลัก เช่น 2510)" };
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) {
    return { error: "วันเกิดไม่ถูกต้อง" };
  }
  return { iso: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}` };
}

/** Today's date as YYYY-MM-DD in local time (the clinic day). */
export function todayISO(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** "2026-06-11" -> "11 มิ.ย. 2569" (years already in พ.ศ. are shown as-is) */
export function thaiDate(iso: string | null | undefined): string {
  if (!iso) return "-";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${d} ${THAI_MONTHS[m - 1]} ${yearToCE(y) + 543}`;
}

/** "2026-06-25" -> "วันพฤหัสบดีที่ 25 มิถุนายน พ.ศ. 2569" (for printed papers) */
export function thaiDateFull(iso: string | null | undefined): string {
  if (!iso) return "-";
  const norm = isoToCE(iso.slice(0, 10));
  const [y, m, d] = norm.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const weekday = THAI_WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `วัน${weekday}ที่ ${d} ${THAI_MONTHS_FULL[m - 1]} พ.ศ. ${y + 543}`;
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

/** Age in years from ISO dob (tolerates dobs stored with a พ.ศ. year). */
export function ageYears(dob: string | null | undefined): number | null {
  if (!dob) return null;
  const b = new Date(isoToCE(dob));
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
