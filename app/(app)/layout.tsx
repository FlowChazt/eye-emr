import Link from "next/link";
import { eq } from "drizzle-orm";
import { db, tables } from "@/db";
import { requireUser } from "@/lib/session";
import { logout } from "@/app/login/actions";
import { NavLink } from "@/components/nav-link";
import { GlobalSearch } from "@/components/global-search";
import { ClinicLogo } from "@/components/clinic-logo";
import {
  WorklistIcon,
  PatientsIcon,
  StockIcon,
  ReportsIcon,
  SettingsIcon,
} from "@/components/icons";

const NAV = [
  { href: "/", label: "งานวันนี้", icon: <WorklistIcon /> },
  { href: "/patients", label: "ผู้ป่วย", icon: <PatientsIcon /> },
  { href: "/stock", label: "สต็อกยา", icon: <StockIcon /> },
  { href: "/reports", label: "รายงาน", icon: <ReportsIcon /> },
  { href: "/settings", label: "ตั้งค่า", icon: <SettingsIcon /> },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const clinicName =
    db.select().from(tables.settings).where(eq(tables.settings.key, "clinic_name")).get()?.value ||
    "Eye Clinic";

  return (
    <div className="min-h-screen">
      <header className="no-print sticky top-0 z-30 border-b border-line bg-paper/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 lg:gap-5 lg:px-6">
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            <ClinicLogo size={30} className="shrink-0" />
            <span className="hidden text-[15px] leading-tight font-bold whitespace-nowrap text-teal-900 lg:inline">
              {clinicName}
            </span>
          </Link>

          <nav className="hidden shrink-0 items-center gap-5 md:flex">
            {NAV.map((item) => (
              <NavLink key={item.href} href={item.href} icon={item.icon} label={item.label} />
            ))}
          </nav>

          <div className="ml-auto flex min-w-0 items-center gap-3 lg:gap-4">
            <GlobalSearch />
            <div className="hidden shrink-0 items-center gap-3 sm:flex">
              <span className="whitespace-nowrap text-sm text-ink-soft">{user.displayName}</span>
              <form action={logout}>
                <button className="whitespace-nowrap text-sm font-medium text-ink-soft underline-offset-2 hover:text-teal-800 hover:underline">
                  ออกจากระบบ
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* compact nav for small screens */}
        <nav className="flex items-center gap-5 overflow-x-auto border-t border-line-soft px-4 md:hidden">
          {NAV.map((item) => (
            <NavLink key={item.href} href={item.href} icon={item.icon} label={item.label} />
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl p-4 lg:p-6">{children}</main>
    </div>
  );
}
