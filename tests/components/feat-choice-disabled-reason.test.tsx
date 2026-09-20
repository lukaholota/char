// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import FeatChoiceOptionsForm from "@/lib/components/characterCreator/FeatChoiceOptionsForm";
import { findCharacterCreationOptions } from "@/lib/content/creator-content";
import { usePersFormStore } from "@/lib/stores/persFormStore";
import type { FeatPrisma } from "@/lib/types/model-types";

afterEach(cleanup);

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

const ALREADY_OWNED = /Вже володієте цією навичкою/;

/// Підпис пояснює, чому варіант сірий, і зникати від того, що гравець дообрав свої три, він не
/// має: причина «я вже це вмію» нікуди не поділася, а без підпису варіант виглядає як просто
/// вичерпаний ліміт.
describe("опції риси — підпис причини", () => {
  function renderSkilled() {
    const skilled = findCharacterCreationOptions("RULES_2014").feats.find(
      (feat) => feat.name === "SKILLED"
    ) as unknown as FeatPrisma;

    usePersFormStore.setState({
      formData: { featId: skilled.featId, featChoiceSelections: {} } as never,
      isHydrated: true,
    });

    render(
      <FeatChoiceOptionsForm
        selectedFeat={skilled}
        formId="feat-choices"
        extraExistingSkills={["HISTORY", "PERSUASION"]}
      />
    );
  }

  const pick = (label: string) => fireEvent.click(screen.getByText(label));

  it("варіант, яким персонаж уже володіє, підписаний", () => {
    renderSkilled();

    expect(screen.queryAllByText(ALREADY_OWNED).length).toBe(2);
  });

  it("підпис лишається, коли всі три вибори витрачені", () => {
    renderSkilled();

    pick("Акробатика");
    pick("Атлетика");
    pick("Виступ");

    expect(screen.queryAllByText(ALREADY_OWNED).length).toBe(2);
  });
});
