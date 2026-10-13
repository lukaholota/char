"use client";

import { useCallback, useState } from "react";
import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModeLink } from "@/components/no-ai/ModeLink";
import { usePersFormStore } from "@/lib/stores/persFormStore";
import type { PersFormData } from "@/lib/zod/schemas/persCreateSchema";
import type { GuidedLevelUp as GuidedLevelUpOffer } from "@/lib/optimization/guided-level-up";

type FormData = Partial<PersFormData>;
export type GuidedLevelUpControl = { guide: GuidedLevelUpOffer | null; isApplied: boolean; apply: () => void; restoreManual: () => void };

const EMPTY_LEVEL_UP_CHOICES = {
  subclassId: undefined,
  customAsi: [],
  featId: undefined,
  featChoiceSelections: {},
  classChoiceSelections: {},
  subclassChoiceSelections: {},
  classOptionalFeatureSelections: {},
  classOptionalFeatureReplacementSelections: {},
  levelUpSkillSelections: {},
  expertiseSchema: { expertises: [] },
  languagesSchema: { languages: [] },
  infusionSelections: [],
  weaponMasteryWeaponIds: undefined,
  featSpellIds: [],
  featGrowthSpellIds: [],
  classOptionSpellIds: [],
  catchUpSpellSelections: {},
  classSpells: undefined,
  levelUpAsiChoiceType: undefined,
};

export function useGuidedLevelUp(guide: GuidedLevelUpOffer | null): GuidedLevelUpControl {
  const [manualDraft, setManualDraft] = useState<FormData | null>(null);

  const apply = useCallback(() => {
    if (guide?.status !== "ready") return;
    setManualDraft(usePersFormStore.getState().formData);
    usePersFormStore.getState().updateFormData({ ...EMPTY_LEVEL_UP_CHOICES, ...guide.input, levelUpAsiChoiceType: findAsiChoiceType(guide.input) } as FormData);
  }, [guide]);

  const restoreManual = useCallback(() => {
    if (!manualDraft) return;
    usePersFormStore.setState({ formData: manualDraft });
    setManualDraft(null);
  }, [manualDraft]);

  return { guide, isApplied: manualDraft !== null, apply, restoreManual };
}

function findAsiChoiceType(input: Extract<GuidedLevelUpOffer, { status: "ready" }>["input"]): "ASI" | "FEAT" | undefined {
  if (input.featId !== undefined) return "FEAT";
  return input.customAsi.length ? "ASI" : undefined;
}

export function GuidedLevelUpCard({ control }: { control: GuidedLevelUpControl }) {
  const { guide, isApplied, apply, restoreManual } = control;
  if (!guide) return null;

  return (
    <section aria-labelledby="guided-level-up-title" className="glass-card rounded-xl border border-white/10 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-arcane-300" aria-hidden />
        <div className="min-w-0 space-y-1">
          <h2 id="guided-level-up-title" className="text-base font-semibold text-slate-100">За гайдом</h2>
          {guide.build ? (
            <ModeLink prefetch={false} href={guide.build.href} className="block text-sm text-arcane-300 underline underline-offset-2 break-words">
              {guide.build.title}
            </ModeLink>
          ) : null}
        </div>
      </div>

      {guide.status === "unavailable" ? (
        <p className="text-sm text-slate-300">{guide.reason} Підвищуйте рівень вручну — оцінки заклинань у кроці заклинань лишаються.</p>
      ) : (
        <GuidedLevelUpReady guide={guide} isApplied={isApplied} onApply={apply} onRestoreManual={restoreManual} />
      )}
    </section>
  );
}

function GuidedLevelUpReady({ guide, isApplied, onApply, onRestoreManual }: {
  guide: Extract<GuidedLevelUpOffer, { status: "ready" }>;
  isApplied: boolean;
  onApply: () => void;
  onRestoreManual: () => void;
}) {
  const notes = [...guide.skipped, ...guide.open];
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-300">
        Рівень {guide.nextLevel}: {guide.classLabel}, {guide.classLevel}-й рівень класу.
        {isApplied ? " Рекомендації заповнено — переглядайте й змінюйте їх на наступних кроках." : " Заповнимо вибори цього рівня за планом пресета, а ви зможете змінити будь-який."}
      </p>
      {isApplied && notes.length ? (
        <ul className="list-disc space-y-1 pl-5 text-sm text-amber-200/90">
          {notes.map((note) => <li key={note}>{note}</li>)}
        </ul>
      ) : null}
      {isApplied ? (
        <Button type="button" variant="outline" className="min-h-11 border-white/15 bg-white/5 text-slate-200 hover:bg-white/7" onClick={onRestoreManual}>
          Повернутися до ручного підвищення
        </Button>
      ) : (
        <Button type="button" className="min-h-11" onClick={onApply}>
          Заповнити за гайдом
        </Button>
      )}
    </div>
  );
}
