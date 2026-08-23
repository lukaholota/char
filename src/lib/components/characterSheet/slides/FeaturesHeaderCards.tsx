"use client";

import { ClassInfoModal } from "@/lib/components/characterCreator/modals/ClassInfoModal";
import { SubclassInfoModal } from "@/lib/components/characterCreator/modals/SubclassInfoModal";
import {
  classTranslations,
  subclassTranslations,
  variantTranslations,
} from "@/lib/refs/translation";

type ClassEntry = {
  key: string;
  kind: "main" | "multiclass";
  classLevel: number;
  cls: any;
};

type SubclassEntry = {
  key: string;
  kind: "main" | "multiclass";
  classLevel: number;
  cls: any;
  subclass: any;
};

type Props = {
  raceName: string;
  subraceName: string | null;
  backgroundName: string;
  raceVariants: any[];
  classEntries: ClassEntry[];
  subclassEntries: SubclassEntry[];
  featsCount: number;
  openEntity: (kind: "race" | "raceVariant" | "subrace" | "background", idx?: number) => void;
  onOpenFeatsManager: () => void;
};

export function FeaturesHeaderCards({
  raceName,
  subraceName,
  backgroundName,
  raceVariants,
  classEntries,
  subclassEntries,
  featsCount,
  openEntity,
  onOpenFeatsManager,
}: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
      <button
        type="button"
        onClick={() => openEntity("race")}
        className="rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition px-1.5 py-1 text-center flex flex-col items-center justify-center min-h-[3rem] h-auto"
      >
        <div className="text-[8px] uppercase tracking-[0.1em] text-slate-400 leading-none mb-0.5">Раса</div>
        <div className="text-[12px] font-semibold text-slate-50 leading-tight whitespace-normal break-words w-full">{raceName}</div>
      </button>

      {raceVariants.map((rv: any, idx: number) => {
        const name = variantTranslations[rv.name as keyof typeof variantTranslations] ?? String(rv.name);
        return (
          <button
            key={rv.raceVariantId ?? idx}
            type="button"
            onClick={() => openEntity("raceVariant", idx)}
            className="rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition px-1.5 py-1 text-center flex flex-col items-center justify-center min-h-[3rem] h-auto"
          >
            <div className="text-[8px] uppercase tracking-[0.1em] text-slate-400 leading-none mb-0.5">Варіант раси</div>
            <div className="text-[12px] font-semibold text-slate-50 leading-tight whitespace-normal break-words w-full">{name}</div>
          </button>
        );
      })}

      {subraceName ? (
        <button
          type="button"
          onClick={() => openEntity("subrace")}
          className="rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition px-1.5 py-0.5 text-center flex flex-col items-center justify-center h-12"
        >
          <div className="text-[8px] uppercase tracking-[0.1em] text-slate-400 leading-none mb-0.5">Підраса</div>
          <div className="text-[12px] font-semibold text-slate-50 leading-tight whitespace-normal break-words w-full">{subraceName}</div>
        </button>
      ) : null}

      {classEntries.map((entry) => {
        const name =
          classTranslations[entry.cls?.name as keyof typeof classTranslations] ||
          entry.cls?.name ||
          "Клас";

        return (
          <ClassInfoModal
            key={entry.key}
            cls={entry.cls}
            asyncFetchSubclasses={true}
            trigger={
              <button
                type="button"
                className="w-full rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition px-1.5 py-1 text-center flex flex-col items-center justify-center min-h-[3rem] h-auto"
              >
                <div className="text-[8px] uppercase tracking-[0.1em] text-slate-400 leading-none mb-0.5">
                  {entry.kind === "main" ? "Клас" : "Мультиклас"}
                </div>
                <div className="text-[12px] font-semibold text-slate-50 leading-tight whitespace-normal break-words w-full">{name}</div>
                <div className="text-[9px] text-slate-300/70 leading-none mt-0.5">Рівень {entry.classLevel}</div>
              </button>
            }
          />
        );
      })}

      {subclassEntries.map((entry) => {
        const clsName =
          classTranslations[entry.cls?.name as keyof typeof classTranslations] ||
          entry.cls?.name ||
          "Клас";
        const scName =
          subclassTranslations[entry.subclass?.name as keyof typeof subclassTranslations] ||
          entry.subclass?.name ||
          "Підклас";

        return (
          <SubclassInfoModal
            key={entry.key}
            subclass={entry.subclass}
            trigger={
              <button
                type="button"
                className="w-full rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition px-1.5 py-1 text-center flex flex-col items-center justify-center min-h-[3rem] h-auto"
              >
                <div className="text-[8px] uppercase tracking-[0.1em] text-slate-400 leading-none mb-0.5">
                  {entry.kind === "main" ? "Підклас" : "Підклас (м)"}
                </div>
                <div className="text-[12px] font-semibold text-slate-50 leading-tight whitespace-normal break-words w-full">{scName}</div>
                <div className="text-[9px] text-slate-300/70 leading-none mt-0.5">{clsName}</div>
              </button>
            }
          />
        );
      })}

      <button
        type="button"
        onClick={() => openEntity("background")}
        className="rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition px-1.5 py-1 text-center flex flex-col items-center justify-center min-h-[3rem] h-auto"
      >
        <div className="text-[8px] uppercase tracking-[0.1em] text-slate-400 leading-none mb-0.5">Передісторія</div>
        <div className="text-[12px] font-semibold text-slate-50 leading-tight whitespace-normal break-words w-full">{backgroundName}</div>
      </button>

      <button
        type="button"
        onClick={onOpenFeatsManager}
        className="rounded-lg border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 transition px-1.5 py-1 text-center flex flex-col items-center justify-center min-h-[3rem] h-auto"
      >
        <div className="text-[8px] uppercase tracking-[0.1em] text-amber-400/80 leading-none mb-0.5">Риси</div>
        <div className="text-[12px] font-semibold text-amber-300 leading-tight whitespace-normal break-words w-full">
          {featsCount > 0 ? `${featsCount} ${featsCount === 1 ? "риса" : "рис"}` : "+ Додати"}
        </div>
      </button>
    </div>
  );
}
