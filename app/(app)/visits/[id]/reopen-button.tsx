"use client";

import { useState, useTransition } from "react";
import { reopenVisit } from "../actions";

export function ReopenButton({ visitId }: { visitId: number }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    if (!confirm("เปิด visit นี้ใหม่? ใบเสร็จเดิมจะถูกยกเลิกและคืนสต็อกยา")) return;
    setError(null);
    startTransition(async () => {
      const res = await reopenVisit(visitId);
      if (res && "error" in res && res.error) setError(res.error);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button onClick={onClick} disabled={pending} className="btn-ghost">
        {pending ? "กำลังเปิด…" : "เปิด visit อีกครั้ง"}
      </button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
