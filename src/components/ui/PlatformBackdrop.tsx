import { PLATFORM_BACKDROP } from "@/styles/palette";

/// Was `HomeBackdrop`, local to the two home screens. KR15.1 §1: the same backdrop paints every
/// route, so it lives in the root layout now. The blue mesh it replaced was rejected by the owner
/// (KR13.5 §12).
export function PlatformBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      style={{
        backgroundColor: PLATFORM_BACKDROP.base,
        backgroundImage: PLATFORM_BACKDROP.glow,
      }}
    >
      <div className="absolute inset-0" style={{ backgroundImage: PLATFORM_BACKDROP.vignette }} />
      <GrainOverlay />
    </div>
  );
}

function GrainOverlay() {
  return (
    <svg className="absolute inset-0 h-full w-full opacity-[0.05] mix-blend-overlay">
      <filter id="rpg-noise">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#rpg-noise)" />
    </svg>
  );
}
