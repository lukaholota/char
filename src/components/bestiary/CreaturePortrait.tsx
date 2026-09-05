"use client";

import { FramedIllustration } from "@/components/ui/FramedIllustration";
import type { CreatureData } from "@/lib/bestiaryData";

const FALLBACK_RATIO = 3 / 4;

/// Рамка бере пропорції самої ілюстрації, а не навпаки: арти aidedd — від майже квадратних до
/// вузьких портретів, і будь-яке спільне співвідношення або ріже істоту, або лишає поля. Стеля
/// висоти жива в CSS (`--creature-portrait-h`), тому в модалці телефона портрет не зʼїдає екран.
export function CreaturePortrait({ creature }: { creature: CreatureData }) {
  if (!creature.imageUrl) return null;

  const ratio =
    creature.imageWidth && creature.imageHeight
      ? creature.imageWidth / creature.imageHeight
      : FALLBACK_RATIO;

  return (
    <div className="mt-4 flex justify-center">
      <div
        className="[--creature-portrait-h:38vh] sm:[--creature-portrait-h:400px]"
        style={{
          width: `min(100%, calc(var(--creature-portrait-h) * ${ratio}))`,
          aspectRatio: ratio,
        }}
      >
        <FramedIllustration
          src={creature.imageUrl}
          alt={creature.name}
          provenance="manual"
          sizes="(max-width: 1024px) 90vw, 420px"
          chamfer="md"
          vignette="lg"
        />
      </div>
    </div>
  );
}
