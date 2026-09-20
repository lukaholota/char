import type { Ruleset } from "@prisma/client";
import metamagic2014Json from "./generated/metamagic.json";
import metamagic2024Json from "../../data/2024/normalized/metamagic.json";
import { toEntitySlug } from "./slug-utils";

export type MetamagicData = {
  id: number;
  nameUa: string;
  engName: string;
  cost: number;
  isCostSpellLevel: boolean;
  description: string;
  shortDescription: string;
  ruleset: Ruleset;
  source: string;
};

const metamagic2014 = (metamagic2014Json as MetamagicData[]).map((option) => ({
  ...option,
  ruleset: "RULES_2014" as Ruleset,
}));

const metamagic2024: MetamagicData[] = metamagic2024Json.options.map((option, index) => ({
  id: index + 1,
  nameUa: option.name,
  engName: option.engName,
  cost: option.cost,
  isCostSpellLevel: false,
  description: option.description,
  shortDescription: "",
  ruleset: "RULES_2024",
  source: metamagic2024Json.source,
}));

export function getAllMetamagic(ruleset: Ruleset = "RULES_2014"): MetamagicData[] {
  return ruleset === "RULES_2024" ? metamagic2024 : metamagic2014;
}

export function getMetamagicByIdOrSlug(idOrSlug: string, ruleset: Ruleset = "RULES_2014"): MetamagicData | undefined {
  const trimmed = idOrSlug.trim();
  const options = getAllMetamagic(ruleset);
  const asNumber = Number(trimmed);

  if (Number.isFinite(asNumber)) return options.find((option) => option.id === Math.trunc(asNumber));

  const slug = toEntitySlug(trimmed);
  const lowered = trimmed.toLowerCase();
  return options.find(
    (option) =>
      toEntitySlug(option.engName) === slug ||
      option.engName.toLowerCase() === lowered ||
      option.nameUa.toLowerCase() === lowered
  );
}
