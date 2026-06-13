/**
 * Thai/Buddhist-era date handling: DOB entry in พ.ศ., age calculation, and
 * tolerance for legacy rows that stored a พ.ศ. year in the dob column.
 */
import { describe, expect, it } from "vitest";
import { ageYears, isoToCE, parseDobParts, thaiDate, thaiDateFull, yearToCE } from "@/lib/format";

describe("Buddhist-era year normalization", () => {
  it("converts พ.ศ. years to CE and keeps CE years as-is", () => {
    expect(yearToCE(2510)).toBe(1967);
    expect(yearToCE(1990)).toBe(1990);
    expect(isoToCE("2533-05-15")).toBe("1990-05-15");
    expect(isoToCE("1990-05-15")).toBe("1990-05-15");
  });
});

describe("parseDobParts", () => {
  it("builds a CE ISO date from Thai-style parts (ปี พ.ศ.)", () => {
    expect(parseDobParts("15", "5", "2533")).toEqual({ iso: "1990-05-15" });
  });

  it("accepts a CE year typed directly", () => {
    expect(parseDobParts("15", "5", "1990")).toEqual({ iso: "1990-05-15" });
  });

  it("returns null when all parts are empty", () => {
    expect(parseDobParts(null, null, null)).toEqual({ iso: null });
  });

  it("rejects partial input", () => {
    expect(parseDobParts("15", "5", null)).toHaveProperty("error");
  });

  it("rejects impossible dates and implausible years", () => {
    expect(parseDobParts("31", "2", "2533")).toHaveProperty("error"); // 31 ก.พ.
    expect(parseDobParts("1", "1", "60")).toHaveProperty("error"); // 2-digit year
    expect(parseDobParts("1", "1", "9999")).toHaveProperty("error");
  });
});

describe("ageYears", () => {
  const thisYear = new Date().getFullYear();

  it("computes age from a CE dob", () => {
    expect(ageYears(`${thisYear - 30}-01-01`)).toBe(30);
  });

  it("computes the same age when the dob was stored with a พ.ศ. year", () => {
    expect(ageYears(`${thisYear - 30 + 543}-01-01`)).toBe(30);
  });

  it("counts birthdays, not just years", () => {
    // born this year minus 30, but birthday is tomorrow → still 29
    const d = new Date();
    d.setDate(d.getDate() + 1);
    if (d.getFullYear() === thisYear) {
      const iso = `${thisYear - 30}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      expect(ageYears(iso)).toBe(29);
    }
  });
});

describe("thai date display", () => {
  it("shows พ.ศ. for CE dates and leaves พ.ศ.-stored dates alone", () => {
    expect(thaiDate("2026-06-11")).toBe("11 มิ.ย. 2569");
    expect(thaiDate("2569-06-11")).toBe("11 มิ.ย. 2569");
  });

  it("renders the full form for printed papers", () => {
    expect(thaiDateFull("2026-06-25")).toBe("วันพฤหัสบดีที่ 25 มิถุนายน พ.ศ. 2569");
  });
});
