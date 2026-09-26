"use client";

import { raceTranslations, raceTranslationsEng } from "@/lib/refs/translation";
import { useStepForm } from "@/hooks/useStepForm";
import { raceSchema } from "@/lib/zod/schemas/persCreateSchema";
import { RaceI } from "@/lib/types/model-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { useEffect, useMemo, useCallback, useRef, useState } from "react";
import { usePersFormStore } from "@/lib/stores/persFormStore";
import { RaceInfoModal } from "@/lib/components/characterCreator/modals/RaceInfoModal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { isEmbeddedWebView } from "@/lib/utils/isEmbeddedWebView";
import { CreationCard } from "@/components/characterCreator/CreationCard";
import { getRaceVisual } from "@/components/characterCreator/creation-visuals";

const normalizeText = (value?: string) =>
  (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

interface Props {
  races: RaceI[];
  formId: string;
  onNextDisabledChange?: (disabled: boolean) => void;
}

export const RacesForm = (
  {races, formId, onNextDisabledChange}: Props
) => {
  const { updateFormData, nextStep } = usePersFormStore();

  const pendingNextRef = useRef<null | (() => void)>(null);
  const [webViewWarningOpen, setWebViewWarningOpen] = useState(false);
  const [isWebView] = useState(() => isEmbeddedWebView());

  const webViewShareUrl = useMemo(() => {
    if (typeof window === "undefined") return undefined;
    return `${window.location.origin}/char`;
  }, []);

  const handleCopyLink = useCallback(async () => {
    if (!webViewShareUrl || typeof window === "undefined") return;
    try {
      await window.navigator.clipboard.writeText(webViewShareUrl);
      toast.success("Посилання скопійовано", {
        description: "Відкрийте його у Safari або Chrome.",
      });
    } catch {
      toast.error("Не вдалося скопіювати", {
        description: "Спробуйте скопіювати адресу вручну.",
      });
    }
  }, [webViewShareUrl]);

  const shouldShowWebViewWarning = useCallback(() => {
    if (!isWebView) return false;
    if (typeof window === "undefined") return false;
    try {
      return window.sessionStorage.getItem("webview-warning-after-race") !== "1";
    } catch {
      return true;
    }
  }, [isWebView]);

  const markWebViewWarningShown = () => {
    if (typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem("webview-warning-after-race", "1");
    } catch {
      // ignore
    }
  };
  
  const {form, onSubmit} = useStepForm(raceSchema, (data) => {
    updateFormData({
      raceId: data.raceId,
      raceSearch: data.raceSearch,
    });

    if (shouldShowWebViewWarning()) {
      markWebViewWarningShown();
      pendingNextRef.current = () => nextStep();
      setWebViewWarningOpen(true);
      return;
    }

    nextStep();
  });

  const chosenRaceId = form.watch('raceId') || 0;
  const raceSearch = form.watch('raceSearch') || '';
  const normalizedRaceSearch = useMemo(() => normalizeText(raceSearch), [raceSearch]);

  useEffect(() => {
    if (!chosenRaceId) {
      onNextDisabledChange?.(true);
      return;
    }
    onNextDisabledChange?.(false);
  }, [onNextDisabledChange, chosenRaceId]);

  const matchesSearch = useCallback((raceName: string) => {
    if (!normalizedRaceSearch) return true;
    const ua = normalizeText(raceTranslations[raceName]);
    const eng = normalizeText(raceTranslationsEng[raceName]);
    return ua.includes(normalizedRaceSearch) || eng.includes(normalizedRaceSearch);
  }, [normalizedRaceSearch]);

  const is2024 = useMemo(() => races.some((r) => r.ruleset === "RULES_2024" || r.name.endsWith("2024")), [races]);

  const coreRaces = useMemo(
    () => races
      .filter(r => is2024 ? (r.ruleset === "RULES_2024" || r.name.endsWith("2024")) : r.name.endsWith('2014'))
      .filter(r => matchesSearch(r.name))
      .sort((a, b) => (a.sortOrder - b.sortOrder) || (a.raceId - b.raceId)),
    [races, is2024, matchesSearch]
  );
  const otherRaces = useMemo(
    () => is2024 ? [] : races
      .filter(r => !r.name.endsWith('2014'))
      .filter(r => matchesSearch(r.name))
      .sort((a, b) => {
        const orderDiff = a.sortOrder - b.sortOrder;
        if (orderDiff !== 0) return orderDiff;
        return a.raceId - b.raceId;
      }),
    [races, is2024, matchesSearch]
  );

  const hasNoResults = !coreRaces.length && !otherRaces.length;

  const handleRaceSelect = (r: RaceI) => {
    if (r.raceId !== chosenRaceId) {
      updateFormData({
        subraceId: undefined,
        raceVariantId: null,
        raceChoiceSelections: {},
        featId: undefined,
        featChoiceSelections: {},
        racialBonusChoiceSchema: undefined,
      });
    }
    form.setValue('raceId', r.raceId);
  };

  return (
    <>
      <form id={formId} onSubmit={onSubmit} className="w-full space-y-4">
      <div className="space-y-2 text-center">
        <h2 className="font-rpg-display text-3xl font-semibold uppercase tracking-widest text-slate-200 sm:text-4xl">
          {is2024 ? "Оберіть вид" : "Оберіть расу"}
        </h2>
      </div>

      <div className="glass-panel border-gradient-rpg rounded-xl p-3 sm:p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              type="search"
              {...form.register('raceSearch')}
              value={raceSearch}
              onChange={(e) => form.setValue('raceSearch', e.target.value)}
              placeholder="Пошук за назвою"
              aria-label="Пошук раси"
              className="h-10 border-white/10 bg-white/5 pl-9 pr-10 text-sm text-slate-100 placeholder:text-slate-400 focus-visible:ring-arcane-400/30"
            />
            {raceSearch && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1.5 top-1/2 h-7 w-7 -translate-y-1/2 text-slate-400 hover:text-white"
                onClick={() => form.setValue('raceSearch', '')}
                aria-label="Очистити пошук рас"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {hasNoResults && (
        <p className="text-center text-sm text-slate-400">Нічого не знайдено.</p>
      )}

      <div className="space-y-4">
        <div>
          <div className="mb-2.5 flex items-center justify-between">
            <p className="text-sm font-semibold text-white">{is2024 ? "PHB 2024" : "PHB 2014"}</p>
            <Badge variant="outline" className="border-white/15 bg-white/5 text-slate-200">Джерело</Badge>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
            {coreRaces.map(r => (
              <CreationCard
                key={r.raceId}
                testId={`race-${r.name}`}
                title={raceTranslations[r.name] ?? r.name}
                englishTitle={raceTranslationsEng[r.name]}
                visual={getRaceVisual(r.name)}
                isSelected={r.raceId === chosenRaceId}
                is2024={r.ruleset === "RULES_2024"}
                infoModal={<RaceInfoModal race={r} />}
                onClick={(e) => {
                  if ((e.target as HTMLElement | null)?.closest?.('[data-stop-card-click]')) return;
                  handleRaceSelect(r);
                }}
              />
            ))}
          </div>
        </div>

        {!is2024 && otherRaces.length > 0 && (
          <details className="glass-panel border-gradient-rpg rounded-xl" open>
            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-white hover:bg-white/5 [&::-webkit-details-marker]:hidden">
              Інші джерела
            </summary>
            <div className="border-t border-white/10 p-3.5">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
                {otherRaces.map(r => (
                  <CreationCard
                    key={r.raceId}
                    testId={`race-${r.name}`}
                    title={raceTranslations[r.name] ?? r.name}
                    englishTitle={raceTranslationsEng[r.name]}
                    visual={getRaceVisual(r.name)}
                    isSelected={r.raceId === chosenRaceId}
                is2024={r.ruleset === "RULES_2024"}
                        infoModal={<RaceInfoModal race={r} />}
                    onClick={(e) => {
                      if ((e.target as HTMLElement | null)?.closest?.('[data-stop-card-click]')) return;
                      handleRaceSelect(r);
                    }}
                  />
                ))}
              </div>
            </div>
          </details>
        )}
      </div>

      <input
        type="hidden"
        {...form.register("raceId", {
          setValueAs: (value) => {
            if (value === "" || value === undefined || value === null) return undefined;
            const num = typeof value === "number" ? value : Number(value);
            return Number.isFinite(num) ? num : undefined;
          },
        })}
      />
      </form>

      <Dialog open={webViewWarningOpen} onOpenChange={setWebViewWarningOpen}>
        <DialogContent className="sm:max-w-[460px] border border-slate-800/70 bg-slate-950/90 backdrop-blur">
          <DialogHeader>
            <DialogTitle className="text-white">Краще відкрити у браузері зараз</DialogTitle>
            <DialogDescription className="text-slate-400">
              Ви відкрили сайт у вбудованому браузері (Threads/Instagram/Facebook тощо). Google-логін тут може не
              працювати.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm text-slate-300">
            <div className="rounded-lg border border-slate-800/80 bg-slate-900/70 px-3 py-2">
              Рекомендуємо відкрити сторінку у Safari/Chrome прямо зараз, тому що якщо ви перейдете в браузер пізніше,
              прогрес створення персонажа з цього вбудованого браузера не перенесеться.
            </div>

            <div className="rounded-lg border border-slate-800/80 bg-slate-900/70 px-3 py-2 text-xs text-slate-400">
              {webViewShareUrl ? <span className="break-all">{webViewShareUrl}</span> : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={handleCopyLink}>
                Скопіювати посилання
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setWebViewWarningOpen(false);
                  const fn = pendingNextRef.current;
                  pendingNextRef.current = null;
                  fn?.();
                }}
                className="bg-gradient-to-r from-indigo-500 via-blue-500 to-emerald-500 text-white"
              >
                Продовжити тут
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
};

export default RacesForm;
