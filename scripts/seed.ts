/**
 * Seed initial data: admin user, clinic info, and a few sample medications.
 * Run with: npm run seed
 * Idempotent — skips anything that already exists.
 */
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, tables } from "@/db";

function seedUser() {
  const existing = db.select().from(tables.users).where(eq(tables.users.username, "eye")).get();
  if (existing) {
    console.log("user 'eye' already exists, skipping");
    return;
  }
  db.insert(tables.users)
    .values({
      username: "eye",
      displayName: "พญ. Eye",
      passwordHash: bcrypt.hashSync("eyeclinic", 10),
    })
    .run();
  console.log("created user 'eye' (password: eyeclinic — change it in ตั้งค่า)");
}

function seedSettings() {
  const defaults: Record<string, string> = {
    clinic_name: "Eye Clinic คลินิกเวชกรรม",
    clinic_address: "",
    clinic_phone: "",
  };
  for (const [key, value] of Object.entries(defaults)) {
    db.insert(tables.settings).values({ key, value }).onConflictDoNothing().run();
  }
  console.log("seeded clinic settings");
}

function seedMedications() {
  const count = db.select().from(tables.medications).all().length;
  if (count > 0) {
    console.log("medications already exist, skipping samples");
    return;
  }
  const samples = [
    { name: "Paracetamol 500 mg", unit: "เม็ด", price: 2, stockQty: 500, lowStockThreshold: 100, defaultInstructions: "1-2 เม็ด ทุก 4-6 ชม. เวลาปวด/มีไข้" },
    { name: "Omeprazole 20 mg", unit: "แคปซูล", price: 5, stockQty: 200, lowStockThreshold: 50, defaultInstructions: "1 แคปซูล ก่อนอาหารเช้า" },
    { name: "Simethicone 80 mg", unit: "เม็ด", price: 3, stockQty: 200, lowStockThreshold: 50, defaultInstructions: "1 เม็ด เคี้ยวหลังอาหาร 3 เวลา" },
    { name: "ORS ผงเกลือแร่", unit: "ซอง", price: 10, stockQty: 100, lowStockThreshold: 20, defaultInstructions: "ละลายน้ำ 1 แก้ว จิบบ่อยๆ" },
  ];
  db.insert(tables.medications).values(samples).run();
  console.log(`seeded ${samples.length} sample medications`);
}

seedUser();
seedSettings();
seedMedications();
console.log("seed complete");
