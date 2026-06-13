"use client";

import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "./icons";

/**
 * In-page back control so the user doesn't reach for the browser button.
 * Uses history.back() when there's somewhere to go, otherwise falls back to a
 * sensible href (defaults to the worklist).
 */
export function BackButton({
  fallbackHref = "/",
  label = "กลับ",
}: {
  fallbackHref?: string;
  label?: string;
}) {
  const router = useRouter();

  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) router.back();
    else router.push(fallbackHref);
  }

  return (
    <button
      type="button"
      onClick={goBack}
      className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft transition hover:text-teal-800"
    >
      <ArrowLeftIcon size={16} />
      {label}
    </button>
  );
}
