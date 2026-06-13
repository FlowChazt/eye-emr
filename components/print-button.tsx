"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-lg bg-teal-700 px-4 py-2 font-semibold text-white hover:bg-teal-800"
    >
      🖨️ พิมพ์
    </button>
  );
}
