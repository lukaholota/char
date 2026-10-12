import type { HydrationTarget } from "./content-hydration";
import type { AnalysisArticle } from "./types";
import { toEntitySlug } from "@/lib/slug-utils";

type ContextualAlias = { articleSlugs: readonly string[]; original: string; aliases: readonly string[]; hrefPrefix?: string };

const CONTEXTUAL_ALIASES: readonly ContextualAlias[] = [
  { articleSlugs: ["artificer-races-2014"], original: "Genasi (Air, EEPC)", aliases: ["Air", "Air Genasi", "Genasi (Air)"] },
  { articleSlugs: ["artificer-races-2014"], original: "Genasi (Earth, EEPC)", aliases: ["Earth", "Earth Genasi", "Genasi (Earth)"] },
  { articleSlugs: ["artificer-races-2014"], original: "Genasi (Fire, EEPC)", aliases: ["Fire", "Fire Genasi", "Genasi (Fire)"] },
  { articleSlugs: ["artificer-races-2014"], original: "Genasi (Water, EEPC)", aliases: ["Water", "Water Genasi", "Genasi (Water)"] },
  { articleSlugs: ["artificer-races-2014"], original: "Genasi (Air)", aliases: ["Air", "Air Genasi", "Genasi (Air)"] },
  { articleSlugs: ["artificer-races-2014"], original: "Genasi (Earth)", aliases: ["Earth", "Earth Genasi", "Genasi (Earth)"] },
  { articleSlugs: ["artificer-races-2014"], original: "Genasi (Fire)", aliases: ["Fire", "Fire Genasi", "Genasi (Fire)"] },
  { articleSlugs: ["artificer-races-2014"], original: "Genasi (Water)", aliases: ["Water", "Water Genasi", "Genasi (Water)"] },
  { articleSlugs: ["artificer-races-2014"], original: "Dragonborn (Chromatic)", aliases: ["Chromatic"] },
  { articleSlugs: ["artificer-races-2014"], original: "Dragonborn (Metallic)", aliases: ["Metallic"] },
  { articleSlugs: ["artificer-races-2014"], original: "Dragonborn (Gem)", aliases: ["Gem"] },
  { articleSlugs: ["artificer-races-2014"], original: "Fallen Aasimar", aliases: ["Fallen"] },
  { articleSlugs: ["artificer-races-2014"], original: "Celestial Revelation", aliases: ["Fallen"] },
  { articleSlugs: ["artificer-races-2014"], original: "Deep Gnome (Svirfneblin)", aliases: ["Deep"], hrefPrefix: "/races?" },
  { articleSlugs: ["artificer-races-2014"], original: "Lightfoot Halfling", aliases: ["Lightfoot"] },
  { articleSlugs: ["artificer-races-2014"], original: "Stout Halfling", aliases: ["Stout"] },
  { articleSlugs: ["artificer-races-2014"], original: "Ghostwise Halfling", aliases: ["Ghostwise"] },
  { articleSlugs: ["artificer-races-2014", "druid-circle-of-spores-2014"], original: "Hill Dwarf", aliases: ["Hill"] },
  { articleSlugs: ["artificer-races-2014"], original: "Human", aliases: ["Default Human", "Standard Human"] },
  { articleSlugs: ["artificer-races-2014"], original: "Half-Elf", aliases: ["Standard Half-Elf"] },
  { articleSlugs: ["druid-circle-of-stars-2014"], original: "Starry Form", aliases: ["Chalice"] },
  { articleSlugs: ["bard-2014"], original: "Blade Flourish", aliases: ["Flourishes"] },
  { articleSlugs: ["wizard-abjuration-2014"], original: "Aberrant Spirit", aliases: ["Beholderkin"] },
  { articleSlugs: ["sorcerer-lunar-sorcery-2014"], original: "Rune Shaper", aliases: ["Cloud", "Frost", "Hill", "King"] },
  { articleSlugs: ["bard-glamour-2014"], original: "Mantle of Inspiration", aliases: ["Mantle"] },
  { articleSlugs: ["bard-eloquence-2014"], original: "Bardic Inspiration", aliases: ["Basic Inspiration"] },
  { articleSlugs: ["cleric-spells-2014"], original: "Dispel Evil and Good", aliases: ["Break Enchantment", "Dismissal"] },
  { articleSlugs: ["monk-2014"], original: "Unarmed Strike", aliases: ["Unarmed"], hrefPrefix: "/rules/" },
  { articleSlugs: ["races-2014"], original: "Kender Aptitude", aliases: ["Kender Curiosity"] },
  { articleSlugs: ["monk-astral-self-2014"], original: "Firearms Mastery", aliases: ["Firearm Proficiency"] },
  { articleSlugs: ["sorcerer-wild-magic-2014", "warlock-celestial-2014"], original: "Rolling 1 or 20", aliases: ["Natural 1"], hrefPrefix: "/rules/" },
  { articleSlugs: ["monk-four-elements-2014"], original: "Disciple of the Elements", aliases: ["Elemental Disciplines"] },
];

// A class guide opens with «Ряткидки», «Володіння» headers; the class card lists exactly those.
const CLASS_SUMMARY_MARKERS = ["Saves", "Proficiencies"];

export function collectContextualReferenceAliases(article: Pick<AnalysisArticle, "slug" | "ruleset">, targets: readonly HydrationTarget[]): HydrationTarget[] {
  if (article.ruleset !== "RULES_2014") return [];
  return [...collectClassSummaryAliases(article.slug, targets), ...CONTEXTUAL_ALIASES.filter((entry) => entry.articleSlugs.includes(article.slug)).flatMap((entry) => {
    const matches = targets.filter((target) => target.engName === entry.original && !target.href.startsWith("/2024/") && target.href.startsWith(entry.hrefPrefix ?? ""));
    const native = matches.filter((target) => /^\/(?:classes\?class=|races\?race=|bestiary\?creature=)/.test(target.href));
    const parents = native.length ? native : matches;
    if (new Set(parents.map((parent) => parent.href)).size !== 1) return [];
    return entry.aliases.map((engName) => ({ ...parents[0], engName, name: engName,
      sectionId: undefined, markerOnly: true, linkPlainText: false, priority: 3 }));
  })];
}

function collectClassSummaryAliases(articleSlug: string, targets: readonly HydrationTarget[]): HydrationTarget[] {
  const guideClass = targets.find((target) => target.kind === "class" && !target.href.startsWith("/2024/") && `${toEntitySlug(target.engName)}-2014` === articleSlug);
  return guideClass ? CLASS_SUMMARY_MARKERS.map((engName) => ({ ...guideClass, engName, name: engName,
    sectionId: undefined, markerOnly: true, linkPlainText: false, priority: 3 })) : [];
}
