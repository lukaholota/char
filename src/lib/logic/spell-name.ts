/// Назва заклинання в базі несе оригінал у дужках — чипу вистачає української частини.
export function shortenSpellName(name: string): string {
  return name.replace(/\s*\[.*?\]\s*$/, "").trim() || name;
}
