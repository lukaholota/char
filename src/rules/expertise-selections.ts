export type ExpertiseGrant = {
  chooseFromCurrentProficiencies?: boolean;
  count?: number;
  options?: readonly string[];
  getProficiencyAsWell?: boolean;
};

export type ExpertiseSelectionInput = {
  grants: readonly ExpertiseGrant[];
  selected: readonly string[];
  proficientSkills: readonly string[];
  existingExpertises?: readonly string[];
};

export function readExpertiseGrant(value: unknown): ExpertiseGrant | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const count = Number(record.count);
  const options = Array.isArray(record.options)
    ? record.options.filter((option): option is string => typeof option === "string")
    : undefined;
  const grant: ExpertiseGrant = {
    chooseFromCurrentProficiencies: record.chooseFromCurrentProficiencies === true,
    count: Number.isInteger(count) && count > 0 ? count : undefined,
    options,
    getProficiencyAsWell: record.getProficiencyAsWell === true,
  };
  return grant.count || grant.chooseFromCurrentProficiencies || grant.options?.length ? grant : null;
}

function grantCount(grant: ExpertiseGrant): number {
  if (Number.isInteger(grant.count) && Number(grant.count) > 0) return Number(grant.count);
  return grant.chooseFromCurrentProficiencies || grant.options?.length ? 1 : 0;
}

function eligibleSkills(grant: ExpertiseGrant, proficientSkills: ReadonlySet<string>): Set<string> {
  const eligible = new Set<string>();
  if (grant.chooseFromCurrentProficiencies) {
    proficientSkills.forEach((skill) => eligible.add(skill));
  }
  grant.options?.forEach((skill) => {
    if (grant.getProficiencyAsWell || proficientSkills.has(skill)) eligible.add(skill);
  });
  return eligible;
}

function canAssignEverySelection(
  selections: readonly string[],
  grants: readonly { remaining: number; eligible: ReadonlySet<string> }[],
  index = 0,
): boolean {
  if (index === selections.length) return true;
  const skill = selections[index];

  for (let grantIndex = 0; grantIndex < grants.length; grantIndex += 1) {
    const grant = grants[grantIndex];
    if (grant.remaining <= 0 || !grant.eligible.has(skill)) continue;

    const next = grants.map((candidate, index) => index === grantIndex
      ? { ...candidate, remaining: candidate.remaining - 1 }
      : candidate);
    if (canAssignEverySelection(selections, next, index + 1)) return true;
  }

  return false;
}

export function findExpertiseSelectionProblem(input: ExpertiseSelectionInput): string | null {
  const grants = input.grants
    .map((grant) => ({
      remaining: grantCount(grant),
      eligible: eligibleSkills(grant, new Set(input.proficientSkills)),
    }))
    .filter((grant) => grant.remaining > 0);
  const requiredCount = grants.reduce((total, grant) => total + grant.remaining, 0);
  const selected = input.selected.map(String);

  if (new Set(selected).size !== selected.length) return "Не можна обрати ту саму експертизу двічі";
  if (selected.length !== requiredCount) return `Оберіть рівно ${requiredCount} навичок для експертизи`;

  const existing = new Set(input.existingExpertises ?? []);
  if (selected.some((skill) => existing.has(skill))) return "Ця навичка вже має експертизу";
  if (!canAssignEverySelection(selected, grants)) return "Обрані навички не відповідають доступним варіантам експертизи";

  return null;
}

export function countExpertiseSelections(grants: readonly ExpertiseGrant[]): number {
  return grants.reduce((total, grant) => total + grantCount(grant), 0);
}
