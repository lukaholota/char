/// Значки статблока обʼєкта (розмір, тип) — фіксований перелік 5etools, не проза. Р20-маркер
/// сюди не йде, той самий принцип, що `trap-hazard-labels.ts`. Значення, яких немає в жодному
/// записі корпусу KR23.5 (17 облогових знарядь), тут не заведені — додавати за потреби.
/// Ті самі слова, що `SizeTranslations` у `translation.ts` (джерело істини для розміру істот) —
/// звірено, а не заведено окремим варіантом.
const OBJECT_SIZE_LABELS: Record<string, string> = {
  T: "Крихітний",
  S: "Маленький",
  M: "Середній",
  L: "Великий",
  H: "Величезний",
  G: "Гігантський",
};

const OBJECT_TYPE_LABELS: Record<string, string> = {
  SW: "Облогове знаряддя",
};

export function findObjectSizeLabel(size: string): string {
  return OBJECT_SIZE_LABELS[size] ?? size;
}

export function findObjectTypeLabel(objectType: string): string {
  return OBJECT_TYPE_LABELS[objectType] ?? objectType;
}
