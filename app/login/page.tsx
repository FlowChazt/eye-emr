import { eq } from "drizzle-orm";
import { db, tables } from "@/db";
import { ClinicLogo } from "@/components/clinic-logo";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  const clinicName =
    db.select().from(tables.settings).where(eq(tables.settings.key, "clinic_name")).get()?.value ||
    "Eye Clinic";

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <ClinicLogo size={84} className="mx-auto mb-4 drop-shadow-sm" />
          <h1 className="text-2xl font-bold text-teal-900">{clinicName}</h1>
          <p className="mt-1 text-sm text-ink-soft">ระบบเวชระเบียนคลินิก</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
