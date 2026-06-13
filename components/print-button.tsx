"use client";

import { PrintIcon } from "./icons";

export function PrintButton() {
  return (
    <button onClick={() => window.print()} className="btn-primary px-4 py-2">
      <PrintIcon size={16} /> พิมพ์
    </button>
  );
}
