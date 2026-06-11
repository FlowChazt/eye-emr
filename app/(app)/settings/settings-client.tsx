"use client";

import { useActionState, useTransition } from "react";
import { changePassword, createUser, saveClinicInfo, setUserActive } from "./actions";

const field =
  "w-full rounded-lg border border-line bg-cream px-3 py-2 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-200";

type User = { id: number; username: string; displayName: string; active: boolean };

function StatusLine({ state }: { state: { error?: string; ok?: boolean } | null }) {
  if (!state) return null;
  if (state.error)
    return <p className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{state.error}</p>;
  if (state.ok)
    return <p className="mt-3 rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-800">บันทึกแล้ว ✓</p>;
  return null;
}

export function SettingsClient({
  settings,
  users,
  myUserId,
}: {
  settings: Record<string, string>;
  users: User[];
  myUserId: number;
}) {
  const [clinicState, clinicAction, clinicPending] = useActionState(
    async (p: unknown, f: FormData) => saveClinicInfo(p, f),
    null,
  );
  const [userState, userAction, userPending] = useActionState(
    async (p: unknown, f: FormData) => createUser(p, f),
    null,
  );
  const [pwState, pwAction, pwPending] = useActionState(
    async (p: unknown, f: FormData) => changePassword(p, f),
    null,
  );
  const [, startToggle] = useTransition();

  return (
    <div className="space-y-6">
      {/* clinic info */}
      <form action={clinicAction} className="rounded-2xl border border-line bg-paper p-6 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold">ข้อมูลคลินิก</h2>
        <p className="mb-4 text-sm text-ink-soft">แสดงบนหัวใบเสร็จรับเงิน</p>
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium">ชื่อคลินิก</span>
            <input name="clinic_name" defaultValue={settings.clinic_name ?? ""} className={field} />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">ที่อยู่</span>
            <input name="clinic_address" defaultValue={settings.clinic_address ?? ""} className={field} />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">เบอร์โทร</span>
            <input name="clinic_phone" defaultValue={settings.clinic_phone ?? ""} className={field} />
          </label>
        </div>
        <StatusLine state={clinicState} />
        <button
          disabled={clinicPending}
          className="mt-4 rounded-lg bg-teal-700 px-5 py-2 font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
        >
          บันทึก
        </button>
      </form>

      {/* users */}
      <div className="rounded-2xl border border-line bg-paper p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">ผู้ใช้งานระบบ</h2>
        <ul className="mb-5 divide-y divide-line/60">
          {users.map((u) => (
            <li key={u.id} className="flex items-center justify-between py-2.5">
              <div>
                <span className="font-medium">{u.displayName}</span>
                <span className="ml-2 text-sm text-ink-soft">@{u.username}</span>
                {u.id === myUserId && (
                  <span className="ml-2 rounded bg-teal-100 px-1.5 py-0.5 text-xs text-teal-800">คุณ</span>
                )}
                {!u.active && (
                  <span className="ml-2 rounded bg-line/60 px-1.5 py-0.5 text-xs text-ink-soft">ปิดใช้งาน</span>
                )}
              </div>
              {u.id !== myUserId && (
                <button
                  onClick={() => startToggle(async () => void (await setUserActive(u.id, !u.active)))}
                  className="text-sm text-ink-soft hover:text-ink hover:underline"
                >
                  {u.active ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                </button>
              )}
            </li>
          ))}
        </ul>

        <form action={userAction} className="rounded-xl bg-cream p-4">
          <p className="mb-3 text-sm font-semibold">เพิ่มผู้ใช้ใหม่</p>
          <div className="grid grid-cols-3 gap-3">
            <input name="username" required placeholder="ชื่อผู้ใช้ (a-z)" className={field} />
            <input name="displayName" required placeholder="ชื่อที่แสดง" className={field} />
            <input name="password" type="password" required placeholder="รหัสผ่าน (6+ ตัว)" className={field} />
          </div>
          <StatusLine state={userState} />
          <button
            disabled={userPending}
            className="mt-3 rounded-lg bg-teal-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
          >
            เพิ่มผู้ใช้
          </button>
        </form>
      </div>

      {/* change password */}
      <form action={pwAction} className="rounded-2xl border border-line bg-paper p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">เปลี่ยนรหัสผ่านของฉัน</h2>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium">รหัสผ่านปัจจุบัน</span>
            <input name="current" type="password" required className={field} />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">รหัสผ่านใหม่</span>
            <input name="next" type="password" required className={field} />
          </label>
        </div>
        <StatusLine state={pwState} />
        <button
          disabled={pwPending}
          className="mt-4 rounded-lg bg-teal-700 px-5 py-2 font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
        >
          เปลี่ยนรหัสผ่าน
        </button>
      </form>
    </div>
  );
}
