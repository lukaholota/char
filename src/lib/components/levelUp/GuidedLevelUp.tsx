"use client";

import { useCallback } from "react";
import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModeLink } from "@/components/no-ai/ModeLink";
import { usePersFormStore } from "@/lib/stores/persFormStore";
import { findGuideSignature, startLevelUpDraft } from "@/lib/stores/levelUpDraft";
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
  const signature = findGuideSignature(guide);
  const isApplied = usePersFormStore((state) => Boolean(state.levelUpDraft?.guide));

  const apply = useCallback(() => {
    if (guide?.status !== "ready" || signature === null) return;
    const { formData, levelUpDraft } = usePersFormStore.getState();
    usePersFormStore.getState().setLevelUpDraft({ ...(levelUpDraft ?? startLevelUpDraft("")), guide: { signature, manualFormData: formData } });
    usePersFormStore.getState().updateFormData({ ...EMPTY_LEVEL_UP_CHOICES, ...guide.input, levelUpAsiChoiceType: findAsiChoiceType(guide.input) } as FormData);
  }, [guide, signature]);

  const restoreManual = useCallback(() => {
    const { levelUpDraft } = usePersFormStore.getState();
    if (!levelUpDraft?.guide) return;
    usePersFormStore.setState({ formData: levelUpDraft.guide.manualFormData, levelUpDraft: { ...levelUpDraft, guide: null } });
  }, []);

  return { guide, isApplied, apply, restoreManual };
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
  const notes = [...guide.open, ...guide.skipped];
  const hasPicks = guide.picks.length > 0;
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-300">Рівень {guide.nextLevel}: {guide.classLabel}, {guide.classLevel}-й рівень класу.</p>
      {hasPicks ? (
        <div className="space-y-1">
          <p className="text-sm text-slate-400">{isApplied ? "Заповнено за гайдом — змінюйте що завгодно на наступних кроках:" : "Гайд обере:"}</p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-200">
            {guide.picks.map((pick) => <li key={pick}>{pick}</li>)}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-slate-300">
          {notes.length ? "Гайду нічого заповнювати на цьому рівні." : "На цьому рівні виборів немає — гайду нічого заповнювати. Хіти й нові вміння класу додадуться самі."}
        </p>
      )}
      {notes.length ? (
        <ul className="list-disc space-y-1 pl-5 text-sm text-amber-200/90">
          {notes.map((note) => <li key={note}>{note}</li>)}
        </ul>
      ) : null}
      {!hasPicks ? null : isApplied ? (
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
