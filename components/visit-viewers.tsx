"use client";

import { useVisitViewers } from "./realtime-provider";

/**
 * Awareness cue (not a hard lock): when another logged-in user has this same
 * visit open, show who, so the screener and doctor don't unknowingly edit the
 * same record at once. Driven by live SSE presence.
 */
export function VisitViewers({ visitId }: { visitId: number }) {
  const others = useVisitViewers(visitId);
  if (others.length === 0) return null;

  // de-dup (same user could have two tabs open)
  const names = Array.from(new Set(others));

  return (
    <div className="no-print mb-3 flex items-center gap-2 rounded-md border border-amber-strong/30 bg-amber-soft px-3 py-1.5 text-sm text-amber-strong">
      <span aria-hidden>👁</span>
      <span>กำลังดูโดย {names.join(", ")}</span>
    </div>
  );
}
