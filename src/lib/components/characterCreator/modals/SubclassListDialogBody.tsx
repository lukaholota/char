"use client";

import { Badge } from "@/components/ui/badge";
import { BranchCover } from "@/components/catalogs/reading/BranchCover";
import { getSubclassImagePath } from "@/lib/assets/image-manifest";
import { SubclassInfoModal } from "@/lib/components/characterCreator/modals/SubclassInfoModal";
import { translateValue } from "@/lib/components/characterCreator/infoUtils";
import type { SubclassCard } from "@/lib/logic/legacy-subclass-visibility";
import { stripToPlainText } from "@/lib/logic/plain-text";
import { sourceTranslations } from "@/lib/refs/translation";
import { constructorSubclassEntity } from "@/lib/optimization/bindings";
import type { ClassI } from "@/lib/types/model-types";

type ListedSubclass = SubclassCard & { description?: string | null; features?: unknown[] };

export function SubclassListDialogBody({
  current,
  legacy,
  isLoading,
  parentClass,
}: {
  current: readonly ListedSubclass[];
  legacy: readonly ListedSubclass[];
  isLoading: boolean;
  parentClass?: Pick<ClassI, "name" | "ruleset">;
}) {
  if (isLoading && current.length + legacy.length === 0) return <p className="text-sm text-slate-400">Завантаження підкласів…</p>;
  if (current.length + legacy.length === 0) return <p className="text-sm text-slate-400">Для цього класу підкласи ще не додані.</p>;

  return (
    <div className="space-y-3">
      <SubclassButtons subclasses={current} parentClass={parentClass} />
      {legacy.length > 0 ? (
        <section className="space-y-2" aria-label="Зі старих книг">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Зі старих книг</h3>
          <SubclassButtons subclasses={legacy} parentClass={parentClass} />
        </section>
      ) : null}
    </div>
  );
}

function SubclassButtons({ subclasses, parentClass }: { subclasses: readonly ListedSubclass[]; parentClass?: Pick<ClassI, "name" | "ruleset"> }) {
  return (
    <div className="grid grid-cols-1 gap-3">
      {subclasses.map((subclass) => (
        <SubclassInfoModal key={subclass.subclassId} subclass={subclass} analysisEntity={parentClass ? constructorSubclassEntity(parentClass, subclass) : undefined} trigger={<SubclassButton subclass={subclass} />} />
      ))}
    </div>
  );
}

function SubclassButton({ subclass }: { subclass: ListedSubclass }) {
  const localizedName = translateValue(subclass.name) || subclass.name;

  return (
    <button
      type="button"
      className="glass-panel border-gradient-rpg w-full max-w-full overflow-hidden rounded-xl p-3 text-left transition-colors hover:bg-white/10"
    >
      <BranchCover src={getSubclassImagePath(subclass.name)} alt={localizedName} sizes="(min-width: 640px) 560px, 100vw" className="mb-2" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-white">{localizedName}</p>
          {subclass.description ? <p className="mt-1 line-clamp-2 text-sm text-slate-300">{stripToPlainText(String(subclass.description))}</p> : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Badge variant="outline" className="border-white/15 bg-white/5 text-[10px] text-slate-300">
            Фічі: {Array.isArray(subclass.features) ? subclass.features.length : 0}
          </Badge>
          {subclass.legacySource ? (
            <span className="text-[10px] text-slate-400">
              {sourceTranslations[subclass.legacySource as keyof typeof sourceTranslations] ?? subclass.legacySource}
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
}
