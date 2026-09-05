"use client";

import { CatalogMedallion } from "@/components/catalogs/CatalogMedallion";
import { getCreatureVisual } from "@/components/catalogs/catalog-visuals";
import type { CreatureData } from "@/lib/bestiaryData";
import { cn } from "@/lib/utils";

/// Медальйон, а не смуга: у корпусі 315 портретних артів, 161 горизонтальний і 153 квадратні —
/// спільної орієнтації немає, тож будь-яка витягнута форма ріже половину каталогу. Квадрат із
/// кадруванням від верху лишає впізнаваним і портрет, і панораму. Рамка — та сама, що в деталі.
export function CreatureMedallion({
  creature,
  visual,
}: {
  creature: Pick<CreatureData, "name" | "imageUrl">;
  visual: ReturnType<typeof getCreatureVisual>;
}) {
  const Icon = visual.icon;

  return (
    <CatalogMedallion
      src={creature.imageUrl}
      alt={creature.name}
      provenance="manual"
      fallback={
        <div className={cn("flex h-full w-full items-center justify-center", visual.iconWrap)}>
          <Icon className={cn("h-8 w-8", visual.iconColor)} />
        </div>
      }
    />
  );
}
