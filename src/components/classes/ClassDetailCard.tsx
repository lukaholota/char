"use client";

import { Skills } from "@/lib/prisma-enums";
import { Shield, Sparkles, Wrench } from "lucide-react";
import { D20Icon } from "@/lib/components/icons/D20Icon";

import type { ClassData, SubclassData } from "@/lib/classesData";
import { findFeatureKey, type ClassSection } from "@/lib/catalogs/reading-target";
import { buildFeatureEntries } from "@/lib/catalogs/reading-entries";
import { splitCatalogSubclasses } from "@/lib/logic/legacy-subclass-visibility";
import { CatalogProse } from "@/components/catalogs/CatalogProse";
import { BranchCardGrid, type BranchCard } from "@/components/catalogs/reading/BranchCardGrid";
import { MissingTargetNotice } from "@/components/catalogs/reading/MissingTargetNotice";
import { ReadingEntryList } from "@/components/catalogs/reading/ReadingEntryList";
import { ReadingSectionTabs, type ReadingSection } from "@/components/catalogs/reading/ReadingSectionTabs";
import type { ReadingActions, ReadingView } from "@/components/catalogs/reading/reading-view";
import { FramedIllustration } from "@/components/ui/FramedIllustration";
import { ClassTableView } from "@/components/classes/ClassTableView";
import type { ClassTable } from "@/rules/class-table";
import { useIsArtHidden } from "@/components/no-ai/ContentImage";
import { cn } from "@/lib/utils";
import { skillTranslations, sourceTranslations } from "@/lib/refs/translation";
import { describeSkillChoice, formatAnySkillsLabel, normalizeSkillProficiencies } from "@/rules/proficiency";
import { findAccentVariant } from "@/styles/edition-accent";

const ALL_SKILLS = Object.values(Skills);

export const LEGACY_SUBCLASSES_NOTE =
  "Правила 2024 дозволяють підклас із книги 2014 без перевидання; риси нижче 3-го рівня ви отримуєте на 3-му.";

const FEATURE_FORMS = ["здібність", "здібності", "здібностей"] as const;

export function ClassDetailCard({
  characterClass,
  table,
  is2024 = false,
  view,
  actions,
}: {
  characterClass: ClassData;
  table?: ClassTable;
  is2024?: boolean;
  view: ReadingView<ClassSection>;
  actions: ReadingActions<ClassSection>;
}) {
  return (
    <div
      className={cn(
        "glass-card max-w-full overflow-hidden break-words rounded-2xl border border-white/10 bg-slate-950/60 p-4 backdrop-blur-xl sm:p-6",
        findAccentVariant(is2024, { prism: "shadow-[0_0_30px_rgba(192,74,224,0.08)] ring-1 ring-prism-500/20", arcane: "shadow-[0_0_30px_rgba(141,99,238,0.08)] ring-1 ring-white/10" }),
      )}
    >
      <Header characterClass={characterClass} is2024={is2024} />
      {view.missing ? (
        <MissingTargetNotice
          message={view.missing === "branch" ? "Такого підкласу в цьому класі немає." : "Такої здібності тут немає."}
          actionLabel="До класу"
          onAction={actions.onDismissMissing}
        />
      ) : null}
      <ReadingSectionTabs
        label={`Розділи класу ${characterClass.name}`}
        sections={buildSections(characterClass, table, is2024, view, actions)}
        value={view.section}
        onValueChange={actions.onSectionChange}
        is2024={is2024}
      />
    </div>
  );
}

function buildSections(
  characterClass: ClassData,
  table: ClassTable | undefined,
  is2024: boolean,
  view: ReadingView<ClassSection>,
  actions: ReadingActions<ClassSection>,
): ReadingSection<ClassSection>[] {
  const sections: ReadingSection<ClassSection>[] = [
    {
      value: "overview",
      label: "Огляд",
      content: (
        <>
          <CatalogProse content={characterClass.description} />
          <MetaGrid characterClass={characterClass} />
        </>
      ),
    },
  ];
  if (table) {
    sections.push({
      value: "table",
      label: "Таблиця",
      content: (
        <ClassTableView
          table={table}
          className="max-h-[70vh]"
          onOpenFeature={(feature) =>
            feature.kind === "class" ? actions.onOpenFeature?.(findFeatureKey(feature)) : actions.onSectionChange("subclasses")
          }
        />
      ),
    });
  }
  if (characterClass.features.length > 0) {
    sections.push({
      value: "features",
      label: `Здібності (${characterClass.features.length})`,
      content: (
        <ReadingEntryList
          entries={buildFeatureEntries(characterClass.features)}
          targetKey={view.featureKey}
          focusRequest={view.focusRequest}
          is2024={is2024}
        />
      ),
    });
  }
  if (characterClass.subclasses.length > 0) {
    sections.push({
      value: "subclasses",
      label: `Підкласи (${splitCatalogSubclasses(characterClass.subclasses).current.length})`,
      content: <SubclassSection characterClass={characterClass} is2024={is2024} onOpen={actions.onOpenBranch} />,
    });
  }
  return sections;
}

