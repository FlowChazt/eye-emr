import { ClinicLogoImg } from "@/components/clinic-logo-img";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <ClinicLogoImg variant="named" size={260} className="mx-auto mb-3 drop-shadow-sm" />
          <p className="text-sm text-ink-soft">ระบบเวชระเบียนคลินิก</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
