import type { ReactNode } from "react";
import { ClinicLogo } from "./clinic-logo";

/**
 * Official A5 document frame shared by all printed papers: double-rule
 * border, emblem letterhead, title band, faint watermark, signature block.
 */
export function PrintDoc({
  clinicName,
  clinicAddress,
  clinicPhone,
  title,
  titleEn,
  meta,
  children,
  signature,
  footnote,
}: {
  clinicName: string;
  clinicAddress?: string;
  clinicPhone?: string;
  title: string;
  titleEn?: string;
  meta?: { label: string; value: string }[];
  children: ReactNode;
  signature?: { role: string; name?: string };
  footnote?: ReactNode;
}) {
  return (
    <div className="print-doc relative overflow-hidden border-2 border-teal-900 bg-white p-1 font-print text-[12px] leading-relaxed text-ink shadow-sm print:shadow-none">
      <div className="relative flex min-h-[150mm] flex-col border border-teal-900/60 px-6 py-5">
        {/* watermark */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.045]" aria-hidden>
          <ClinicLogo size={300} />
        </div>

        {/* letterhead */}
        <header className="relative flex items-center gap-3">
          <ClinicLogo size={52} className="shrink-0" />
          <div className="min-w-0">
            <p className="text-lg font-bold text-teal-900">{clinicName}</p>
            {clinicAddress && <p className="text-[11px] text-ink-soft">{clinicAddress}</p>}
            {clinicPhone && <p className="text-[11px] text-ink-soft">โทร. {clinicPhone}</p>}
          </div>
        </header>

        <div className="relative mt-2.5 mb-3 border-b-[3px] border-double border-[#c8a24a]" />

        {/* title band */}
        <div className="relative mb-1 text-center">
          <h1 className="text-base font-bold tracking-wide text-teal-900">{title}</h1>
          {titleEn && <p className="text-[11px] tracking-[0.25em] text-ink-soft uppercase">{titleEn}</p>}
        </div>

        {meta && meta.length > 0 && (
          <div className="relative mb-3 flex justify-end gap-6 text-[12px]">
            {meta.map((m) => (
              <p key={m.label}>
                {m.label} <span className="font-semibold tabular-nums">{m.value}</span>
              </p>
            ))}
          </div>
        )}

        {/* body */}
        <div className="relative flex-1">{children}</div>

        {/* signature */}
        {signature && (
          <div className="relative mt-7 ml-auto w-52 text-center text-[12px]">
            <p>ลงชื่อ ...............................................</p>
            {signature.name && <p className="mt-1">( {signature.name} )</p>}
            <p className="text-ink-soft">{signature.role}</p>
          </div>
        )}

        {footnote && (
          <p className="relative mt-4 border-t border-line pt-2 text-[11px] text-ink-soft">{footnote}</p>
        )}
      </div>
    </div>
  );
}

/** Dotted-leader label/value pair used in document bodies. */
export function DocField({
  label,
  value,
  className,
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <p className={`flex items-baseline gap-2 ${className ?? ""}`}>
      <span className="shrink-0 text-ink-soft">{label}</span>
      <span className="min-w-0 flex-1 border-b border-dotted border-ink/40 px-1 font-medium">{value}</span>
    </p>
  );
}
