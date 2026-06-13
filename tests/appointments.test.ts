/**
 * Appointment lifecycle: scheduling and the arrival transition that fires when
 * a visit is opened for an appointed patient.
 */
import { beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

process.env.DB_PATH = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "eye-emr-appt-test-")), "test.db");

// imported after DB_PATH is set so the connection uses the temp file
const { db, tables } = await import("@/db");
const { todayISO } = await import("@/lib/format");
const { and, eq, lte, or } = await import("drizzle-orm");

let userId: number;
let patientId: number;

beforeAll(() => {
  userId = db
    .insert(tables.users)
    .values({ username: "t", displayName: "Test", passwordHash: "x" })
    .returning()
    .get().id;
  patientId = db
    .insert(tables.patients)
    .values({ hn: "00-0000", firstName: "ทดสอบ", lastName: "ระบบ" })
    .returning()
    .get().id;
});

/** Mirror of openVisitForPatient's transaction body (sans session). */
function openVisit(pid: number, fromAppointmentId?: number) {
  const iso = todayISO();
  return db.transaction((tx) => {
    const v = tx.insert(tables.visits).values({ patientId: pid, visitDate: iso, createdBy: userId }).returning().get();
    const due = fromAppointmentId
      ? or(eq(tables.appointments.id, fromAppointmentId), lte(tables.appointments.date, iso))
      : lte(tables.appointments.date, iso);
    tx.update(tables.appointments)
      .set({ status: "arrived", arrivedVisitId: v.id })
      .where(and(eq(tables.appointments.patientId, pid), eq(tables.appointments.status, "scheduled"), due))
      .run();
    return v;
  });
}

function makeAppointment(date: string) {
  return db
    .insert(tables.appointments)
    .values({ patientId, date, createdBy: userId })
    .returning()
    .get();
}

describe("appointment arrival on visit open", () => {
  it("marks a due appointment arrived and links the visit", () => {
    const appt = makeAppointment(todayISO());
    const visit = openVisit(patientId);

    const after = db.select().from(tables.appointments).where(eq(tables.appointments.id, appt.id)).get()!;
    expect(after.status).toBe("arrived");
    expect(after.arrivedVisitId).toBe(visit.id);
  });

  it("leaves future appointments scheduled on a walk-in visit", () => {
    const future = new Date();
    future.setDate(future.getDate() + 14);
    const appt = makeAppointment(todayISO(future));

    openVisit(patientId);

    const after = db.select().from(tables.appointments).where(eq(tables.appointments.id, appt.id)).get()!;
    expect(after.status).toBe("scheduled");
  });

  it("consumes a future appointment when the visit is opened from it", () => {
    const future = new Date();
    future.setDate(future.getDate() + 14);
    const appt = makeAppointment(todayISO(future));

    const visit = openVisit(patientId, appt.id);

    const after = db.select().from(tables.appointments).where(eq(tables.appointments.id, appt.id)).get()!;
    expect(after.status).toBe("arrived");
    expect(after.arrivedVisitId).toBe(visit.id);
  });

  it("does not touch cancelled appointments", () => {
    const appt = makeAppointment(todayISO());
    db.update(tables.appointments).set({ status: "cancelled" }).where(eq(tables.appointments.id, appt.id)).run();

    openVisit(patientId);

    const after = db.select().from(tables.appointments).where(eq(tables.appointments.id, appt.id)).get()!;
    expect(after.status).toBe("cancelled");
    expect(after.arrivedVisitId).toBeNull();
  });
});
