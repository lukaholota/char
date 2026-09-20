"use client";

import { ContentImage, useIsArtHidden } from "@/components/no-ai/ContentImage";
import { SpellIcon } from "@/components/spells/SpellIcon";
import type { ItemVisual } from "@/components/catalogs/catalog-visuals";
import type { OmniSearchItem } from "@/lib/omniSearchData";
import { cn } from "@/lib/utils";

const FRAME = "h-8 w-8 shrink-0 rounded-lg";

/// Квадрат 32 px ліворуч у рядку видачі. Де корпус має власну картинку — малюється вона, і в тій
/// самій формі, що в каталозі: клітинка спрайта в заклинань, круглий токен або кадрований портрет
/// в істот. Немає картинки, немає режиму «без ШІ» — лишається кольорова іконка категорії.
export function OmniSearchItemArt({ item, visual }: { item: OmniSearchItem; visual: ItemVisual }) {
  const art = item.art;

  if (art?.kind === "spell") {
    return <SpellIcon engName={art.engName} school={item.visualKey} className={FRAME} />;
  }

  if (art?.kind === "creature") {
    return <CreatureThumbnail art={art} title={item.title} visual={visual} />;
  }

  return <CategoryIcon visual={visual} />;
}

function CreatureThumbnail({
  art,
  title,
  visual,
}: {
  art: Extract<NonNullable<OmniSearchItem["art"]>, { kind: "creature" }>;
  title: string;
  visual: ItemVisual;
}) {
  const isHidden = useIsArtHidden(art.imageUrl, "manual");
  if (isHidden) return <CategoryIcon visual={visual} />;

  /// Р48: токен 5etools уже кругла картина у власному кільці — ні рамки, ні кадрування.
  const isRoundToken = art.imageShape === "round";

  return (
    <div
      className={cn(
        "relative overflow-hidden",
        FRAME,
        isRoundToken ? "" : "border border-white/10 bg-slate-950/40"
      )}
    >
      <ContentImage
        src={art.imageUrl}
        alt=""
        provenance="manual"
        fill
        sizes="32px"
        loading="lazy"
        title={title}
        className={isRoundToken ? "object-contain" : "object-cover object-top"}
      />
    </div>
  );
}

function CategoryIcon({ visual }: { visual: ItemVisual }) {
  const Icon = visual.icon;

  return (
    <div className={cn("flex items-center justify-center border", FRAME, visual.iconWrap)}>
      <Icon className={cn("h-4 w-4", visual.iconColor)} />
    </div>
  );
}
