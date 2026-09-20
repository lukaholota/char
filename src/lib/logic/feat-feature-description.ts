import { translateValue } from "@/lib/components/characterCreator/infoUtils";

export type PersFeatChoice = {
  choiceOption: { optionName: string } | null;
};

/// Вибори всередині риси (три навички «Умільця», список «Посвяченого у магію») не є окремими
/// здібностями: їхні наслідки вже стоять у навичках і характеристиках. На картці риси вони
/// відповідають на питання «що я взяв», тож дописуються в її опис, а не лягають картками поруч.
export function buildFeatFeatureDescription(description: string, choices: PersFeatChoice[] | null | undefined): string {
  const picked = collectPickedOptionNames(choices);
  if (picked.length === 0) return description;

  const pickedLine = `**Обрано:** ${picked.join(", ")}`;
  return description.trim() ? `${description.trim()}\n\n${pickedLine}` : pickedLine;
}

function collectPickedOptionNames(choices: PersFeatChoice[] | null | undefined): string[] {
  const names = (choices ?? [])
    .map((choice) => choice.choiceOption?.optionName)
    .filter((name): name is string => Boolean(name?.trim()))
    .map((name) => translateValue(name));
  return Array.from(new Set(names));
}
