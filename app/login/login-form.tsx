"use client";

import { useActionState } from "react";
import { login } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, null);

  return (
    <form action={action} className="card p-5 shadow-sm">
      <label className="mb-4 block">
        <span className="mb-1 block text-sm font-medium">ชื่อผู้ใช้</span>
        <input name="username" required autoFocus autoComplete="username" className="field px-3 py-2" />
      </label>
      <label className="mb-5 block">
        <span className="mb-1 block text-sm font-medium">รหัสผ่าน</span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="field px-3 py-2"
        />
      </label>

      {state?.error && (
        <p className="mb-4 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{state.error}</p>
      )}

      <button type="submit" disabled={pending} className="btn-primary w-full py-2.5">
        {pending ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
      </button>
    </form>
  );
}
