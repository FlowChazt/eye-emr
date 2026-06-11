"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({ href, icon, label }: { href: string; icon: string; label: string }) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-medium transition ${
        active ? "bg-teal-700 text-white shadow-sm" : "text-teal-200 hover:bg-teal-800 hover:text-white"
      }`}
    >
      <span aria-hidden>{icon}</span>
      {label}
    </Link>
  );
}
