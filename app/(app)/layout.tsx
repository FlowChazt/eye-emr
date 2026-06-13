import Link from "next/link";
import { eq } from "drizzle-orm";
import { db, tables } from "@/db";
import { requireUser } from "@/lib/session";
import { logout } from "@/app/login/actions";
import { NavLink } from "@/components/nav-link";
import { ClinicLogo } from "@/components/clinic-logo";

const NAV = [
  { href: "/", label: "คลินิก", icon: "🏥" },
  { href: "/patients", label: "ผู้ป่วย", icon: "🪪" },
  { href: "/stock", label: "สต็อกยา", icon: "💊" },
  { href: "/reports", label: "รายงาน", icon: "📊" },
  { href: "/settings", label: "ตั้งค่า", icon: "⚙️" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const clinicName =
    db.select().from(tables.settings).where(eq(tables.settings.key, "clinic_name")).get()?.value ||
    "Eye Clinic";

  return (
    <div className="flex min-h-screen">
      <aside className="no-print sticky top-0 flex h-screen w-56 shrink-0 flex-col border-r border-teal-800 bg-teal-900 text-teal-100">
        <Link href="/" className="flex items-center gap-3 px-5 py-5">
          <ClinicLogo size={40} variant="dark" className="shrink-0" />
          <span className="text-base leading-tight font-bold text-white">{clinicName}</span>
        </Link>

        <nav className="flex-1 space-y-1 px-3">
          {NAV.map((item) => (
            <NavLink key={item.href} href={item.href} icon={item.icon} label={item.label} />
          ))}
        </nav>

        <div className="border-t border-teal-800 p-4">
          <p className="mb-2 truncate text-sm text-teal-200">{user.displayName}</p>
          <form action={logout}>
            <button className="text-sm text-teal-300 underline-offset-2 hover:text-white hover:underline">
              ออกจากระบบ
            </button>
          </form>
        </div>
      </aside>

      <main className="bg-grain min-h-screen flex-1 p-6 lg:p-8">{children}</main>
    </div>
  );
}
