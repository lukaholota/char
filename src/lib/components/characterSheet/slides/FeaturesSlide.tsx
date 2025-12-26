"use client";

import { useMemo, useState } from "react";
import { CharacterFeatureItem, CharacterFeaturesGroupedResult, PersWithRelations } from "@/lib/actions/pers";
import { FeatureDisplayType, SpellcastingType } from "@prisma/client";
import { ChevronRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Badge } from "@/components/ui/badge";
import {
  ControlledInfoDialog,
  InfoGrid,
  InfoPill,
  InfoSectionTitle,
} from "@/lib/components/characterCreator/EntityInfoDialog";
import {
  formatASI,
  formatAbilityList,
  formatArmorProficiencies,
  formatLanguages,
  formatList,
  formatMulticlassReqs,
  formatRaceAC,
  formatSkillProficiencies,
  formatSpeeds,
  formatToolProficiencies,
  formatWeaponProficiencies,
  prettifyEnum,
  translateValue,
} from "@/lib/components/characterCreator/infoUtils";
import {
  backgroundTranslations,
  classTranslations,
  raceTranslations,
  sourceTranslations,
  subraceTranslations,
  subclassTranslations,
  variantTranslations,
} from "@/lib/refs/translation";

interface FeaturesSlideProps {
  pers: PersWithRelations;
  groupedFeatures: CharacterFeaturesGroupedResult | null;
}

type CategoryKind = "passive" | "action" | "bonus" | "reaction";
type Category = { title: string; items: CharacterFeatureItem[]; kind: CategoryKind };

type EntityDialogKind = "race" | "raceVariant" | "subrace" | "class" | "subclass" | "background";

const SPELLCASTING_LABELS: Record<SpellcastingType, string> = {
  NONE: "Без чаклунства",
  FULL: "Повний кастер",
  HALF: "Половинний кастер",
  THIRD: "Третинний кастер",
  PACT: "Магія пакту",
};

function safeText(value: string | null | undefined) {
  return (value ?? "").trim();
}

function categoryVariant(kind: "passive" | "action" | "bonus" | "reaction") {
  switch (kind) {
    case "action":
      return {
        container: "border-l-red-500/50 from-red-950/20",
        chevron: "text-red-300",
        title: "text-red-50",
        count: "text-red-200/70",
        cardBorder: "border-red-600/30 hover:border-red-500/60",
        cardBg: "bg-red-900/25 hover:bg-red-900/45",
      };
    case "bonus":
      return {
        container: "border-l-blue-500/50 from-blue-950/20",
        chevron: "text-blue-300",
        title: "text-blue-50",
        count: "text-blue-200/70",
        cardBorder: "border-blue-600/30 hover:border-blue-500/60",
        cardBg: "bg-blue-900/25 hover:bg-blue-900/45",
      };
    case "reaction":
      return {
        container: "border-l-purple-500/50 from-purple-950/20",
        chevron: "text-purple-300",
        title: "text-purple-50",
        count: "text-purple-200/70",
        cardBorder: "border-purple-600/30 hover:border-purple-500/60",
        cardBg: "bg-purple-900/25 hover:bg-purple-900/45",
      };
    case "passive":
    default:
      return {
        container: "border-l-amber-600/50 from-amber-950/20",
        chevron: "text-amber-300",
        title: "text-amber-50",
        count: "text-amber-200/70",
        cardBorder: "border-amber-700/30 hover:border-amber-600/60",
        cardBg: "bg-amber-900/20 hover:bg-amber-900/40",
      };
  }
}

function getKindFromPrimaryType(primaryType: FeatureDisplayType): "passive" | "action" | "bonus" | "reaction" {
  switch (primaryType) {
    case FeatureDisplayType.ACTION:
      return "action";
    case FeatureDisplayType.BONUSACTION:
      return "bonus";
    case FeatureDisplayType.REACTION:
      return "reaction";
    default:
      return "passive";
  }
}

