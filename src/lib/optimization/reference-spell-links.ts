import { buildSpellHref, buildSpellSlug } from "@/lib/spell-link";
import type { ContentReference, OptimizationRuleset } from "./types";

type SpellName = { name: string; engName: string };
const EXISTING_LINK = /(<a\b[\s\S]*?<\/a>|\[(?:[^\[\]]|\[[^\]]*\])*\]\([^\n)]*\))/gi;

export function hydrateReferenceSpellLinks(references: readonly ContentReference[], spells: readonly SpellName[], ruleset: OptimizationRuleset): ContentReference[] {
  const byName = new Map(spells.filter((spell) => /\[[^\]]+\]$/.test(spell.name)).map((spell) => [spell.name.toLocaleLowerCase("uk"), spell]));
  if (!byName.size) return [...references];
  const names = [...byName.keys()].sort((a, b) => b.length - a.length)
    .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(names.join("|"), "giu");
  return references.map((reference) => ({ ...reference,
    ...(reference.options ? { options: hydrateReferenceSpellLinks(reference.options, spells, ruleset) } : {}),
    description: reference.description?.split(EXISTING_LINK)
    .map((part, index) => index % 2 ? part : part.replace(pattern, (name, offset: number) => {
      if (/[\p{L}\p{N}]/u.test(part[offset - 1] ?? "")) return name;
      const spell = byName.get(name.toLocaleLowerCase("uk"))!;
      const href = buildSpellHref({ ruleset, spellKey: buildSpellSlug(spell.engName) });
      return `<a href="${href}">${spell.name.replace(/\s*\[[^\]]+\]$/, "")}</a>`;
    })).join("") }));
}
