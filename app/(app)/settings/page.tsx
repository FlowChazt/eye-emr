import { asc, eq } from "drizzle-orm";
import { db, tables } from "@/db";
import { requireUser } from "@/lib/session";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const me = await requireUser();

  const settingRows = db.select().from(tables.settings).all();
  const settings = Object.fromEntries(settingRows.map((r) => [r.key, r.value]));

  const users = db
    .select({
      id: tables.users.id,
      username: tables.users.username,
      displayName: tables.users.displayName,
      active: tables.users.active,
    })
    .from(tables.users)
    .orderBy(asc(tables.users.id))
    .all();

  const meRow = db.select().from(tables.users).where(eq(tables.users.id, me.userId)).get();
  const myPrefs = {
    notifyNewVisit: meRow?.notifyNewVisit ?? true,
    notifySound: meRow?.notifySound ?? true,
  };

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-4 text-lg font-bold text-teal-900">ตั้งค่า</h1>
      <SettingsClient settings={settings} users={users} myUserId={me.userId} myPrefs={myPrefs} />
    </div>
  );
}
