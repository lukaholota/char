// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";

import { EMPTY_BRANCH_CHOICES } from "@/lib/components/levelUp/levelUpBranchChoices";
import { usePersFormStore } from "@/lib/stores/persFormStore";

vi.hoisted(() => {
  const entries = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    writable: true,
    value: {
      get length() {
        return entries.size;
      },
      key: (index: number) => [...entries.keys()][index] ?? null,
      getItem: (key: string) => entries.get(key) ?? null,
      setItem: (key: string, value: string) => void entries.set(key, String(value)),
      removeItem: (key: string) => void entries.delete(key),
      clear: () => entries.clear(),
    } satisfies Storage,
  });
});

/// Зміна шляху або класу на підвищенні рівня ховає крок «Експертиза»; залишені там вибори
/// сервер 2014 відхиляє («Оберіть рівно 0 навичок»), а прибрати їх гравець уже не може.
describe("скидання виборів при зміні гілки підвищення рівня", () => {
  it("прибирає експертизу й мови з покинутої гілки", () => {
    const { updateFormData } = usePersFormStore.getState();
    updateFormData({
      classId: 9,
      expertiseSchema: { expertises: ["STEALTH", "PERCEPTION"] },
      languagesSchema: { languages: ["ELVISH"] },
    });

    updateFormData({ levelUpPath: "MULTICLASS", classId: undefined });
    updateFormData(EMPTY_BRANCH_CHOICES);

    const { formData } = usePersFormStore.getState();
    expect(formData.expertiseSchema?.expertises ?? []).toEqual([]);
    expect(formData.languagesSchema?.languages ?? []).toEqual([]);
  });
});
