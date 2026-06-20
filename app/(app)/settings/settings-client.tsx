"use client";

import { useActionState, useState, useTransition } from "react";
import { changePassword, createUser, saveClinicInfo, setUserActive } from "./actions";
import { setNotifyPrefs } from "../visits/actions";

const field = "field";

type User = { id: number; username: string; displayName: string; active: boolean };

function StatusLine({ state }: { state: { error?: string; ok?: boolean } | null }) {
  if (!state) return null;
  if (state.error)
    return <p className="mt-3 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{state.error}</p>;
  if (state.ok)
    return <p className="mt-3 rounded-md bg-teal-50 px-3 py-2 text-sm text-teal-800">บันทึกแล้ว ✓</p>;
  return null;
}

export function SettingsClient({
  settings,
  users,
  myUserId,
  myPrefs,
}: {
  settings: Record<string, string>;
  users: User[];
  myUserId: number;
  myPrefs: { notifyNewVisit: boolean; notifySound: boolean };
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

  const [notifyNewVisit, setNotifyNewVisit] = useState(myPrefs.notifyNewVisit);
  const [notifySound, setNotifySound] = useState(myPrefs.notifySound);
  function saveNotify(next: { notifyNewVisit: boolean; notifySound: boolean }) {
    startToggle(async () => void (await setNotifyPrefs(next)));
  }

  return (
    <div className="space-y-5">
      {/* realtime notifications (per-user) */}
      <div className="card p-4">
        <h2 className="mb-0.5 text-sm font-semibold tracking-wide text-ink-soft uppercase">การแจ้งเตือน</h2>
        <p className="mb-3 text-xs text-ink-soft">เฉพาะบัญชีนี้ — รายการคิวจะอัปเดตอัตโนมัติเสมอ</p>
        <label className="flex cursor-pointer items-center gap-2 py-1.5 text-sm text-ink-soft">
          <input
            type="checkbox"
            checked={notifyNewVisit}
            onChange={(e) => {
              const v = e.target.checked;
              setNotifyNewVisit(v);
              saveNotify({ notifyNewVisit: v, notifySound });
            }}
            className="size-4 accent-teal-700"
          />
          แจ้งเตือน (pop-up) เมื่อมีผู้ป่วยใหม่เข้าคิว
        </label>
        <label className="flex cursor-pointer items-center gap-2 py-1.5 text-sm text-ink-soft data-[off=true]:opacity-50" data-off={!notifyNewVisit}>
          <input
            type="checkbox"
            checked={notifySound}
            disabled={!notifyNewVisit}
            onChange={(e) => {
              const v = e.target.checked;
              setNotifySound(v);
              saveNotify({ notifyNewVisit, notifySound: v });
            }}
            className="size-4 accent-teal-700"
          />
          เล่นเสียงเตือนพร้อม pop-up
        </label>
      </div>

      {/* clinic info */}
      <form action={clinicAction} className="card p-4">
        <h2 className="mb-0.5 text-sm font-semibold tracking-wide text-ink-soft uppercase">ข้อมูลคลินิก</h2>
        <p className="mb-3 text-xs text-ink-soft">แสดงบนหัวใบเสร็จรับเงิน</p>
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-soft">ชื่อคลินิก</span>
            <input name="clinic_name" defaultValue={settings.clinic_name ?? ""} className={field} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-soft">ที่อยู่</span>
            <input name="clinic_address" defaultValue={settings.clinic_address ?? ""} className={field} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-soft">เบอร์โทร</span>
            <input name="clinic_phone" defaultValue={settings.clinic_phone ?? ""} className={field} />
          </label>
        </div>
        <StatusLine state={clinicState} />
        <button disabled={clinicPending} className="btn-primary mt-4 px-5 py-2">
          บันทึก
        </button>
      </form>

      {/* users */}
      <div className="card p-4">
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-ink-soft uppercase">ผู้ใช้งานระบบ</h2>
        <ul className="mb-4 divide-y divide-line-soft">
          {users.map((u) => (
            <li key={u.id} className="flex items-center justify-between py-2.5">
              <div>
                <span className="font-medium">{u.displayName}</span>
                <span className="ml-2 text-sm text-ink-soft">@{u.username}</span>
                {u.id === myUserId && (
                  <span className="chip ml-2 bg-teal-100 text-teal-800">คุณ</span>
                )}
                {!u.active && (
                  <span className="chip ml-2 bg-line/60 text-ink-soft">ปิดใช้งาน</span>
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

        <form action={userAction} className="rounded-md border border-line-soft bg-cream p-3">
          <p className="mb-3 text-xs font-semibold tracking-wide text-ink-soft uppercase">เพิ่มผู้ใช้ใหม่</p>
          <div className="grid grid-cols-3 gap-3">
            <input name="username" required placeholder="ชื่อผู้ใช้ (a-z)" className={field} />
            <input name="displayName" required placeholder="ชื่อที่แสดง" className={field} />
            <input name="password" type="password" required placeholder="รหัสผ่าน (6+ ตัว)" className={field} />
          </div>
          <StatusLine state={userState} />
          <button disabled={userPending} className="btn-primary mt-3">
            เพิ่มผู้ใช้
          </button>
        </form>
      </div>

      {/* change password */}
      <form action={pwAction} className="card p-4">
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-ink-soft uppercase">เปลี่ยนรหัสผ่านของฉัน</h2>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-soft">รหัสผ่านปัจจุบัน</span>
            <input name="current" type="password" required className={field} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-soft">รหัสผ่านใหม่</span>
            <input name="next" type="password" required className={field} />
          </label>
        </div>
        <StatusLine state={pwState} />
        <button disabled={pwPending} className="btn-primary mt-4 px-5 py-2">
          เปลี่ยนรหัสผ่าน
        </button>
      </form>
    </div>
  );
}
