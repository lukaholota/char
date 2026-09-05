/**
 * KR18.8 — доступність потойбічних викликів Чорнокнижника.
 *
 * Той самий предикат обслуговує обидві редакції: 2014 передає як `knownOptionNameEngs`
 * один-єдиний обраний Дар пакту (окрема група вибору), 2024 — усі вже відомі виклики з тієї
 * самої групи «Потойбічні виклики» (Pact of the Blade/Chain/Tome там — такі самі виклики, а не
 * окрема фіча). Правило про це не знає нічого: воно лише звіряє рівень і членство в наборі.
 */

export type InvocationPrerequisite = {
  level?: number;
  pact?: string;
};

export type InvocationPrerequisiteFailure = {
  met: false;
  reason: "level" | "pact";
};

export type InvocationPrerequisiteResult = { met: true } | InvocationPrerequisiteFailure;

export function checkInvocationPrerequisite(
  prereq: InvocationPrerequisite,
  args: { classLevel: number; knownOptionNameEngs: ReadonlySet<string> },
): InvocationPrerequisiteResult {
  if (typeof prereq.level === "number" && Number.isFinite(prereq.level) && args.classLevel < prereq.level) {
    return { met: false, reason: "level" };
  }

  if (prereq.pact && !args.knownOptionNameEngs.has(prereq.pact)) {
    return { met: false, reason: "pact" };
  }

  return { met: true };
}

export type CandidateInvocation = {
  optionNameEng: string;
  prerequisite: InvocationPrerequisite;
};

export type UnmetInvocationPrerequisite = {
  optionNameEng: string;
  reason: "level" | "pact";
};

/**
 * Перевіряє весь пакет нових виборів разом: виклик, обраний у тому самому пакеті, що й його
 * `pact`-передумова (наприклад, Pact of the Blade і Eldritch Smite на 5-му рівні), задовольняє
 * її — так само, як вибір на різних рівнях.
 */
export function findFirstUnmetInvocationPrerequisite(args: {
  classLevel: number;
  knownOptionNameEngs: ReadonlySet<string>;
  selectedInvocations: readonly CandidateInvocation[];
}): UnmetInvocationPrerequisite | null {
  const known = new Set(args.knownOptionNameEngs);
  for (const invocation of args.selectedInvocations) known.add(invocation.optionNameEng);

  for (const invocation of args.selectedInvocations) {
    const result = checkInvocationPrerequisite(invocation.prerequisite, {
      classLevel: args.classLevel,
      knownOptionNameEngs: known,
    });
    if (!result.met) return { optionNameEng: invocation.optionNameEng, reason: result.reason };
  }

  return null;
}
