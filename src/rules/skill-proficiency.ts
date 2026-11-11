type SkillRow = { name: string; proficiencyType: string };

/// The sheet keeps a row with NONE when a player turns proficiency off, so a row alone means nothing.
export function isProficientSkillRow(row: SkillRow): boolean {
  return row.proficiencyType === "PROFICIENT" || row.proficiencyType === "EXPERTISE";
}

export function listProficientSkills(rows: readonly SkillRow[]): string[] {
  return rows.filter(isProficientSkillRow).map((row) => row.name);
}
