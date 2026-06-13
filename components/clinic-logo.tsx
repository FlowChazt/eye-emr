const STOMACH_PATH =
  "M45 22 L45 37 C45.5 49 49 56 47 62 C45.5 66 41 67.5 36 67.5 L32.5 67.5 " +
  "C29 67.5 29 75.5 32.5 75.5 L40 75.5 C52 88 72 87 80.5 74 C88.5 61.5 86.5 43 75 34.5 " +
  "C68 29.5 58.5 29 53 33 L53 22 C53 18.5 45 18.5 45 22 Z";

const RUGAE = ["M58 42 C62 46.5 67 49 73 49.5", "M56 50 C59.5 54 64 56.3 69 57"];

/**
 * Clinic emblem: a stomach drawn in line-art inside a double-ring seal
 * (GI medicine), deep teal with a gold accent.
 *
 * variants:
 *  - "seal"  : full emblem, for light backgrounds (login, print headers)
 *  - "dark"  : full emblem inverted, for the teal sidebar
 *  - "mark"  : bare silhouette, for tiny sizes
 */
export function ClinicLogo({
  size = 64,
  variant = "seal",
  className,
}: {
  size?: number;
  variant?: "seal" | "dark" | "mark";
  className?: string;
}) {
  if (variant === "mark") {
    return (
      <svg width={size} height={size} viewBox="0 0 120 120" className={className} aria-hidden>
        <path d={STOMACH_PATH} fill="currentColor" />
      </svg>
    );
  }

  const dark = variant === "dark";
  const ink = dark ? "#f0faf8" : "#0a6358";
  const ring = dark ? "#f0faf8" : "#084d45";
  const gold = "#c8a24a";

  return (
    <svg width={size} height={size} viewBox="0 0 120 120" className={className} aria-hidden>
      <circle cx="60" cy="60" r="55" fill="none" stroke={ring} strokeWidth="2.5" />
      <circle cx="60" cy="60" r="49.5" fill="none" stroke={gold} strokeWidth="1.2" />
      <path d={STOMACH_PATH} fill="none" stroke={ink} strokeWidth="3.4" strokeLinejoin="round" />
      {RUGAE.map((d) => (
        <path key={d} d={d} fill="none" stroke={gold} strokeWidth="2.6" strokeLinecap="round" />
      ))}
    </svg>
  );
}
