import { cn } from "@/lib/utils";

/// The owner's dragon (`/images/dragon.png`), brought to lucide's line weight (KR15.3 §5).
///
/// The art is 512 px of ~18 px line, so at the 24 px the navbar draws it the stroke lands at
/// ~0.8 px against lucide's 2 px — that is the "не такий жирний" the owner saw. A raster has no
/// stroke width to raise and the file is a fixed grey, so it also ignored the active colour every
/// neighbour picked up. Both fall out of painting the art as a mask over `currentColor` and then
/// growing the line with four zero-blur drop shadows, one per direction.
///
/// Redrawing the head as an SVG was tried first and rejected: a front-facing dragon at 24 px with
/// a 2 px stroke reads as an insect.
const SUPERSAMPLE = 4;

/// Growth per side, in the icon's own pixels: 0.8 + 2 × 0.33 ≈ 1.5, the weight the navbar's
/// lucide icons are set to. Meeting in the middle rather than dragging the dragon all the way to
/// 2 is deliberate: the art's own gaps are barely a pixel at 24 px, and a 2 px line closes them —
/// the head turns into a blob. The owner asked for one weight, not for a heavier one.
const GROWTH_PX = 0.33;

/// Dilating at the icon's own size beads the diagonals — the shadow of a 0.8 px line offset by
/// 0.6 px overlaps by a fraction of a pixel and the seams show. Doing it SUPERSAMPLE times larger
/// and scaling back down keeps every overlap whole.
const OFFSET = GROWTH_PX * SUPERSAMPLE;

const DILATE = [
  `drop-shadow(${OFFSET}px 0 0 currentColor)`,
  `drop-shadow(-${OFFSET}px 0 0 currentColor)`,
  `drop-shadow(0 ${OFFSET}px 0 currentColor)`,
  `drop-shadow(0 -${OFFSET}px 0 currentColor)`,
].join(" ");

const MASK = {
  backgroundColor: "currentColor",
  maskImage: "url(/images/dragon.png)",
  maskSize: "contain",
  maskRepeat: "no-repeat",
  maskPosition: "center",
  WebkitMaskImage: "url(/images/dragon.png)",
  WebkitMaskSize: "contain",
  WebkitMaskRepeat: "no-repeat",
  WebkitMaskPosition: "center",
} as const;

export function DragonIcon({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cn("relative inline-block overflow-hidden", className)}>
      <span
        className="absolute left-0 top-0 origin-top-left"
        style={{
          width: `${SUPERSAMPLE * 100}%`,
          height: `${SUPERSAMPLE * 100}%`,
          transform: `scale(${1 / SUPERSAMPLE})`,
          filter: DILATE,
        }}
      >
        {/* The mask sits on a child: CSS applies `filter` before `mask`, so a filter on the
            masked element would have its shadows cut away by the mask it is meant to grow. */}
        <span className="block h-full w-full" style={MASK} />
      </span>
    </span>
  );
}