function FeatureCard({
  item,
  onClick,
}: {
  item: CharacterFeatureItem;
  onClick: () => void;
}) {
  const kind = getKindFromPrimaryType(item.primaryType);
  const variant = categoryVariant(kind);

  const description = safeText(item.description);
  const preview = description.length > 180 ? description.slice(0, 180).trimEnd() + "…" : description;

  const showUses =
    (item.primaryType === FeatureDisplayType.ACTION || item.primaryType === FeatureDisplayType.BONUSACTION) &&
    typeof item.usesRemaining === "number" &&
    typeof item.usesPer === "number";

  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "group relative w-full text-left p-3 rounded-lg border shadow-inner transition-all cursor-pointer " +
        variant.cardBorder +
        " " +
        variant.cardBg
      }
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-r from-white/5 via-transparent to-transparent rounded-lg transition-opacity" />

      <div className="relative z-10 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h4 className="font-bold text-sm text-white/95 truncate">{item.name}</h4>
          {preview ? <p className="text-xs mt-1 text-slate-200/70 leading-snug line-clamp-2">{preview}</p> : null}
        </div>

        {showUses ? (
          <div className="flex-shrink-0 text-right">
            <div className="text-xs font-semibold text-amber-300">
              {item.usesRemaining}/{item.usesPer}
            </div>
            {item.restType ? <div className="text-[10px] text-slate-400 mt-0.5">{item.restType}</div> : null}
          </div>
        ) : null}
      </div>
    </button>
  );
}

