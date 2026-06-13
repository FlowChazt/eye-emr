"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Horizontal top-bar nav item. Active route gets an ink label + a teal
 * underline indicator that sits flush with the bar's bottom border.
 */
export function NavLink({ href, icon, label }: { href: string; icon: ReactNode; label: string }) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={`relative flex shrink-0 items-center gap-2 px-1 py-3 text-sm font-medium whitespace-nowrap transition ${
        active ? "text-teal-900" : "text-ink-soft hover:text-teal-800"
      }`}
    >
      <span className={active ? "text-teal-700" : "text-ink-soft"}>{icon}</span>
      {label}
      {active && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-teal-700" />}
    </Link>
  );
}
