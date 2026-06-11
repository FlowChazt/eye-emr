"use server";

import { eq, like, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, tables } from "@/db";
import { nextHN } from "@/lib/counters";
import { requireUser } from "@/lib/session";

function patientFromForm(formData: FormData) {
  const get = (k: string) => {
    const v = String(formData.get(k) ?? "").trim();
    return v === "" ? null : v;
  };
  const firstName = get("firstName");
  const lastName = get("lastName");
  if (!firstName || !lastName) return { error: "กรุณากรอกชื่อและนามสกุล" } as const;
  return {
    data: {
      prefix: get("prefix"),
      firstName,
      lastName,
      nationalId: get("nationalId"),
      dob: get("dob"),
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

/** Open a new visit for an existing patient (today, status waiting). */
export async function openVisitForPatient(patientId: number): Promise<number> {
  const user = await requireUser();
  const today = new Date();
  const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const visit = db
    .insert(tables.visits)
    .values({ patientId, visitDate: iso, createdBy: user.userId })
    .returning()
    .get();
  revalidatePath("/");
  return visit.id;
}

export async function openVisitAndGo(patientId: number) {
  const visitId = await openVisitForPatient(patientId);
  redirect(`/visits/${visitId}`);
}
