import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

export type ChamferSize = "sm" | "md" | "lg";

/// Owner's spec: the diagonal cut is 10–16 px "depending on card size". Three steps, not a free
/// number, so the platform cannot drift into a dozen slightly different frames.
const CHAMFER_PX: Record<ChamferSize, number> = { sm: 10, md: 13, lg: 16 };

export type FrameWeight = "regular" | "bold";

/// The trim of a card that has to carry the screen is thicker — same frame, more presence.
const TRIM_WIDTH: Record<FrameWeight, number> = { regular: 1.5, bold: 3 };
const BEVEL_WIDTH: Record<FrameWeight, number> = { regular: 1, bold: 1.5 };
const FOCUS_RING_WIDTH = 3;
const FOCUS_RING_COLOR = "rgb(196 181 253)";
const HIGHLIGHT_RING_WIDTH = 2;

/// 145deg runs top-left → bottom-right, so the lit silver lands on the top and left edges and the
/// unlit graphite on the bottom and right ones. Static by the owner's spec: nothing here may
/// follow the cursor or compute a light direction.
const METALLIC_TRIM =
  "linear-gradient(145deg, rgba(236,241,248,0.88) 0%, rgba(186,196,212,0.62) 16%, rgba(214,222,235,0.75) 30%, rgba(126,138,158,0.45) 48%, rgba(84,94,112,0.5) 66%, rgba(150,161,180,0.4) 82%, rgba(58,66,80,0.62) 100%)";

/// The second, much fainter line just inside the trim — this is what reads as a bevel rather than
/// as a flat outline.
const INNER_BEVEL =
  "linear-gradient(145deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.05) 34%, rgba(0,0,0,0) 58%, rgba(0,0,0,0.4) 100%)";

const CONTENT_BACKGROUND = "#0b0a11";

/// `box-shadow` малюється по прямокутному боксу, а не по `clip-path`, і за фаскою вилазив чорний
/// кут. `drop-shadow` іде за силуетом уже обрізаних дітей, тому тінь повторює зрізи.
const AMBIENT_SHADOW = "drop-shadow(0 10px 10px rgba(0,0,0,0.55))";

/// Сяйво — теж не `box-shadow`: це розмитий шар тієї ж фаски позаду рамки. Розмиття мусить бути
/// на зовнішньому елементі, бо `clip-path` ріже вже відфільтрований результат і зʼїв би ореол.
const GLOW_SPREAD = 5;
const GLOW_BLUR = 15;

type OrnateFrameProps = {
  chamfer?: ChamferSize;
  weight?: FrameWeight;
  /// Колір постійного канта навколо рамки — стан «обрано». Своєї палітри примітив не має:
  /// редакція чи екран передають свій акцент, бо `clip-path` ріже звичайний `ring`.
  highlightColor?: string | null;
  /// Сяйво тієї ж фаски навколо обраної картки.
  glowColor?: string | null;
  /// Те саме сяйво, але тільки поки курсор на картці — вмикає найближчий батьківський `group`.
  hoverGlowColor?: string | null;
  className?: string;
  children: ReactNode;
};

export function OrnateFrame({
  chamfer = "md",
  weight = "regular",
  highlightColor,
  glowColor,
  hoverGlowColor,
  className,
  children,
}: OrnateFrameProps) {
  const notch = CHAMFER_PX[chamfer];
  const trim = TRIM_WIDTH[weight];
  const bevel = BEVEL_WIDTH[weight];

  return (
    <div className={cn("group/frame relative h-full w-full", className)}>
      {glowColor ? <ChamferGlow notch={notch} color={glowColor} /> : null}
      {hoverGlowColor ? (
        <ChamferGlow
          notch={notch}
          color={hoverGlowColor}
          className="opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        />
      ) : null}
      {highlightColor ? (
        <ChamferRing notch={notch} width={HIGHLIGHT_RING_WIDTH} color={highlightColor} />
      ) : null}
      <FocusRing notch={notch} />
      <div style={{ filter: AMBIENT_SHADOW }} className="relative h-full w-full">
        <div
          style={{ ...buildChamferStyle(notch), backgroundImage: METALLIC_TRIM, padding: trim }}
          className="relative h-full w-full"
        >
          <div
            style={{
              ...buildChamferStyle(notch - trim),
              backgroundImage: INNER_BEVEL,
              padding: bevel,
            }}
            className="relative h-full w-full"
          >
            <div
              style={{
                ...buildChamferStyle(notch - trim - bevel),
                backgroundColor: CONTENT_BACKGROUND,
              }}
              className="relative h-full w-full overflow-hidden"
            >
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/// `clip-path` cuts the outline and the focus ring together with the corners, so the ring cannot
/// live on any clipped element. It sits behind the frame instead, wider by its own thickness, and
/// the opaque frame covers everything but that edge.
function FocusRing({ notch }: { notch: number }) {
  return (
    <ChamferRing
      notch={notch}
      width={FOCUS_RING_WIDTH}
      color={FOCUS_RING_COLOR}
      className="opacity-0 transition-opacity duration-150 group-focus-visible:opacity-100 group-has-[:focus-visible]/frame:opacity-100"
    />
  );
}

function ChamferRing({
  notch,
  width,
  color,
  className,
}: {
  notch: number;
  width: number;
  color: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      style={{
        ...buildChamferStyle(notch + width),
        inset: -width,
        backgroundColor: color,
      }}
      className={cn("pointer-events-none absolute", className)}
    />
  );
}

function ChamferGlow({
  notch,
  color,
  className,
}: {
  notch: number;
  color: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      style={{ inset: -GLOW_SPREAD, filter: `blur(${GLOW_BLUR}px)` }}
      className={cn("pointer-events-none absolute", className)}
    >
      <span
        style={{
          ...buildChamferStyle(notch + GLOW_SPREAD),
          backgroundColor: color,
        }}
        className="absolute inset-0"
      />
    </span>
  );
}

function buildChamferStyle(notch: number): CSSProperties {
  const corner = `${Math.max(notch, 0)}px`;
  const inset = `calc(100% - ${corner})`;

  return {
    clipPath: `polygon(${corner} 0, ${inset} 0, 100% ${corner}, 100% ${inset}, ${inset} 100%, ${corner} 100%, 0 ${inset}, 0 ${corner})`,
  };
}
