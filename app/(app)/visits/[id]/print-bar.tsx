"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { setAutoPrintOnClose } from "../actions";
import { PrintIcon } from "@/components/icons";

type DocKind = "receipt" | "appointment" | "labels";

const LABEL: Record<DocKind, string> = {
  receipt: "พิมพ์ใบเสร็จ",
  appointment: "พิมพ์ใบนัด",
  labels: "พิมพ์ฉลากยา",
};

/**
 * Bottom-of-visit print bar. Each button prints its document via a hidden
 * iframe (one click → the OS print dialog, no preview page). The toggle is a
 * per-user preference that makes closing a visit auto-print everything.
 */
export function PrintBar({
  visitId,
  available,
  autoPrintOnClose,
  printAllOnMount,
}: {
  visitId: number;
  available: DocKind[];
  autoPrintOnClose: boolean;
  printAllOnMount: boolean;
}) {
  const router = useRouter();
  const [auto, setAuto] = useState(autoPrintOnClose);
  const [printing, setPrinting] = useState(false);
  const firedRef = useRef(false);

  // One print job = one OS dialog (one iframe). Resolves when printing finishes.
  function printJob(docs: DocKind[]): Promise<void> {
    return new Promise((resolve) => {
      if (docs.length === 0) return resolve();
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.setAttribute("aria-hidden", "true");
      iframe.src = `/visits/${visitId}/print?docs=${docs.join(",")}`;

      let done = false;
      const cleanup = () => {
        if (done) return;
        done = true;
        iframe.remove();
        resolve();
      };

      iframe.onload = () => {
        const w = iframe.contentWindow;
        if (!w) return cleanup();
        w.onafterprint = cleanup;
        // give the browser a tick to lay out @page sizes before printing
        setTimeout(() => {
          try {
            w.focus();
            w.print();
          } catch {
            cleanup();
          }
        }, 150);
        // fallback in case onafterprint never fires (some browsers)
        setTimeout(cleanup, 60000);
      };

      document.body.appendChild(iframe);
    });
  }

  // Print as separate jobs: regular-paper docs (receipt/appointment) and the
  // sticker labels go to different paper, so they get their own print dialogs.
  async function printDocs(docs: DocKind[]) {
    setPrinting(true);
    const paper = docs.filter((d) => d !== "labels");
    const stickers = docs.filter((d) => d === "labels");
    for (const group of [paper, stickers]) {
      if (group.length) await printJob(group);
    }
    setPrinting(false);
  }

  // Auto-print everything right after the visit was closed (if the user opted in).
  useEffect(() => {
    if (!printAllOnMount || firedRef.current || available.length === 0) return;
    firedRef.current = true;
    void printDocs(available);
    router.replace(`/visits/${visitId}`); // drop ?printAll so a refresh won't reprint
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onToggle(next: boolean) {
    setAuto(next);
    void setAutoPrintOnClose(next);
  }

  if (available.length === 0) {
    return (
      <section className="card flex items-center gap-3 p-4">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-soft">
          <input type="checkbox" checked={auto} onChange={(e) => onToggle(e.target.checked)} className="size-4 accent-teal-700" />
          พิมพ์เอกสารทั้งหมดอัตโนมัติเมื่อปิด visit
        </label>
      </section>
    );
  }

  return (
    <section className="card p-4">
      <h2 className="mb-3 text-sm font-semibold tracking-wide text-ink-soft uppercase">พิมพ์เอกสาร</h2>
      <div className="flex flex-wrap items-center gap-2">
        {available.map((d) => (
          <button key={d} onClick={() => void printDocs([d])} disabled={printing} className="btn-ghost">
            <PrintIcon size={16} /> {LABEL[d]}
          </button>
        ))}
        {available.length > 1 && (
          <button onClick={() => void printDocs(available)} disabled={printing} className="btn-primary px-4 py-2">
            <PrintIcon size={16} /> พิมพ์ทั้งหมด
          </button>
        )}
        {printing && <span className="text-xs text-ink-soft">กำลังเตรียมพิมพ์…</span>}
      </div>

      <label className="mt-3 flex cursor-pointer items-center gap-2 border-t border-line pt-3 text-sm text-ink-soft">
        <input type="checkbox" checked={auto} onChange={(e) => onToggle(e.target.checked)} className="size-4 accent-teal-700" />
        พิมพ์เอกสารทั้งหมดอัตโนมัติเมื่อปิด visit
      </label>
    </section>
  );
}
