import { sqliteTable, text, integer, real, uniqueIndex, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ── Users ────────────────────────────────────────────────────────────────────
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  displayName: text("display_name").notNull(),
  passwordHash: text("password_hash").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  // when set, closing a visit auto-prints all of its documents
  autoPrintOnClose: integer("auto_print_on_close", { mode: "boolean" }).notNull().default(false),
  // realtime: pop up a toast when another user checks in a new patient
  notifyNewVisit: integer("notify_new_visit", { mode: "boolean" }).notNull().default(true),
  // realtime: play a short sound alongside that toast
  notifySound: integer("notify_sound", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

// ── Patients ─────────────────────────────────────────────────────────────────
export const patients = sqliteTable(
  "patients",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    hn: text("hn").notNull().unique(), // e.g. "69-0001"
    prefix: text("prefix"), // นาย/นาง/นางสาว/ด.ช./ด.ญ. ...
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    nationalId: text("national_id"),
    dob: text("dob"), // ISO date string
    sex: text("sex", { enum: ["male", "female", "other"] }),
    phone: text("phone"),
    address: text("address"),
    allergies: text("allergies"), // free text, displayed prominently
    chronicConditions: text("chronic_conditions"),
    notes: text("notes"),
    createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  },
  (t) => [index("patients_name_idx").on(t.firstName, t.lastName), index("patients_phone_idx").on(t.phone)],
);

// ── Visits ───────────────────────────────────────────────────────────────────
export const visits = sqliteTable(
  "visits",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    patientId: integer("patient_id").notNull().references(() => patients.id),
    visitDate: text("visit_date").notNull(), // ISO date (YYYY-MM-DD), local clinic day
    status: text("status", { enum: ["waiting", "in_progress", "completed"] })
      .notNull()
      .default("waiting"),
    // vitals (all optional, recorded at check-in)
    weightKg: real("weight_kg"),
    heightCm: real("height_cm"),
    bpSystolic: integer("bp_systolic"),
    bpDiastolic: integer("bp_diastolic"),
    pulse: integer("pulse"),
    temperatureC: real("temperature_c"),
    // clinical record
    chiefComplaint: text("chief_complaint"),
    note: text("note"),
    diagnosis: text("diagnosis"),
    createdBy: integer("created_by").notNull().references(() => users.id),
    createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
    completedAt: text("completed_at"),
  },
  (t) => [index("visits_date_idx").on(t.visitDate), index("visits_patient_idx").on(t.patientId)],
);

// ── Appointments (นัดหมาย) ───────────────────────────────────────────────────
export const appointments = sqliteTable(
  "appointments",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    patientId: integer("patient_id").notNull().references(() => patients.id),
    // visit during which the appointment was made (null if created elsewhere)
    scheduledFromVisitId: integer("scheduled_from_visit_id").references(() => visits.id),
    date: text("date").notNull(), // ISO date (YYYY-MM-DD)
    note: text("note"), // เหตุผลที่นัด เช่น ฟังผลเลือด / ติดตามอาการ
    status: text("status", { enum: ["scheduled", "arrived", "cancelled"] })
      .notNull()
      .default("scheduled"),
    arrivedVisitId: integer("arrived_visit_id").references(() => visits.id),
    createdBy: integer("created_by").notNull().references(() => users.id),
    createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  },
  (t) => [index("appointments_date_idx").on(t.date), index("appointments_patient_idx").on(t.patientId)],
);

// ── Medications (stock) ──────────────────────────────────────────────────────
export const medications = sqliteTable("medications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  // "drug" = stocked medication (default); "procedure" = หัตถการ/อุปกรณ์ —
  // a billable service/item with no stock, สรรพคุณ, วิธีใช้ or drug label.
  kind: text("kind", { enum: ["drug", "procedure"] }).notNull().default("drug"),
  // procedures only: auto-added to every new visit (shared clinic-wide setting)
  autoAddOnVisit: integer("auto_add_on_visit", { mode: "boolean" }).notNull().default(false),
  unit: text("unit").notNull().default("เม็ด"), // เม็ด/แคปซูล/ขวด/ซอง/หลอด...
  price: real("price").notNull().default(0), // selling price per unit (THB)
  stockQty: integer("stock_qty").notNull().default(0),
  lowStockThreshold: integer("low_stock_threshold").notNull().default(10),
  // one portion = default qty dispensed AND how much fits in one drug packet;
  // drives autofill qty and the number of labels printed (ceil(qty / portion)).
  portionAmount: real("portion_amount"),
  // lay description of what the drug is for, printed on the label (สรรพคุณ),
  // e.g. "ยาลดกรดในกระเพาะ แก้ปวดท้องกระเพาะ"
  indication: text("indication"),
  defaultInstructions: text("default_instructions"), // e.g. "1x3 หลังอาหาร"
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

// ── Visit items (treatments/dispensed meds) ──────────────────────────────────
// Snapshots description + unit price at dispense time so later edits to the
// medication never change historical bills.
export const visitItems = sqliteTable(
  "visit_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    visitId: integer("visit_id").notNull().references(() => visits.id),
    type: text("type", { enum: ["medication", "custom", "procedure"] }).notNull(),
    medicationId: integer("medication_id").references(() => medications.id),
    description: text("description").notNull(), // snapshot of med name, or custom text
    instructions: text("instructions"), // วิธีใช้ for the drug label (meds only)
    qty: real("qty").notNull().default(1),
    unitPrice: real("unit_price").notNull(), // snapshot (THB)
    lineTotal: real("line_total").notNull(),
  },
  (t) => [index("visit_items_visit_idx").on(t.visitId)],
);

// ── Stock movements (audit trail) ────────────────────────────────────────────
export const stockMovements = sqliteTable(
  "stock_movements",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    medicationId: integer("medication_id").notNull().references(() => medications.id),
    change: integer("change").notNull(), // +restock / -dispense
    reason: text("reason", { enum: ["dispense", "restock", "adjust"] }).notNull(),
    visitId: integer("visit_id").references(() => visits.id),
    userId: integer("user_id").notNull().references(() => users.id),
    note: text("note"),
    createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  },
  (t) => [index("stock_movements_med_idx").on(t.medicationId)],
);

// ── Payments ─────────────────────────────────────────────────────────────────
export const payments = sqliteTable("payments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  visitId: integer("visit_id").notNull().unique().references(() => visits.id),
  receiptNo: text("receipt_no").notNull().unique(), // e.g. "R69-00001"
  total: real("total").notNull(),
  method: text("method", { enum: ["cash", "transfer"] }).notNull().default("cash"),
  receivedBy: integer("received_by").notNull().references(() => users.id),
  paidAt: text("paid_at").notNull().default(sql`(datetime('now'))`),
});

// ── Counters (year-scoped running numbers for HN / receipts) ─────────────────
export const counters = sqliteTable(
  "counters",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    kind: text("kind", { enum: ["hn", "receipt"] }).notNull(),
    yearBE: integer("year_be").notNull(), // 2-digit Buddhist-era year, e.g. 69
    value: integer("value").notNull().default(0),
  },
  (t) => [uniqueIndex("counters_kind_year_idx").on(t.kind, t.yearBE)],
);

// ── Clinic settings (single row key/value) ───────────────────────────────────
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(), // clinic_name, clinic_address, clinic_phone
  value: text("value").notNull(),
});
