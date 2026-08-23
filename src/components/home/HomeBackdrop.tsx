import type { CSSProperties } from "react";

export type HomeBackdropVariant = "obsidian" | "ember" | "slate";

/// The blue mesh painted by the root layout was rejected by the owner (KR13.5 §12). This layer
/// sits above it and repaints the home screens only — no other route changes colour.
/// `slate` reproduces the rejected look so the options can be compared side by side.
const BACKDROP_VARIANTS: Record<HomeBackdropVariant, CSSProperties> = {
  obsidian: {
    backgroundColor: "#09080d",
    backgroundImage: [
      "radial-gradient(90% 55% at 50% -10%, rgba(124, 96, 180, 0.26), transparent 65%)",
      "radial-gradient(70% 45% at 50% 112%, rgba(150, 92, 70, 0.16), transparent 70%)",
    ].join(", "),
  },
  ember: {
    backgroundColor: "#0d0a09",
    backgroundImage: [
      "radial-gradient(85% 50% at 50% -8%, rgba(190, 138, 84, 0.22), transparent 66%)",
      "radial-gradient(70% 45% at 50% 110%, rgba(120, 72, 52, 0.2), transparent 70%)",
    ].join(", "),
  },
  slate: {
    backgroundColor: "#020617",
    backgroundImage: [
      "radial-gradient(90% 55% at 20% -10%, rgba(49, 46, 129, 0.55), transparent 65%)",
      "radial-gradient(80% 50% at 80% -5%, rgba(59, 7, 100, 0.45), transparent 70%)",
    ].join(", "),
  },
};

const VIGNETTE: CSSProperties = {
  backgroundImage:
    "radial-gradient(120% 120% at 50% 50%, transparent 45%, rgba(0, 0, 0, 0.55) 100%)",
};

export const HOME_BACKDROP: HomeBackdropVariant = "obsidian";

export function HomeBackdrop({ variant = HOME_BACKDROP }: { variant?: HomeBackdropVariant }) {
  return (
    <div
      aria-hidden="true"
      style={BACKDROP_VARIANTS[variant]}
      className="pointer-events-none fixed inset-0 -z-[5]"
    >
      <div className="absolute inset-0" style={VIGNETTE} />
    </div>
  );
}
