type OptionalFeatureItem = { optionalFeatureId?: number | null; title?: string | null; feature?: { name?: string | null } | null };
type ReplacementSelection = { removeChoiceOptionId?: number; addChoiceOptionId?: number } | undefined;
type OptionalFeatureMode = "OPTIONAL" | "REPLACEMENT" | string;

const DECISION_BUTTONS: Record<string, string> = {
  OPTIONAL: "«Взяти» чи «Пропустити»",
  REPLACEMENT: "«Прийняти заміну» чи «Залишити як є»",
};

export function findOptionalFeatureHint<Item extends OptionalFeatureItem>(
  items: readonly Item[],
  decisions: Record<string, boolean | undefined>,
  mode: OptionalFeatureMode | undefined,
  findReplacement: (item: Item) => ReplacementSelection | null = () => null,
): string | null {
  for (const item of items) {
    if (!item.optionalFeatureId) continue;
    const title = `«${item.title || item.feature?.name || "Додаткова опція"}»`;
    const decision = decisions[String(item.optionalFeatureId)];
    if (decision === undefined) return `Вирішіть щодо ${title}: ${DECISION_BUTTONS[mode ?? "REPLACEMENT"] ?? DECISION_BUTTONS.REPLACEMENT}.`;
    if (decision !== true) continue;
    const replacement = findReplacement(item);
    if (replacement === null) continue;
    const removeId = Number(replacement?.removeChoiceOptionId);
    const addId = Number(replacement?.addChoiceOptionId);
    if (!Number.isFinite(removeId) || !Number.isFinite(addId)) return `Для ${title} оберіть, що замінити і на що.`;
    if (removeId === addId) return `Для ${title} оберіть варіант, відмінний від того, що замінюєте.`;
  }
  return null;
}
