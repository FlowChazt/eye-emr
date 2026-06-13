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
    `relative -mb-px px-1 py-2.5 text-sm font-semibold transition ${
      active
        ? "text-teal-900 after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-full after:bg-teal-700"
        : "text-ink-soft hover:text-teal-800"
    }`;

  return (
    <div>
      <div role="tablist" className="mb-4 flex gap-5 border-b border-line">
        <button role="tab" aria-selected={tab === "record"} onClick={() => setTab("record")} className={tabClass(tab === "record")}>
          การตรวจครั้งนี้
        </button>
        <button role="tab" aria-selected={tab === "history"} onClick={() => setTab("history")} className={tabClass(tab === "history")}>
          ประวัติเดิม ({historyCount})
        </button>
      </div>

      <div hidden={tab !== "record"} className="space-y-4">
        {record}
      </div>
      <div hidden={tab !== "history"} className="space-y-4">
        {history}
      </div>
    </div>
  );
}
