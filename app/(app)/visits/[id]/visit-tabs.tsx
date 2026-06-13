"use client";

import { useState, type ReactNode } from "react";

/**
 * Tabs between today's record and the patient's past history. Both panels stay
 * mounted (hidden via CSS) so unsaved form input survives switching back and
 * forth.
 */
export function VisitTabs({
  record,
  history,
  historyCount,
}: {
  record: ReactNode;
  history: ReactNode;
  historyCount: number;
}) {
  const [tab, setTab] = useState<"record" | "history">("record");

  const tabClass = (active: boolean) =>
    `rounded-lg px-4 py-2 text-sm font-semibold transition ${
      active ? "bg-teal-700 text-white shadow-sm" : "text-ink-soft hover:bg-teal-50 hover:text-teal-800"
    }`;

  return (
    <div>
      <div role="tablist" className="mb-4 inline-flex gap-1 rounded-xl border border-line bg-paper p-1 shadow-sm">
        <button role="tab" aria-selected={tab === "record"} onClick={() => setTab("record")} className={tabClass(tab === "record")}>
          การตรวจครั้งนี้
        </button>
        <button role="tab" aria-selected={tab === "history"} onClick={() => setTab("history")} className={tabClass(tab === "history")}>
          ประวัติเดิม ({historyCount})
        </button>
      </div>

      <div hidden={tab !== "record"} className="space-y-5">
        {record}
      </div>
      <div hidden={tab !== "history"} className="space-y-5">
        {history}
      </div>
    </div>
  );
}
