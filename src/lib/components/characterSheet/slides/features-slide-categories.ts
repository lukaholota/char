import type { CharacterFeatureItem } from "@/lib/actions/pers";

export const ATTACK_CATEGORY_HINT = "Не займає дії: спрацьовує на кидку атаки, після влучання чи промаху";

export type CategoryKind = "passive" | "action" | "attack" | "bonus" | "reaction" | "resource";
export type Category = { title: string; items: CharacterFeatureItem[]; kind: CategoryKind; hint?: string };

export function categoryVariant(kind: CategoryKind) {
  switch (kind) {
    case "resource":
      return {
        container: "border-l-cyan-500/50 from-cyan-950/20",
        chevron: "text-cyan-300",
        title: "text-cyan-50",
        count: "text-cyan-200/70",
        cardBorder: "border-cyan-600/30 hover:border-cyan-500/60",
        cardBg: "bg-cyan-900/25 hover:bg-cyan-900/45",
      };
    case "action":
      return {
        container: "border-l-red-500/50 from-red-950/20",
        chevron: "text-red-300",
        title: "text-red-50",
        count: "text-red-200/70",
        cardBorder: "border-red-600/30 hover:border-red-500/60",
        cardBg: "bg-red-900/25 hover:bg-red-900/45",
      };
    case "attack":
      return {
        container: "border-l-orange-500/50 from-orange-950/20",
        chevron: "text-orange-300",
        title: "text-orange-50",
        count: "text-orange-200/70",
        cardBorder: "border-orange-600/30 hover:border-orange-500/60",
        cardBg: "bg-orange-900/25 hover:bg-orange-900/45",
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
