import { mergeGains, type AdvancementChoice, type FeatPoolEntry } from "./ready-preset-advancements";
import { ABILITY_LABELS } from "./ready-preset-levels";

export function describeAdvancementChoice(choice: AdvancementChoice, pool: readonly FeatPoolEntry[], defaultFeat: FeatPoolEntry | null = null): string {
  if (choice.kind === "asi") {
    return `Підвищення характеристик: ${mergeGains(choice.abilities.map((ability) => ({ ability, amount: 1 }))).map((gain) => `${ABILITY_LABELS[gain.ability]} +${gain.amount}`).join(", ")}`;
  }
  const feat = pool.find((entry) => entry.key === choice.featKey) ?? defaultFeat;
  const option = feat?.options.find((entry) => entry.nameEng === choice.optionNameEng);
  return `Риса: ${feat?.name ?? choice.featKey}${option ? ` (${option.name})` : ""}`;
}