function SubclassSection({
  characterClass,
  is2024,
  onOpen,
}: {
  characterClass: ClassData;
  is2024: boolean;
  onOpen: ReadingActions<ClassSection>["onOpenBranch"];
}) {
  const { current, legacy } = splitCatalogSubclasses(characterClass.subclasses);

  return (
    <div className="space-y-5">
      {current.length > 0 ? (
        <SubclassGroup title={`Підкласи (${current.length}) · з ${characterClass.subclassLevel} рівня`}>
          <BranchCardGrid cards={current.map(toSubclassCard)} is2024={is2024} onOpen={onOpen} />
        </SubclassGroup>
      ) : null}
      {legacy.length > 0 ? (
        <SubclassGroup title={`Зі старих книг (${legacy.length})`}>
          <p className="mb-3 text-xs text-slate-400">{LEGACY_SUBCLASSES_NOTE}</p>
          <BranchCardGrid cards={legacy.map(toSubclassCard)} is2024={is2024} onOpen={onOpen} />
        </SubclassGroup>
      ) : null}
    </div>
  );
}

function SubclassGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-label={title}>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</h3>
      {children}
    </section>
  );
}

export function findSubclassSourceLabel(subclass: SubclassData): string | null {
  return subclass.source ? sourceTranslations[subclass.source] ?? subclass.source : null;
}

function toSubclassCard(subclass: SubclassData): BranchCard {
  return {
    key: subclass.slug,
    name: subclass.name,
    engName: subclass.engName,
    kindLabel: "Підклас",
    sourceLabel: findSubclassSourceLabel(subclass),
    entryCount: subclass.features.length,
    entryCountForms: FEATURE_FORMS,
    description: subclass.description,
  };
}

function Header({ characterClass, is2024 }: { characterClass: ClassData; is2024: boolean }) {
  const isArtHidden = useIsArtHidden(characterClass.imageSrc);

  return (
    <div className="flex items-start gap-4">
      {characterClass.imageSrc && !isArtHidden ? (
        <div className="hidden h-28 w-28 shrink-0 sm:block">
          <FramedIllustration
            src={characterClass.imageSrc}
            alt={characterClass.name}
            sizes="112px"
            chamfer="sm"
            vignette="md"
            imageClassName="object-top"
          />
        </div>
      ) : null}

      <div className="min-w-0 flex-1">
        <h1
          className={cn(
            "font-rpg-display text-xl uppercase tracking-wide sm:text-2xl",
            findAccentVariant(is2024, { prism: "text-prism-200", arcane: "text-arcane-200" }),
          )}
        >
          {characterClass.name}
        </h1>
        <p className="mt-0.5 font-mono text-xs text-slate-500">[{characterClass.engName}]</p>
        <p className="mt-2 text-xs text-slate-400">
          Кістка здоровʼя к{characterClass.hitDie} · Підклас з {characterClass.subclassLevel} рівня
        </p>
      </div>
    </div>
  );
}

function MetaGrid({ characterClass }: { characterClass: ClassData }) {
  const skills = formatClassSkillChoices(characterClass.skillChoices);
  const casting = characterClass.spellcasting
    ? `${characterClass.spellcasting}${characterClass.castingStat ? ` · ${characterClass.castingStat}` : ""}`
    : "Немає";

  return (
    <div className="mt-4 grid gap-2 sm:grid-cols-2">
      <MetaCell icon={D20Icon} label="Рятівні кидки" value={characterClass.savingThrows.join(", ") || "—"} />
      <MetaCell icon={Sparkles} label="Чаротворення" value={casting} />
      <MetaCell
        icon={Shield}
        label="Обладунки"
        value={characterClass.armorProficiencies.join(", ") || "—"}
      />
      <MetaCell
        icon={Wrench}
        label="Інструменти"
        value={characterClass.toolProficiencies.join(", ") || "—"}
      />
      <div className="sm:col-span-2">
        <MetaCell icon={Sparkles} label="Навички" value={skills} />
      </div>
    </div>
  );
}

export function formatClassSkillChoices(skillChoices: ClassData["skillChoices"]): string {
  const normalized = normalizeSkillProficiencies(
    { options: skillChoices.options, choiceCount: skillChoices.count },
    ALL_SKILLS,
  );
  if (!normalized) return "—";

  const choice = describeSkillChoice(normalized, ALL_SKILLS);
  if (choice.type === "any") return formatAnySkillsLabel(choice.choiceCount);
  const names = (choice.type === "fixed" ? choice.skills : choice.options).map(
    (skill) => skillTranslations[skill] ?? skill,
  );
  return `${skillChoices.count} з: ${names.join(", ")}`;
}

function MetaCell({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-slate-500">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-1 text-sm text-slate-200">{value}</div>
    </div>
  );
}
