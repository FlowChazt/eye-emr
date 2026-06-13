import type { SVGProps } from "react";

/**
 * Minimal line-icon set (1.6px stroke, 24-grid) used across the app chrome.
 * Replaces the previous emoji navigation. Icons inherit `currentColor` and
 * default to 18px; pass `className`/`size` to adjust.
 */
type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 18, children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      {children}
    </svg>
  );
}

/** Worklist — clipboard with lines */
export function WorklistIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4.5h6a1 1 0 0 1 1 1V7H8V5.5a1 1 0 0 1 1-1Z" />
      <path d="M8.5 11h7M8.5 14.5h7M8.5 18h4" />
    </Svg>
  );
}

/** Patients — id card */
export function PatientsIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="8.5" cy="11" r="2" />
      <path d="M5.5 16c.4-1.6 1.6-2.5 3-2.5s2.6.9 3 2.5" />
      <path d="M14 9.5h4M14 12.5h4M14 15.5h2.5" />
    </Svg>
  );
}

/** Stock — pill / capsule */
export function StockIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3.5" y="9" width="17" height="6" rx="3" transform="rotate(-45 12 12)" />
      <path d="M9.5 9.5 14.5 14.5" />
    </Svg>
  );
}

/** Reports — bar chart */
export function ReportsIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 20h16" />
      <rect x="6" y="11" width="3" height="6" rx="0.5" />
      <rect x="11" y="7" width="3" height="10" rx="0.5" />
      <rect x="16" y="13" width="3" height="4" rx="0.5" />
    </Svg>
  );
}

/** Settings — gear */
export function SettingsIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2.5M12 18.5V21M21 12h-2.5M5.5 12H3M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8M18.4 18.4l-1.8-1.8M7.4 7.4 5.6 5.6" />
    </Svg>
  );
}

/** Search — magnifier */
export function SearchIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </Svg>
  );
}

/** Plus */
export function PlusIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

/** Printer */
export function PrintIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M7 9V4h10v5" />
      <rect x="4" y="9" width="16" height="7" rx="1.5" />
      <rect x="7" y="14" width="10" height="6" rx="1" />
      <path d="M17 12h.01" />
    </Svg>
  );
}

/** Alert triangle — for allergy/warning flags */
export function AlertIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 4 2.5 20h19L12 4Z" />
      <path d="M12 10v4M12 17h.01" />
    </Svg>
  );
}

/** Arrow left — back navigation */
export function ArrowLeftIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </Svg>
  );
}

/** Calendar — appointments */
export function CalendarIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="4" y="5" width="16" height="16" rx="2" />
      <path d="M4 9h16M8 3v4M16 3v4" />
    </Svg>
  );
}
