const DIGITS = ["", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
const PLACES = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน"];

/** Read a 1–6 digit integer group in Thai (สิบ/ยี่สิบ/เอ็ด rules). */
function readGroup(n: number): string {
  let out = "";
  const s = String(n);
  for (let i = 0; i < s.length; i++) {
    const digit = Number(s[i]);
    const place = s.length - i - 1;
    if (digit === 0) continue;
    if (place === 1 && digit === 1) out += "สิบ";
    else if (place === 1 && digit === 2) out += "ยี่สิบ";
    else if (place === 0 && digit === 1 && s.length > 1) out += "เอ็ด";
    else out += DIGITS[digit] + PLACES[place];
  }
  return out;
}

/** Read a non-negative integer in Thai, recursing per million. */
function readInt(n: number): string {
  if (n === 0) return "ศูนย์";
  if (n < 1_000_000) return readGroup(n);
  return readInt(Math.floor(n / 1_000_000)) + "ล้าน" + readGroup(n % 1_000_000);
}

/** 1234.50 -> "หนึ่งพันสองร้อยสามสิบสี่บาทห้าสิบสตางค์" (official receipt wording) */
export function bahtText(amount: number): string {
  const negative = amount < 0;
  const abs = Math.abs(amount);
  const baht = Math.floor(abs);
  const satang = Math.round((abs - baht) * 100);
  // rounding may carry satang into a full baht (e.g. 1.999)
  const carried = satang === 100;
  const b = carried ? baht + 1 : baht;
  const s = carried ? 0 : satang;

  let out = readInt(b) + "บาท";
  out += s === 0 ? "ถ้วน" : readGroup(s) + "สตางค์";
  return (negative ? "ลบ" : "") + out;
}
