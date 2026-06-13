import Link from "next/link";
import type { ReactNode } from "react";
import { ageYears, fullName } from "@/lib/format";
import { AlertIcon } from "./icons";

const SEX_LABEL: Record<string, string> = { male: "ชาย", female: "หญิง", other: "อื่นๆ" };

type BannerPatient = {
  hn: string;
  prefix: string | null;
  firstName: string;
  lastName: string;
  sex: string | null;
  dob: string | null;
  chronicConditions: string | null;
  allergies: string | null;
};

/**
 * Persistent patient-context banner shown atop chart-style screens (visit,
 * patient detail). Keeps identity + safety flags (allergy in danger color)
 * visible while working. `nameHref` makes the name a link; `actions` renders
 * page-level buttons on the right; `context` adds a small line above the name
 * (e.g. visit date · status).
 */
export function PatientBanner({
  patient,
  context,
  actions,
  nameHref,
}: {
  patient: BannerPatient;
  context?: ReactNode;
  actions?: ReactNode;
  nameHref?: string;
}) {
  const age = ageYears(patient.dob);

  return (
    <div className="card mb-4 px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {context && <div className="mb-0.5 text-xs text-ink-soft">{context}</div>}
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1 className="text-lg leading-tight font-bold text-teal-900">
              {nameHref ? (
                <Link href={nameHref} className="hover:underline">
                  {fullName(patient)}
                </Link>
              ) : (
                fullName(patient)
              )}
            </h1>
            <span className="text-sm font-semibold tabular-nums text-teal-700">HN {patient.hn}</span>
            <span className="text-sm text-ink-soft">
              {patient.sex && SEX_LABEL[patient.sex]}
              {age !== null && <> · {age} ปี</>}
              {patient.chronicConditions && <> · {patient.chronicConditions}</>}
            </span>
          </div>
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>

      {patient.allergies && (
        <div className="mt-2.5 flex items-center gap-2 rounded-md border border-danger/25 bg-danger-soft px-3 py-1.5 text-sm">
          <AlertIcon size={16} className="shrink-0 text-danger" />
          <span className="font-semibold text-danger">แพ้ยา/แพ้อาหาร:</span>
          <span className="text-danger">{patient.allergies}</span>
        </div>
      )}
    </div>
  );
}
