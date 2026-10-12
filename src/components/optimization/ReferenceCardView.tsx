"use client";

import { Suspense, useEffect, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import type { ClassData } from "@/lib/classesData";
import type { ClassTable } from "@/rules/class-table";
import type { RaceData } from "@/lib/racesData";
import { fetchReferenceCard } from "@/lib/catalog-reads";
import { findBranchKey, findClassReading, findRaceReading, parseClassReadingTarget, parseRaceReadingTarget, type ClassSection, type RaceBranchKind, type RaceSection } from "@/lib/catalogs/reading-target";
import type { ReferenceCardTarget } from "@/lib/optimization/reference-card-target";
import type { ReferenceCard } from "@/lib/optimization/reference-cards.server";

const FeatDetailCard = dynamic(() => import("@/components/feats/FeatDetailCard").then((module) => module.FeatDetailCard));
const MagicItemDetailPane = dynamic(() => import("@/lib/components/magicItems/MagicItemDetailPane").then((module) => module.MagicItemDetailPane));
const BackgroundDetailCard = dynamic(() => import("@/components/backgrounds/BackgroundDetailCard").then((module) => module.BackgroundDetailCard));
const InvocationDetailCard = dynamic(() => import("@/components/invocations/InvocationDetailCard").then((module) => module.InvocationDetailCard));
const MetamagicDetailCard = dynamic(() => import("@/components/metamagic/MetamagicDetailCard").then((module) => module.MetamagicDetailCard));
const InfusionDetailCard = dynamic(() => import("@/components/infusions/InfusionDetailCard").then((module) => module.InfusionDetailCard));
const WeaponDetailCard = dynamic(() => import("@/components/weapons/WeaponDetailCard").then((module) => module.WeaponDetailCard));
const ArmorDetailCard = dynamic(() => import("@/components/armor/ArmorDetailCard").then((module) => module.ArmorDetailCard));
const ClassDetailCard = dynamic(() => import("@/components/classes/ClassDetailCard").then((module) => module.ClassDetailCard));
const SubclassReader = dynamic(() => import("@/components/classes/SubclassReader").then((module) => module.SubclassReader));
const RaceDetailCard = dynamic(() => import("@/components/races/RaceDetailCard").then((module) => module.RaceDetailCard));
const RaceBranchReader = dynamic(() => import("@/components/races/RaceBranchReader").then((module) => module.RaceBranchReader));

type CardLoad = { href: string; card: ReferenceCard | null; failed: boolean };
const loadedCards = new Map<string, Promise<ReferenceCard>>();

type Props = {
  href: string;
  target: ReferenceCardTarget;
  unavailable: ReactNode;
  onBranchChange: (isBranchOpen: boolean) => void;
  onClose: () => void;
};

const LOADING = <p role="status" className="py-8 text-center text-sm text-slate-400">Завантажую…</p>;

export function ReferenceCardView({ href, target, unavailable, onBranchChange, onClose }: Props) {
  const load = useReferenceCard(href);
  if (load.failed) return unavailable;
  if (!load.card) return LOADING;
  // Without its own boundary a lazy card suspends the root one: the whole page hides and scroll resets to the top.
  return <Suspense fallback={LOADING}><CardContent card={load.card} target={target} onBranchChange={onBranchChange} onClose={onClose} /></Suspense>;
}

function CardContent({ card, target, onBranchChange, onClose }: Omit<Props, "href" | "unavailable"> & { card: ReferenceCard }) {
  const is2024 = target.ruleset === "RULES_2024";
  switch (card.catalog) {
    case "class": return <ClassReading characterClass={card.characterClass} table={card.table} params={target.params} is2024={is2024} onBranchChange={onBranchChange} onClose={onClose} />;
    case "race": return <RaceReading race={card.race} params={target.params} is2024={is2024} onBranchChange={onBranchChange} onClose={onClose} />;
    case "feat": return <FeatDetailCard feat={card.feat} is2024={is2024} />;
    case "magic-item": return <MagicItemDetailPane item={card.item} />;
    case "background": return <BackgroundDetailCard background={card.background} is2024={is2024} />;
    case "invocation": return <InvocationDetailCard invocation={card.invocation} is2024={is2024} />;
    case "metamagic": return <MetamagicDetailCard metamagic={card.metamagic} is2024={is2024} />;
    case "infusion": return <InfusionDetailCard infusion={card.infusion} />;
    case "weapon": return <WeaponDetailCard weapon={card.weapon} is2024={is2024} />;
    case "armor": return <ArmorDetailCard armor={card.armor} is2024={is2024} />;
  }
}

function useReferenceCard(href: string): CardLoad {
  const [load, setLoad] = useState<CardLoad>({ href, card: null, failed: false });
  useEffect(() => {
    let isCurrent = true;
    const request = loadedCards.get(href) ?? fetchReferenceCard(href);
    loadedCards.set(href, request);
    request.then(
      (card) => { if (isCurrent) setLoad({ href, card, failed: false }); },
      () => { loadedCards.delete(href); if (isCurrent) setLoad({ href, card: null, failed: true }); },
    );
    return () => { isCurrent = false; };
  }, [href]);
  return load.href === href ? load : { href, card: null, failed: false };
}

type ReadingProps = { params: URLSearchParams; is2024: boolean; onBranchChange: (isBranchOpen: boolean) => void; onClose: () => void };

function ClassReading({ characterClass, table, params, is2024, onBranchChange, onClose }: ReadingProps & { characterClass: ClassData; table?: ClassTable }) {
  const target = parseClassReadingTarget(params);
  const initial = target ? findClassReading([characterClass], target) : null;
  const [subclassKey, setSubclassKey] = useState(initial?.subclass?.slug ?? null);
  const [section, setSection] = useState<ClassSection>(initial?.section ?? "overview");
  const subclass = characterClass.subclasses.find((candidate) => candidate.slug === subclassKey) ?? null;
  useEffect(() => onBranchChange(!!subclass), [subclass, onBranchChange]);
  if (subclass) return <SubclassReader characterClass={characterClass} subclass={subclass} featureKey={null} focusRequest={0} is2024={is2024}
    onBack={() => { setSubclassKey(null); setSection("subclasses"); }} onClose={onClose} />;
  return <ClassDetailCard characterClass={characterClass} table={table} is2024={is2024}
    view={{ section, featureKey: null, focusRequest: 0, missing: null }}
    actions={{ onSectionChange: setSection, onOpenBranch: (key) => setSubclassKey(key), onDismissMissing: () => undefined }} />;
}

function RaceReading({ race, params, is2024, onBranchChange, onClose }: ReadingProps & { race: RaceData }) {
  const target = parseRaceReadingTarget(params);
  const initial = target ? findRaceReading([race], target) : null;
  const [branchKey, setBranchKey] = useState(initial?.branch ? `${initial.branch.kind}:${findBranchKey(initial.branch.entry)}` : null);
  const [section, setSection] = useState<RaceSection>(initial?.section ?? "overview");
  const branch = branchKey ? findRaceBranch(race, branchKey) : null;
  useEffect(() => onBranchChange(!!branch), [branch, onBranchChange]);
  if (branch) return <RaceBranchReader race={race} kind={branch.kind} branch={branch.entry} featureKey={null} focusRequest={0} is2024={is2024}
    onBack={() => { setBranchKey(null); setSection("branches"); }} onClose={onClose} />;
  return <RaceDetailCard race={race} is2024={is2024}
    view={{ section, featureKey: null, focusRequest: 0, missing: null }}
    actions={{ onSectionChange: setSection, onOpenBranch: (cardKey) => setBranchKey(cardKey), onDismissMissing: () => undefined }} />;
}

function findRaceBranch(race: RaceData, cardKey: string) {
  const [kind, key] = cardKey.split(":") as [RaceBranchKind, string];
  return findRaceReading([race], { raceKey: race.slug, section: "branches", branch: { kind, key }, featureKey: null })?.branch ?? null;
}
