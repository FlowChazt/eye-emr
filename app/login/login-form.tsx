"use client";

import { useActionState } from "react";
import { login } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, null);

  return (
    <form action={action} className="rounded-2xl border border-line bg-paper p-6 shadow-sm">
      <label className="mb-4 block">
        <span className="mb-1 block text-sm font-medium">ชื่อผู้ใช้</span>
        <input
          name="username"
          required
          autoFocus
          autoComplete="username"
          className="w-full rounded-lg border border-line bg-cream px-3 py-2 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-200"
        />
      </label>
      <label className="mb-5 block">
        <span className="mb-1 block text-sm font-medium">รหัสผ่าน</span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full rounded-lg border border-line bg-cream px-3 py-2 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-200"
        />
      </label>

      {state?.error && (
        <p className="mb-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-teal-700 py-2.5 font-semibold text-white transition hover:bg-teal-800 disabled:opacity-50"
      >
        {pending ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
      </button>
    </form>
  );
}
