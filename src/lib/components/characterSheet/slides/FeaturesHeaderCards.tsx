"use client";

import { useState } from "react";
import { ModeLink } from "@/components/no-ai/ModeLink";
import { SharedBastionDialog } from "@/components/bastions/SharedBastionDialog";
import { cn } from "@/lib/utils";
import { BASTION_STANDARD_LEVEL } from "@/rules/bastions";
import type { SharedBastionView } from "@/server/db/bastions";
import { ClassInfoModal } from "@/lib/components/characterCreator/modals/ClassInfoModal";
import { SubclassInfoModal } from "@/lib/components/characterCreator/modals/SubclassInfoModal";
import { findLegacySubclass2024 } from "@/rules/legacy-subclasses-2024";
import {
  classTranslations,
  sourceTranslations,
  variantTranslations,
} from "@/lib/refs/translation";
import { translateSubclassName } from "@/lib/refs/subclass-name";

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

/// Вхід у бастіон: `name === null` — бастіон доступний, але ще не створений. `shared` — поширений
/// лист, лише перегляд. Картки немає взагалі, коли значення `null` — редакція 2014 або знімок.
export type BastionEntryCard =
  | { kind: "owner"; href: string; name: string | null; facilityCount: number; isMuted: boolean }
  | { kind: "shared"; bastion: SharedBastionView };

function countFacilities(count: number): string {
  const lastTwoDigits = count % 100;
  const lastDigit = count % 10;
  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return `${count} приміщень`;
  if (lastDigit >= 1 && lastDigit <= 4) return `${count} приміщення`;
  return `${count} приміщень`;
}

type Props = {
  raceName: string;
  subraceName: string | null;
  backgroundName: string;
  raceVariants: any[];
  classEntries: ClassEntry[];
  subclassEntries: SubclassEntry[];
  featsCount: number;
  bastionEntry?: BastionEntryCard | null;
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
  bastionEntry,
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
          (entry.subclass?.name ? translateSubclassName(entry.subclass.name) : null) ||
          "Підклас";
        const legacySource = findLegacySubclass2024(String(entry.cls?.name), String(entry.subclass?.name))?.source ?? null;

        return (
          <SubclassInfoModal
            key={entry.key}
            subclass={{ ...entry.subclass, legacySource }}
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
                {legacySource ? (
                  <div className="text-[8px] text-slate-400 leading-none mt-0.5">
                    {sourceTranslations[legacySource as keyof typeof sourceTranslations] ?? legacySource}
                  </div>
                ) : null}
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

      {bastionEntry?.kind === "owner" ? <OwnerBastionTile entry={bastionEntry} /> : null}
      {bastionEntry?.kind === "shared" ? <SharedBastionTile bastion={bastionEntry.bastion} /> : null}
    </div>
  );
}

const BASTION_TILE_CLASS =
  "rounded-lg border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 transition px-1.5 py-1 text-center flex flex-col items-center justify-center min-h-[3rem] h-auto";

function OwnerBastionTile({ entry }: { entry: Extract<BastionEntryCard, { kind: "owner" }> }) {
  const subtitle = entry.name
    ? countFacilities(entry.facilityCount)
    : entry.isMuted
      ? `за правилами з ${BASTION_STANDARD_LEVEL}-го рівня`
      : "Створити";

  return (
    <ModeLink href={entry.href} className={cn(BASTION_TILE_CLASS, entry.isMuted && "border-white/10 bg-white/5 opacity-70")}>
      <BastionTileText title={entry.name ?? "Доступний"} subtitle={subtitle} />
    </ModeLink>
  );
}

function SharedBastionTile({ bastion }: { bastion: SharedBastionView }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)} className={BASTION_TILE_CLASS}>
        <BastionTileText title={bastion.name} subtitle={countFacilities(bastion.facilities.length)} />
      </button>
      <SharedBastionDialog bastion={bastion} open={isOpen} onOpenChange={setIsOpen} />
    </>
  );
}

function BastionTileText({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <>
      <div className="text-[8px] uppercase tracking-[0.1em] text-emerald-400/80 leading-none mb-0.5">Бастіон</div>
      <div className="text-[12px] font-semibold text-emerald-300 leading-tight whitespace-normal break-words w-full">{title}</div>
      <div className="text-[9px] text-emerald-200/70 leading-none mt-0.5">{subtitle}</div>
    </>
  );
}
