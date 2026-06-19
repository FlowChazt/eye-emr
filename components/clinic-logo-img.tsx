/* eslint-disable @next/next/no-img-element */

// Intrinsic aspect ratios of the official logo assets (width / height).
const RATIO = {
  named: 1.066, // public/clinic-logo-named.png — emblem with the clinic name
  mark: 1.513, // public/clinic-logo.png — emblem only
} as const;

const SRC = {
  named: "/clinic-logo-named.png",
  mark: "/clinic-logo.png",
} as const;

/**
 * Official clinic logo as a raster image. `size` is the rendered height in px;
 * width follows the asset's intrinsic aspect ratio.
 *
 * variants:
 *  - "mark"  : emblem only — header, print letterhead, watermark
 *  - "named" : emblem with the clinic name — login screen
 */
export function ClinicLogoImg({
  size = 48,
  variant = "mark",
  className,
}: {
  size?: number;
  variant?: "mark" | "named";
  className?: string;
}) {
  const width = Math.round(size * RATIO[variant]);
  return (
    <img
      src={SRC[variant]}
      width={width}
      height={size}
      style={{ height: size, width }}
      alt="โลโก้คลินิก"
      className={className}
    />
  );
}
