"use client";

import { useEffect, useState } from "react";
import { ZodError } from "zod";
import { useModeRouter } from "@/components/no-ai/NoAiModeProvider";
import { captureRpgbotEvent } from "@/lib/monitoring/rpgbot-analytics";
import type { BuildPageData } from "./build-pages.server";
import { applyBuildDraft, hasManualCreatorDraft, restoreCreatorBackup, findBuildBackupKey } from "./build-handoff";
import { buildDraftSchema, countRemainingBuildPoints } from "./build-draft";
import { findBuildCreatorStep } from "./build-assembly";
import type { PersFormData } from "@/lib/zod/schemas/persCreateSchema";

type AbilityScores = NonNullable<PersFormData["asi"]>;

export function useGuidedBuildDraft(data: BuildPageData, initialBuildId?: string) {
  const initialBuild = data.builds.find((entry) => entry.recipe.buildId === initialBuildId);
  const [buildId, setBuildId] = useState(initialBuild?.recipe.buildId ?? "");
  const [classChosen, setClassChosen] = useState(Boolean(initialBuild));
  const [raceId, setRaceId] = useState<number | undefined>(initialBuild?.startingDraft.raceId);
  const [scores, setScores] = useState<AbilityScores>(initialBuild?.recipe.details!.abilityScores ?? []);
  const [notes, setNotes] = useState("");
  const [customized, setCustomized] = useState(false);
  const [scoresCustomized, setScoresCustomized] = useState(false);
  const [confirmReplacement, setConfirmReplacement] = useState(false);
  const [assembling, setAssembling] = useState(false);
  const [hasBackup, setHasBackup] = useState(false);
  const [error, setError] = useState("");
  const [draftLoaded, setDraftLoaded] = useState(false);
  const router = useModeRouter();
  const edition = data.ruleset === "RULES_2024" ? "2024" : "2014";
  const build = data.builds.find((entry) => entry.recipe.buildId === buildId);
  const draftKey = `rpgbot-build-${data.ruleset}`;
  const creatorHref = edition === "2024" ? "/2024/char" : "/char/create";

  useEffect(() => { setHasBackup(Boolean(localStorage.getItem(findBuildBackupKey(data.ruleset)))); }, [data.ruleset]);
  useEffect(() => {
    const saved = localStorage.getItem(draftKey);
    try {
      if (saved) {
        const draft = buildDraftSchema.parse(JSON.parse(saved));
        const savedBuild = data.builds.find((entry) => entry.recipe.buildId === draft.buildId && entry.recipe.revisionId === draft.revisionId);
        if (savedBuild && (!initialBuildId || initialBuildId === draft.buildId)) {
          setBuildId(draft.buildId); setClassChosen(true); setRaceId(draft.raceId);
          setScores(draft.scores); setNotes(draft.notes); setCustomized(draft.customized); setScoresCustomized(draft.scoresCustomized);
        }
      }
    } catch (failure) {
      if (failure instanceof SyntaxError || failure instanceof ZodError) setError("Збережена чернетка дерева не читається. Можна обрати пресет знову.");
      else throw failure;
    }
    setDraftLoaded(true);
  }, [draftKey, data.builds, initialBuildId]);

  useEffect(() => {
    if (!draftLoaded || !build) return;
    const draft = buildDraftSchema.safeParse({ buildId, revisionId: build.recipe.revisionId, raceId, scores, notes, customized, scoresCustomized });
    if (draft.success) localStorage.setItem(draftKey, JSON.stringify(draft.data));
  }, [draftLoaded, build, buildId, draftKey, raceId, scores, notes, customized, scoresCustomized]);

  function selectBuild(nextId: string) {
    const selected = data.builds.find((entry) => entry.recipe.buildId === nextId)!;
    captureRpgbotEvent("rpgbot_build_selected", { build_id: nextId });
    setBuildId(nextId);
    setRaceId(selected.startingDraft.raceId);
    if (!scoresCustomized) setScores(selected.recipe.details!.abilityScores);
    setCustomized(scoresCustomized);
    setConfirmReplacement(false);
    setError("");
    window.history.replaceState(window.history.state, "", `?build=${encodeURIComponent(nextId)}`);
  }

  function saveDraft() {
    localStorage.setItem(draftKey, JSON.stringify({ buildId, revisionId: build!.recipe.revisionId, raceId, scores, notes, customized, scoresCustomized }));
  }

  function assembleBuild(replace = false) {
    if (!build || assembling) return;
    if (!replace && hasManualCreatorDraft(data.ruleset)) { setConfirmReplacement(true); return; }
    saveDraft();
    captureRpgbotEvent("rpgbot_build_assembled", { build_id: buildId, is_customized: customized });
    const draft = { ...build.startingDraft, raceId, asi: scores, points: countRemainingBuildPoints(scores) };
    if (raceId !== build.startingDraft.raceId) { draft.raceVariantId = undefined; draft.racialBonusChoiceSchema = undefined; }
    applyBuildDraft(draft, findBuildCreatorStep(draft), data.ruleset);
    setAssembling(true);
    router.push(creatorHref);
  }

  function restoreDraft() {
    if (restoreCreatorBackup(data.ruleset)) router.push(creatorHref);
  }

  function chooseRace(id: number) { setRaceId(id); setCustomized(true); setConfirmReplacement(false); }
  function changeScores(next: AbilityScores) { setScores(next); setScoresCustomized(true); setCustomized(true); setConfirmReplacement(false); }
  return { build, buildId, classChosen, chooseClass: () => setClassChosen(true), raceId, scores, notes, setNotes, customized,
    confirmReplacement, cancelReplacement: () => setConfirmReplacement(false), assembling, hasBackup, error,
    selectBuild, assembleBuild, restoreDraft, chooseRace, changeScores, scoresCustomized };
}