export default function FeaturesSlide({ pers, groupedFeatures }: FeaturesSlideProps) {
  const [selected, setSelected] = useState<CharacterFeatureItem | null>(null);
  const [entityOpen, setEntityOpen] = useState(false);
  const [entityKind, setEntityKind] = useState<EntityDialogKind>("race");
  const [entityVariantIndex, setEntityVariantIndex] = useState(0);

  const categories = useMemo<Category[]>(() => {
    if (!groupedFeatures) return [];
    return [
      { title: "Основна дія", items: groupedFeatures.actions, kind: "action" },
      { title: "Бонусна дія", items: groupedFeatures.bonusActions, kind: "bonus" },
      { title: "Реакція", items: groupedFeatures.reactions, kind: "reaction" },
      { title: "Пасивні здібності", items: groupedFeatures.passive, kind: "passive" },
    ];
  }, [groupedFeatures]);

  const raceName = useMemo(
    () => raceTranslations[pers.race.name as keyof typeof raceTranslations] || pers.race.name,
    [pers.race.name]
  );
  const className = useMemo(
    () => classTranslations[pers.class.name as keyof typeof classTranslations] || pers.class.name,
    [pers.class.name]
  );
  const subclassName = useMemo(() => {
    if (!pers.subclass) return null;
    return subclassTranslations[pers.subclass.name as keyof typeof subclassTranslations] || pers.subclass.name;
  }, [pers.subclass]);
  const subraceName = useMemo(() => {
    if (!pers.subrace) return null;
    return subraceTranslations[pers.subrace.name as keyof typeof subraceTranslations] || pers.subrace.name;
  }, [pers.subrace]);
  const backgroundName = useMemo(
    () => backgroundTranslations[pers.background.name as keyof typeof backgroundTranslations] || pers.background.name,
    [pers.background.name]
  );

  const openEntity = (kind: EntityDialogKind, variantIndex?: number) => {
    setEntityKind(kind);
    if (typeof variantIndex === "number") setEntityVariantIndex(variantIndex);
    setEntityOpen(true);
  };

  const parseItems = (items: unknown): string[] => {
    if (!Array.isArray(items)) return [];

    return (items as unknown[])
      .map((item) => {
        if (!item) return null;
        if (typeof item === "string") return item;
        if (typeof item === "object") {
          const name = (item as any).name;
          const quantity = (item as any).quantity;
          if (!name) return null;
          return quantity ? `${name} x${quantity}` : name;
        }
        return null;
      })
      .filter(Boolean) as string[];
  };

  const entityDialog = useMemo(() => {
    if (entityKind === "race") {
      const race = pers.race as any;
      const rawTraits = (race.traits || []) as any[];
      const traitList = [...rawTraits].sort((a, b) => (a.raceTraitId || 0) - (b.raceTraitId || 0));

      return {
        title: raceName,
        subtitle: undefined,
        content: (
          <>
            <InfoGrid>
              <InfoPill label="Джерело" value={sourceTranslations[race.source] ?? race.source} />
              <InfoPill label="Розмір" value={formatList(race.size)} />
              <InfoPill label="Швидкості" value={formatSpeeds(race)} />
              <InfoPill label="Базовий КБ" value={formatRaceAC(race.ac)} />
              <InfoPill label="Бонуси характеристик" value={formatASI(race.ASI)} />
              <InfoPill label="Мови" value={formatLanguages(race.languages, race.languagesToChooseCount)} />
              <InfoPill label="Навички" value={formatSkillProficiencies(race.skillProficiencies)} />
              <InfoPill label="Інструменти" value={formatToolProficiencies(race.toolProficiencies, race.toolToChooseCount)} />
              <InfoPill label="Зброя" value={formatWeaponProficiencies(race.weaponProficiencies)} />
              <InfoPill label="Броня" value={formatArmorProficiencies(race.armorProficiencies)} />
            </InfoGrid>

            <div className="space-y-2">
              <InfoSectionTitle>Риси</InfoSectionTitle>
              {traitList.length ? (
                traitList.map((trait) => (
                  <div
                    key={trait.raceTraitId || trait.feature?.featureId}
                    className="rounded-lg border border-slate-800/80 bg-slate-900/60 px-3 py-2.5 shadow-inner"
                  >
                    <p className="text-sm font-semibold text-white">{trait.feature?.name}</p>
                    <p className="whitespace-pre-line text-sm leading-relaxed text-slate-200/90">
                      {trait.feature?.description}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400">Для цієї раси ще немає опису рис.</p>
              )}
            </div>
          </>
        ),
      };
    }

    if (entityKind === "raceVariant") {
      const variants = (pers as any).raceVariants as any[] | undefined;
      const variant = variants?.[entityVariantIndex];
      if (!variant) {
        return {
          title: "Варіант раси",
          subtitle: undefined,
          content: <div className="text-sm text-slate-400">Немає даних про варіант.</div>,
        };
      }

      const name = variantTranslations[variant.name as keyof typeof variantTranslations] ?? String(variant.name);
      const rawTraits = (variant.traits || []) as any[];
      const traitList = [...rawTraits].sort((a, b) => (a.raceVariantTraitId || 0) - (b.raceVariantTraitId || 0));

      return {
        title: name,
        subtitle: undefined,
        content: (
          <>
            <InfoGrid>
              <InfoPill label="Джерело" value={sourceTranslations[variant.source] ?? variant.source} />
              <InfoPill
                label="Швидкості"
                value={
                  formatSpeeds({
                    speed: variant.overridesRaceSpeed,
                    flightSpeed: variant.overridesFlightSpeed,
                  })
                }
              />
              <InfoPill label="Бонуси характеристик" value={formatASI(variant.overridesRaceASI)} />
              <div className="col-span-full">
                <p className="text-sm text-slate-300">{variant.description}</p>
              </div>
            </InfoGrid>

            <div className="space-y-2">
              <InfoSectionTitle>Риси</InfoSectionTitle>
              {traitList.length ? (
                traitList.map((trait) => (
                  <div
                    key={trait.raceVariantTraitId || trait.feature?.featureId}
                    className="rounded-lg border border-slate-800/80 bg-slate-900/60 px-3 py-2.5 shadow-inner"
                  >
                    <p className="text-sm font-semibold text-white">{trait.feature?.name}</p>
                    <p className="whitespace-pre-line text-sm leading-relaxed text-slate-200/90">
                      {trait.feature?.description}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400">Для цього варіанту ще немає опису рис.</p>
              )}
            </div>
          </>
        ),
      };
    }

    if (entityKind === "subrace") {
      if (!pers.subrace) {
        return {
          title: "Підраса",
          subtitle: undefined,
          content: <div className="text-sm text-slate-400">Підраса не обрана.</div>,
        };
      }

      const subrace = pers.subrace as any;
      const rawTraits = (subrace.traits || []) as any[];
      const traitList = [...rawTraits].sort((a, b) => (a.raceTraitId || 0) - (b.raceTraitId || 0));

      return {
        title: subraceName || subrace.name,
        subtitle: undefined,
        content: (
          <>
            <InfoGrid>
              <InfoPill label="Джерело" value={sourceTranslations[subrace.source] ?? subrace.source} />
              <InfoPill label="Швидкості" value={formatSpeeds(subrace)} />
              <InfoPill label="Бонуси характеристик" value={formatASI(subrace.additionalASI)} />
              <InfoPill label="Мови" value={formatLanguages(subrace.additionalLanguages, subrace.languagesToChooseCount)} />
              <InfoPill label="Інструменти" value={formatToolProficiencies(subrace.toolProficiencies)} />
            </InfoGrid>

            <div className="space-y-2">
              <InfoSectionTitle>Риси</InfoSectionTitle>
              {traitList.length ? (
                traitList.map((trait) => (
                  <div
                    key={trait.raceTraitId || trait.feature?.featureId}
                    className="rounded-lg border border-slate-800/80 bg-slate-900/60 px-3 py-2.5 shadow-inner"
                  >
                    <p className="text-sm font-semibold text-white">{trait.feature?.name}</p>
                    <p className="whitespace-pre-line text-sm leading-relaxed text-slate-200/90">
                      {trait.feature?.description}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400">Для цієї підраси ще немає опису рис.</p>
              )}
            </div>
          </>
        ),
      };
    }

    if (entityKind === "class") {
      const cls = pers.class as any;
      const rawFeatures = (cls.features || []) as any[];
      const features = [...rawFeatures].sort((a, b) => (a.levelGranted || 0) - (b.levelGranted || 0));

      return {
        title: className,
        subtitle: undefined,
        content: (
          <>
            <InfoGrid>
              <InfoPill label="Кістка хітів" value={`d${cls.hitDie}`} />
              <InfoPill label="Чаклунство" value={SPELLCASTING_LABELS[cls.spellcastingType as SpellcastingType] ?? "—"} />
              <InfoPill label="Підклас з рівня" value={`Рівень ${cls.subclassLevel}`} />
              <InfoPill label="Рятунки" value={formatAbilityList(cls.savingThrows)} />
              <InfoPill label="Навички" value={formatSkillProficiencies(cls.skillProficiencies)} />
              <InfoPill label="Інструменти" value={formatToolProficiencies(cls.toolProficiencies, cls.toolToChooseCount)} />
              <InfoPill label="Зброя" value={formatWeaponProficiencies(cls.weaponProficiencies)} />
              <InfoPill label="Броня" value={formatArmorProficiencies(cls.armorProficiencies)} />
              <InfoPill label="Мови" value={formatLanguages(cls.languages, cls.languagesToChooseCount)} />
              <InfoPill label="Мультіклас" value={formatMulticlassReqs(cls.multiclassReqs)} />
              {cls.primaryCastingStat ? (
                <InfoPill label="Ключова характеристика" value={prettifyEnum(cls.primaryCastingStat)} />
              ) : null}
            </InfoGrid>

            <div className="space-y-2">
              <InfoSectionTitle>Особливості</InfoSectionTitle>
              {features.length ? (
                features.map((feature) => (
                  <div
                    key={feature.classFeatureId || feature.feature?.featureId}
                    className="rounded-lg border border-slate-800/80 bg-slate-900/60 px-3 py-2.5 shadow-inner"
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-white">{feature.feature?.name}</p>
                      <Badge
                        variant="outline"
                        className="border-slate-700 bg-slate-800/70 text-[11px] text-slate-200"
                      >
                        Рів. {feature.levelGranted}
                      </Badge>
                    </div>
                    <p className="whitespace-pre-line text-sm leading-relaxed text-slate-200/90">
                      {feature.feature?.description}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400">Наразі немає описаних умінь.</p>
              )}
            </div>
          </>
        ),
      };
    }

    if (entityKind === "subclass") {
      if (!pers.subclass) {
        return {
          title: "Підклас",
          subtitle: undefined,
          content: <div className="text-sm text-slate-400">Підклас не обраний.</div>,
        };
      }

      const subcls = pers.subclass as any;
      const rawFeatures = (subcls.features || []) as any[];
      const featureList = [...rawFeatures].sort((a, b) => (a.levelUnlock || 0) - (b.levelUnlock || 0));

      return {
        title: subclassName || subcls.name,
        subtitle: undefined,
        content: (
          <>
            <InfoGrid>
              <InfoPill label="Джерело" value={sourceTranslations[subcls.source] ?? subcls.source} />
              <InfoPill label="Основна характеристика" value={prettifyEnum(subcls.primaryCastingStat)} />
              <InfoPill label="Тип заклинань" value={prettifyEnum(subcls.spellcastingType)} />
              <InfoPill label="Мови" value={formatLanguages(subcls.languages, subcls.languagesToChooseCount)} />
              <InfoPill label="Інструменти" value={formatToolProficiencies(subcls.toolProficiencies, subcls.toolToChooseCount)} />
              <div className="col-span-full">
                <p className="text-sm text-slate-300">{subcls.description}</p>
              </div>
            </InfoGrid>

            <div className="space-y-2">
              <InfoSectionTitle>Риси підкласу</InfoSectionTitle>
              {featureList.length ? (
                featureList.map((f) => (
                  <div
                    key={f.feature?.featureId}
                    className="rounded-lg border border-slate-800/80 bg-slate-900/60 px-3 py-2.5 shadow-inner"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-semibold text-white">{f.feature?.name}</p>
                      <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-400">
                        Рівень {f.levelUnlock}
                      </Badge>
                    </div>
                    <p className="whitespace-pre-line text-sm leading-relaxed text-slate-200/90">
                      {f.feature?.description}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400">Для цього підкласу ще немає опису рис.</p>
              )}
            </div>
          </>
        ),
      };
    }

    const background = pers.background as any;
    const items = parseItems(background.items);
    const resolvedSource = background.source ? prettifyEnum(background.source) : "—";

    return {
      title: backgroundName,
      subtitle: undefined,
      content: (
        <>
          <InfoGrid>
            <InfoPill label="Джерело" value={resolvedSource} />
            <InfoPill label="Навички" value={formatSkillProficiencies(background.skillProficiencies)} />
            <InfoPill label="Інструменти" value={formatToolProficiencies(background.toolProficiencies)} />
            <InfoPill label="Мови" value={formatLanguages([], background.languagesToChooseCount)} />
            <InfoPill label="Особливість" value={background.specialAbilityName || "-"} />
          </InfoGrid>

          {items.length ? (
            <div className="space-y-1.5">
              <InfoSectionTitle>Стартове спорядження</InfoSectionTitle>
              <ul className="space-y-1 text-sm text-slate-200/90">
                {items.map((item, index) => (
                  <li key={`${item}-${index}`} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-indigo-400" aria-hidden />
                    <span className="flex-1">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {(background.specialAbilityName || background.description) ? (
            <div className="space-y-1">
              <InfoSectionTitle>Опис особливості</InfoSectionTitle>
              {background.specialAbilityName ? (
                <p className="text-sm font-semibold text-white">{background.specialAbilityName}</p>
              ) : null}
              {background.description ? (
                <p className="whitespace-pre-line text-sm leading-relaxed text-slate-200/90">
                  {background.description}
                </p>
              ) : null}
            </div>
          ) : null}
        </>
      ),
    };
  }, [backgroundName, className, entityKind, entityVariantIndex, pers, raceName, subclassName, subraceName]);

  return (
    <div className="h-full p-3 sm:p-4 space-y-3">
      <h2 className="text-xl sm:text-2xl font-bold text-slate-50">Здібності</h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => openEntity("race")}
          className="rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition px-3 py-2 text-left"
        >
          <div className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Раса</div>
          <div className="text-sm font-semibold text-slate-50 truncate">{raceName}</div>
        </button>

        {(pers as any).raceVariants?.map((rv: any, idx: number) => {
          const name = variantTranslations[rv.name as keyof typeof variantTranslations] ?? String(rv.name);
          return (
            <button
              key={rv.raceVariantId ?? idx}
              type="button"
              onClick={() => openEntity("raceVariant", idx)}
              className="rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition px-3 py-2 text-left"
            >
              <div className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Варіант раси</div>
              <div className="text-sm font-semibold text-slate-50 truncate">{name}</div>
            </button>
          );
        })}

        {pers.subrace ? (
          <button
            type="button"
            onClick={() => openEntity("subrace")}
            className="rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition px-3 py-2 text-left"
          >
            <div className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Підраса</div>
            <div className="text-sm font-semibold text-slate-50 truncate">{subraceName}</div>
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => openEntity("class")}
          className="rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition px-3 py-2 text-left"
        >
          <div className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Клас</div>
          <div className="text-sm font-semibold text-slate-50 truncate">{className}</div>
          <div className="text-xs text-slate-300/70 truncate">Рівень {pers.level}</div>
        </button>

        {pers.subclass ? (
          <button
            type="button"
            onClick={() => openEntity("subclass")}
            className="rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition px-3 py-2 text-left"
          >
            <div className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Підклас</div>
            <div className="text-sm font-semibold text-slate-50 truncate">{subclassName}</div>
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => openEntity("background")}
          className="rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition px-3 py-2 text-left"
        >
          <div className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Передісторія</div>
          <div className="text-sm font-semibold text-slate-50 truncate">{backgroundName}</div>
        </button>
      </div>

      {!groupedFeatures ? (
        <div className="text-sm text-slate-400">Немає даних про фічі</div>
      ) : (
        <div className="space-y-2">
          {categories.map((category) => {
            const variant = categoryVariant(category.kind);
            const total = category.items.length;

            return (
              <Collapsible
                key={category.title}
                defaultOpen={total > 0}
                className={
                  "group border-l-2 bg-gradient-to-r to-transparent rounded-r-lg p-3 sm:p-4 transition-all duration-300 " +
                  variant.container
                }
              >
                <CollapsibleTrigger className="flex items-center gap-3 w-full">
                  <ChevronRight className={"w-5 h-5 transition-transform group-data-[state=open]:rotate-90 " + variant.chevron} />
                  <span className={"font-bold uppercase tracking-wider text-xs sm:text-sm " + variant.title}>{category.title}</span>
                  <span className={"ml-auto text-[10px] sm:text-xs " + variant.count}>[{total}]</span>
                </CollapsibleTrigger>

                <CollapsibleContent className="mt-3 sm:mt-4 pl-6 sm:pl-8">
                  {total === 0 ? (
                    <div className="text-xs text-slate-400">Немає в цій категорії</div>
                  ) : (
                    <ScrollArea className="max-h-[44vh] overflow-y-auto pr-3">
                      <div className="space-y-2">
                        {category.items.map((item) => (
                          <FeatureCard key={item.key} item={item} onClick={() => setSelected(item)} />
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl border border-white/10 bg-slate-900/95 backdrop-blur text-slate-50">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">{selected?.name}</DialogTitle>
            {selected ? (
              <DialogDescription className="text-xs text-slate-300">
                {selected.sourceName} • {translateValue(selected.source)}
              </DialogDescription>
            ) : null}
          </DialogHeader>
          <div className="text-sm text-slate-200/90 whitespace-pre-line leading-relaxed">
            {selected?.description}
          </div>
        </DialogContent>
      </Dialog>

      <ControlledInfoDialog
        open={entityOpen}
        onOpenChange={(open) => setEntityOpen(open)}
        title={entityDialog.title}
        subtitle={entityDialog.subtitle}
      >
        {entityDialog.content}
      </ControlledInfoDialog>
    </div>
  );
}
