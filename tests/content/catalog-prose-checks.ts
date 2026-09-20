import { CORPUS_RETIRED_FORMS } from "./ratified-term-forms";

export type ProseEntry = { name: string; prose: string | null | undefined };

export function findProseProblems(entries: ProseEntry[]): string[] {
  return entries.flatMap(({ name, prose }) => {
    if (!prose?.trim()) return [`${name}: немає прози`];
    const retired = CORPUS_RETIRED_FORMS.filter(({ pattern }) => pattern.test(prose)).map(
      ({ label }) => `${name}: знята форма «${label}»`,
    );
    const unclosed = /\{\{[^}]*$|^[^{]*\}\}/m.test(prose) ? [`${name}: незакритий маркер`] : [];
    return [...retired, ...unclosed];
  });
}

export function countProseWords(prose: string): number {
  return prose.replace(/\{\{[^{}]*\}\}/g, "").trim().split(/\s+/).length;
}
