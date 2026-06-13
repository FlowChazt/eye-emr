/** Thai amount-in-words for official receipts (สิบ/ยี่สิบ/เอ็ด/ล้าน/สตางค์ rules). */
import { describe, expect, it } from "vitest";
import { bahtText } from "@/lib/baht-text";

describe("bahtText", () => {
  it("reads whole-baht amounts", () => {
    expect(bahtText(0)).toBe("ศูนย์บาทถ้วน");
    expect(bahtText(1)).toBe("หนึ่งบาทถ้วน");
    expect(bahtText(11)).toBe("สิบเอ็ดบาทถ้วน");
    expect(bahtText(21)).toBe("ยี่สิบเอ็ดบาทถ้วน");
    expect(bahtText(101)).toBe("หนึ่งร้อยเอ็ดบาทถ้วน");
    expect(bahtText(150)).toBe("หนึ่งร้อยห้าสิบบาทถ้วน");
    expect(bahtText(510)).toBe("ห้าร้อยสิบบาทถ้วน");
  });

  it("reads satang", () => {
    expect(bahtText(33.25)).toBe("สามสิบสามบาทยี่สิบห้าสตางค์");
    expect(bahtText(1234.5)).toBe("หนึ่งพันสองร้อยสามสิบสี่บาทห้าสิบสตางค์");
  });

  it("handles millions recursively", () => {
    expect(bahtText(1_000_000)).toBe("หนึ่งล้านบาทถ้วน");
    expect(bahtText(11_000_000)).toBe("สิบเอ็ดล้านบาทถ้วน");
    expect(bahtText(2_100_021)).toBe("สองล้านหนึ่งแสนยี่สิบเอ็ดบาทถ้วน");
  });

  it("carries satang rounding into a full baht", () => {
    expect(bahtText(1.999)).toBe("สองบาทถ้วน");
  });
});
