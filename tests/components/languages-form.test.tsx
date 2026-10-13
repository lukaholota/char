// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { LanguagesForm } from "@/lib/components/characterCreator/LanguagesForm";
import { usePersFormStore } from "@/lib/stores/persFormStore";
import type { BackgroundI, ClassI, RaceI } from "@/lib/types/model-types";

vi.hoisted(() => {
  const entries = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    writable: true,
    value: {
      get length() { return entries.size; },
      key: (index: number) => [...entries.keys()][index] ?? null,
      getItem: (key: string) => entries.get(key) ?? null,
      setItem: (key: string, value: string) => void entries.set(key, String(value)),
      removeItem: (key: string) => void entries.delete(key),
      clear: () => entries.clear(),
    } satisfies Storage,
  });
});

afterEach(cleanup);
beforeEach(() => usePersFormStore.setState({ formData: {}, isHydrated: true }));

describe("крок «Мови» з переданим списком", () => {
  it("показує лише передані мови й відкидає збережений вибір, якого серед них немає: його не було б як зняти", async () => {
    render(<LanguagesForm formId="languages" race={{ languages: ["COMMON"] } as unknown as RaceI} selectedClass={{ languages: [] } as unknown as ClassI}
      background={{} as BackgroundI} activeFeatures={[]} initialSelection={["NOT_A_LANGUAGE", "GITH"]} forcedLanguagesToChooseCount={2} choosableLanguages={["ELVISH", "GITH"]} />);

    expect(screen.getByRole("button", { name: "Ґітська" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Ельфійська" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Дворфська" })).toBeNull();
    await waitFor(() => expect(usePersFormStore.getState().formData.languagesSchema?.languages).toEqual(["GITH"]));
  });
});
