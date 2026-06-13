"use server";

import { and, eq, like, lte, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, tables } from "@/db";
import { nextHN } from "@/lib/counters";
import { parseDobParts, todayISO } from "@/lib/format";
import { requireUser } from "@/lib/session";

function patientFromForm(formData: FormData) {
  const get = (k: string) => {
    const v = String(formData.get(k) ?? "").trim();
    return v === "" ? null : v;
  };
  const firstName = get("firstName");
  const lastName = get("lastName");
  if (!firstName || !lastName) return { error: "กรุณากรอกชื่อและนามสกุล" } as const;
  // DOB arrives Thai-style (วัน/เดือน/ปี พ.ศ.) and is stored as CE ISO
  const dob = parseDobParts(get("dobDay"), get("dobMonth"), get("dobYearBE"));
  if ("error" in dob) return { error: dob.error } as const;
  return {
    data: {
      prefix: get("prefix"),
      firstName,
      lastName,
      nationalId: get("nationalId"),
      dob: dob.iso,
      sex: (get("sex") as "male" | "female" | "other" | null) ?? null,
      phone: get("phone"),
      address: get("address"),
      allergies: get("allergies"),
      chronicConditions: get("chronicConditions"),
      notes: get("notes"),
    },
  } as const;
}

/** Register a new patient; returns the new patient or an error. */
export async function createPatient(_prev: unknown, formData: FormData) {
  await requireUser();
  const parsed = patientFromForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const patient = db.transaction((tx) => {
    const hn = nextHN();
    return tx.insert(tables.patients).values({ hn, ...parsed.data }).returning().get();
  });

  revalidatePath("/patients");
  // openVisit=1 → caller wants a visit opened immediately after registration
  if (formData.get("openVisit")) {
    const visitId = await openVisitForPatient(patient.id);
    redirect(`/visits/${visitId}`);
  }
  redirect(`/patients/${patient.hn}`);
}

export async function updatePatient(patientId: number, _prev: unknown, formData: FormData) {
  await requireUser();
  const parsed = patientFromForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const patient = db
    .update(tables.patients)
    .set(parsed.data)
    .where(eq(tables.patients.id, patientId))
    .returning()
    .get();

  revalidatePath(`/patients/${patient.hn}`);
  redirect(`/patients/${patient.hn}`);
}

/** Search patients by HN, name, phone, or national id. */
export async function searchPatients(query: string) {
  await requireUser();
  const q = query.trim();
  if (!q) return [];
  const pattern = `%${q}%`;
  return db
    .select()
    .from(tables.patients)
    .where(
      or(
        like(tables.patients.hn, pattern),
        like(tables.patients.firstName, pattern),
        like(tables.patients.lastName, pattern),
        like(tables.patients.phone, pattern),
        like(tables.patients.nationalId, pattern),
        like(sql`${tables.patients.firstName} || ' ' || ${tables.patients.lastName}`, pattern),
      ),
    )
    .limit(20)
    .all();
}

/**
 * Open a new visit for an existing patient (today, status waiting).
 * Any scheduled appointment due today or earlier is marked arrived; pass
 * `fromAppointmentId` to also consume a specific (e.g. future-dated) one.
 */
export async function openVisitForPatient(patientId: number, fromAppointmentId?: number): Promise<number> {
  const user = await requireUser();
  const iso = todayISO();
  const visit = db.transaction((tx) => {
    const v = tx
      .insert(tables.visits)
      .values({ patientId, visitDate: iso, createdBy: user.userId })
      .returning()
      .get();
    const due = fromAppointmentId
      ? or(eq(tables.appointments.id, fromAppointmentId), lte(tables.appointments.date, iso))
      : lte(tables.appointments.date, iso);
    tx.update(tables.appointments)
      .set({ status: "arrived", arrivedVisitId: v.id })
      .where(and(eq(tables.appointments.patientId, patientId), eq(tables.appointments.status, "scheduled"), due))
      .run();
    return v;
  });
  revalidatePath("/");
  return visit.id;
}

export async function openVisitAndGo(patientId: number, fromAppointmentId?: number) {
  // guard: when bound as a <form action>, FormData arrives as the 2nd argument
  const apptId = typeof fromAppointmentId === "number" ? fromAppointmentId : undefined;
  const visitId = await openVisitForPatient(patientId, apptId);
  redirect(`/visits/${visitId}`);
}
